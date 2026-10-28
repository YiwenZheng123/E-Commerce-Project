# E-Commerce Project

A full-stack e-commerce application with a React storefront and a Spring Boot API. Customers can browse products, manage a cart and addresses, and complete a Stripe checkout. Admins and sellers use a dashboard to manage products and orders.

## Features

- Browse products by category or keyword, with sorting and pagination.
- Register and sign in with JWT-based authentication.
- Add products to a cart and choose a shipping address at checkout.
- Pay through Stripe or PayPal Sandbox and view a payment confirmation.
- Manage a username, password, profile photo, and shipping addresses from the profile page.
- Manage categories, products, sellers, orders, and analytics from the admin dashboard.
- Use seller product and order views in the dashboard.

## Tech stack

| Frontend | Backend |
| --- | --- |
| React, Vite, React Router | Java 17, Spring Boot |
| Redux Toolkit, Axios | Spring Security, JWT |
| Tailwind CSS, Material UI, Headless UI | Spring Data JPA, PostgreSQL |
| React Hook Form, Stripe.js | Stripe Java SDK, Maven |

## Project structure

```text
E-Commerce-Project/
├── backend/                     # Spring Boot API and Maven wrapper
│   └── src/main/java/com/ecommerce/project/
│       ├── controller/          # HTTP endpoints
│       ├── model/               # JPA entities
│       ├── payload/             # Request and response objects
│       ├── repositories/        # Database queries
│       ├── security/            # JWT authentication and security configuration
│       └── service/             # Business logic
└── Frontend/ecom-frontend/     # React application
    └── src/
        ├── components/          # Storefront, checkout, profile, and dashboard UI
        ├── hooks/               # Filtering and pagination hooks
        ├── store/               # Redux actions and reducers
        └── api/                 # Axios configuration
```

## Getting started

### Requirements

- Java 17 or later
- Node.js 20.19 or later within 20.x, or 22.12 or later, and npm
- PostgreSQL
- A Stripe account with test API keys for checkout

The Maven wrapper included in `backend/` downloads the required Maven version.

### 1. Clone the repository

```bash
git clone https://github.com/YiwenZheng123/E-Commerce-Project.git
cd E-Commerce-Project
```

### 2. Configure the database and backend

Create a PostgreSQL database named `ecommerce`. The default connection uses `localhost:5432` and the `postgres` user. Update `backend/src/main/resources/application.properties` if your local database settings differ. Hibernate is configured with `ddl-auto=update` for development.

Set the following environment variables in the terminal that starts the backend, or in your IDE run configuration:

| Variable | Purpose |
| --- | --- |
| `DB_PASSWORD` | PostgreSQL password |
| `JWT_SECRET` | Base64-encoded signing key; use at least 32 random bytes before encoding |
| `STRIPE_SECRET_KEY` | Stripe secret key; use a test key for development |
| `PAYPAL_CLIENT_ID` | PayPal sandbox app Client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal sandbox app Secret |

For example, in PowerShell:

```powershell
$env:DB_PASSWORD = "your-database-password"
$jwtBytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($jwtBytes)
$rng.Dispose()
$env:JWT_SECRET = [Convert]::ToBase64String($jwtBytes)
$env:STRIPE_SECRET_KEY = "your-stripe-test-secret-key"
cd backend
.\mvnw.cmd spring-boot:run
```

Keep the same JWT key between restarts if existing login sessions should remain valid. On macOS or Linux, set the equivalent environment variables and run `./mvnw spring-boot:run` from `backend/`.

The backend defaults to `http://localhost:8080`. Its CORS setting uses `frontend.url`, and image URLs use `image.base.url`; update both properties if your frontend or backend uses a different address. Uploaded product images and profile photos are stored in the backend's local `images/` directory and served under `/images/`.

### 3. Configure and start the frontend

In a second terminal:

```powershell
cd Frontend/ecom-frontend
npm install
Copy-Item .env.example .env
```

On macOS or Linux, use `cp .env.example .env` instead. Edit `.env`:

| Variable | Local example | Purpose |
| --- | --- | --- |
| `VITE_BACK_END_URL` | `http://localhost:8080` | Backend origin; the app adds `/api` |
| `VITE_FRONTEND_URL` | `http://localhost:5173` | Frontend origin used for the Stripe return URL |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Your Stripe test publishable key | Stripe payment form |
| `VITE_PAYPAL_CLIENT_ID` | Your PayPal sandbox Client ID | PayPal checkout buttons |

```bash
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`. Use matching Stripe test-mode keys on the frontend and backend. Do not put a Stripe secret key in a `VITE_` variable or commit local `.env` files.

## Application routes

