# CareerFit - Kịch Bản Demo Và Kiểm Thử Chức Năng Thực Tế

Tài liệu này là runbook dùng khi trình diễn trực tiếp CareerFit IT AutoPilot. Các bước được sắp xếp để đi từ Guest đến Candidate, Recruiter và Admin; thao tác chỉ đọc chạy trước, thao tác thay đổi dữ liệu chạy sau, các thao tác có thể làm gián đoạn demo được để cuối cùng.

Tài liệu API/E2E chi tiết hơn nằm tại `CAREERFIT_E2E_TEST_SCRIPT.md`. Danh sách test case đầy đủ nằm tại `TEST_CASES.md`.

## 1. Mục Tiêu Và Phạm Vi

Buổi demo cần chứng minh các điểm sau:

1. Frontend, backend và PostgreSQL kết nối thật; UI không dùng mock khi API lỗi.
2. Guest tìm kiếm và xem việc làm công khai mà không cần đăng nhập.
3. Candidate quản lý CV/hồ sơ/portfolio, xem matching, phản hồi, ứng tuyển và cấu hình AutoFit.
4. Recruiter quản lý JD, khám phá candidate, mời và cập nhật trạng thái application.
5. Admin xem số liệu hệ thống, quản lý user/job, audit log và email/token.
6. Role guard, validation, duplicate protection và empty/error state hoạt động đúng.

Thời lượng đề xuất:

| Phần | Thời lượng |
|---|---:|
| Chuẩn bị và smoke | 5 phút |
| Guest | 5 phút |
| Candidate | 15 phút |
| Recruiter | 12 phút |
| Admin | 8 phút |
| Negative cases và kết luận | 5 phút |

## 2. Quy Tắc Trước Khi Demo

- Dùng Chrome hoặc Edge, mở DevTools ở tab Network để chứng minh request thật.
- Không bật `Preserve log` nếu không cần; lọc Network theo `api`.
- Dùng tên dữ liệu test có prefix `DEMO-E2E-YYYYMMDD` để dễ tìm và xóa.
- Không xóa volume DB ngay trước buổi demo nếu đang dùng 994 JD đã import.
- Không dùng các PDF trong `ui-references` làm CV; đó là tài liệu tham chiếu UI, không phải CV hợp lệ.
- Profile dev dùng `NoOpMailService`: email được ghi vào log, không gửi ra Internet.
- Các thao tác Suspend user, Hide job, Delete job và Revoke token phải thực hiện cuối cùng và phải hoàn tác.

## 3. Tài Khoản Và URL

| Vai trò | Tài khoản | Mật khẩu | Trang chính |
|---|---|---|---|
| Candidate | `ca` | `1` | `/candidate` |
| Recruiter | `re` | `1` | `/recruiter` |
| Admin | `ad` | `1` | `/admin` |

```text
Frontend: http://127.0.0.1:5173
Backend:  http://localhost:8080
Swagger:  http://localhost:8080/swagger-ui.html
DB host:  localhost:5433
```

## 4. Khởi Động Môi Trường

### Terminal 1 - PostgreSQL

```powershell
cd C:\CODING\Thesis
Copy-Item .env.example .env -ErrorAction SilentlyContinue
docker compose up -d postgres
docker compose ps
```

Kết quả đạt: `careerfit-postgres` ở trạng thái `healthy`, port `5433->5432`.

### Terminal 2 - Backend

Chạy bằng Maven:

```powershell
cd C:\CODING\Thesis\Backend\careerfit-backend
.\mvnw.cmd spring-boot:run
```

Hoặc chạy backend Docker để có sẵn Tesseract OCR:

```powershell
cd C:\CODING\Thesis
docker compose --profile backend up -d --build
docker compose logs -f backend
```

Chỉ chọn một cách; không chạy đồng thời hai backend trên port `8080`.

### Terminal 3 - Frontend

