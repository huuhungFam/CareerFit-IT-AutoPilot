# CareerFit Deployment And Runtime Checklist

Tài liệu này dùng trước khi demo/deploy `CareerFit IT AutoPilot` từ môi trường local sang môi trường thật.

## 1. Secrets Và Biến Môi Trường

Không commit secret thật vào repo. Các giá trị production phải đặt bằng environment variables hoặc secret manager.

Checklist bắt buộc:

- `JWT_SECRET`: dùng chuỗi riêng cho production, đủ dài, không dùng default trong `.env.example`.
- `SPRING_PROFILES_ACTIVE=prod` nếu muốn bật cấu hình production.
- `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`: trỏ đúng PostgreSQL production.
- `APP_BASE_URL`: trỏ đúng base URL backend public để magic link/email action tạo link đúng.
- `CORS_ORIGINS`: thêm đúng origin frontend production.
- `MAGIC_LINK_EXPOSE_TOKEN=false` ở production.
- `APP_MAIL_ENABLED=true` chỉ khi đã cấu hình SMTP thật.
- `MAIL_USERNAME`, `MAIL_PASSWORD`: dùng App Password/secret riêng, không dùng mật khẩu tài khoản chính.
- Nếu chạy backend bằng Docker Compose, `.env` cần có đủ `APP_MAIL_ENABLED=true`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`; Compose sẽ truyền các biến này vào container.

## 2. Storage Và OCR

- `STORAGE_PATH` phải trỏ tới thư mục có quyền ghi.
- Nếu chạy bằng Docker, mount volume persistent cho storage CV.
- Nếu `OCR_ENABLED=true`, runtime phải có Tesseract và language data `vie+eng`.
- Nếu không có Tesseract ở host Windows, tạm set `OCR_ENABLED=false` hoặc dùng Docker backend image đã cài sẵn OCR.

## 3. Database Và Migration

Trước demo sạch:

```powershell
cd C:\CODING\Thesis
docker compose down -v
docker compose up -d postgres
cd Backend\careerfit-backend
.\mvnw.cmd spring-boot:run
```

Kỳ vọng:

- Flyway chạy tất cả migration.
- Account demo `ca / 1`, `re / 1` và `ad / 1` đăng nhập được.
- `GET /api/matches/me/cards` với account `ca` không trả `500`.
- Migration `V10__notification_policy_log.sql` tạo được `notification_delivery_log`.
- Migration `V12__allow_hidden_by_admin_job_status.sql` cho phép job status `HIDDEN_BY_ADMIN`.
- Migration `V13__demo_admin_account.sql` tạo account Admin demo `ad / 1`.

Không chạy `docker compose down -v` nếu muốn giữ dữ liệu local hiện tại.

## 4. Smoke Test Sau Khi Deploy

Backend:

```powershell
curl.exe -i http://localhost:8080/api/auth/me
curl.exe -i "http://localhost:8080/api/jobs/search?page=0&size=20"
curl.exe -i "http://localhost:8080/api/jobs/search/suggestions?keyword=React"
```

Kỳ vọng:

- `/api/auth/me` không token trả `401`.
- Public search/suggestion trả `200`.

Admin smoke:

```powershell
$adminLogin = Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/auth/login -ContentType 'application/json' -Body (@{ email = 'ad'; password = '1' } | ConvertTo-Json)
$adminHeaders = @{ Authorization = "Bearer $($adminLogin.data.accessToken)" }
Invoke-RestMethod -Method Get -Uri http://localhost:8080/api/admin/dashboard -Headers $adminHeaders
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/admin/users?page=0&size=5" -Headers $adminHeaders
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/admin/audit-logs?page=0&size=5" -Headers $adminHeaders
```

Kỳ vọng:

- Login `ad / 1` trả role `ADMIN`.
- Các endpoint `/api/admin/*` trả `200` với token Admin.
- Candidate/Recruiter gọi `/api/admin/*` bị chặn `403`.

Build/test:

```powershell
cd C:\CODING\Thesis\Backend\careerfit-backend
.\mvnw.cmd test
cd C:\CODING\Thesis\Frontend
npm run build
```

## 5. Demo Flow Bắt Buộc

Chạy theo file:

```text
CAREERFIT_E2E_TEST_SCRIPT.md
```

Các flow tối thiểu phải pass:

- Candidate login `ca / 1`.
- Candidate xem matched job cards.
- Candidate apply job và thấy application trong `/candidate/applications`.
- Candidate bật Auto-Apply và bấm `Run now`.
- Recruiter login `re / 1`.
- Recruiter xem discovery candidate, invite, approve/reject.
- Email toggle tắt được lifecycle email nhưng không chặn domain action.
- Admin login `ad / 1`.
- Admin xem dashboard, users, jobs, audit logs và email monitor.
- Admin suspend/activate user test, hide/restore job test, và kiểm tra audit log được ghi.

## 6. Điều Kiện Chưa Nên Deploy

Không nên deploy nếu gặp một trong các lỗi sau:

- Backend start fail do Flyway migration.
- Login demo không hoạt động trên DB sạch.
- Admin `ad / 1` không đăng nhập được hoặc `/api/admin/*` không được bảo vệ đúng role.
- Apply/invite tạo application trùng.
- Auto-Apply tạo quá 3 application trong một lần chạy.
- Email vẫn gửi khi user đã tắt `emailNotificationsEnabled`.
- Email action/token monitor lộ raw token thay vì redacted token/id.
- OCR bật nhưng runtime không có Tesseract.
- `APP_BASE_URL` hoặc `CORS_ORIGINS` vẫn trỏ localhost trong production.
