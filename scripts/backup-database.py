#!/usr/bin/env python3
"""Initial public-schema backup only. Never changes the live application URL.

Runs on a GitHub-hosted Linux runner with Docker and Python 3. No third-party
Python packages, database URLs in command arguments, or downloadable data logs.
"""
import json
import os
from pathlib import Path
import re
import selectors
import subprocess
import sys
import tempfile
import time
from urllib.parse import parse_qs, unquote, urlsplit
import uuid


class BackupError(Exception):
    pass


def connection(value, target=False):
    try:
        url = urlsplit(value)
        port = url.port or 5432
        params = parse_qs(url.query, strict_parsing=True)
        password = unquote(url.password or "")
        if (url.scheme not in ("postgres", "postgresql") or not url.hostname
                or not url.username or not password or url.fragment
                or not url.path.strip("/") or not 1 <= port <= 65535
                or any(c in value for c in "\r\n\x00")
                or password in ("[YOUR-PASSWORD]", "YOUR-PASSWORD")):
            raise ValueError()
        if any(len(values) != 1 for values in params.values()) or set(params) - {"sslmode", "sslrootcert", "connect_timeout"}:
            raise ValueError()
        sslmode = params.get("sslmode", ["require"])[0]
        if sslmode not in ("require", "verify-ca", "verify-full"):
            raise ValueError()
        if "sslrootcert" in params and params["sslrootcert"] != ["system"]:
            raise ValueError()
        if target:
            host = url.hostname.lower()
            if not (host.endswith(".supabase.com") or host.endswith(".supabase.co")):
                raise BackupError("Target must be the Supabase database connection, not Railway.")
            if port == 6543:
                raise BackupError("Use Supabase's Session pooler on port 5432, not the transaction pooler.")
        elif url.hostname.endswith(".railway.internal"):
            raise BackupError("The source must use Railway's current public TCP proxy URL.")
        result = {
            "PGHOST": url.hostname, "PGPORT": str(port),
            "PGUSER": unquote(url.username), "PGPASSWORD": password,
            "PGDATABASE": unquote(url.path[1:]), "PGSSLMODE": sslmode,
            "PGCONNECT_TIMEOUT": "15", "PGAPPNAME": "tea-atelier-backup",
            "PGOPTIONS": "-c timezone=UTC -c statement_timeout=120000 -c lock_timeout=10000 -c standard_conforming_strings=on",
        }
        if "sslrootcert" in params:
            result["PGSSLROOTCERT"] = "system"
        if not target:
            result["PGOPTIONS"] += " -c default_transaction_read_only=on"
        return result
    except (ValueError, TypeError):
        raise BackupError("Check both GitHub database secrets: use a PostgreSQL URI, URL-encode password characters, and require TLS.") from None


def ident(value):
    return '"' + value.replace('"', '""') + '"'


def literal(value):
    return "'" + value.replace("'", "''") + "'"


# Compare object identities, not owners/ACLs: the destination has managed roles.
INVENTORY_SQL = """
SELECT jsonb_build_object(
 'relations', COALESCE((SELECT jsonb_agg(relkind::text || ':' || relname ORDER BY relkind,relname)
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','i','I','f')), '[]'::jsonb),
 'functions', COALESCE((SELECT jsonb_agg(proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' ORDER BY proname,pg_get_function_identity_arguments(p.oid))
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'), '[]'::jsonb),
 'triggers', COALESCE((SELECT jsonb_agg(c.relname || ':' || t.tgname ORDER BY c.relname,t.tgname)
   FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND NOT t.tgisinternal), '[]'::jsonb),
 'types', COALESCE((SELECT jsonb_agg(t.typname ORDER BY t.typname) FROM pg_type t
   JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype IN ('e','d')), '[]'::jsonb),
 'policies', COALESCE((SELECT jsonb_agg(tablename || ':' || policyname ORDER BY tablename,policyname)
   FROM pg_policies WHERE schemaname='public'), '[]'::jsonb)
)::text;
"""
EMPTY_GUARD = """
DO $guard$ BEGIN
 IF EXISTS(SELECT FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f'))
 OR EXISTS(SELECT FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public')
 OR EXISTS(SELECT FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype IN ('e','d'))
 THEN RAISE EXCEPTION 'Target public schema is not empty; refusing to overwrite it'; END IF;
END $guard$;
"""
PRIVACY_SQL = """
REVOKE ALL ON SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;
"""


