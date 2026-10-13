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
Configure the backend database and application settings before starting it.

## Run the frontend

From the repository root:

```powershell
cd Frontend/ecom-frontend
npm install
Copy-Item .env.example .env
npm run dev
```

On macOS or Linux, use `cp .env.example .env` to create the environment file.
