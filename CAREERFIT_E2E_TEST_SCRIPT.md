# CareerFit E2E Manual Test Script

Tài liệu này dùng để test kỹ thuật các flow của `CareerFit IT AutoPilot`: application flow, recruiter discovery/invite, email toggle/no-spam, ranking tie-breaker, Auto-Apply và Admin. Runbook trình diễn tuần tự, có expected result và cleanup, nằm tại `DEMO_FUNCTIONAL_TEST_SCENARIO.md`.

## 1. Mục tiêu kiểm thử

- Candidate đăng nhập, xem job có matching score, apply thật và rút application.
- Recruiter xem danh sách candidate theo filter, invite candidate chưa apply, approve/reject application.
- Email lifecycle đi qua toggle/no-spam policy.
- Auto-Apply tạo application nội bộ `AUTO_APPLIED` khi policy bật và score đạt ngưỡng.
- Frontend hiển thị được các flow chính, backend trả lỗi có thể đọc được khi fail.

## 2. Chuẩn bị môi trường

Chạy PostgreSQL từ thư mục gốc project:

```powershell
cd C:\CODING\Thesis
Copy-Item .env.example .env -ErrorAction SilentlyContinue
docker compose up -d postgres
```

Chạy backend:

```powershell
cd C:\CODING\Thesis\Backend\careerfit-backend
.\mvnw.cmd spring-boot:run
```

Chạy frontend:

```powershell
cd C:\CODING\Thesis\Frontend
npm install
npm run dev
```

URL mặc định:

```text
Backend:  http://localhost:8080
Frontend: http://127.0.0.1:5173
Swagger:  http://localhost:8080/swagger-ui.html
```

Tài khoản demo:

```text
Candidate: ca / 1
Recruiter: re / 1
Admin:     ad / 1
```

Lưu ý email:

- Profile `dev` dùng `NoOpMailService`, không gửi email thật nhưng backend log lại nội dung gửi.
- Muốn gửi SMTP thật thì cấu hình App Password qua biến môi trường, không commit secret vào repo.

## 3. Smoke API cơ bản

```powershell
curl.exe -i http://localhost:8080/api/auth/me
curl.exe -i "http://localhost:8080/api/jobs/search?page=0&size=20"
curl.exe -i "http://localhost:8080/api/jobs/search/suggestions?keyword=React"
```

Kết quả mong đợi:

- `/api/auth/me` trả `401` vì chưa có token.
- Public job search và suggestions trả `200`.

Nếu fail:

- `Connection refused`: backend chưa chạy hoặc sai port.
- `500` khi search job: kiểm tra log backend và trạng thái migration Flyway.
- `relation does not exist`: database chưa migrate, restart backend sau khi PostgreSQL sẵn sàng.

## 4. Login lấy token để test bằng PowerShell

Candidate:

```powershell
$candidateLogin = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/auth/login" -ContentType "application/json" -Body '{"email":"ca","password":"1"}'
$candidateToken = $candidateLogin.data.accessToken
$candidateHeaders = @{ Authorization = "Bearer $candidateToken" }
```

Recruiter:

```powershell
$recruiterLogin = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/auth/login" -ContentType "application/json" -Body '{"email":"re","password":"1"}'
$recruiterToken = $recruiterLogin.data.accessToken
$recruiterHeaders = @{ Authorization = "Bearer $recruiterToken" }
```

Admin:

```powershell
$adminLogin = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/auth/login" -ContentType "application/json" -Body '{"email":"ad","password":"1"}'
$adminToken = $adminLogin.data.accessToken
$adminHeaders = @{ Authorization = "Bearer $adminToken" }
```

Kết quả mong đợi:

- Response có `data.accessToken`.
- Sai mật khẩu trả `401` hoặc envelope lỗi `UNAUTHORIZED`.
- Admin login trả `data.user.role = ADMIN`.

## 5. Candidate application flow

Mở UI:

```text
http://127.0.0.1:5173/login
```

Đăng nhập `ca / 1`, vào:

```text
/candidate/jobs
```

Thao tác:

1. Chọn một job trong danh sách.
2. Bấm `Apply`.
3. Backend tạo application.
4. UI chuyển sang `/candidate/applications`.

Kết quả mong đợi:

- Application mới xuất hiện trong trang Applications.
- Status hiển thị dạng `Applied` hoặc `Auto-applied` tùy flow.
- Nếu bấm apply cùng job lần nữa, backend không tạo trùng và có thể trả lỗi conflict.

Test API tương đương:

```powershell
$cards = Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/matches/me/cards?page=0&size=20" -Headers $candidateHeaders
$appsBefore = Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/applications/me?page=0&size=50" -Headers $candidateHeaders
$appliedJobIds = @($appsBefore.data.applications | ForEach-Object { $_.jobId })
$jobToApply = $cards.data.jobs | Where-Object { $appliedJobIds -notcontains $_.id } | Select-Object -First 1
if ($null -eq $jobToApply) {
    Write-Warning "Không còn job matching nào chưa từng apply. Đây là NO_ELIGIBLE_MATCHES hợp lệ; dùng DB sạch hoặc candidate khác để test tạo mới."
} else {
    $applyBody = @{ jobId = $jobToApply.id; coverLetter = "Manual E2E test application" } | ConvertTo-Json
    Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/applications" -Headers $candidateHeaders -ContentType "application/json" -Body $applyBody
}
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/applications/me?page=0&size=20" -Headers $candidateHeaders
```

Nếu fail:

- `401`: token hết hạn hoặc chưa login.
- `403`: account không phải candidate.
- `400`: candidate chưa có default CV hoặc request thiếu `jobId`.
- `409`: đã apply job này rồi, đây là fail hợp lệ cho duplicate protection.

## 6. Candidate withdraw application

UI:

1. Vào `/candidate/applications`.
2. Bấm nút skip/withdraw trên application chưa final.

API:

```powershell
$apps = Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/applications/me?page=0&size=20" -Headers $candidateHeaders
$applicationId = $apps.data.applications[0].applicationId
Invoke-RestMethod -Method Delete -Uri "http://localhost:8080/api/applications/$applicationId" -Headers $candidateHeaders
```

Kết quả mong đợi:

- Backend trả `200`.
- Lifecycle email withdraw được gửi hoặc được log bởi `NoOpMailService`.

Nếu fail:

- `404`: application không thuộc candidate đang đăng nhập.
- `400` hoặc `409`: application đã ở trạng thái final nên không thể rút.

## 7. Recruiter candidate discovery, invite và tie-breaker

UI:

1. Đăng nhập `re / 1`.
2. Vào `/recruiter/jobs`.
3. Chọn một job.
4. Dùng các filter `Phù hợp cao`, `Tiềm năng`, `Đã ứng tuyển`, `Chưa ứng tuyển` để thu hẹp candidate card theo score/potential/trạng thái application. Đây là bộ lọc danh sách, không làm thay đổi dữ liệu candidate.
5. Kiểm tra candidate card có score, potential, tie note nếu đồng hạng.
6. Bấm `Invite` với candidate chưa apply.

API:

```powershell
$reJobs = Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/recruiter/jobs" -Headers $recruiterHeaders
$reJobId = $reJobs.data[0].id
$discovery = Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/recruiter/jobs/$reJobId/candidates?minScore=0&page=0&size=20&sort=score_desc" -Headers $recruiterHeaders
$candidateId = $discovery.data.candidates[0].candidateId
$inviteResponse = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/recruiter/jobs/$reJobId/candidates/$candidateId/invite" -Headers $recruiterHeaders
$inviteResponse.data
```

Kết quả mong đợi:

- Discovery trả `resultState` như `READY`, `HIGH_TIE`, `NO_CANDIDATE_MATCHES` hoặc `NO_FILTERED_RESULTS`.
- Candidate item có `applicationStatus`, `applicationId`, `hasApplied`, `tie`.
- Invite tạo application `INVITED` hoặc trả application hiện có nếu đã invite/apply trước đó.

Nếu fail:

- `403`: recruiter không sở hữu job.
- `404`: sai jobId/candidateId.
- `409` không nên xảy ra với invite idempotent; nếu có, kiểm tra unique constraint và service logic.