```powershell
cd C:\CODING\Thesis\Frontend
npm install
npm run dev
```

Kết quả đạt: Vite hiển thị `http://127.0.0.1:5173`.

## 5. Preflight Bắt Buộc

### PF-01: Kiểm tra tiến trình và API

```powershell
docker compose ps
Test-NetConnection localhost -Port 5433
Test-NetConnection localhost -Port 8080
Test-NetConnection localhost -Port 5173
```

Kết quả đạt: ba port đều mở; PostgreSQL healthy.

### PF-02: Smoke API public và security

```powershell
Invoke-WebRequest -Uri "http://localhost:8080/api/auth/me" -SkipHttpErrorCheck
Invoke-RestMethod -Uri "http://localhost:8080/api/jobs/search?page=0&size=5"
Invoke-RestMethod -Uri "http://localhost:8080/api/jobs/search/suggestions?keyword=React"
```

Kết quả đạt:

- `/api/auth/me` không token trả `401`.
- Job search trả `success=true`, có `data.jobs`.
- Suggestions trả titles/companies/skills.

### PF-03: Chứng minh frontend dùng backend thật

1. Mở `http://127.0.0.1:5173`.
2. Mở DevTools > Network, lọc `api`.
3. Reload trang.
4. Kiểm tra request `/api/jobs/search` trả `200` và Response có envelope từ backend.
5. Tắt backend trong một lần test phụ: UI phải hiện error/empty state, không tự thay bằng mock jobs.
6. Bật lại backend trước khi tiếp tục.

Điều kiện dừng: nếu frontend vẫn hiện danh sách đầy đủ trong khi `/api/jobs/search` fail, không tiếp tục demo cho đến khi xác định nguồn dữ liệu.

## 6. Luồng Guest - Chỉ Đọc

### G-01: Trang chủ công khai

1. Đảm bảo đã logout hoặc mở cửa sổ Incognito.
2. Mở `/`.
3. Quan sát dashboard thị trường, danh sách job mới và nhà tuyển dụng nổi bật.
4. Đổi ngôn ngữ Việt/Anh.

Kết quả đạt: trang không yêu cầu login; không hiển thị score cá nhân, Potential hoặc reason chips riêng tư.

### G-02: Search và suggestions

1. Focus ô tìm kiếm.
2. Nhập `React`.
3. Kiểm tra suggestions xuất hiện.
4. Chọn một suggestion hoặc bấm Search.
5. Xác nhận URL chuyển sang `/jobs?keyword=React`.
6. Xóa keyword và search lại để trở về danh sách chung.

Kết quả đạt: Network có `/api/jobs/search/suggestions` và `/api/jobs/search`; kết quả liên quan keyword.

### G-03: Filter, empty state và khôi phục

1. Mở Filter.
2. Chọn tổ hợp hẹp hoặc nhập keyword `DEMO-NOT-FOUND-999`.
3. Kiểm tra empty state có CTA reset/mở rộng tìm kiếm.
4. Reset filter.

Kết quả đạt: không crash, không giữ kết quả cũ sai keyword.

### G-04: Job detail và employer detail

1. Mở một job card.
2. Kiểm tra title, company, location, salary, skills và JD.
3. Scroll để kiểm tra sticky apply bar.
4. Mở employer detail từ company/employer card.
5. Quay lại job list bằng browser Back.

Kết quả đạt: route đúng job/company; Guest vẫn không thấy metadata matching cá nhân.

### G-05: Login guard và next intent

1. Khi đang là Guest, mở `/candidate/upload`.
2. Kiểm tra màn hình yêu cầu đăng nhập.
3. Bấm Login, xác nhận URL có `next`.
4. Chưa login ở bước này; quay lại để test negative auth trước.

Kết quả đạt: Guest không thao tác được Candidate/Recruiter/Admin route.

## 7. Authentication Và Role Guard

### AUTH-01: Sai credential