class Tools:
    def __init__(self, env, directory, major=18):
        self.env, self.directory, self.major = env, directory, major

    def command(self, args, name):
        return ["docker", "run", "--rm", "--name", name, "-i", "--read-only",
                "--user", f"{os.getuid()}:{os.getgid()}",
                "--tmpfs", "/tmp:rw,nosuid,noexec,size=64m",
                "--volume", f"{self.directory}:/backup",
                *[item for key in self.env for item in ("--env", key)],
                f"postgres:{self.major}-bookworm", *args]

    def stop(self, name):
        subprocess.run(["docker", "rm", "-f", name], stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL, check=False)

    def run(self, args, sql=None, phase="database command", timeout=1200):
        name = "tea-backup-" + uuid.uuid4().hex
        try:
            result = subprocess.run(self.command(args, name), input=sql, text=True,
                                    capture_output=True, timeout=timeout,
                                    env={**os.environ, **self.env})
            if result.returncode:
                # Only emit known fixed diagnostics; never echo raw provider errors.
                for needle, message in (
                    ("Target public schema is not empty", "Supabase public schema is not empty. This initial backup refuses to overwrite existing data."),
                    ("password authentication failed", "Database authentication failed. Check the GitHub secret's username and URL-encoded password."),
                    ("does not support SSL", "A database endpoint does not support the required TLS connection. Review its SSL configuration before transferring."),
                    ("could not translate host name", "Database hostname lookup failed. Check Railway's current public proxy and Supabase's Session pooler URI."),
                    ("Restored row counts differ", "Restore row verification failed; the target restore transaction rolled back."),
                    ("Restored objects differ", "Restore object verification failed; the target restore transaction rolled back."),
                ):
                    if needle in result.stderr:
                        raise BackupError(message)
                # Provider errors/COPY contexts can contain customer data or secrets.
                raise BackupError(f"Failed during {phase}. Database output is withheld from logs. Check connectivity, credentials, permissions and schema compatibility; no overwrite is attempted.")
            return result.stdout
        except subprocess.TimeoutExpired:
            self.stop(name)
            raise BackupError(f"Timed out during {phase}; the database connection was closed.") from None

    def sql(self, sql, phase="preflight"):
        return self.run(["psql", "-XAtq", "--set=ON_ERROR_STOP=1"], sql, phase)


class Snapshot:
    """Keep one read-only transaction alive for pg_dump and all source counts."""
    def __init__(self, tools):
        self.tools, self.name = tools, "tea-snapshot-" + uuid.uuid4().hex
        self.errors = tempfile.TemporaryFile()
        self.process = subprocess.Popen(
            tools.command(["psql", "-XAtq", "--set=ON_ERROR_STOP=1"], self.name),
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=self.errors,
            env={**os.environ, **tools.env}, bufsize=0)
        self.buffer = b""
        self.selector = selectors.DefaultSelector()
        self.selector.register(self.process.stdout, selectors.EVENT_READ)

    def query(self, sql):
        marker = "DONE_" + uuid.uuid4().hex
        try:
            self.process.stdin.write((sql + "\n\\echo " + marker + "\n").encode())
        except BrokenPipeError:
            raise BackupError("The source snapshot connection ended.") from None
        deadline, lines = time.monotonic() + 150, []
        while time.monotonic() < deadline:
            if b"\n" not in self.buffer:
                if not self.selector.select(timeout=1):
                    continue
                data = os.read(self.process.stdout.fileno(), 65536)
                if not data:
                    raise BackupError("The source snapshot query failed; database details are withheld from logs.")
                self.buffer += data
            while b"\n" in self.buffer:
                line, self.buffer = self.buffer.split(b"\n", 1)
                text = line.decode().strip()
                if text == marker:
                    return lines
                if text:
                    lines.append(text)
        raise BackupError("Timed out while reading the consistent source snapshot.")

    def close(self):
        self.tools.stop(self.name)
        try:
            self.process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait()
        self.selector.close()
        self.errors.close()
        self.process.stdin.close()
        self.process.stdout.close()


def verification_sql(inventory, counts):
    sql = "DO $verify$ DECLARE actual bigint; BEGIN\n"
    for table, expected in counts.items():
        sql += f"SELECT COUNT(*) INTO actual FROM public.{ident(table)};\n"
        sql += f"IF actual <> {expected} THEN RAISE EXCEPTION 'Restored row counts differ'; END IF;\n"
    sql += "END $verify$;\n"
    query = INVENTORY_SQL.strip().removeprefix("SELECT ").removesuffix(";")
    expected = literal(json.dumps(inventory))
    sql += f"DO $objects$ BEGIN IF ({query})::jsonb <> {expected}::jsonb THEN RAISE EXCEPTION 'Restored objects differ'; END IF; END $objects$;\n"
    return sql


