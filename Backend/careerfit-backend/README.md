# CareerFit Backend

Spring Boot 3.x + Java 21 backend cho hệ thống CareerFit IT AutoPilot.

Tài liệu runtime/API backend tổng hợp nằm trong file này. Hướng dẫn đọc code chi tiết nằm tại `BACKEND_CODE_GUIDE.md`.

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

## Automated Tests

Docker Desktop phải chạy vì integration test dùng Testcontainers tạo PostgreSQL 16 tạm thời và chạy toàn bộ Flyway migration. Không cần khởi động PostgreSQL/backend/frontend thủ công trước khi chạy suite.

```powershell
cd Backend\careerfit-backend
.\mvnw.cmd test
```

Kết quả baseline ngày 2026-06-21: `44 tests, 0 failures, 0 errors, 0 skipped`.

- Unit tests bao phủ TF-IDF/matching, Auto-Apply, portfolio, settings, validation, parse PDF/DOCX/ảnh và JD service.
- Integration tests bao phủ Spring context + Flyway V1-V14, login seed, role security, settings persistence, validation response và recruiter JD lifecycle/CSV export.
- Test integration tắt mail thật, scheduler và cô lập matching async; không gửi email hoặc thay đổi database local.
- `CAREERFIT_E2E_TEST_SCRIPT.md` vẫn cần chạy riêng trước UAT/demo để kiểm tra frontend, email thật và các flow liên hệ nhiều service.

## Cấu trúc Package

