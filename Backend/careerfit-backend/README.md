# CareerFit Backend

Spring Boot 3.x + Java 21 backend cho hệ thống CareerFit IT AutoPilot.

Backend update report tổng hợp nằm tại `../../BACKEND_DOCUMENTATION.md`.

## Yêu cầu

- Java 21
- Maven 3.9+ (có thể dùng `C:\tools\maven\apache-maven-3.9.9\bin\mvn`)
- Docker Desktop (để chạy PostgreSQL)
- Tesseract OCR nếu muốn xử lý PDF scan khi chạy backend trực tiếp bằng Maven. Backend Docker image đã cài sẵn Tesseract + data `vie/eng`.

## Khởi động nhanh

**Bước 1: Khởi động PostgreSQL**
```powershell
# Từ thư mục gốc c:\CODING\Thesis
Copy-Item .env.example .env
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

Kiểm tra nhanh sau khi backend chạy:

```powershell
curl.exe -i http://localhost:8080/api/auth/me
curl.exe -i "http://localhost:8080/api/jobs/search?page=0&size=20"
curl.exe -i "http://localhost:8080/api/jobs/search/suggestions?keyword=React"
```

`/api/auth/me` không token nên trả `401`. Hai endpoint public job search/suggestion nên trả `200`.

**Tùy chọn: chạy backend bằng Docker**
```powershell
# Từ thư mục gốc c:\CODING\Thesis
docker compose --profile backend up -d --build
docker compose logs -f backend
```

Khi backend chạy trong container, datasource dùng host nội bộ Docker `postgres:5432`. Khi backend chạy trực tiếp trên máy bằng Maven, datasource dùng `localhost:5433`.

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
| POST | /api/auth/passwordless/request | Tạo token và gửi magic-link qua mail service |
| GET  | /api/auth/passwordless/verify?token=... | Kiểm tra token còn hợp lệ |
| POST | /api/auth/passwordless/verify | Verify token → JWT |
| GET  | /api/auth/me | Thông tin user hiện tại |

## Advanced Analytics API

Các endpoint analytics cơ bản cũ vẫn được giữ nguyên. Bộ Advanced Analytics mới bổ sung route riêng cho từng vai trò:

| Method | Path | Quyền | Mô tả |
|--------|------|-------|-------|
| GET | /api/analytics/market/overview | Public | Market overview: jobs, employers, views, searches, applications, skills, salary |
| GET | /api/analytics/market/skills | Public | Top required skills |
| GET | /api/analytics/market/salary | Public | Salary distribution by currency/seniority |
| GET | /api/analytics/market/trends | Public | Market time series |
| POST | /api/analytics/events | Authenticated | Track UI/user analytics event |
| GET | /api/candidate/analytics/overview | Candidate | Candidate analytics overview |
| GET | /api/candidate/analytics/skill-demand | Candidate | Demand for candidate skills |
| GET | /api/candidate/analytics/profile-gaps | Candidate | Missing high-demand skills |
| GET | /api/candidate/analytics/match-trends | Candidate | Candidate match/application trends |
| GET | /api/recruiter/analytics/overview | Recruiter | Recruiter advanced dashboard overview |
| GET | /api/recruiter/analytics/jobs/{jobId}/funnel | Recruiter | Job funnel for recruiter-owned job |
| GET | /api/recruiter/analytics/jobs/{jobId}/skill-gap | Recruiter | Required skill coverage among matched candidates |
| GET | /api/recruiter/analytics/trends | Recruiter | Recruiter match/application/view trends |

Frontend contract chi tiết nằm tại `Frontend/ADVANCED_ANALYTICS_API.md`.

## Database

- Primary: PostgreSQL (Docker Compose)
- Migration: Flyway tự động chạy khi khởi động
- File CV: local filesystem `./storage/cv`
- Demo seed: account `ca` / `1` là Candidate, account `re` / `1` là Recruiter.
- Migration `V7__demo_candidate_default_cv.sql` tạo default CV và matching cards mẫu cho `ca`, giúp `GET /api/matches/me/cards` trả dữ liệu thật ngay sau khi backend chạy.

## Các biến môi trường

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `JWT_SECRET` | dev-secret (32+ chars) | JWT signing key |
| `SPRING_DATASOURCE_URL` | jdbc:postgresql://localhost:5433/careerfit | JDBC URL khi chạy backend trên host |
| `SPRING_DATASOURCE_USERNAME` | careerfit | Database username |
| `SPRING_DATASOURCE_PASSWORD` | careerfit | Database password |
| `DB_NAME` | careerfit | Database name cho Docker Compose |
| `DB_USER` | careerfit | Database user cho Docker Compose |
| `DB_PASSWORD` | careerfit | Database password cho Docker Compose |
| `DB_PORT` | 5433 | Port PostgreSQL expose ra host |
| `BACKEND_PORT` | 8080 | Port backend expose ra host khi chạy Docker |
| `SPRING_PROFILES_ACTIVE` | dev | Spring profile mặc định |
| `MAIL_HOST` | smtp.gmail.com | Mail server |
| `MAIL_USERNAME` | no-reply@careerfit.dev | Sender email |
| `MAIL_PASSWORD` | (empty) | Mail password |
| `APP_BASE_URL` | http://localhost:8080 | Base URL for magic links |
| `MAGIC_LINK_EXPOSE_TOKEN` | true | Dev helper: trả raw token trong response passwordless request; prod set false |
| `CORS_ORIGINS` | http://localhost:5173 | Allowed CORS origins |
| `OCR_ENABLED` | true | Bật OCR fallback cho PDF scan/image-only |
| `TESSERACT_COMMAND` | tesseract | Lệnh hoặc đường dẫn tuyệt đối tới Tesseract khi chạy trên host |
| `OCR_LANGUAGES` | vie+eng | Language data dùng cho OCR |
| `OCR_DPI` | 220 | DPI render PDF thành ảnh trước khi OCR |
| `OCR_MAX_PAGES` | 8 | Số trang tối đa OCR cho mỗi CV |
| `OCR_TIMEOUT_SECONDS` | 45 | Timeout OCR cho mỗi trang |

### Passwordless email contract

`POST /api/auth/passwordless/request` luôn trả envelope chuẩn. Ở profile `dev`, mail service mặc định là `NoOpMailService` nên email chỉ được log ra console và response có `data.token` để frontend/dev dùng test nhanh. Ở profile `prod`, `app.mail.enabled=true`, `MAGIC_LINK_EXPOSE_TOKEN=false`, backend gửi email thật qua SMTP và không expose raw token.

```json
{
  "success": true,
  "data": {
    "message": "Magic link sent if the account exists and mail is configured.",
    "token": "dev-only-token-or-null",
    "expiresInMinutes": 15
  }
}
```

Để test gửi email thật cần cấu hình tối thiểu:

```powershell
$env:SPRING_PROFILES_ACTIVE="prod"
$env:MAIL_HOST="smtp.gmail.com"
$env:MAIL_PORT="587"
$env:MAIL_USERNAME="sender@gmail.com"
$env:MAIL_PASSWORD="<gmail-app-password>"
$env:APP_BASE_URL="http://localhost:8080"
```