## 8. Recruiter approve/reject application

API:

```powershell
$invitedApplicationId = $inviteResponse.data.applicationId
$approveBody = @{ status = "APPROVED"; recruiterNotes = "E2E approve test" } | ConvertTo-Json
Invoke-RestMethod -Method Patch -Uri "http://localhost:8080/api/recruiter/applications/$invitedApplicationId/status" -Headers $recruiterHeaders -ContentType "application/json" -Body $approveBody
```

Thay `APPROVED` bằng `REJECTED` để test email từ chối.

Kết quả mong đợi:

- Backend trả `200`.
- Candidate nhận lifecycle email hoặc backend log gửi mail trong dev.
- Discovery/application list phản ánh status mới sau refetch.

Nếu fail:

- `400`: status không hợp lệ.
- `403`: application thuộc job của recruiter khác.
- `404`: applicationId không tồn tại.

## 9. Email toggle và no-spam

Tắt toàn bộ notification email:

```powershell
Invoke-RestMethod -Method Patch -Uri "http://localhost:8080/api/automation/policy/email-notifications" -Headers $candidateHeaders -ContentType "application/json" -Body '{"enabled":false}'
```

Thực hiện một action có email lifecycle, ví dụ apply/withdraw/invite.

Kết quả mong đợi:

- Domain action vẫn chạy bình thường nếu hợp lệ.
- Email không được gửi.
- Backend ghi `SKIPPED` trong `notification_delivery_log` với lý do policy/no-spam.

Bật lại:

```powershell
Invoke-RestMethod -Method Patch -Uri "http://localhost:8080/api/automation/policy/email-notifications" -Headers $candidateHeaders -ContentType "application/json" -Body '{"enabled":true}'
```

Nếu fail:

- Email vẫn gửi dù đã tắt: kiểm tra flow đó có đi qua `NotificationPolicyGuard` chưa.
- Action bị chặn vì tắt email: sai hành vi, email toggle không được chặn application/recommendation.

## 10. Auto-Apply thật

UI:

1. Đăng nhập `ca / 1`.
2. Vào `/candidate/automation`.
3. Bật `Auto Apply`.
4. Chọn threshold, ví dụ `80`.
5. Bấm `Run now`.
6. Vào `/candidate/applications` kiểm tra application mới.

API:

```powershell
$policyBody = @{ autoApplyEnabled = $true; autoApplyThreshold = 80 } | ConvertTo-Json
Invoke-RestMethod -Method Patch -Uri "http://localhost:8080/api/automation/policy" -Headers $candidateHeaders -ContentType "application/json" -Body $policyBody
Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/automation/auto-apply/run-now" -Headers $candidateHeaders
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/applications/me?page=0&size=20" -Headers $candidateHeaders
```

Kết quả mong đợi:

- `run-now` trả `{ created: n, reason: "CREATED_APPLICATIONS" }` nếu có job đủ điểm và chưa apply.
- Nếu không còn job hợp lệ, trả `{ created: 0, reason: "NO_ELIGIBLE_MATCHES" }`.
- Nếu Auto-Apply đang tắt, trả `{ created: 0, reason: "AUTO_APPLY_DISABLED" }`.
- Scheduler nền vẫn chạy mỗi 2 giờ và dùng cùng service.

Nếu fail:

- `400 autoApplyThreshold must be between 50 and 100`: threshold ngoài range.
- `created=0` nhưng kỳ vọng có application: candidate có thể đã apply hết job đủ điểm, CV chưa `SCORING_DONE`, hoặc match score thấp hơn threshold.
- `500`: kiểm tra log `AutoApplyService`, thường là dữ liệu seed thiếu job/candidate/CV/matching.

## 11. Validation và matching edge state

Manual validation UI:

1. Đăng nhập `ca / 1`.
2. Mở `/candidate/profile` hoặc màn hình tạo CV thủ công.
3. Gửi form thiếu trường bắt buộc hoặc email sai format.
4. Kiểm tra lỗi hiển thị tại field, không chỉ toast tổng.