```
com.careerfit.backend
├── admin/          # Admin dashboard, user management, job moderation, audit/email monitor
├── auth/           # Đăng ký, đăng nhập, JWT, passwordless
├── candidate/      # Hồ sơ candidate, preferences
├── cv/             # Upload CV, manual CV, multi-CV
├── job/            # Job CRUD, search, suggestions
├── employer/       # Employer profile
├── matching/       # CV-JD cosine similarity scoring
├── settings/       # Settings JSONB theo user/role
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

## Admin MVP API

Các endpoint Admin yêu cầu JWT role `ADMIN`. Account demo mặc định sau Flyway V13 là `ad` / `1`.

| Method | Path | Mô tả |
|--------|------|-------|
| GET | /api/admin/dashboard | Tổng quan users, jobs, matching, email actions |
| GET | /api/admin/users | Danh sách user, hỗ trợ filter/search |
| GET | /api/admin/users/{userId} | Chi tiết user |
| POST | /api/admin/users/{userId}/suspend | Khóa user và ghi audit log |
| POST | /api/admin/users/{userId}/activate | Mở lại user và ghi audit log |
| GET | /api/admin/jobs | Danh sách job cho moderation |
| POST | /api/admin/jobs/{jobId}/hide | Ẩn job bằng status `HIDDEN_BY_ADMIN` |
| POST | /api/admin/jobs/{jobId}/restore | Khôi phục job về `ACTIVE` |
| GET | /api/admin/audit-logs | Danh sách audit log, hỗ trợ filter |
| GET | /api/admin/email-actions | Danh sách email action đã redact id/token |
| POST | /api/admin/email-actions/{actionId}/retry | Đưa email action lỗi về trạng thái pending để xử lý lại |
| GET | /api/admin/email-tokens | Danh sách email token đã redact token |
| POST | /api/admin/email-tokens/{tokenId}/revoke | Thu hồi email token |
| POST | /api/admin/matching/rebuild?cvId=... | Rebuild matching cho CV |
| POST | /api/admin/matching/rebuild-batch?page=0&size=100 | Rebuild matching theo batch JD ACTIVE |

Smoke test nhanh:

```powershell
$adminLogin = Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/auth/login -ContentType 'application/json' -Body (@{ email = 'ad'; password = '1' } | ConvertTo-Json)
$adminHeaders = @{ Authorization = "Bearer $($adminLogin.data.accessToken)" }
Invoke-RestMethod -Method Get -Uri http://localhost:8080/api/admin/dashboard -Headers $adminHeaders
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/admin/users?page=0&size=5" -Headers $adminHeaders
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/admin/audit-logs?page=0&size=5" -Headers $adminHeaders
```

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

## Lifecycle email

Backend có `NotificationEmailService` riêng cho các email lifecycle, dùng template HTML mobile-safe cùng phong cách với email action. Các email đã được wire vào các flow hiện có:

| Trigger | Người nhận | Email |
|---------|------------|-------|
| Candidate apply thành công | Candidate | Chúc may mắn, link xem lịch sử ứng tuyển |
| Candidate apply thành công | Recruiter | Báo có ứng viên mới |
| Candidate withdraw | Candidate | Xác nhận đã rút hồ sơ |
| Recruiter set `INVITED` | Candidate | Chúc mừng/mời phỏng vấn |
| Recruiter set `APPROVED` | Candidate | CV được accept/qua vòng lọc |
| Recruiter set `REJECTED` | Candidate | Thông báo từ chối và gợi ý tiếp tục |
| Recruiter set `INTERVIEW_RESCHEDULED` | Candidate | Lịch phỏng vấn được đổi |
| Recruiter set `INTERVIEW_CANCELLED` | Candidate | Lịch phỏng vấn bị hủy |
| Email action `NOT_INTERESTED` | Candidate | Xác nhận skip và hệ thống giảm gợi ý tương tự |
| CV scoring không có JD phù hợp | Candidate | Chờ JD phù hợp hơn |
| CV scoring chỉ có điểm thấp | Candidate | Gợi ý cập nhật CV |

Service cũng có sẵn method cho các lifecycle mở rộng: `AUTO_APPLIED`, `PROFILE_OR_CV_NEEDS_UPDATE`, `NEW_HIGH_MATCH_FOUND`, `DIGEST_SUMMARY`, `RECRUITER_HIGH_MATCH_CANDIDATE_FOUND`, `CANDIDATE_RESPONDED_TO_INVITE`.

### Notification policy và no-spam

Frontend bật/tắt email bằng boolean, nhưng Backend là nguồn kiểm soát cuối cùng. Mọi lifecycle email và email action/digest đều đi qua `NotificationPolicyGuard`.

| Method | Path | Mô tả |
|--------|------|-------|
| GET | /api/automation/policy | Lấy policy hiện tại, tự tạo default nếu chưa có |
| PATCH | /api/automation/policy | Cập nhật policy nâng cao |
| PATCH | /api/automation/policy/email-notifications | Bật/tắt toàn bộ non-security email notification |
| POST | /api/automation/auto-apply/run-now | Chạy Auto-Apply một lần cho user hiện tại |
| POST | /api/automation/pause?until=... | Tạm dừng AutoFit/AutoPilot đến thời điểm chỉ định hoặc mặc định 7 ngày |
| POST | /api/automation/resume | Bật lại AutoFit/AutoPilot và xóa trạng thái pause |

Payload toggle:

```json
{ "enabled": false }
```

Các rule đang áp dụng:

- `emailNotificationsEnabled=false`: skip mọi notification email không phải security/passwordless.
- `quietHoursEnabled=true`: skip trong khung giờ yên lặng theo `userTimezone`.
- `maxEmailPerDay`: quota email đã gửi trong ngày.
- `notificationCooldownHours`: chặn gửi lại cùng `emailType`/`contextKey` quá gần.
- Mọi lần `SENT`, `SKIPPED`, `FAILED` được ghi vào `notification_delivery_log`.

## Auto-Apply nội bộ

Auto-Apply hiện là automation nội bộ của CareerFit, không submit sang website bên thứ ba. Khi candidate bật `autoApplyEnabled=true`, backend tạo `Application` status `AUTO_APPLIED` cho các job đủ điều kiện:

- Candidate có default CV và CV đã `SCORING_DONE`.
- Matching score `normalizedScore >= autoApplyThreshold`.
- Job còn `ACTIVE`.
- Candidate chưa có application cho job đó.
- Mỗi lần chạy tạo tối đa 3 application để tránh spam.

Endpoint policy:

```text
GET /api/automation/policy
PATCH /api/automation/policy
```

Payload mẫu:

```json
{
  "autoApplyEnabled": true,
  "autoApplyThreshold": 80
}
```

`autoApplyThreshold` hợp lệ trong khoảng `50-100`. Nếu ngoài khoảng này backend trả `400 BAD_REQUEST`.

Endpoint chạy ngay:

```text
POST /api/automation/auto-apply/run-now
```

Response:

```json
{
  "created": 1,
  "reason": "CREATED_APPLICATIONS"
}
```

Các `reason` có thể gặp:

- `CREATED_APPLICATIONS`: đã tạo ít nhất một application.
- `NO_ELIGIBLE_MATCHES`: policy bật nhưng không còn job đủ điều kiện.
- `AUTO_APPLY_DISABLED`: policy đang tắt nên không tạo application.

Scheduler nền vẫn chạy mỗi 2 giờ qua `AutomationScheduler.executeAutoApply()`. Mọi application tự động đều ghi audit `AUTO_APPLY_EXECUTED` và đi qua lifecycle email/no-spam policy.

## Recruiter candidate discovery và tie-breaker

Route ranking cũ vẫn giữ:

```text
GET /api/recruiter/jobs/{jobId}/ranking
```

Response ranking có thêm field `tie` trong từng candidate để frontend xử lý đồng hạng:

```json
{
  "tie": {
    "rank": 1,
    "tieRank": 1,
    "tieGroupSize": 3,
    "tied": true,
    "sortKey": "score_desc|potential_desc|updated_desc|id_asc",
    "lastUpdatedAt": "2026-06-05T00:00:00Z"
  }
}
```

Route discovery mới cho recruiter:

```text
GET /api/recruiter/jobs/{jobId}/candidates
```

Query:

```text
label=HIGH|MEDIUM|LOW|POTENTIAL
isPotential=true|false
applicationStatus=NONE|PENDING|AUTO_APPLIED|APPROVED|REJECTED|INVITED|NOT_INTERESTED|INTERVIEW_RESCHEDULED|INTERVIEW_CANCELLED
minScore=70
sort=score_desc|updated_desc|experience_desc|status_asc
page=0
size=20
```

Response có `resultState`:

- `READY`: có kết quả bình thường.
- `HIGH_TIE`: nhóm đầu có nhiều candidate cùng score cao nhất.
- `NO_CANDIDATE_MATCHES`: job chưa có candidate nào được score.
- `NO_FILTERED_RESULTS`: có match nhưng filter hiện tại không còn kết quả.

Recruiter có thể mời candidate chưa apply:

```text
POST /api/recruiter/jobs/{jobId}/candidates/{candidateId}/invite
```

Hành vi:

- Chỉ recruiter sở hữu job được gọi.
- Job phải còn `ACTIVE`.
- Nếu candidate đã có application cho job đó, endpoint trả application hiện tại và không tạo trùng.
- Nếu chưa có application, backend tạo `Application` status `INVITED`, ghi audit `CANDIDATE_INVITED`, và gửi lifecycle email cho candidate theo notification/no-spam policy.

## Validation error contract

Bean validation và domain quality validation trả envelope thống nhất:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "fieldErrors": {
      "code": "VALIDATION_FAILED",
      "message": "Validation failed",
      "fields": [
        {
          "severity": "ERROR",
          "field": "salaryMin",
          "reason": "SALARY_RANGE_INVALID",
          "message": "Salary min cannot be greater than salary max.",
          "suggestion": "Make salaryMin less than or equal to salaryMax."
        }
      ]
    }
  }
}
```

