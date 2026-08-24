# CareerFit IT AutoPilot

CareerFit IT AutoPilot is a full-stack platform for IT recruitment. It helps candidates compare CVs with job descriptions, discover suitable jobs, and manage applications; recruiters can manage jobs and review matching candidates; administrators can monitor and moderate the system.

The project is designed for local development, reproducible demonstrations, and production-like Docker deployment.

## Technology

```text
React 18 + TypeScript + Vite
            |
            | REST API (/api)
            v
Spring Boot 3 + Java 21
            |
            v
PostgreSQL 16 + Flyway migrations
```

The backend also uses PDFBox and Apache POI for document extraction, Tesseract for OCR, and TF-IDF/cosine similarity with Rocchio feedback for job matching.

## What is included

- Candidate, recruiter, and administrator workspaces.
- CV upload (PDF, image, DOCX) and matching against job descriptions.
- Job recommendations, application workflow, feedback, audit history, and email actions.
- Docker Compose for PostgreSQL and an optional Docker backend with OCR.
- Seed data, tests, Maven Wrapper, and exact frontend dependency lockfile.

## Requirements

- Git 2.x
- Docker Desktop with Docker Compose v2
- Java 21 JDK
- Node.js 20.x and npm 10.x (or a compatible release)
- Optional for host-based OCR: Tesseract with Vietnamese and English language data

Check the installed tools:

```powershell
git --version
docker --version
docker compose version
java -version
node --version
npm --version
```

## Quick start (recommended)

These steps work from a new clone. Dependency folders such as `node_modules` are deliberately not committed; `npm ci` restores the exact frontend dependency tree from `package-lock.json`, and Maven Wrapper downloads backend dependencies automatically.

```powershell
git clone https://github.com/huuhungFam/CareerFit-IT-AutoPilot.git
cd CareerFit-IT-AutoPilot
Copy-Item .env.example .env
Copy-Item Frontend\.env.example Frontend\.env
docker compose up -d postgres
```

Then use two more terminals.

```powershell
# Terminal 2 — backend
cd Backend\careerfit-backend
.\mvnw.cmd spring-boot:run
```

```powershell
# Terminal 3 — frontend
cd Frontend
npm ci
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). The frontend proxies `/api` to the backend at `http://localhost:8080`.

The first backend start applies Flyway migrations and creates the local seed data. Verify service readiness with:

```powershell
curl.exe -i http://localhost:8080/actuator/health/readiness
```

## Docker backend and OCR

For a Dockerized backend (including Tesseract OCR), stop any backend already using port 8080 and run:

```powershell
docker compose --profile backend up -d --build
docker compose ps
```

Start the frontend as in the quick-start section:

```powershell
cd Frontend
npm ci
npm run dev
```

Useful commands:

```powershell
docker compose logs -f backend
docker compose stop
docker compose down
```

`docker compose down -v` also deletes the local database and uploaded CV storage. Use it only when a full local reset is intended.

## Demo data

The repository includes a deterministic demo-data reset script and a scraped-job import dataset. It resets the Compose project's local volumes, so it is destructive to this project's local demo data:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts\reset-local-demo-data.ps1 -Force
```

Use the development/demo accounts shown by the application only for local demonstrations. Replace or disable all demo accounts before a real deployment.

## Tests and builds

```powershell
# Backend
cd Backend\careerfit-backend
.\mvnw.cmd test
.\mvnw.cmd -DskipTests package
```

```powershell
# Frontend
cd Frontend
npm ci
npm run type-check
npm run lint
npm run build
```

Some backend integration tests use Testcontainers, so Docker Desktop must be running.

## Configuration and secrets

Start from the checked-in examples only:

- `.env.example` for local Docker/development settings.
- `Frontend/.env.example` for the Vite frontend.
- `.env.prod.example` for production-like deployment.

Copy values into local-only files (`.env`, `Frontend/.env`, or `.env.prod`) and never commit them. The local-only [PRIVATE_CONFIGURATION.md](PRIVATE_CONFIGURATION.md) explains each sensitive setting and exactly where to place it for local, SMTP, and production runs.

For production-like Docker Compose, create `.env.prod` from the example and pass it explicitly:

```powershell
Copy-Item .env.prod.example .env.prod
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

Before exposing a deployment publicly: set strong database and JWT credentials, use a real domain and HTTPS, restrict CORS, configure backups and external storage, and remove demo credentials/data.

## Project documentation

The `project-documentation` branch contains the thesis, architecture, test evidence, defense materials, and operational documents. The `main` branch contains the runnable application.

```powershell
git fetch origin project-documentation
git switch project-documentation
```

## License and data handling

This is a graduation-thesis project. Do not upload real CVs, personal data, API keys, SMTP app passwords, private keys, or production database credentials to a public repository.