1. Mở `/login`.
2. Nhập `ca` và mật khẩu sai.
3. Submit.

Kết quả đạt: hiển thị lỗi đăng nhập; không tạo token trong localStorage; Network trả `401`.

### AUTH-02: Candidate login và redirect

1. Mở lại `/candidate/upload` khi chưa login.
2. Đi qua login guard.
3. Login `ca` / `1`.

Kết quả đạt: quay lại route Candidate đã yêu cầu hoặc dashboard Candidate; localStorage có access token.

### AUTH-03: Cross-role guard

1. Khi đang login Candidate, nhập trực tiếp `/recruiter/jobs`.
2. Nhập trực tiếp `/admin`.

Kết quả đạt: UI redirect về Candidate; nếu gọi API bằng Candidate token thì backend trả `403`.

## 8. Luồng Candidate - Hồ Sơ Và CV

### C-01: Candidate dashboard và personalized jobs

1. Mở `/candidate`.
2. Mở `/candidate/jobs`.
3. Kiểm tra job cards có score, label, Potential và reasons.
4. Trong Network, kiểm tra `/api/matches/me/cards` trả `200`.

Kết quả đạt: account `ca` dùng default CV seeded và nhận matching cards thật.

### C-02: Xem và cập nhật Fixed Profile

1. Mở `/candidate/profile`.
2. Chọn tab Hồ sơ cố định.
3. Ghi lại giá trị hiện tại của một field ít ảnh hưởng, ví dụ `aboutMe`.
4. Thêm suffix `[DEMO-E2E]`, bấm Save.
5. Reload trang.
6. Xác nhận giá trị còn tồn tại.
7. Khôi phục giá trị ban đầu và Save lại.

Kết quả đạt: PATCH profile trả `200`; dữ liệu persist sau reload.

### C-03: Manual CV validation

1. Mở `/candidate/upload`, chọn Manual Creation.
2. Submit form rỗng.
3. Nhập email sai, years = `51`, skills rỗng rồi submit.
4. Sau khi thấy lỗi, nhập bộ dữ liệu hợp lệ:

```text
Display name: DEMO-E2E Fullstack CV
Full name: Demo Candidate
Email: ca@example.com
Desired title: Fullstack Engineer
Years: 4
Skills: React, TypeScript, Spring Boot, PostgreSQL
Language: vi hoặc en
Summary: CV tạo trong buổi demo E2E
```

5. Bấm lưu và bắt đầu matching.

Kết quả đạt: lỗi hiển thị sát field; request hợp lệ tạo CV source `MANUAL`.

### C-04: CV list và set default

1. Quay lại `/candidate/profile`, tab CV đã tạo.
2. Xác nhận CV `DEMO-E2E Fullstack CV` xuất hiện.
3. Bấm Đặt mặc định trên CV mới.
4. Reload trang.
5. Xác nhận chỉ một CV có trạng thái mặc định.
6. Sau khi test xong, đặt CV seed ban đầu về mặc định nếu muốn giữ kết quả matching ổn định.

Kết quả đạt: `POST /api/cv/{cvId}/set-default` trả `200`; không có hai default CV.

### C-05: Upload CV file

1. Chuẩn bị một PDF CV text-based nhỏ hơn 10 MB.
2. Mở Document Parser và upload file.
3. Kiểm tra trạng thái UPLOADED/PROCESSING rồi SCORING_DONE hoặc FAILED có lý do.
4. Thử một file `.txt` hoặc file lớn hơn 10 MB.

Kết quả đạt: PDF hợp lệ được nhận và xử lý async; file sai loại/quá lớn bị từ chối rõ ràng.

Ghi chú: PDF scan cần Tesseract. Backend Docker đã có OCR `vie+eng`; Maven trên Windows cần cài Tesseract hoặc set `TESSERACT_COMMAND`.

### C-06: Portfolio CRUD và URL security

