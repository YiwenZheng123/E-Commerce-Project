import base64
import getpass
import os
from pathlib import Path
import secrets


db_password = getpass.getpass("ecom_app database password: ")
if not db_password:
    raise SystemExit("The database password is required.")

stripe_key = getpass.getpass("Stripe sk_test_ secret key (Enter to configure later): ")
if stripe_key and not stripe_key.startswith("sk_test_"):
    raise SystemExit("Use a Stripe sandbox key beginning with sk_test_.")
paypal_id = getpass.getpass("PayPal sandbox client ID (Enter to configure later): ")
paypal_secret = getpass.getpass("PayPal sandbox client secret (Enter to configure later): ")
if bool(paypal_id) != bool(paypal_secret):
    raise SystemExit("Provide both PayPal sandbox credentials, or leave both empty.")

values = {
    "SPRING_PROFILES_ACTIVE": "prod",
    "ECOM_DB_URL": "jdbc:postgresql://ecom-db.cxyigu6mcmfj.us-east-2.rds.amazonaws.com:5432/ecommerce"
                   "?sslmode=verify-full&sslrootcert=/home/ec2-user/us-east-2-bundle.pem",
    "ECOM_DB_USERNAME": "ecom_app",
    "ECOM_DB_PASSWORD": db_password,
    "ECOM_JWT_SECRET": base64.b64encode(secrets.token_bytes(64)).decode("ascii"),
    "ECOM_PUBLIC_URL": "https://52.15.49.45",
    "STRIPE_SECRET_KEY": stripe_key,
    "PAYPAL_CLIENT_ID": paypal_id,
    "PAYPAL_CLIENT_SECRET": paypal_secret,
}
env_path = Path.home() / "ecom" / "app.env"
descriptor = os.open(env_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(descriptor, "w", encoding="utf-8") as env_file:
    for name, value in values.items():
        escaped = value.replace("\\", "\\\\").replace('"', '\\"')
        env_file.write(f'{name}="{escaped}"\n')

print(f"Created {env_path} with owner-only permissions.")
print(f"Sandbox keys configured: Stripe={bool(stripe_key)}, PayPal={bool(paypal_id)}")
