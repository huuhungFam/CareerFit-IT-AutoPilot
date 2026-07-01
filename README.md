# CareerFit-IT-AutoPilot

Backend runtime/API notes: xem `Backend/careerfit-backend/README.md` và `Backend/careerfit-backend/BACKEND_CODE_GUIDE.md`.

## Database local

Project uu tien dung PostgreSQL local qua Docker cho development va demo truc tiep tren may ca nhan.

Chay PostgreSQL local:

```powershell
Copy-Item .env.example .env
docker compose up -d
```

Thong tin ket noi mac dinh:

```text
Host: localhost
Port: 5433
Database: careerfit
Username: careerfit
Password: careerfit
```

Dung database:

```powershell
docker compose down
```

Dung va xoa sach du lieu local:

```powershell
docker compose down -v
```

Luu y: `down -v` se xoa volume PostgreSQL local. Schema backend nen duoc tao bang Flyway migration, khong tao bang thu cong.

Backend doc datasource tu cac bien `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` neu duoc set. Neu khong set, backend mac dinh ket noi vao PostgreSQL Docker tai `jdbc:postgresql://localhost:5433/careerfit`.

Chay backend bang Docker neu can:

```powershell
docker compose --profile backend up -d --build
```

Khi chay bang profile `backend`, backend container se ket noi PostgreSQL qua Docker network bang `jdbc:postgresql://postgres:5432/careerfit`. Port PostgreSQL tren may host van la `5433`, con port `5432` chi dung noi bo giua cac container.

Backend Docker image da cai san Tesseract OCR va language data `vie+eng` de doc PDF scan/image-only. Neu chay backend truc tiep bang Maven tren host Windows, can cai Tesseract rieng hoac set `TESSERACT_COMMAND` toi duong dan binary.

Xem log backend:

```powershell
docker compose logs -f backend
```

Huong database chinh:

- Primary DB: PostgreSQL.
- Development DB: PostgreSQL local qua Docker Compose.
- Optional demo/deploy DB: Supabase PostgreSQL hoac PostgreSQL cloud khac.
- Migration: Flyway.
- Demo seed: Flyway seed tao account `ca` / `1`, `re` / `1` va `ad` / `1`; account `ca` co default CV va matching cards mau de test `GET /api/matches/me/cards`, account `ad` dung de test Admin MVP.
- Real job data: du lieu crawl dat trong `scraped-data/jobs_for_careerfit_import.json` co the import vao DB bang script `scripts/import-scraped-jobs.mjs`. DB hien da co metadata nguon crawl tu migration `V11__scraped_job_source_metadata.sql`.
- Admin/job moderation migrations: `V12__allow_hidden_by_admin_job_status.sql` bo sung job status `HIDDEN_BY_ADMIN`; `V13__demo_admin_account.sql` seed account admin `ad` / `1`.
- File CV: local storage trong development, co the doi sang Supabase Storage/S3 sau.
- Auth: Spring Security JWT/passwordless tu lam, khong phu thuoc Supabase Auth.

Import lai du lieu job crawl khi co file moi:

```powershell
docker compose up -d postgres
node scripts\import-scraped-jobs.mjs
```

Kiem tra truoc khi import that:

```powershell
node scripts\import-scraped-jobs.mjs --dry-run
```

Script se loc field bat buoc, normalize enum/salary khong hop le, tao recruiter/employer sinh tu company neu chua co, va upsert job bang `external_hash` nen chay lai khong bi nhan doi du lieu.

Kiem tra nhanh backend/API sau khi chay PostgreSQL va backend:

```powershell
curl.exe -i http://localhost:8080/api/auth/me
curl.exe -i "http://localhost:8080/api/jobs/search?page=0&size=20"
curl.exe -i "http://localhost:8080/api/jobs/search/suggestions?keyword=React"
```

`/api/auth/me` khong token nen ky vong tra `401`; hai endpoint job public nen tra `200`.

Kiem tra nhanh Admin MVP:

```powershell
$adminLogin = Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/auth/login -ContentType 'application/json' -Body (@{ email = 'ad'; password = '1' } | ConvertTo-Json)
$adminHeaders = @{ Authorization = "Bearer $($adminLogin.data.accessToken)" }
Invoke-RestMethod -Method Get -Uri http://localhost:8080/api/admin/dashboard -Headers $adminHeaders
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/admin/audit-logs?page=0&size=2" -Headers $adminHeaders
```

Runbook demo theo thu tu Guest -> Candidate -> Recruiter -> Admin, gom ca expected result, negative cases va cleanup, nam tai `DEMO_FUNCTIONAL_TEST_SCENARIO.md`.