Màn hình tạo CV thủ công đã submit vào `POST /api/cv/manual`. Request bên dưới vẫn dùng để kiểm tra riêng validation envelope của backend.

```powershell
$invalidCvBody = @{
  displayName = ""
  fullName = ""
  email = "email-sai"
  desiredTitle = ""
  yearsOfExperience = 99
  skills = @()
  language = "vi"
} | ConvertTo-Json
Invoke-WebRequest -Method Post -Uri "http://localhost:8080/api/cv/manual" -Headers $candidateHeaders -ContentType "application/json" -Body $invalidCvBody -SkipHttpErrorCheck
```

JD/salary validation:

1. Đăng nhập `re / 1`.
2. Mở màn hình tạo/sửa job.
3. Nhập salary min lớn hơn salary max hoặc title/JD quá ngắn.
4. Submit.

> Frontend đã có form tạo JD nối API. Có thể dùng request dưới đây để kiểm tra riêng validation response của backend.

```powershell
$invalidJobBody = @{
  title = "Fresher"
  company = "CareerFit Test"
  originalText = "Quá ngắn"
  requiredSkills = @("Java")
  seniorityLevel = "FRESHER"
  employmentType = "FULL_TIME"
  salaryMode = "RANGE"
  salaryMin = 30000000
  salaryMax = 20000000
  salaryCurrency = "VND"
  salaryType = "MONTHLY"
  salaryIsVisible = $true
  language = "vi"
} | ConvertTo-Json
Invoke-WebRequest -Method Post -Uri "http://localhost:8080/api/jobs" -Headers $recruiterHeaders -ContentType "application/json" -Body $invalidJobBody -SkipHttpErrorCheck
```

Kết quả mong đợi:

- Backend trả envelope `VALIDATION_ERROR`.
- Response có field/reason/message/suggestion nếu backend đã map signal.
- UI giữ dữ liệu người dùng đã nhập và chỉ đánh dấu trường lỗi.

Matching empty state:

1. Mở `/candidate/jobs`.
2. Dùng search/filter rất hẹp để tạo danh sách rỗng, hoặc dùng data test không có match.
3. Mở recruiter discovery với filter High/Potential nếu không có candidate phù hợp.

Kết quả mong đợi:

- Candidate thấy CTA cập nhật CV, reset filter hoặc mở rộng preference.
- Recruiter thấy `NO_CANDIDATE_MATCHES` hoặc `NO_FILTERED_RESULTS`, không crash.
- Nếu có nhiều candidate/job đồng điểm, UI hiển thị tie note thay vì sắp xếp ngẫu nhiên khó hiểu.

## 11A. Candidate CV và Fixed Profile

UI:

1. Đăng nhập `ca / 1`, vào `/candidate/profile`.
2. Xác nhận tab `CV đã tạo` hiển thị CV thật từ backend; CV mặc định có nút `Đặt mặc định` bị disable.
3. Bấm `Tải CV mới`, chọn một file PDF hợp lệ và chờ thông báo đã tiếp nhận.
4. Bấm `Tạo CV bằng form`, nhập dữ liệu rồi bấm `Lưu & bắt đầu đối sánh`.
5. Mở tab `Hồ sơ cố định`, sửa một trường không quan trọng, lưu và reload để xác nhận dữ liệu vẫn còn.

API kiểm tra dữ liệu tương đương:

```powershell
# Nếu đã dừng test lâu hoặc backend vừa restart, login lại để làm mới token/header.
$candidateLogin = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/auth/login" -ContentType "application/json" -Body '{"email":"ca","password":"1"}'
$candidateHeaders = @{ Authorization = "Bearer $($candidateLogin.data.accessToken)" }

Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/candidates/me" -Headers $candidateHeaders
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/candidates/me/cvs" -Headers $candidateHeaders
```

Kết quả mong đợi:

- Profile và CV không còn là dữ liệu mẫu phía frontend.
- Upload PDF gọi `POST /api/cv/upload`; Manual Creation gọi `POST /api/cv/manual`.
- Email trong Fixed Profile chỉ đọc. Endpoint profile hiện không dùng để đổi email đăng nhập.
- File không phải PDF, PDF quá lớn hoặc form thiếu trường bắt buộc trả validation error có thể đọc được.
- PDF scan/image-only chỉ OCR được khi Tesseract có trong runtime. Docker backend đã cài `vie+eng`; chạy Maven trực tiếp trên Windows phải cài Tesseract riêng.
- Ảnh `.png/.jpg` trực tiếp và `.doc/.docx` hiện chưa phải input được hỗ trợ.

## 11B. Recruiter tạo JD

UI:

1. Đăng nhập `re / 1`, vào `/recruiter/jobs`.
2. Bấm `Đăng việc` hoặc từ dashboard bấm `Tạo JD`.
3. Nhập chức danh, công ty, kỹ năng, mô tả JD và thông tin lương.
4. Bấm `Đăng công việc`, xác nhận thông báo thành công và job mới xuất hiện trong danh sách.

Kết quả mong đợi:

- Form gọi thật `POST /api/jobs` và refetch danh sách recruiter jobs.
- JD có dữ liệu phi lý nhưng chưa đến mức lỗi chặn có thể trả quality warning; lỗi contract trả `400 VALIDATION_FAILED`.
- Không dùng dữ liệu production cho test vì thao tác này tạo job thật trong database đang chạy.

## 11C. Candidate Portfolio CRUD

UI:

1. Đăng nhập `ca / 1`, mở `/candidate/profile?tab=portfolio`.
2. Thêm một link GitHub có URL `https://github.com/careerfit-e2e`.
3. Thêm một dự án có tên, vai trò, tóm tắt, tech stack, URL và impact.
4. Sửa link hoặc dự án, reload trang và xác nhận dữ liệu vẫn còn.
5. Xóa cả hai mục test qua hộp xác nhận để trả database về trạng thái ban đầu.

API tương đương:

```powershell
$link = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/candidates/me/portfolio/links" -Headers $candidateHeaders -ContentType "application/json" -Body '{"type":"GITHUB","url":"https://github.com/careerfit-e2e"}'
$projectBody = @{ name="CareerFit E2E"; role="Full Stack"; summary="Portfolio CRUD test"; techStack=@("React", "Spring Boot"); projectUrl="https://example.com/careerfit"; impact="E2E verified" } | ConvertTo-Json
$project = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/candidates/me/portfolio/projects" -Headers $candidateHeaders -ContentType "application/json" -Body $projectBody

Invoke-RestMethod -Method Patch -Uri "http://localhost:8080/api/candidates/me/portfolio/links/$($link.data.id)" -Headers $candidateHeaders -ContentType "application/json" -Body '{"type":"BLOG","url":"https://example.com/careerfit-blog"}'
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/candidates/me/portfolio" -Headers $candidateHeaders

Invoke-RestMethod -Method Delete -Uri "http://localhost:8080/api/candidates/me/portfolio/links/$($link.data.id)" -Headers $candidateHeaders
Invoke-RestMethod -Method Delete -Uri "http://localhost:8080/api/candidates/me/portfolio/projects/$($project.data.id)" -Headers $candidateHeaders
```

Kết quả mong đợi:

- GET trả đúng `links[]` và `projects[]`; UI không dùng portfolio mẫu khi danh sách rỗng.
- Link type được chuẩn hóa uppercase, tech stack được trim/loại trùng.
- URL không phải HTTP(S), ví dụ `javascript:alert(1)`, trả `400 BAD_REQUEST`.
- Recruiter/admin gọi endpoint candidate Portfolio trả `403`.
- Candidate không thể sửa hoặc xóa link/project thuộc candidate khác.

## 12. Admin MVP control panel

UI:

1. Đăng nhập `ad / 1`.
2. Mở `/admin`.
3. Mở lần lượt `/admin/users`, `/admin/jobs`, `/admin/audit-logs`, `/admin/email-monitor`.
4. Kiểm tra sidebar admin, bảng dữ liệu, loading/error state và các action chính.

