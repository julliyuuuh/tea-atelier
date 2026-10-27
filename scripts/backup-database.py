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
    label = "NEON_BACKUP_TARGET_URL" if target else "RAILWAY_BACKUP_SOURCE_URL"

    def invalid(message):
        # Fixed messages only: never include the URI, password or parse exception.
        raise BackupError(f"{label}: {message}")

    if not isinstance(value, str) or not value.strip():
        invalid("Secret is missing or empty. Add it under repository Actions secrets, not Variables.")
    value = value.strip()
    if any(c in value for c in "\r\n\x00"):
        invalid("The URI contains a line break/control character. Paste a single-line connection URI.")
    if not value.startswith(("postgresql://", "postgres://")):
        invalid("Paste only the PostgreSQL URI beginning postgresql:// or postgres://, without psql, quotes or a variable-name prefix.")
    if "YOUR-PASSWORD" in unquote(value).upper():
        invalid("Replace [YOUR-PASSWORD] with the saved database password, without brackets; URL-encode special characters in the password.")
    try:
        url = urlsplit(value)
        if url.fragment:
            invalid("The URI contains a fragment (#). A # inside the password must be URL-encoded as %23.")
        port = url.port if url.port is not None else 5432
        host = url.hostname
        username = unquote(url.username or "")
        password = unquote(url.password or "")
    except (ValueError, TypeError):
        invalid("The URI cannot be parsed. Recopy it from Connect/Variables and URL-encode password characters; do not paste a shell command.")
    if not host or not username or not password:
        invalid("The URI needs a username, password and hostname. Recopy the database connection URI and insert the URL-encoded password.")
    if not url.path.strip("/"):
        invalid("The URI is missing its database name after the hostname/port.")
    if not 1 <= port <= 65535:
        invalid("The URI's database port is invalid; recopy the current connection URI.")
    try:
        params = parse_qs(url.query, strict_parsing=True, keep_blank_values=True)
    except ValueError:
        invalid("The URI query string is malformed. Encode any ? or & inside the password, rather than changing the database connection options.")
    if any(len(values) != 1 for values in params.values()):
        invalid("The URI contains repeated connection options. Use a single value for each option.")
    if set(params) - {"sslmode", "sslrootcert", "connect_timeout", "channel_binding"}:
        invalid("The URI contains unsupported query options. Use the PostgreSQL connection URI, not a framework/client-library example.")
    sslmode = params.get("sslmode", ["require"])[0]
    if sslmode not in ("require", "verify-ca", "verify-full"):
        invalid("Use sslmode=require (or verify-ca/verify-full). This transfer will not use disable/prefer/allow TLS modes.")
    if "sslrootcert" in params and params["sslrootcert"] != ["system"]:
        invalid("Only sslrootcert=system is supported; a file path from your PC is not available on the runner.")
    if "channel_binding" in params and params["channel_binding"][0] not in ("require", "prefer", "disable"):
        invalid("channel_binding must be require, prefer or disable; TLS is still required independently.")
    if target:
        host = host.lower()
        if not host.endswith(".neon.tech"):
            invalid("Target must be the Neon database connection, not Railway or the old backup provider.")
        if host.split(".")[0].endswith("-pooler") or port != 5432:
            invalid("Use Neon's direct PostgreSQL URI on port 5432, with Connection pooling switched off. Dump/restore needs a direct connection.")
    elif host.endswith(".railway.internal"):
        invalid("Use Railway's current public TCP proxy URL; GitHub-hosted runners cannot reach its private hostname.")
    result = {
        "PGHOST": host, "PGPORT": str(port),
        "PGUSER": username, "PGPASSWORD": password,
        "PGDATABASE": unquote(url.path[1:]), "PGSSLMODE": sslmode,
        "PGCONNECT_TIMEOUT": "15", "PGAPPNAME": "tea-atelier-backup",
        "PGOPTIONS": "-c timezone=UTC -c statement_timeout=120000 -c lock_timeout=10000 -c standard_conforming_strings=on",
    }
    if "sslrootcert" in params:
        result["PGSSLROOTCERT"] = "system"
    if "channel_binding" in params:
        result["PGCHANNELBINDING"] = params["channel_binding"][0]
    if not target:
        result["PGOPTIONS"] += " -c default_transaction_read_only=on"
    return result


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
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC;
-- API roles are optional. A plain Neon PostgreSQL project does not need them.
DO $privacy$ DECLARE api_role text; BEGIN
 FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','anonymous','authenticated') LOOP
  EXECUTE format('REVOKE ALL ON SCHEMA public FROM %I', api_role);
  EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', api_role);
  EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', api_role);
  EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', api_role);
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', api_role);
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', api_role);
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', api_role);
 END LOOP;
END $privacy$;
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
                    ("Target public schema is not empty", "Neon public schema is not empty. This initial backup refuses to overwrite existing data."),
                    ("password authentication failed", "Database authentication failed. Check the GitHub secret's username and URL-encoded password."),
                    ("does not support SSL", "A database endpoint does not support the required TLS connection. Review its SSL configuration before transferring."),
                    ("could not translate host name", "Database hostname lookup failed. Check Railway's current public proxy and Neon's direct connection URI."),
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
    print(f"Preflight: Railway PostgreSQL {source_major} → Neon PostgreSQL {target_major}.", flush=True)
    if source_major not in range(14, 19):
        raise BackupError(f"Railway PostgreSQL {source_major} is outside this script's supported 14–18 range.")
    if target_major < source_major:
        raise BackupError(f"Neon PostgreSQL {target_major} is older than Railway PostgreSQL {source_major}. Select PostgreSQL {source_major} or newer for the backup project; the source will not be downgraded.")
    source_tools.major = target_tools.major = source_major
    target_tools.sql(EMPTY_GUARD, "empty-target check")
    snapshot = Snapshot(source_tools)
    try:
        snapshot.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL idle_in_transaction_session_timeout='25min';")
        snapshot_id = snapshot.query("SELECT pg_export_snapshot();")[0]
        if not re.fullmatch(r"[0-9A-Fa-f]+-[0-9A-Fa-f]+-\d+", snapshot_id):
            raise BackupError("The exported snapshot could not be verified.")
        extensions = json.loads(snapshot.query("SELECT COALESCE(json_agg(extname),'[]'::json) FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE n.nspname='public';")[0])
        if extensions:
            raise BackupError("The source has public-schema extensions; review their Neon installation/schema compatibility before transferring.")
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
    # The target database already owns public. Preserve its schema and never clean it.
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
        connections, errors = [], []
        for name, is_target in (("RAILWAY_BACKUP_SOURCE_URL", False), ("NEON_BACKUP_TARGET_URL", True)):
            try:
                connections.append(connection(os.environ.get(name, ""), target=is_target))
            except BackupError as error:
                errors.append(str(error))
        if errors:
            raise BackupError("\n".join(errors))
        source, target = connections
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