1. Mở `/candidate/profile?tab=portfolio`.
2. Thêm link GitHub `https://github.com/careerfit-demo-e2e`.
3. Thêm project:

```text
Name: DEMO-E2E CareerFit
Role: Full Stack Developer
Summary: Kiểm thử portfolio CRUD
Tech stack: React, Spring Boot, PostgreSQL
URL: https://example.com/careerfit-demo
Impact: Verified during live demo
```

4. Sửa link/project, reload và kiểm tra persist.
5. Thử URL `javascript:alert(1)` qua API hoặc bỏ qua validation trình duyệt.
6. Xóa link và project test.

Kết quả đạt: CRUD thật; URL không phải HTTP(S) bị backend trả `400`; dữ liệu test được dọn sạch.

## 9. Luồng Candidate - Job, Feedback Và Application

### C-07: Search personalized và job detail

1. Mở `/candidate/jobs?keyword=React`.
2. Kiểm tra score/reasons vẫn gắn đúng job.
3. Mở detail của một job `ACTIVE` chưa apply.

Kết quả đạt: public metadata và personalized metadata không bị lẫn giữa các job.

### C-08: Match feedback

1. Trên job card/detail, chọn `Good Match` hoặc `Potential`.
2. Reload và kiểm tra thông báo thành công.
3. Với một job test khác, chọn `Not Interested`.

Kết quả đạt: `POST /api/matches/{matchingId}/feedback` trả `200`; action không xuất hiện cho Guest.

Lưu ý: feedback làm thay đổi tín hiệu học. Không dùng `Bad Match` trên job seed quan trọng nếu muốn giữ kết quả demo ổn định.

### C-09: Apply thủ công

1. Chọn job `ACTIVE` chưa apply.
2. Bấm Apply.
3. Mở `/candidate/applications`.
4. Kiểm tra application mới có job/company/status/thời gian.

Kết quả đạt: `POST /api/applications` tạo một application và trang Applications đọc lại từ backend.

### C-10: Duplicate protection

1. Quay lại cùng job.
2. Bấm Apply lần nữa.

Kết quả đạt: backend trả `409`; UI hiển thị message có thể đọc được; DB không có application trùng.

### C-11: Withdraw

1. Trong `/candidate/applications`, chọn application PENDING/AUTO_APPLIED phù hợp.
2. Bấm Rút đơn.
3. Refetch hoặc reload.

Kết quả đạt: status chuyển `NOT_INTERESTED`; application final `APPROVED/REJECTED` không cho withdraw.

## 10. Candidate Automation, Analytics Và Settings

### C-12: Email toggle

1. Mở `/candidate/automation`.
2. Tắt email notifications.
3. Reload và xác nhận trạng thái persist.
4. Bật lại để không ảnh hưởng các bước sau.

Kết quả đạt: policy thay đổi; tắt email không chặn domain action như apply/withdraw.

### C-13: Auto-Apply run now

1. Bật Auto Apply.
2. Đặt threshold hợp lệ, ví dụ `80`.
3. Bấm Run now.
4. Mở Applications kiểm tra application `AUTO_APPLIED` nếu còn match đủ điều kiện.
5. Chạy lần hai.

Kết quả đạt:

- Lần đầu có thể trả `CREATED_APPLICATIONS`.
- Nếu đã hết job hợp lệ, `created=0`, reason `NO_ELIGIBLE_MATCHES` là kết quả đúng.
- Không tạo application trùng.

### C-14: Advanced Analytics

1. Mở `/candidate/advanced-analytics`.
2. Kiểm tra market overview, skill demand, profile gaps và match trends.
3. Thay range/filter nếu UI hỗ trợ.

Kết quả đạt: chart không blank/crash; API `/api/analytics/market/*` và `/api/candidate/analytics/*` trả `200`.

### C-15: Settings persistence và logout

1. Mở `/candidate/settings`.
2. Thay một setting không nguy hiểm, Save và reload.
3. Khôi phục giá trị ban đầu.
4. Logout.