Kich ban test E2E/API ky thuat chi tiet cho application flow, recruiter discovery/invite, email toggle/no-spam, Auto-Apply, validation/empty-state va Admin MVP nam tai `CAREERFIT_E2E_TEST_SCRIPT.md`.

Checklist deploy/runtime truoc demo production nam tai `DEPLOYMENT_CHECKLIST.md`.

## Frontend

Frontend nam trong thu muc `Frontend` va hien dang chay bang React 18, TypeScript, Vite.

### Yeu cau

- Node.js 20.x
- npm 10.x hoac tuong duong

### Khởi động môi trường local

```powershell
cd Frontend
npm install
npm run dev
```

Mặc định Vite sẽ mở dev server tại:

```text
http://127.0.0.1:5173/
```

Một số route có thể dùng để kiểm tra nhanh:

```text
http://127.0.0.1:5173/
http://127.0.0.1:5173/jobs
http://127.0.0.1:5173/login
http://127.0.0.1:5173/candidate
http://127.0.0.1:5173/candidate/jobs
http://127.0.0.1:5173/candidate/jobs?keyword=React
http://127.0.0.1:5173/candidate/jobs/{jobId}
http://127.0.0.1:5173/candidate/employers/northstar-healthtech
http://127.0.0.1:5173/candidate/upload
http://127.0.0.1:5173/candidate/profile
http://127.0.0.1:5173/candidate/advanced-analytics
http://127.0.0.1:5173/candidate/settings
http://127.0.0.1:5173/recruiter
http://127.0.0.1:5173/recruiter/jobs
http://127.0.0.1:5173/recruiter/analytics
http://127.0.0.1:5173/recruiter/advanced-analytics
http://127.0.0.1:5173/recruiter/settings
http://127.0.0.1:5173/admin
http://127.0.0.1:5173/admin/users
http://127.0.0.1:5173/admin/jobs
http://127.0.0.1:5173/admin/audit-logs
http://127.0.0.1:5173/admin/email-monitor
http://127.0.0.1:5173/automation/confirm
```

Hiện tại UI candidate có các luồng chính:

- Mặc định vào trang Guest tại `/`: hiển thị tổng quan và việc làm public, không hiển thị các khối cá nhân như Gợi ý, Tự động ứng tuyển, Ứng tuyển.
- Guest có nav gần giống Candidate để xem được Dashboard và Jobs public; các tab Upload CV, Hồ sơ & CV, Gợi ý, Ứng tuyển và AutoFit sẽ hiển thị màn hình yêu cầu đăng nhập.
- Header Guest chỉ có Guest chip, nút Đăng nhập và chuyển ngôn ngữ. Sau khi đăng nhập, header hiển thị workspace đầy đủ và logout/delete account nằm trong Settings.
- Login guard và Apply modal truyền `next` intent để sau login quay lại trang vừa định mở nếu role phù hợp.
- Login gọi backend `POST /api/auth/login`; token và account được lưu trong `localStorage`. Các tài khoản test nhanh `ca` / `1`, `re` / `1`, `ad` / `1` là tài khoản seed thật từ backend/Flyway, không phải phiên mock tạm thời. Backend cần chạy để đăng nhập các tài khoản này; admin seed dùng email/identifier `ad`.
- Trang tổng quan hiển thị search hero, một số job mới và nút xem tất cả.
- Khi gõ keyword sẽ hiển thị gợi ý tìm kiếm trong lúc input đang focus.
- Bấm Search sẽ chuyển sang trang kết quả `/candidate/jobs?keyword=...`.
- Trang kết quả hiển thị list job một cột, filter bar và link vào job detail.
- Job detail có sticky apply bar khi cuộn xuống.
- Nhà tuyển dụng nổi bật có route chi tiết riêng.
- Upload CV có 2 tab: Document Parser và Manual Creation.
- Hồ sơ & CV quản lý nhiều CV, hồ sơ cố định và Portfolio / Dự án.
- Candidate Settings quản lý tài khoản, job alerts, privacy và security.
- Candidate job feed ưu tiên `GET /api/matches/me/cards` để lấy score/potential/reasons. Account test seed `ca` / `1` đã có default CV và matching seed nên route Candidate Jobs có thể lấy data thật khi backend đang chạy.
- Candidate job cards/detail có Rocchio feedback UI: `GOOD_MATCH`, `POTENTIAL`, `BAD_MATCH`, `NOT_INTERESTED`; public/guest cards không hiện feedback controls.
- Candidate job results có edge-case UX: no-match CTA, low-match-only warning, stable tie-score ordering và tie-break note khi có metadata.
- Manual CV Builder và Hồ sơ cố định có field-level validation suggestions, phân biệt quality flag/warning/hard error pattern để sau này map trực tiếp từ backend validation signals.
- Public job feed/detail ưu tiên `GET /api/jobs/search` và `GET /api/jobs/{jobId}`.
- Recruiter tổng quan (`/recruiter`) tách riêng với trang Việc làm HR Dashboard (`/recruiter/jobs`) và ưu tiên `GET /api/recruiter/dashboard`, `GET /api/recruiter/jobs`.
- Recruiter job workspace có candidate filter riêng theo `HIGH`, `POTENTIAL`, `HIGH_OR_POTENTIAL`, `APPLIED`, `NOT_APPLIED`; filter được lưu trên URL bằng `match=...` và không thay thế tab Applied CVs / AI Potential Matches.
- Recruiter applicant/ranking cards có Rocchio feedback UI role `RECRUITER`, tie-break note khi điểm bằng nhau và CTA Invite/Review/Mark Potential cho candidate chưa apply nhưng high/potential.
- Recruiter Settings quản lý company profile, team permissions, JD defaults và recruiting notifications.
- Admin control panel có dashboard, user management, job moderation, audit logs và email/token monitor; UI dùng các endpoint `/api/admin/*`, chặn role không phải Admin và hiển thị error panel nếu API lỗi thay vì treo loading vô hạn.
- Trang Thống kê cũ của recruiter vẫn giữ tại `/recruiter/analytics`.
- Advanced Analytics UI đã có route riêng `/candidate/advanced-analytics` và `/recruiter/advanced-analytics`, sử dụng market analytics public kết hợp analytics theo role. Backend contract cho UI nằm tại `Frontend/ADVANCED_ANALYTICS_API.md`.
- Candidate application flow đã nối API thật: Apply từ job card/detail gọi `POST /api/applications`, trang `/candidate/applications` đọc `GET /api/applications/me` và withdraw gọi `DELETE /api/applications/{id}`.
- AutoFit/Automation page đã nối policy backend, có toggle `emailNotificationsEnabled`/no-spam, Auto-Apply threshold, high-match email, daily digest, quiet hours, cooldown và nút `Run now` để gọi `POST /api/automation/auto-apply/run-now` khi cần test ngay.
- Recruiter job page đã nối discovery/invite/status flow: `GET /api/recruiter/jobs/{jobId}/candidates`, `POST /api/recruiter/jobs/{jobId}/candidates/{candidateId}/invite`, `PATCH /api/recruiter/applications/{id}/status`.
- UX hiện tại đã được polish: job card có avatar công ty, metadata có icon, insight row, hover/detail action rõ hơn; search suggestions và modal có animation; job list có skeleton loading khi API đang fetch; các interactive surfaces có focus visible, hover lift và reduced-motion support.

Frontend API client nằm tại `Frontend/src/lib/api.ts`. Mặc định client gọi `http://localhost:8080/api`; có thể đổi bằng biến môi trường Vite `VITE_API_BASE_URL`.

### Build kiểm tra

```powershell
cd Frontend
npm run build
```

Build output sẽ nằm trong `Frontend/dist`.

### Ghi chú hiện tại

- Frontend da co API client that cho auth, public/candidate jobs, suggestions va recruiter dashboard/jobs.
- Các route API-driven không còn fallback sang dữ liệu mock khi backend lỗi. UI phải hiển thị đúng loading, error hoặc empty state; dữ liệu trong `src/data/mock.ts` chỉ còn phục vụ các phần trình bày tĩnh chưa có contract riêng.

### Trạng thái dữ liệu và matching 2026-06-21

- DB local đã import đủ 974 JD crawl: 500 ITViec và 474 CareerBuilder; cùng 20 JD seed là 994 JD tổng cộng.
- 991 JD đang `ACTIVE`; batch matching đã phủ đủ 991 JD cho 13 CV `SCORING_DONE`, không có batch failure.
- Chạy lại import bằng `node scripts\import-scraped-jobs.mjs`; chạy lại matching bằng `node scripts\rebuild-matchings.mjs`.
- Backend Docker hỗ trợ CV PDF text, PDF scan, PNG/JPG và DOCX; OCR runtime đã kiểm tra với Tesseract `vie+eng`.
- Recruiter có edit/status/delete/export CSV cho JD. Candidate và Recruiter Settings được lưu thật qua `/api/settings/me`.
- Neu port `5173` dang bi dung, chay port khac bang:

```powershell
npm run dev -- --port 5174
```
