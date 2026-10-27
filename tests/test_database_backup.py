"""Pure safeguard tests: no credentials, network or database required."""
import contextlib
import io
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("database_backup", Path(__file__).resolve().parents[1] / "scripts/backup-database.py")
backup = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(backup)


class BackupSafeguards(unittest.TestCase):
    def test_missing_secrets_identify_the_exact_repository_secret(self):
        for target, name in ((False, "RAILWAY_BACKUP_SOURCE_URL"), (True, "NEON_BACKUP_TARGET_URL")):
            with self.subTest(target=target), self.assertRaises(backup.BackupError) as caught:
                backup.connection("", target=target)
            self.assertIn(name, str(caught.exception))
            self.assertIn("missing or empty", str(caught.exception))

    def test_outer_copy_whitespace_is_harmless(self):
        env = backup.connection("  postgresql://u:fixture@db.example.test/db\n")
        self.assertEqual(env["PGDATABASE"], "db")

    def test_password_fragment_error_is_specific_without_printing_password(self):
        with self.assertRaises(backup.BackupError) as caught:
            backup.connection("postgresql://u:private#value@db.example.test/db")
        self.assertIn("fragment", str(caught.exception))
        self.assertNotIn("private", str(caught.exception))
        self.assertNotIn("postgresql://u:", str(caught.exception))

    def test_placeholder_explains_password_replacement(self):
        with self.assertRaises(backup.BackupError) as caught:
            backup.connection("postgresql://neondb_owner:[YOUR-PASSWORD]@ep-example.ap-southeast-1.aws.neon.tech/postgres", target=True)
        self.assertIn("NEON_BACKUP_TARGET_URL", str(caught.exception))
        self.assertIn("Replace [YOUR-PASSWORD]", str(caught.exception))

    def test_shell_command_and_variable_prefixes_have_a_clear_error(self):
        for value in ("psql 'postgresql://u:fixture@db.example.test/db'", "DATABASE_URL=postgresql://u:fixture@db.example.test/db"):
            with self.subTest(value=value), self.assertRaises(backup.BackupError) as caught:
                backup.connection(value)
            self.assertIn("Paste only", str(caught.exception))
            self.assertNotIn("fixture", str(caught.exception))

    def test_main_reports_both_invalid_secrets_without_connecting(self):
        output = io.StringIO()
        with patch.dict(backup.os.environ, {"RAILWAY_BACKUP_SOURCE_URL": "", "NEON_BACKUP_TARGET_URL": ""}), patch.object(backup, "transfer") as transfer, contextlib.redirect_stderr(output):
            self.assertEqual(backup.main(), 1)
            transfer.assert_not_called()
        self.assertIn("RAILWAY_BACKUP_SOURCE_URL", output.getvalue())
        self.assertIn("NEON_BACKUP_TARGET_URL", output.getvalue())

    def test_encoded_password_and_neon_owner_are_preserved(self):
        env = backup.connection("postgresql://neondb_owner:p%40ss%3Aword@ep-example.ap-southeast-1.aws.neon.tech:5432/postgres", target=True)
        self.assertEqual(env["PGPASSWORD"], "p@ss:word")
        self.assertEqual(env["PGUSER"], "neondb_owner")
        self.assertEqual(env["PGSSLMODE"], "require")
        self.assertNotIn("default_transaction_read_only", env["PGOPTIONS"])

    def test_neon_channel_binding_is_preserved_with_required_tls(self):
        env = backup.connection("postgresql://neondb_owner:fixture@ep-example.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require", target=True)
        self.assertEqual(env["PGCHANNELBINDING"], "require")
        self.assertEqual(env["PGSSLMODE"], "require")

    def test_invalid_channel_binding_is_refused(self):
        with self.assertRaises(backup.BackupError):
            backup.connection("postgresql://u:fixture@db.example.test/db?channel_binding=unknown")

    def test_old_provider_is_refused_as_neon_target(self):
        with self.assertRaises(backup.BackupError):
            backup.connection("postgresql://postgres:fixture@aws.pooler.supabase.com/postgres", target=True)

    def test_source_connections_are_read_only(self):
        env = backup.connection("postgresql://postgres:fixture@fixture.proxy.rlwy.net:12345/railway")
        self.assertIn("default_transaction_read_only=on", env["PGOPTIONS"])

    def test_disabled_tls_or_ambiguous_parameters_are_refused(self):
        for query in ("sslmode=disable", "sslmode=prefer", "sslmode=require&sslmode=disable", "options=unsafe"):
            with self.subTest(query=query), self.assertRaises(backup.BackupError):
                backup.connection("postgresql://u:fixture@db.example.test/db?" + query)

    def test_target_must_be_neon_and_not_a_pooler(self):
        for uri in ("postgresql://u:fixture@fixture.proxy.rlwy.net/db", "postgresql://u:fixture@evil-neon.tech/db", "postgresql://u:fixture@ep-example-pooler.ap-southeast-1.aws.neon.tech:5432/neondb", "postgresql://u:fixture@ep-example.ap-southeast-1.aws.neon.tech:6543/neondb", "postgresql://u:fixture@ep-example.neon.tech.evil.test/neondb"):
            with self.subTest(uri=uri), self.assertRaises(backup.BackupError):
                backup.connection(uri, target=True)

    def test_missing_or_placeholder_credentials_and_private_source_are_refused(self):
        for uri in ("", "postgresql://u@db.example.test/db", "postgresql://u:[YOUR-PASSWORD]@db.example.test/db", "postgresql://u:fixture@postgres.railway.internal/railway"):
            with self.subTest(uri=uri), self.assertRaises(backup.BackupError):
                backup.connection(uri)

    def test_credentials_are_not_command_arguments(self):
        env = backup.connection("postgresql://u:p%40ss@db.example.test/db")
        with tempfile.TemporaryDirectory() as temporary:
            tools = backup.Tools(env, Path(temporary), 17)
            command = tools.command(["psql", "-XAtq"], "fixture")
            self.assertNotIn("p@ss", " ".join(command))
            self.assertNotIn("postgresql://", " ".join(command))
            self.assertIn("PGPASSWORD", command)

    def test_identifier_and_literal_quoting(self):
        self.assertEqual(backup.ident('odd"table'), '"odd""table"')
        self.assertEqual(backup.literal("a'b"), "'a''b'")

    def test_verification_requires_counts_and_objects(self):
        sql = backup.verification_sql({"relations": ['r:odd"table']}, {'odd"table': 3})
        self.assertIn('public."odd""table"', sql)
        self.assertIn("actual <> 3", sql)
        self.assertIn("Restored objects differ", sql)

    def test_older_target_is_refused_before_dump_or_restore(self):
        source = backup.connection("postgresql://u:fixture@db.example.test/source")
        target = backup.connection("postgresql://u:fixture@db.example.test/target")
        with patch.object(backup, "Tools") as tools, tempfile.TemporaryDirectory() as temporary:
            tools.return_value.sql.side_effect = ["180000", "170000"]
            with self.assertRaises(backup.BackupError):
                backup.transfer(source, target, Path(temporary))
            tools.return_value.run.assert_not_called()

    def test_source_and_target_equality_refuses_before_any_command(self):
        env = backup.connection("postgresql://u:fixture@db.example.test/db")
        with patch.object(backup, "Tools") as tools, tempfile.TemporaryDirectory() as temporary:
            with self.assertRaises(backup.BackupError):
                backup.transfer(env, env.copy(), Path(temporary))
            tools.assert_not_called()

    def test_privacy_targets_only_application_schema(self):
        self.assertIn("REVOKE ALL ON SCHEMA public FROM PUBLIC;", backup.PRIVACY_SQL)
        self.assertIn("rolname IN ('anon','anonymous','authenticated')", backup.PRIVACY_SQL)
        self.assertNotIn("SCHEMA auth", backup.PRIVACY_SQL)
        self.assertNotIn("SCHEMA storage", backup.PRIVACY_SQL)
        self.assertNotIn("DROP", backup.EMPTY_GUARD)

    def test_raw_database_errors_are_not_logged(self):
        env = backup.connection("postgresql://u:fixture@db.example.test/db")
        response = type("Result", (), {"returncode": 1, "stderr": "ERROR: customer-private-value", "stdout": ""})()
        with tempfile.TemporaryDirectory() as temporary, patch.object(backup.subprocess, "run", return_value=response):
            with self.assertRaises(backup.BackupError) as caught:
                backup.Tools(env, Path(temporary)).sql("SELECT 1")
            self.assertNotIn("customer-private-value", str(caught.exception))


if __name__ == "__main__":
    unittest.main()