## List metadata và empty state

Các endpoint danh sách quan trọng trả thêm metadata để UI biết trạng thái dữ liệu, thời điểm sinh kết quả và gợi ý xử lý:

```json
{
  "generatedAt": "2026-06-06T10:00:00Z",
  "lastUpdatedAt": "2026-06-06T09:55:00Z",
  "resultState": "READY",
  "message": "Application results are ready.",
  "suggestions": []
}
```

Áp dụng:

- `GET /api/matches/me`
- `GET /api/matches/me/cards`
- `GET /api/recruiter/jobs/{jobId}/ranking`
- `GET /api/recruiter/jobs/{jobId}/candidates`
- `GET /api/recruiter/jobs/{jobId}/applicants`
- `GET /api/applications/me`

Các state chính:

- `READY`
- `NO_MATCH`
- `LOW_MATCH_ONLY`
- `HIGH_TIE`
- `PROCESSING`
- `FAILED`
- `NO_FILTERED_RESULTS`
- `NO_CANDIDATE_MATCHES`

Candidate match endpoints và application/applicant pages trả metadata trong `data.meta`. Recruiter discovery đã có `resultState/message` ở top-level data và bổ sung `generatedAt/lastUpdatedAt/suggestions`.

## Database

- Primary: PostgreSQL (Docker Compose)
- Migration: Flyway tự động chạy khi khởi động
- File CV: local filesystem `./storage/cv`
- Demo seed: account `ca` / `1` là Candidate, account `re` / `1` là Recruiter, account `ad` / `1` là Admin.
- Migration `V7__demo_candidate_default_cv.sql` tạo default CV và matching cards mẫu cho `ca`, giúp `GET /api/matches/me/cards` trả dữ liệu thật ngay sau khi backend chạy.
- Migration `V11__scraped_job_source_metadata.sql` bổ sung metadata nguồn crawl cho bảng `job`: `source_platform`, `source_url`, `scraped_at`, `external_hash`.
- Migration `V12__allow_hidden_by_admin_job_status.sql` cho phép status `HIDDEN_BY_ADMIN` để Admin ẩn job khỏi feed candidate mà không xóa dữ liệu.
- Migration `V13__demo_admin_account.sql` tạo account demo `ad` / `1` role `ADMIN`.
- Migration `V14__user_settings.sql` lưu Settings theo user bằng JSONB, có unique constraint trên `user_id`.
- Dữ liệu job crawl nằm tại `scraped-data/jobs_for_careerfit_import.json` và được import bằng `scripts/import-scraped-jobs.mjs`.

