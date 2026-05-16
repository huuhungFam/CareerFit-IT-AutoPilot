# CareerFit Backend

Spring Boot 3.x + Java 21 backend cho hệ thống CareerFit IT AutoPilot.

## Yêu cầu

- Java 21
- Maven 3.9+ (có thể dùng `C:\tools\maven\apache-maven-3.9.9\bin\mvn`)
- Docker Desktop (để chạy PostgreSQL)

## Khởi động nhanh

**Bước 1: Khởi động PostgreSQL**
```powershell
# Từ thư mục gốc c:\CODING\Thesis
docker compose up -d
```

**Bước 2: Chạy Backend**
```powershell
cd Backend\careerfit-backend
$env:PATH = "C:\tools\maven\apache-maven-3.9.9\bin;$env:PATH"
mvn spring-boot:run
```

Backend khởi động tại: `http://localhost:8080`
Swagger UI: `http://localhost:8080/swagger-ui.html`

## Build

```powershell
$env:PATH = "C:\tools\maven\apache-maven-3.9.9\bin;$env:PATH"
mvn compile        # compile only
mvn package -DskipTests  # build JAR
```

## Cấu trúc Package

```
com.careerfit.backend
├── auth/           # Đăng ký, đăng nhập, JWT, passwordless
├── candidate/      # Hồ sơ candidate, preferences
├── cv/             # Upload CV, manual CV, multi-CV
├── job/            # Job CRUD, search, suggestions
├── employer/       # Employer profile
├── matching/       # CV-JD cosine similarity scoring
├── recommendation/ # Job recommendation cho candidate
├── application/    # Application tracking
├── feedback/       # Rocchio feedback learning
├── automation/     # AutoFit policy, email action, token
├── notification/   # Email sender, digest, scheduler
├── audit/          # Audit log
├── analytics/      # Job market analytics
├── common/         # Exception, response envelope, utils
└── config/         # Security, async, Jackson config
```

## API Endpoints đã implement (Phase 1)

| Method | Path | Mô tả |
|--------|------|-------|
| POST | /api/auth/register | Đăng ký (CANDIDATE / RECRUITER) |
| POST | /api/auth/login | Đăng nhập email/password |
| POST | /api/auth/passwordless/request | Yêu cầu magic-link |
| GET  | /api/auth/passwordless/verify?token=... | Xem thông tin token |
| POST | /api/auth/passwordless/verify | Verify token → JWT |
| GET  | /api/auth/me | Thông tin user hiện tại |

## Database

- Primary: PostgreSQL (Docker Compose)
- Migration: Flyway tự động chạy khi khởi động
- File CV: local filesystem `./storage/cv`

## Các biến môi trường

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `JWT_SECRET` | dev-secret (32+ chars) | JWT signing key |
| `MAIL_HOST` | smtp.gmail.com | Mail server |
| `MAIL_USERNAME` | no-reply@careerfit.dev | Sender email |
| `MAIL_PASSWORD` | (empty) | Mail password |
| `APP_BASE_URL` | http://localhost:8080 | Base URL for magic links |
| `CORS_ORIGINS` | http://localhost:5173 | Allowed CORS origins |