API smoke:

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/admin/dashboard" -Headers $adminHeaders
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/admin/users?page=0&size=10" -Headers $adminHeaders
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/admin/jobs?page=0&size=10" -Headers $adminHeaders
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/admin/audit-logs?page=0&size=10" -Headers $adminHeaders
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/admin/email-actions?page=0&size=10" -Headers $adminHeaders
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/admin/email-tokens?page=0&size=10" -Headers $adminHeaders
```

Role guard:

```powershell
Invoke-WebRequest -Uri "http://localhost:8080/api/admin/dashboard" -Headers $candidateHeaders -SkipHttpErrorCheck
Invoke-WebRequest -Uri "http://localhost:8080/api/admin/dashboard" -Headers $recruiterHeaders -SkipHttpErrorCheck
```

Kết quả mong đợi:

- Admin token gọi `/api/admin/*` trả `200`.
- Candidate/Recruiter gọi `/api/admin/*` trả `403`.
- Email action/token monitor chỉ hiển thị id/token đã redact, không lộ raw token.
- Audit log filter không gây lỗi PostgreSQL kiểu `upper(bytea)`.

User suspend/activate:

```powershell
$candidateMe = Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/auth/me" -Headers $candidateHeaders
$candidateUserId = $candidateMe.data.id
Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/admin/users/$candidateUserId/suspend" -Headers $adminHeaders
Invoke-WebRequest -Method Get -Uri "http://localhost:8080/api/auth/me" -Headers $candidateHeaders -SkipHttpErrorCheck
Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/admin/users/$candidateUserId/activate" -Headers $adminHeaders
```

Kết quả mong đợi:

- Sau suspend, request dùng JWT cũ của candidate bị chặn `403`.
- Sau activate, candidate có thể login/request lại bình thường.
- Audit log ghi action suspend/activate.

Job hide/restore:

```powershell
$jobs = Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/admin/jobs?page=0&size=10" -Headers $adminHeaders
$jobId = $jobs.data.content[0].id
Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/admin/jobs/$jobId/hide" -Headers $adminHeaders
Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/admin/jobs/$jobId/restore" -Headers $adminHeaders
```

Kết quả mong đợi:

- Hide chuyển job sang `HIDDEN_BY_ADMIN` và job không còn trong feed candidate active.
- Restore đưa job về `ACTIVE`.
- Audit log ghi action hide/restore.

Nếu fail:

- `401`: admin token chưa được lấy hoặc hết hạn.
- `403`: account không phải admin hoặc security config chưa map `/api/admin/**`.
- UI loading vô hạn: kiểm tra `AdminPages.tsx` error state và Network tab.

## 13. Build/test kỹ thuật trước khi demo

Backend:

```powershell
cd C:\CODING\Thesis\Backend\careerfit-backend
.\mvnw.cmd -DskipTests compile
.\mvnw.cmd test
```

Frontend:

```powershell
cd C:\CODING\Thesis\Frontend
npm run build
```

Kết quả mong đợi:

- Backend compile/test exit code `0`.
- Frontend build exit code `0`.
- Vite có thể cảnh báo bundle lớn hơn 500 kB; đây là warning, không phải fail runtime.
- Nếu Docker/Testcontainers không khả dụng, một số integration test có thể bị skip theo cấu hình hiện tại.

## 14. Test runtime từ DB sạch

Chỉ chạy bước này nếu bạn chấp nhận xóa dữ liệu PostgreSQL local hiện tại. Lệnh `down -v` sẽ xóa volume database.

```powershell
cd C:\CODING\Thesis
docker compose down -v
docker compose up -d postgres
cd C:\CODING\Thesis\Backend\careerfit-backend
.\mvnw.cmd spring-boot:run
```

Sau khi backend start xong, kiểm tra seed demo:

```powershell
$candidateLogin = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/auth/login" -ContentType "application/json" -Body '{"email":"ca","password":"1"}'
$candidateToken = $candidateLogin.data.accessToken
$candidateHeaders = @{ Authorization = "Bearer $candidateToken" }
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/matches/me/cards?page=0&size=20" -Headers $candidateHeaders

$adminLogin = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/auth/login" -ContentType "application/json" -Body '{"email":"ad","password":"1"}'
$adminHeaders = @{ Authorization = "Bearer $($adminLogin.data.accessToken)" }
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/admin/dashboard" -Headers $adminHeaders
```

Kết quả mong đợi:

- Login `ca / 1` thành công.
- Login `ad / 1` thành công và `/api/admin/dashboard` trả `200`.
- `GET /api/matches/me/cards` có dữ liệu hoặc empty-state hợp lệ, không `500`.
- Flyway chạy hết V1-V14, gồm notification policy, `HIDDEN_BY_ADMIN`, admin seed và `user_settings`.

Nếu fail:

- Login demo fail: kiểm tra Flyway seed account demo có chạy chưa.
- `relation does not exist`: backend kết nối nhầm database hoặc migration chưa chạy.
- OCR/Tesseract fail khi upload PDF scan: nếu chạy Maven trên Windows, cần cài Tesseract hoặc tắt OCR bằng `OCR_ENABLED=false`.

## 15. Checklist demo nhanh

- Login candidate `ca / 1` OK.
- `/candidate/jobs` có job card từ backend.
- Apply từ job card/detail tạo application thật.
- `/candidate/applications` refetch được application thật.
- `/candidate/profile?tab=portfolio` thêm/sửa/xóa link và project thật; sau test đã dọn dữ liệu mẫu.
- Withdraw application hoạt động nếu status chưa final.
- `/candidate/automation` update policy và `Run now` Auto-Apply hoạt động.
- Validation lỗi CV/JD hiển thị rõ, không mất dữ liệu form.
- Empty state `NO_MATCH`/`LOW_MATCH_ONLY`/`NO_FILTERED_RESULTS` không làm UI crash.
- Login recruiter `re / 1` OK.
- `/recruiter/jobs` có discovery candidate.
- Invite candidate chưa apply tạo application `INVITED`.
- Approve/reject application gửi/log lifecycle email.
- Email toggle tắt được email nhưng không làm hỏng domain action.
- Login admin `ad / 1` OK.
- `/admin` dashboard render từ backend.
- `/admin/users`, `/admin/jobs`, `/admin/audit-logs`, `/admin/email-monitor` render không treo loading.
- Candidate/Recruiter bị chặn khi gọi `/api/admin/*`.
- Admin suspend/activate user và hide/restore job có audit log.

## 16. Kiểm tra bổ sung sau cập nhật 1-5

### 16.1 Import và batch matching

```powershell
cd C:\CODING\Thesis
node scripts\import-scraped-jobs.mjs --dry-run
node scripts\import-scraped-jobs.mjs
node scripts\rebuild-matchings.mjs
```

Kết quả mong đợi hiện tại: importer đọc 974 row, 500 ITViec + 474 CareerBuilder, không duplicate trong file. Batch xử lý 991 JD ACTIVE x 13 CV `SCORING_DONE`, `failures=0`. Script import là idempotent theo `external_hash`; batch dùng `createdAt DESC, id ASC` để không bỏ JD có timestamp trùng.

### 16.2 JD và Settings

- Login `re / 1`, mở `/recruiter/jobs`: sửa JD, đổi ACTIVE/DRAFT/PAUSED/CLOSED, xuất CSV. Xóa chỉ thành công khi JD chưa có application.
- Login `ca / 1` hoặc `re / 1`, mở Settings: đổi một giá trị, Save, reload và xác nhận giá trị còn giữ.
- API tương ứng: `PATCH /api/jobs/{id}`, `GET /api/jobs/export`, `GET/PATCH /api/settings/me`.

### 16.3 CV đa định dạng

- Upload PDF text, PDF scan, PNG/JPG rõ chữ và DOCX.
- MIME phải đúng extension; PowerShell `Invoke-RestMethod -Form` có thể gửi PNG thành `application/octet-stream`, nên dùng UI hoặc `curl.exe -F "file=@cv.png;type=image/png"`.
- Poll `/api/cv/{cvId}/status` đến `SCORING_DONE`; nếu `FAILED`, xem `errorMessage` và `docker compose logs backend`.

### 16.4 Không fallback mock

- Tắt backend rồi reload các trang job, recruiter và admin.
- Kết quả đúng: loading chuyển thành error/empty state; không xuất hiện user/JD/ứng viên demo giả.