Kết quả đạt: `/api/settings/me` persist; logout xóa token/account và quay về Guest.

## 11. Luồng Recruiter

### R-01: Login, dashboard và role guard

1. Login `re` / `1`.
2. Mở `/recruiter`.
3. Kiểm tra summary cards, job metrics và market data.
4. Thử mở `/candidate/profile` và `/admin`.

Kết quả đạt: dashboard dùng API thật; cross-role route bị redirect.

### R-02: Recruiter job list và filters

1. Mở `/recruiter/jobs`.
2. Search theo title/company.
3. Đổi status filter và sort.
4. Chọn một JD để xem detail, ranking, applicants và potential.

Kết quả đạt: URL giữ query/subview; job/candidate card cập nhật đúng selection.

### R-03: Tạo JD thật

1. Bấm Đăng việc.
2. Submit form thiếu title hoặc JD quá ngắn để kiểm tra validation.
3. Nhập dữ liệu hợp lệ:

```text
Title: DEMO-E2E Fullstack Engineer
Company: CareerFit Demo Lab
Required skills: React, TypeScript, Spring Boot, PostgreSQL
Nice-to-have: Docker, AWS
Seniority: MID
Employment type: FULL_TIME
Location: Ho Chi Minh
Work model: HYBRID
Salary mode: RANGE
Min/Max: 20000000 / 35000000
Currency: VND
Domain: Software
JD: ít nhất một đoạn đầy đủ mô tả trách nhiệm, yêu cầu và kỹ năng
```

4. Submit và xác nhận JD xuất hiện trong list.

Kết quả đạt: `POST /api/jobs` trả `201`; job mới thuộc recruiter `re`.

### R-04: Edit và status lifecycle

1. Mở JD `DEMO-E2E Fullstack Engineer`.
2. Sửa title hoặc thêm skill Docker, Save.
3. Đổi trạng thái ACTIVE -> PAUSED.
4. Mở public `/jobs` ở tab khác, xác nhận job không nằm trong active search.
5. Đổi PAUSED -> ACTIVE và xác nhận xuất hiện lại.

Kết quả đạt: update và status API trả `200`; public visibility bám status.

### R-05: Candidate discovery và filters

1. Chọn một job có matching, ưu tiên job seed nếu JD mới chưa recompute xong.
2. Mở lần lượt Ranking, Applicants và Potential.
3. Test filter High, Potential, Applied, Not Applied.
4. Kiểm tra score, reasons, applicationStatus và tie note.
5. Dùng filter không có kết quả để kiểm tra `NO_FILTERED_RESULTS`.

Kết quả đạt: discovery không lẫn candidate giữa các job; empty state rõ ràng.

### R-06: Invite và idempotency

1. Chọn candidate chưa apply có score phù hợp.
2. Bấm Invite.
3. Refetch và xác nhận status `INVITED`.
4. Bấm Invite lại cùng candidate/job.

Kết quả đạt: không tạo application trùng; trả application hiện có hoặc trạng thái idempotent.

### R-07: Approve/Reject application

1. Chọn candidate có applicationId.
2. Bấm Approve.
3. Với application test khác, bấm Reject.
4. Login Candidate hoặc dùng API để kiểm tra status phản ánh đúng.

Kết quả đạt: PATCH status trả `200`; audit/email lifecycle được ghi.

### R-08: Recruiter feedback

1. Chọn candidate matching chưa final.
2. Mark Potential hoặc gửi feedback phù hợp.

Kết quả đạt: feedback role `RECRUITER` được lưu; không sửa application status ngoài ý muốn.

### R-09: Export CSV

1. Bấm Export jobs.
2. Mở file CSV.
3. Kiểm tra UTF-8, header, dấu phẩy/quote và JD vừa tạo.

Kết quả đạt: file tải từ `GET /api/jobs/export`, không phải blob rỗng; ký tự tiếng Việt không lỗi.

