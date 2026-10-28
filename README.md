# E-Commerce-Project

## Project structure

- `backend/`: Spring Boot backend, Maven configuration, and Maven wrapper.
- `Frontend/ecom-frontend/`: React frontend.

## Run the backend

From the repository root on Windows:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

On macOS or Linux, run `./mvnw spring-boot:run` inside `backend`.
Set `DB_PASSWORD`, `JWT_SECRET`, and `STRIPE_SECRET_KEY` in your environment before starting the backend. Configure the database connection and image URL in `backend/src/main/resources/application.properties` for your environment.

## Run the frontend

From the repository root:

```powershell
cd Frontend/ecom-frontend
npm install
Copy-Item .env.example .env
npm run dev
```

On macOS or Linux, use `cp .env.example .env` to create the environment file.