def transfer(source, target, directory):
    if (source["PGHOST"], source["PGPORT"], source["PGDATABASE"]) == (target["PGHOST"], target["PGPORT"], target["PGDATABASE"]):
        raise BackupError("Source and target are the same database.")
    source_tools, target_tools = Tools(source, directory), Tools(target, directory)
    source_major = int(source_tools.sql("SHOW server_version_num;").strip()) // 10000
    target_major = int(target_tools.sql("SHOW server_version_num;").strip()) // 10000
    if source_major not in range(14, 19) or target_major < source_major:
        raise BackupError("Use a supported PostgreSQL 14–18 source and a Supabase target of the same or newer major version.")
    source_tools.major = target_tools.major = source_major
    print(f"Preflight: PostgreSQL {source_major} source → PostgreSQL {target_major} target.", flush=True)
    target_tools.sql(EMPTY_GUARD, "empty-target check")
    roles = target_tools.sql("SELECT COUNT(*) FROM pg_roles WHERE rolname IN ('anon','authenticated');").strip()
    if roles != "2":
        raise BackupError("The target does not have the expected Supabase API roles.")
    snapshot = Snapshot(source_tools)
    try:
        snapshot.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL idle_in_transaction_session_timeout='25min';")
        snapshot_id = snapshot.query("SELECT pg_export_snapshot();")[0]
        if not re.fullmatch(r"[0-9A-Fa-f]+-[0-9A-Fa-f]+-\d+", snapshot_id):
            raise BackupError("The exported snapshot could not be verified.")
        extensions = json.loads(snapshot.query("SELECT COALESCE(json_agg(extname),'[]'::json) FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE n.nspname='public';")[0])
        if extensions:
            raise BackupError("The source has public-schema extensions; review their Supabase installation/schema compatibility before transferring.")
        inventory = json.loads(snapshot.query(INVENTORY_SQL)[0])
        if any(item.startswith("f:") for item in inventory["relations"]):
            raise BackupError("Foreign tables require a separate backup plan.")
        tables = [item[2:] for item in inventory["relations"] if item[:2] in ("r:", "p:")]
        if "users" not in tables or "orders" not in tables:
            raise BackupError("The source is missing the expected application tables.")
        counts = {}
        for table in tables:
            counts[table] = int(snapshot.query(f"SELECT COUNT(*) FROM public.{ident(table)};")[0])
        print(f"Dumping one read-only snapshot: {len(tables)} application tables.", flush=True)
        source_tools.run(["pg_dump", "--format=custom", "--schema=public", "--no-owner", "--no-acl", "--lock-wait-timeout=10s", f"--snapshot={snapshot_id}", "--file=/backup/application.dump"], phase="source dump")
    finally:
        snapshot.close()

    listing = source_tools.run(["pg_restore", "--list", "/backup/application.dump"], phase="archive inspection")
    # Supabase already owns public. Preserve that managed schema and never clean it.
    entries = [line for line in listing.splitlines() if not re.match(r"^\d+;\s+\d+\s+\d+\s+SCHEMA\s+-\s+public(?:\s|$)", line)]
    (directory / "restore.list").write_text("\n".join(entries) + "\n")
    source_tools.run(["pg_restore", "--no-owner", "--no-acl", "--use-list=/backup/restore.list", "--file=/backup/restore.sql", "/backup/application.dump"], phase="restore preparation")
    with (directory / "transaction.sql").open("w") as script:
        script.write("BEGIN;\nSET LOCAL statement_timeout='20min';\n")
        script.write("DO $lock$ BEGIN IF NOT pg_try_advisory_xact_lock(71304257) THEN RAISE EXCEPTION 'Another backup is running'; END IF; END $lock$;\n")
        script.write(EMPTY_GUARD)
        script.write("\\i /backup/restore.sql\n")
        script.write(PRIVACY_SQL)
        script.write(verification_sql(inventory, counts))
        script.write("COMMIT;\n")
    print("Restoring and verifying in one target transaction; no app connection is changed.", flush=True)
    target_tools.run(["psql", "-Xq", "--set=ON_ERROR_STOP=1", "--file=/backup/transaction.sql"], phase="transactional restore/verification")
    print("Backup verified and committed. Railway remains primary. No dump artifact was uploaded.", flush=True)


def main():
    os.umask(0o077)
    try:
        source = connection(os.environ.get("RAILWAY_BACKUP_SOURCE_URL", ""))
        target = connection(os.environ.get("SUPABASE_BACKUP_TARGET_URL", ""), target=True)
        with tempfile.TemporaryDirectory(prefix="tea-backup-") as temporary:
            transfer(source, target, Path(temporary))
    except (BackupError, OSError, ValueError, json.JSONDecodeError):
        # Do not print raw exceptions, subprocess output, connection URIs or data.
        error = sys.exc_info()[1]
        print(str(error) if isinstance(error, BackupError) else "Backup failed before completion. Check the workflow setup and database access; credentials/data were not printed.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