### R-10: Recruiter Analytics và Settings

1. Mở `/recruiter/analytics` và `/recruiter/advanced-analytics`.
2. Kiểm tra overview, trends, funnel/skill gaps nếu chọn job.
3. Mở `/recruiter/settings`, thay một setting, Save/reload rồi khôi phục.

Kết quả đạt: analytics không crash; settings persist qua backend.

### R-11: Delete guard và cleanup JD

1. Nếu JD demo chưa có application, thử Delete và xác nhận xóa thành công.
2. Nếu JD có application, Delete phải bị chặn; chuyển CLOSED thay vì xóa.

Kết quả đạt: không xóa cascade application ngoài ý muốn; thông báo giải thích được lý do.

## 12. Luồng Admin - Thực Hiện Cuối Buổi

### A-01: Login và dashboard

1. Logout Recruiter.
2. Login `ad` / `1`.
3. Mở `/admin`.

Kết quả đạt: hiển thị tổng Candidate/Recruiter, active jobs, applications, high/potential matches và email actions.

### A-02: User management và hoàn tác

1. Mở `/admin/users`.
2. Chọn một user test không phải `ca`, `re`, `ad`.
3. Suspend user.
4. Mở cửa sổ Incognito và thử login user đó.
5. Quay lại Admin và Activate user.

Kết quả đạt: user bị suspend không login được; activate khôi phục login; audit log có hai action.

Không suspend `ad` đang dùng hoặc account demo chính trong lúc trình bày.

### A-03: Job moderation và hoàn tác

1. Mở `/admin/jobs`.
2. Chọn JD `DEMO-E2E Fullstack Engineer` hoặc một job test riêng.
3. Hide job.
4. Mở public search ở tab Incognito, xác nhận job biến mất.
5. Restore job.

Kết quả đạt: status chuyển `HIDDEN_BY_ADMIN`, recruiter không tự bypass được; restore về active.

### A-04: Audit logs

1. Mở `/admin/audit-logs`.
2. Kiểm tra các action vừa tạo: login, application, status update, hide/restore, suspend/activate.
3. Kiểm tra timestamp, actor, target và result.

Kết quả đạt: log append-only, action mới xuất hiện và không lộ secret/token đầy đủ.

### A-05: Email/token monitor

1. Mở `/admin/email-monitor`.
2. Kiểm tra email actions và token validity.
3. Chỉ Retry action test ở trạng thái phù hợp.
4. Không revoke passwordless token đang cần cho phần demo khác.

Kết quả đạt: retry cập nhật trạng thái; token chỉ hiển thị prefix/metadata an toàn.

### A-06: Admin role security

1. Logout Admin, login Candidate.
2. Gọi trực tiếp `/api/admin/dashboard` bằng Candidate token hoặc mở `/admin`.

Kết quả đạt: backend trả `403`, UI không hiển thị admin data.

## 13. Email Action Và Passwordless

Phần này chỉ chạy nếu đã chuẩn bị token test trước buổi demo.

### E-01: Passwordless

1. Request passwordless token cho user hợp lệ.
2. Verify token lần đầu.
3. Verify lại cùng token.
4. Thử token sai/hết hạn.

Kết quả đạt: lần đầu trả JWT; replay bị từ chối; token invalid/expired có message rõ.

### E-02: Email action token

1. Mở link redeem của token PENDING.
2. Kiểm tra trang HTML success.
3. Mở lại cùng link.

Kết quả đạt: action thực thi một lần; lần hai hiển thị đã xử lý, không duplicate feedback/application.

## 14. Negative Cases Bắt Buộc

