"""Pure safeguard tests: no credentials, network or database required."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("database_backup", Path(__file__).resolve().parents[1] / "scripts/backup-database.py")
backup = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(backup)


class BackupSafeguards(unittest.TestCase):
    def test_encoded_password_and_pooler_user_are_preserved(self):
        env = backup.connection("postgresql://postgres.project:p%40ss%3Aword@aws-0-example.pooler.supabase.com:5432/postgres", target=True)
        self.assertEqual(env["PGPASSWORD"], "p@ss:word")
        self.assertEqual(env["PGUSER"], "postgres.project")
        self.assertEqual(env["PGSSLMODE"], "require")
        self.assertNotIn("default_transaction_read_only", env["PGOPTIONS"])

    def test_source_connections_are_read_only(self):
        env = backup.connection("postgresql://postgres:fixture@fixture.proxy.rlwy.net:12345/railway")
        self.assertIn("default_transaction_read_only=on", env["PGOPTIONS"])

    def test_disabled_tls_or_ambiguous_parameters_are_refused(self):
        for query in ("sslmode=disable", "sslmode=prefer", "sslmode=require&sslmode=disable", "options=unsafe"):
            with self.subTest(query=query), self.assertRaises(backup.BackupError):
                backup.connection("postgresql://u:fixture@db.example.test/db?" + query)

    def test_target_must_be_supabase_and_not_transaction_pooler(self):
        for uri in ("postgresql://u:fixture@fixture.proxy.rlwy.net/db", "postgresql://u:fixture@evil-supabase.com/db", "postgresql://u:fixture@aws.pooler.supabase.com:6543/postgres"):
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
        self.assertIn("REVOKE ALL ON SCHEMA public FROM PUBLIC, anon, authenticated", backup.PRIVACY_SQL)
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