Import lại dữ liệu job crawl:

```powershell
# Từ thư mục gốc C:\CODING\Thesis
docker compose up -d postgres
node scripts\import-scraped-jobs.mjs
```

Dry-run để xem thống kê lọc/normalize trước khi ghi DB:

```powershell
node scripts\import-scraped-jobs.mjs --dry-run
```

Importer sẽ:

- bỏ row thiếu `title`, `company`, hoặc `originalText`;
- normalize `salaryMode`, `salaryType`, `remoteType`, `employmentType`;
- tạo recruiter account dạng `scraped+<hash>@careerfit.local` cho từng company;
- tạo `employer_profile` tương ứng;
- upsert `job` theo `external_hash`, nên chạy lại không tạo trùng job.

Sau import, rebuild vector và matching cho toàn bộ JD ACTIVE bằng script có phân trang ổn định:

```powershell
node scripts\rebuild-matchings.mjs
```

Script đăng nhập account Admin `ad / 1` mặc định và gọi `/api/admin/matching/rebuild-batch`. Có thể cấu hình `CAREERFIT_API_URL`, `CAREERFIT_ADMIN_EMAIL`, `CAREERFIT_ADMIN_PASSWORD`, `MATCHING_BATCH_SIZE`.

## API bổ sung 2026-06-21

| Method | Path | Quyền | Mô tả |
| --- | --- | --- | --- |
| `PATCH` | `/api/jobs/{id}` | Recruiter sở hữu JD | Sửa một phần JD và vector hóa lại khi cần |
| `PATCH` | `/api/jobs/{id}/status?status=...` | Recruiter sở hữu JD | `ACTIVE`, `DRAFT`, `PAUSED`, `CLOSED` |
| `DELETE` | `/api/jobs/{id}` | Recruiter sở hữu JD | Chỉ xóa khi chưa có application |
| `GET` | `/api/jobs/export` | Recruiter | Xuất CSV UTF-8 có BOM |
| `GET` | `/api/settings/me` | Candidate/Recruiter | Đọc default và settings đã lưu theo role |
| `PATCH` | `/api/settings/me` | Candidate/Recruiter | Patch các key được allowlist, validate type/range |

`POST /api/cv/upload` nhận `PDF`, `PNG`, `JPG/JPEG` và `DOCX`. PDF scan và ảnh chạy Tesseract; DOCX đọc bằng Apache POI. Backend kiểm tra extension/MIME, kích thước file, số pixel ảnh và độ dài text trích xuất.

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
| `APP_MAIL_ENABLED` | false trong Docker/dev; true nếu tự bật hoặc prod profile không override | Bật `MailService` SMTP thật khi cấu hình qua environment |
| `MAIL_HOST` | smtp.gmail.com | Mail server |
| `MAIL_USERNAME` | no-reply@careerfit.dev | Sender email |
| `MAIL_PASSWORD` | (empty) | Mail password |
| `APP_BASE_URL` | http://localhost:8080 | Base URL for magic links |
| `MAGIC_LINK_EXPOSE_TOKEN` | true | Dev helper: trả raw token trong response passwordless request; prod set false |
| `CORS_ORIGINS` | http://localhost:5173 | Allowed CORS origins |
| `STORAGE_PATH` | ./storage/cv | Thư mục lưu file CV khi chạy backend trên host |
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