| Route | Page |
| --- | --- |
| `/` | Home |
| `/products` | Product catalog |
| `/cart` | Shopping cart |
| `/register`, `/login` | Account registration and sign-in |
| `/profile` | Account details, password, photo, and addresses |
| `/checkout`, `/order-confirm` | Checkout and payment confirmation |
| `/admin` | Admin analytics dashboard |
| `/admin/products`, `/admin/orders` | Product and order dashboard; also used by sellers |
| `/admin/categories`, `/admin/sellers` | Admin category and seller management |

The buyer's **My Orders** link is present in the menu, but its page is not yet implemented.

## API overview

The API uses the `/api` prefix. Sign-in sets a JWT cookie, and the frontend sends credentials with Axios requests.

| Area | Examples |
| --- | --- |
| Authentication | `POST /api/auth/signup`, `POST /api/auth/signin`, `POST /api/auth/signout` |
| Profile | `GET /api/auth/user`, `PUT /api/auth/profile`, `PUT /api/auth/password`, `PUT /api/auth/profile/avatar` |
| Catalog | `GET /api/public/products`, `GET /api/public/categories` |
| Addresses | `GET /api/users/addresses`, `POST /api/addresses`, `PUT /api/addresses/{addressId}` |
| Cart | `POST /api/carts/create`, `GET /api/carts/users/cart` |
| Checkout | `POST /api/order/stripe-client-secret`, `POST /api/order/users/payments/{paymentMethod}`, `POST /api/order/paypal`, `POST /api/order/paypal/{paypalOrderId}/capture` |
| Dashboard | `/api/admin/products`, `/api/admin/orders`, `/api/seller/products`, `/api/seller/orders` |

Product and order dashboard APIs support pagination. The backend page number is zero-based; the dashboard converts the displayed page number before making requests.

## PayPal sandbox checkout

PayPal checkout uses the sandbox environment and charges in USD.

### Configuration

1. In the PayPal Developer Dashboard, select **Sandbox** and create or select an app under **Apps & Credentials**. Use the Client ID and Secret from the same sandbox app.
2. Set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` as environment variables for the Spring Boot process, for example in the IntelliJ run configuration. The backend reads them through `paypal.client-id` and `paypal.client-secret` in `application.properties`.
3. Add `VITE_PAYPAL_CLIENT_ID` to `Frontend/ecom-frontend/.env` using the same sandbox Client ID. The frontend Client ID is public; keep the Secret on the backend and never add it to a `VITE_` variable.
4. Restart both servers after changing their environment variables.

The backend creates a PayPal order from the server-side cart and selected address. It calculates the amount as the cart subtotal plus 13% tax, then checks the capture status, currency, and amount before creating the application order. The endpoints are `POST /api/order/paypal` and `POST /api/order/paypal/{paypalOrderId}/capture`.

### Test a payment

1. In the Developer Dashboard, open **Testing Tools → Sandbox Accounts**. A Personal account represents the buyer; the Business account associated with the app represents the merchant.
2. Sign in to the application, add a product to the cart, select an address, and choose PayPal at checkout.
3. Check the amount in the PayPal window and approve the payment using the Personal sandbox account.
4. Sign in to [PayPal Sandbox](https://www.sandbox.paypal.com/) with the corresponding Business sandbox account and check **Activity / Recent Activity** for the transaction. The merchant's net amount may reflect fees.
5. Check the application order and cart as well. A successful PayPal API request alone does not prove that the application order was saved.

For request details, select **Sandbox → Event Logs → API Calls** in the Developer Dashboard. An order that has only been created and not approved is not a completed payment.

The implementation has passed mocked service tests and a sandbox order-creation check. A successful capture request was observed in the sandbox API log, but the complete browser-to-database checkout flow still needs verification. The existing Stripe path also requires payment verification and inventory-concurrency review before production use.

## Development commands

From `Frontend/ecom-frontend/`:

```bash
npm run dev      # Start the development server
npm run build    # Create a production build
npm run lint     # Run ESLint
npm run preview  # Preview the build
```

From `backend/`:

```powershell
.\mvnw.cmd test
```

On macOS or Linux, use `./mvnw test`. Some backend tests may need the configured PostgreSQL database and environment variables.

## Current limitations

- The project is intended for development and learning. Review authentication, authorization, payment verification, and data protection before deploying it publicly. In particular, the current signup flow accepts roles and startup code creates development accounts; seller mutation endpoints also need ownership checks.
- The seller dashboard currently uses `/admin/products` and `/admin/orders` as frontend routes, while its API requests use `/api/seller/...`.
- Default shipping addresses and a buyer order-history page are not yet implemented.
- Uploaded images are stored locally; old profile photos are not automatically removed when replaced.