| ID | Tương tác | Kết quả đạt |
|---|---|---|
| N-01 | Login sai mật khẩu | `401`, không token |
| N-02 | Guest gọi Candidate API | `401` |
| N-03 | Candidate gọi Recruiter/Admin API | `403` |
| N-04 | Recruiter gọi Candidate/Admin API | `403` |
| N-05 | Job UUID sai format | `400`, không stack trace |
| N-06 | Search keyword không tồn tại | `200`, list rỗng |
| N-07 | Apply trùng | `409`, không duplicate row |
| N-08 | Apply job CLOSED/PAUSED | `400` |
| N-09 | Set default CV người khác | `403/404` |
| N-10 | Portfolio URL `javascript:` | `400` |
| N-11 | Salary RANGE min > max | `400 VALIDATION_ERROR` |
| N-12 | Recruiter sửa/xóa job người khác | `403` |
| N-13 | Withdraw application final | `400` |
| N-14 | Auto-Apply threshold ngoài 50-100 | `400` |
| N-15 | Backend tắt khi UI mở | UI error state, không mock fallback |

## 15. Responsive Và Accessibility Smoke

1. Test viewport 390x844, 768x1024 và 1440x900.
2. Đi qua Guest home, Candidate jobs/detail, Recruiter jobs và Admin tables.
3. Dùng Tab/Shift+Tab qua search, modal, form và actions.
4. Nhấn Escape hoặc Close ở modal.
5. Kiểm tra focus visible, text không overlap, không scroll ngang vô lý.
6. Bật `prefers-reduced-motion` và xác nhận UI vẫn dùng được.

Kết quả đạt: workflow chính hoàn thành bằng keyboard; button icon-only có accessible name.

## 16. Cleanup Sau Demo

Thực hiện theo thứ tự:

1. Restore user đã suspend.
2. Restore job đã hide.
3. Bật lại email notifications nếu đã tắt.
4. Khôi phục profile/settings đã sửa.
5. Xóa link/project có prefix `DEMO-E2E`.
6. Xóa JD `DEMO-E2E Fullstack Engineer` nếu chưa có application; nếu đã có application, chuyển CLOSED.
7. Đặt lại CV seed làm default nếu đã đổi.
8. Không xóa audit log; đây là dữ liệu append-only.

Dừng runtime:

```powershell
# Dừng frontend/backend Maven bằng Ctrl+C tại terminal tương ứng.
cd C:\CODING\Thesis
docker compose down
```

Không dùng `docker compose down -v` trừ khi chủ động muốn xóa toàn bộ DB local.

## 17. Phiếu Ghi Kết Quả

| Nhóm | Pass/Fail/Blocked | Evidence | Ghi chú |
|---|---|---|---|
| Preflight |  |  |  |
| Guest |  |  |  |
| Authentication/Role |  |  |  |
| Candidate CV/Profile/Portfolio |  |  |  |
| Candidate Job/Feedback/Application |  |  |  |
| Candidate Automation/Analytics |  |  |  |
| Recruiter JD/Discovery/Application |  |  |  |
| Recruiter Analytics/Settings |  |  |  |
| Admin |  |  |  |
| Email/Passwordless |  |  |  |
| Negative/Security |  |  |  |
| Responsive/Accessibility |  |  |  |
| Cleanup |  |  |  |

Evidence nên lưu:

- Screenshot UI trước/sau action.
- Network request URL, method, status và response body.
- Backend log có requestId cho lỗi.
- ID của job/CV/application/feedback được tạo.
- Timestamp bắt đầu/kết thúc và commit đang demo.

## 18. Điều Kiện Kết Luận Demo Đạt

Demo được coi là đạt khi:

- DB, backend và frontend chạy ổn định, API chính không có `500`.
- Guest, Candidate, Recruiter và Admin đều hoàn thành ít nhất một luồng end-to-end thật.
- Không có role bypass hoặc rò rỉ dữ liệu cá nhân sang Guest.
- Apply/invite/Auto-Apply không tạo duplicate.
- Validation và error state hiển thị có thể hiểu được.
- Mọi thao tác destructive trong demo đã được hoàn tác hoặc ghi nhận rõ.

