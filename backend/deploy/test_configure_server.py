import base64
import os
from pathlib import Path
import runpy
import stat
import tempfile
import unittest
from unittest.mock import patch


class ServerConfigurationTest(unittest.TestCase):
    def test_writes_private_production_configuration_and_preserves_password_characters(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            (home / "ecom").mkdir()
            password = 'spaces $dollar "quotes" \\backslash #hash café'
            with patch("pathlib.Path.home", return_value=home), patch(
                "getpass.getpass", side_effect=[password, "sk_test_dummy", "paypal-id", "paypal-secret"]
            ):
                runpy.run_path(str(Path(__file__).with_name("configure-server.py")))

            env_path = home / "ecom" / "app.env"
            contents = env_path.read_text(encoding="utf-8")
            self.assertIn('ECOM_DB_PASSWORD="spaces $dollar \\"quotes\\" \\\\backslash #hash café"\n', contents)
            self.assertIn('SPRING_PROFILES_ACTIVE="prod"\n', contents)
            self.assertIn('ECOM_DB_USERNAME="ecom_app"\n', contents)
            secret_line = next(line for line in contents.splitlines() if line.startswith("ECOM_JWT_SECRET="))
            self.assertEqual(64, len(base64.b64decode(secret_line.split('"')[1])))
            if os.name != "nt":
                self.assertEqual(0o600, stat.S_IMODE(env_path.stat().st_mode))

    def test_rejects_missing_database_password_live_stripe_key_and_partial_paypal_credentials(self):
        for answers in ([""], ["password", "sk_live_dummy"], ["password", "", "paypal-id", ""]):
            with self.subTest(answers=answers), patch("getpass.getpass", side_effect=answers):
                with self.assertRaises(SystemExit):
                    runpy.run_path(str(Path(__file__).with_name("configure-server.py")))


if __name__ == "__main__":
    unittest.main()
