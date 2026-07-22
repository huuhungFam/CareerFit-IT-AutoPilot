# CareerFit - Kịch Bản Demo Và Kiểm Thử Chức Năng Thực Tế

Tài liệu này là runbook dùng khi trình diễn trực tiếp CareerFit IT AutoPilot trên giao diện frontend. Các bước được sắp xếp để đi từ Guest đến Candidate, Recruiter và Admin; thao tác chỉ đọc chạy trước, thao tác thay đổi dữ liệu chạy sau, các thao tác có thể làm gián đoạn demo được để cuối cùng.

Trong phần demo chính, người trình bày chỉ thao tác bằng trình duyệt. PowerShell chỉ dùng trước hoặc sau buổi demo để khởi động, dừng, backup hoặc reset môi trường; không dùng console, Swagger, câu lệnh API hay truy vấn database để chứng minh chức năng trước người xem.

Tài liệu API/E2E chi tiết hơn nằm tại `CAREERFIT_E2E_TEST_SCRIPT.md`. Danh sách test case đầy đủ nằm tại `TEST_CASES.md`.

## 1. Mục Tiêu Và Phạm Vi

Buổi demo cần chứng minh các điểm sau:

1. Giao diện tải được dữ liệu thật từ hệ thống và hiển thị rõ loading, thành công, dữ liệu rỗng hoặc lỗi.
2. Guest tìm kiếm và xem việc làm công khai mà không cần đăng nhập.
3. Candidate quản lý CV/hồ sơ/portfolio, xem matching, phản hồi, ứng tuyển và cấu hình AutoFit.
4. Recruiter quản lý JD, khám phá candidate, mời và cập nhật trạng thái application.
5. Admin xem số liệu hệ thống, quản lý user/job, audit log và email/token.
6. Role guard, validation, duplicate protection và empty/error state thể hiện rõ ngay trên giao diện.

Thời lượng đề xuất:

| Phần | Thời lượng |
|---|---:|
| Chuẩn bị và smoke | 5 phút |
| Guest | 5 phút |
| Candidate | 15 phút |
| Recruiter | 12 phút |
| Admin | 8 phút |
| Negative cases và kết luận | 5 phút |

Thứ tự chạy ngắn gọn:

1. Người vận hành khởi động hệ thống và hoàn thành PF-01..02 trước khi chia sẻ màn hình.
2. Demo Guest và đăng nhập/role guard.
3. Tạo user tạm, sau đó demo Candidate; giữ lại một application chờ xử lý.
4. Demo Recruiter; xử lý application Candidate và giữ lại JD chính.
5. Demo Admin; suspend/activate user tạm và hide/restore JD chính.
6. Chạy các negative case frontend cần thiết, ghi kết quả và cleanup.

## 2. Quy Tắc Trước Khi Demo

- Dùng Chrome hoặc Edge ở chế độ trình duyệt bình thường; không cần mở DevTools trong lúc trình bày.
- Chuẩn bị sẵn một cửa sổ thường và một cửa sổ Incognito để kiểm tra Guest/role guard mà không phải xóa phiên đăng nhập liên tục.
- Dùng tên dữ liệu test có prefix `DEMO-E2E-YYYYMMDD` để dễ tìm và xóa.
- Không xóa volume DB ngay trước buổi demo nếu đang dùng 994 JD đã import.
- Không dùng các PDF trong `ui-references` làm CV; đó là tài liệu tham chiếu UI, không phải CV hợp lệ.
- Profile `dev` mặc định đặt `APP_MAIL_ENABLED=false`: email không gửi ra Internet. Nếu demo passwordless, phải chuẩn bị sẵn link frontend hợp lệ trước buổi trình bày.
- Các thao tác Suspend user, Hide job và Delete job phải thực hiện cuối cùng và phải hoàn tác.

## 3. Tài Khoản Và URL

| Vai trò | Tài khoản | Mật khẩu | Trang chính |
|---|---|---|---|
| Candidate | `ca` | `1` | `/candidate` |
| Recruiter | `re` | `1` | `/recruiter` |
| Admin | `ad` | `1` | `/admin` |

```text
Frontend: http://127.0.0.1:5173
Backend:  http://localhost:8080
DB host:  localhost:5433
```

Các route viết ngắn như `/candidate/jobs` đều được mở dưới frontend `http://127.0.0.1:5173`. Ví dụ: `/candidate/jobs` nghĩa là `http://127.0.0.1:5173/candidate/jobs`.

## 4. Khởi Động Môi Trường

### Yêu cầu trên máy demo

- Docker Desktop đang chạy.
- Java 21 có trong `PATH` nếu chạy backend bằng Maven.
- Node.js 20 và npm đã được cài.
- Chrome hoặc Edge đã cập nhật; độ zoom để 100%.
- Không có tiến trình cũ chiếm port `5433`, `8080` hoặc `5173`.

Kiểm tra nhanh ở hậu trường:

```powershell
docker version
java -version
node --version
npm --version
```

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
npm ci
npm run dev
```

Kết quả đạt: Vite hiển thị `http://127.0.0.1:5173`.

## 5. Preflight Bắt Buộc Trước Khi Trình Chiếu

Phần này do người vận hành thực hiện trước khi chia sẻ màn hình. Khi bắt đầu demo, chỉ giữ lại cửa sổ trình duyệt frontend.

### PF-01: Kiểm tra tiến trình ở hậu trường

```powershell
docker compose ps
Test-NetConnection localhost -Port 5433
Test-NetConnection localhost -Port 8080
Test-NetConnection localhost -Port 5173
Invoke-RestMethod -Uri "http://localhost:8080/actuator/health"
```

Kết quả đạt: ba port đều mở, PostgreSQL healthy và health status là `UP`. Không cần trình chiếu terminal này.

### PF-02: Kiểm tra frontend bằng trình duyệt

1. Mở `http://127.0.0.1:5173` trong cửa sổ thường.
2. Xác nhận trang chủ hiện dashboard thị trường, việc làm mới và nhà tuyển dụng nổi bật; không có banner lỗi hoặc loading kéo dài.
3. Mở `http://127.0.0.1:5173/jobs`, xác nhận có danh sách việc làm.
4. Mở `http://127.0.0.1:5173/login`, xác nhận form đăng nhập hiển thị đầy đủ.
5. Mở một cửa sổ Incognito tại `http://127.0.0.1:5173` để dành cho các bước Guest/Admin kiểm tra chéo.

Kết quả đạt: ba trang frontend mở bình thường, dữ liệu hiển thị và các nút chính có thể tương tác.

Điều kiện dừng: không bắt đầu demo nếu trang báo lỗi kết nối, danh sách job không tải được hoặc login không phản hồi.

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

Kết quả đạt: suggestions xuất hiện đúng lúc; trang kết quả hiển thị các việc làm liên quan đến keyword và URL giữ từ khóa tìm kiếm.

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

Kết quả đạt: hiển thị thông báo sai tài khoản hoặc mật khẩu, vẫn ở trang Login và chưa xuất hiện workspace Candidate.

### AUTH-02: Candidate login và redirect

1. Mở lại `/candidate/upload` khi chưa login.
2. Đi qua login guard.
3. Login `ca` / `1`.

Kết quả đạt: quay lại trang Upload CV đã yêu cầu hoặc dashboard Candidate; header hiển thị đúng tên/vai trò Candidate.

### AUTH-03: Cross-role guard

1. Khi đang login Candidate, nhập trực tiếp `/recruiter/jobs`.
2. Nhập trực tiếp `/admin`.

Kết quả đạt: giao diện chuyển về workspace Candidate và không hiển thị dữ liệu Recruiter/Admin.

### AUTH-04: Tạo user tạm cho phần Admin

Thực hiện bước này trước khi tiếp tục Candidate flow để A-02 có tài khoản biết mật khẩu:

1. Logout Candidate và mở `/register`.
2. Đăng ký role Candidate với dữ liệu:

```text
Full name: DEMO-E2E Suspend User
Email: demo-e2e-suspend-20260722@example.com
Password: Demo@12345
```

3. Xác nhận đăng ký thành công và vào được workspace Candidate.
4. Logout, sau đó login lại `ca` / `1` để tiếp tục C-01.

Kết quả đạt: user tạm đăng nhập được trước khi bị Admin suspend; lưu lại email/mật khẩu để dùng tại A-02.

## 8. Luồng Candidate - Hồ Sơ Và CV

### C-01: Candidate dashboard và personalized jobs

1. Mở `/candidate`.
2. Mở `/candidate/jobs`.
3. Kiểm tra job cards có score, label, Potential và reasons.
4. Mở một job card và kiểm tra score/reasons vẫn khớp với card đã chọn.

Kết quả đạt: account `ca` dùng default CV seeded và nhận matching cards thật.

### C-02: Xem và cập nhật Fixed Profile

1. Mở `/candidate/profile`.
2. Chọn tab Hồ sơ cố định.
3. Ghi lại giá trị hiện tại của một field ít ảnh hưởng, ví dụ `aboutMe`.
4. Thêm suffix `[DEMO-E2E]`, bấm Save.
5. Reload trang.
6. Xác nhận giá trị còn tồn tại.
7. Khôi phục giá trị ban đầu và Save lại.

Kết quả đạt: hiện thông báo lưu thành công; dữ liệu vẫn còn sau reload.

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

Kết quả đạt: lỗi hiển thị sát field; dữ liệu hợp lệ tạo CV mới và chuyển sang trạng thái chấm điểm/matching.

### C-04: CV list và set default

1. Quay lại `/candidate/profile`, tab CV đã tạo.
2. Xác nhận CV `DEMO-E2E Fullstack CV` xuất hiện.
3. Bấm Đặt mặc định trên CV mới.
4. Reload trang.
5. Xác nhận chỉ một CV có trạng thái mặc định.
6. Đặt lại `Demo Candidate - Fullstack CV` làm mặc định trước khi sang C-07 để giữ dữ liệu matching ổn định.

Kết quả đạt: hiện thông báo thành công và chỉ một CV có nhãn mặc định sau reload.

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
5. Thử nhập một URL sai định dạng như `abc`; form phải chặn lưu hoặc hiển thị lỗi ngay trên giao diện.
6. Xóa link và project test.

Kết quả đạt: thêm, sửa, reload và xóa đều phản ánh đúng trên giao diện; URL sai không được lưu.

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

Kết quả đạt: giao diện báo đã ghi nhận phản hồi; action feedback không xuất hiện khi xem bằng Guest hoặc Recruiter.

Lưu ý: feedback làm thay đổi tín hiệu học. Không dùng `Bad Match` trên job seed quan trọng nếu muốn giữ kết quả demo ổn định.

### C-09: Apply thủ công

1. Chọn job seed `Demo Fullstack Engineer` của `CareerFit Demo Lab`; nếu đã từng apply từ lần demo trước, reset/snapshot dữ liệu trước khi bắt đầu.
2. Bấm Apply.
3. Mở `/candidate/applications`.
4. Kiểm tra application mới có job/company/status/thời gian.

Kết quả đạt: hiện thông báo ứng tuyển thành công và đơn mới xuất hiện trong trang Applications sau reload.

### C-10: Duplicate protection

1. Quay lại cùng job.
2. Bấm Apply lần nữa.

Kết quả đạt: UI thông báo đã ứng tuyển hoặc không cho gửi trùng; danh sách Applications chỉ có một đơn cho job đó.

### C-11: Giữ application cho luồng Recruiter

1. Trong `/candidate/applications`, xác nhận application vừa tạo đang ở trạng thái chờ xử lý.
2. Ghi lại chính xác tên job và candidate `ca` để Recruiter dùng tại R-07.
3. Không rút đơn ở bước này; thao tác Withdraw được thực hiện sau khi Recruiter đã kiểm tra lifecycle hoặc trên một application test khác.

Kết quả đạt: application còn trong danh sách và sẵn sàng xuất hiện ở tab Applicants của Recruiter.

## 10. Candidate Automation, Analytics Và Settings

### C-12: Automation policy

1. Mở `/candidate/automation`.
2. Bật/tắt Auto Apply, điều chỉnh ngưỡng trong khoảng 50-100 và kiểm tra nút Run now chỉ khả dụng khi Auto Apply bật.
3. Tắt email notifications; kiểm tra các điều khiển phụ thuộc email bị vô hiệu hóa.
4. Ghi lại high-match threshold ban đầu, đổi thành `88`, reload và xác nhận giá trị vẫn là `88`.
5. Khôi phục policy ban đầu, gồm email notifications, để không ảnh hưởng các bước sau.

Kết quả đạt: mỗi thay đổi hiện thông báo đã lưu, còn nguyên sau reload và không chặn Apply/Withdraw thủ công.

### C-13: Auto-Apply run now

1. Bật Auto Apply.
2. Đặt threshold hợp lệ, ví dụ `80`.
3. Bấm Run now.
4. Mở Applications kiểm tra đơn mới có trạng thái `PENDING` và được đánh dấu auto-applied nếu còn match đủ điều kiện.
5. Chạy lần hai.

Kết quả đạt:

- Lần đầu có thể trả `CREATED_APPLICATIONS`.
- Nếu đã hết job hợp lệ, `created=0`, reason `NO_ELIGIBLE_MATCHES` là kết quả đúng.
- Không tạo application trùng.

### C-14: Advanced Analytics

1. Mở `/candidate/advanced-analytics`.
2. Kiểm tra market overview, skill demand, salary distribution, profile gaps và match trends.
3. Chọn lần lượt khoảng `7`, `30` và `90` ngày ở phần market overview.

Kết quả đạt: các chart có tiêu đề, trục/chú thích và dữ liệu; đổi khoảng thời gian làm nội dung cập nhật mà không blank/crash.

### C-15: Settings persistence và logout

1. Mở `/candidate/settings`.
2. Ghi lại Alert threshold ban đầu, đổi thành `89`, bấm Save và reload.
3. Khôi phục giá trị ban đầu.
4. Logout.

Kết quả đạt: setting còn nguyên sau reload; Logout đưa giao diện về Guest và các route Candidate yêu cầu đăng nhập lại.

## 11. Luồng Recruiter

### R-01: Login, dashboard và role guard

1. Login `re` / `1`.
2. Mở `/recruiter`.
3. Kiểm tra summary cards, job metrics và market data.
4. Thử mở `/candidate/profile` và `/admin`.

Kết quả đạt: dashboard hiển thị số liệu và danh sách việc làm; cross-role route bị chuyển về workspace Recruiter.

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
JD: Build and maintain CareerFit web features using React, TypeScript, Spring Boot and PostgreSQL. Collaborate with product and QA, write automated tests, review code and deploy services with Docker. Candidates should have at least three years of full-stack development experience.
```

4. Submit và xác nhận JD xuất hiện trong list.

Kết quả đạt: hiện thông báo tạo thành công; JD mới xuất hiện trong danh sách của recruiter `re` sau reload.

### R-04: Edit và status lifecycle

1. Mở JD `DEMO-E2E Fullstack Engineer`.
2. Giữ nguyên title để các bước sau dễ tìm; thêm skill Docker rồi Save.
3. Đổi trạng thái ACTIVE -> PAUSED.
4. Mở public `/jobs` ở tab khác, xác nhận job không nằm trong active search.
5. Đổi PAUSED -> ACTIVE và xác nhận xuất hiện lại.

Kết quả đạt: nội dung đã sửa còn nguyên sau reload; job biến mất khi PAUSED và xuất hiện lại khi ACTIVE trên trang public.

### R-05: Candidate discovery và filters

1. Mở job mới `DEMO-E2E Fullstack Engineer`; hệ thống bắt đầu matching sau khi tạo JD.
2. Nếu chưa có candidate, chờ khoảng 5-15 giây rồi reload trang cho đến khi Ranking xuất hiện.
3. Mở lần lượt Ranking, Applicants và Potential.
4. Test filter High, Potential, Applied, Not Applied.
5. Kiểm tra score, reasons, application status và tie note.
6. Dùng filter không có kết quả để kiểm tra empty state.

Kết quả đạt: discovery không lẫn candidate giữa các job; empty state rõ ràng.

### R-06: Invite và idempotency

1. Trên job mới `DEMO-E2E Fullstack Engineer`, chọn một candidate chưa apply và không phải `Demo Candidate`/account `ca`.
2. Bấm Invite.
3. Refetch và xác nhận status `INVITED`.
4. Bấm Invite lại cùng candidate/job.
5. Ghi lại tên candidate vừa mời để dùng làm application thứ hai tại R-07.

Kết quả đạt: không tạo application trùng; trả application hiện có hoặc trạng thái idempotent.

### R-07: Approve/Reject application

1. Mở tab Applicants của `Demo Fullstack Engineer` và tìm `Demo Candidate`/account `ca`.
2. Mở Review và bấm Approve; xác nhận card đổi sang `APPROVED`.
3. Chuyển sang job `DEMO-E2E Fullstack Engineer`, mở candidate đã Invite tại R-06 và bấm Reject; xác nhận card đổi sang `REJECTED`.
4. Logout Recruiter, login lại `ca` / `1`, mở `/candidate/applications` và xác nhận application tương ứng hiện `APPROVED`.
5. Logout Candidate, login lại `re` / `1` để tiếp tục.

Kết quả đạt: hai trạng thái Approve/Reject được lưu và vẫn đúng sau reload; Candidate nhìn thấy trạng thái application của mình.

### R-08: Recruiter candidate actions không dùng Candidate feedback endpoint

1. Chọn candidate matching chưa apply hoặc có application.
2. Kiểm tra chỉ có Invite/Review hoặc Approve/Reject theo trạng thái.
3. Xác nhận không có Rocchio feedback controls hay Mark Potential.

Kết quả đạt: Recruiter chỉ thấy các action Invite/Review/Approve/Reject; không thấy các nút feedback dành cho Candidate.

### R-09: Export CSV

1. Bấm Export jobs.
2. Mở file CSV.
3. Kiểm tra UTF-8, header, dấu phẩy/quote và JD vừa tạo.

Kết quả đạt: trình duyệt tải file CSV không rỗng; file có header, JD vừa tạo và ký tự tiếng Việt hiển thị đúng.

### R-10: Recruiter Analytics và Settings

1. Mở `/recruiter/analytics` và `/recruiter/advanced-analytics`.
2. Kiểm tra overview, market trend, funnel và skill gap của một JD thuộc recruiter.
3. Mở `/recruiter/automation` và `/recruiter/settings`; thay một setting an toàn, reload rồi khôi phục.

Kết quả đạt: analytics không crash; settings persist qua backend.

### R-11: Delete một JD dùng riêng cho cleanup

1. Tạo thêm một JD bằng cách dùng lại toàn bộ dữ liệu hợp lệ ở R-03, chỉ đổi title thành `DEMO-E2E DELETE ONLY`; không Invite hoặc Apply candidate vào JD này.
2. Mở JD vừa tạo, bấm Delete và xác nhận trong modal.
3. Search lại title để xác nhận JD đã biến mất.
4. Giữ nguyên `DEMO-E2E Fullstack Engineer` ở trạng thái ACTIVE để Admin dùng tại A-03; chưa xóa JD này.

Kết quả đạt: chỉ JD `DELETE ONLY` bị xóa; JD chính vẫn còn để tiếp tục demo.

## 12. Luồng Admin - Thực Hiện Cuối Buổi

### A-01: Login và dashboard

1. Logout Recruiter.
2. Login `ad` / `1`.
3. Mở `/admin`.

Kết quả đạt: hiển thị tổng Candidate/Recruiter, active jobs, applications, high/potential matches và email actions.

### A-02: User management và hoàn tác

1. Mở `/admin/users`.
2. Tìm user `demo-e2e-suspend-20260722@example.com` đã tạo tại AUTH-04.
3. Bấm Suspend và xác nhận trạng thái chuyển sang `SUSPENDED`/Tạm khóa.
4. Mở cửa sổ Incognito và thử login bằng `demo-e2e-suspend-20260722@example.com` / `Demo@12345`.
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

Kết quả đạt: các dòng log mới xuất hiện với thời gian, actor, action, target và result; không hiển thị mật khẩu hoặc raw token.

### A-05: Email/token monitor

1. Mở `/admin/email-monitor`.
2. Kiểm tra email actions và token validity.
3. Với một email action test ở trạng thái phù hợp, bấm `Mark pending` để gọi retry và reload bảng.
4. Kiểm tra bảng chỉ có thông tin người nhận, loại, trạng thái và tính hợp lệ; không có raw token.

Kết quả đạt: hiện thông báo cập nhật thành công; trạng thái action đổi sau reload và không lộ raw token.

### A-06: Admin role security

1. Logout Admin, login Candidate.
2. Nhập trực tiếp `http://127.0.0.1:5173/admin` trên thanh địa chỉ.

Kết quả đạt: giao diện chuyển về Candidate; không hiển thị dashboard hoặc dữ liệu Admin.

## 13. Passwordless Trên Frontend - Tùy Chọn

Phần này là tùy chọn. Với profile dev mặc định, email thật không được gửi nên không thể hoàn thành luồng chỉ bằng frontend. Chỉ trình bày khi đã cấu hình mail thật và có inbox test, hoặc người vận hành đã chuẩn bị sẵn link frontend hợp lệ trước khi chia sẻ màn hình.

### E-01: Passwordless

1. Tại `/login`, nhập email của inbox test rồi bấm nút gửi liên kết đăng nhập.
2. Mở inbox test trên trình duyệt và bấm liên kết CareerFit nhận được.
3. Xác nhận liên kết mở route frontend `/auth/magic-link/verify` và màn hình hiển thị trạng thái xác minh.
4. Bấm xác nhận đăng nhập nếu giao diện yêu cầu; kiểm tra được chuyển về dashboard đúng role.
5. Mở lại cùng liên kết trong Incognito để kiểm tra token đã dùng.

Kết quả đạt: lần đầu đăng nhập thành công; lần mở lại hiển thị token không còn hợp lệ hoặc đã được sử dụng.

Email action redeem mở trang HTML do backend trả trực tiếp, không phải giao diện React frontend. Vì vậy luồng này không nằm trong buổi demo frontend-only; phần Admin Email Monitor tại A-05 là đủ để trình bày khả năng theo dõi email action.

## 14. Negative Cases Trên Giao Diện

Chỉ thực hiện các trường hợp có thể quan sát trực tiếp bằng frontend. Kiểm tra bảo mật cấp API nằm trong bộ automated test, không thuộc kịch bản trình chiếu.

| ID | Thao tác trên frontend | Kết quả nhìn thấy |
|---|---|---|
| N-01 | Login `ca` với mật khẩu sai | Hiện lỗi, vẫn ở Login |
| N-02 | Guest mở `/candidate/profile` | Hiện màn hình yêu cầu đăng nhập |
| N-03 | Candidate mở `/recruiter/jobs` hoặc `/admin` | Chuyển về workspace Candidate |
| N-04 | Recruiter mở `/candidate/profile` hoặc `/admin` | Chuyển về workspace Recruiter |
| N-05 | Mở `/jobs/00000000-0000-0000-0000-000000000000` | Hiện trạng thái không tìm thấy/lỗi có thể hiểu được, không crash |
| N-06 | Search `DEMO-NOT-FOUND-999` | Hiện empty state và nút reset/mở rộng tìm kiếm |
| N-07 | Quay lại job đã ứng tuyển | Nút Apply bị vô hiệu hóa hoặc hiện thông báo đã ứng tuyển; không có đơn trùng |
| N-08 | Nhập URL portfolio `abc` | Form chặn lưu hoặc báo URL không hợp lệ |
| N-09 | Tạo JD salary RANGE với min lớn hơn max | Form báo lỗi và không tạo JD |
| N-10 | Candidate mở application `APPROVED` tại C-11/R-07 | Không có nút Withdraw khả dụng cho application đã final |
| N-11 | Kéo Auto-Apply threshold | Control chỉ cho chọn trong khoảng 50-100 |
| N-12 | Submit form CV/JD rỗng | Lỗi hiển thị cạnh field bắt buộc; form không đóng |

## 15. Responsive Và Accessibility Smoke

Phần này nên kiểm tra trước buổi demo; không cần mở DevTools khi đang trình bày.

1. Thu nhỏ/phóng to cửa sổ trình duyệt để kiểm tra bố cục hẹp, tablet và desktop; giữ browser zoom 100%.
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
8. Xóa các CV manual/upload có prefix `DEMO-E2E` sau khi CV seed đã là default.
9. Không xóa audit log; đây là dữ liệu append-only.

User tạm, feedback và application final không có luồng xóa an toàn trên frontend hiện tại. Muốn môi trường sạch hoàn toàn, dùng Reset dữ liệu hoặc restore Snapshot sau khi kết thúc trình bày.

Dừng runtime:

```powershell
# Dừng frontend/backend Maven bằng Ctrl+C tại terminal tương ứng.
cd C:\CODING\Thesis
docker compose down
```

Không dùng `docker compose down -v` trừ khi chủ động muốn xóa toàn bộ DB local.

### Reset dữ liệu để chạy lại từ seed

Chỉ thực hiện khi không cần giữ dữ liệu demo hiện tại. Dừng backend trước để Flyway có thể chạy lại từ đầu, sau đó xóa Docker volumes và khởi động PostgreSQL:

```powershell
cd C:\CODING\Thesis
docker compose down -v
docker compose up -d postgres
```

Sau đó chạy lại backend theo Mục 4. Flyway tạo schema, seed accounts (`ca` / `re` / `ad`) và dữ liệu mẫu. Nếu backend chạy bằng Docker, `down -v` cũng xóa storage CV Docker. Nếu backend chạy bằng Maven, kiểm tra riêng thư mục `Backend\careerfit-backend\storage\cv` trước khi xóa file upload local.

### Snapshot trước demo

Nếu muốn quay lại đúng trạng thái đã chuẩn bị thay vì seed mới, tạo backup trước buổi demo:

```powershell
cd C:\CODING\Thesis
New-Item -ItemType Directory -Force .\backup | Out-Null
docker exec careerfit-postgres pg_dump -U careerfit -d careerfit -Fc -f /tmp/careerfit-before-demo.dump
docker cp careerfit-postgres:/tmp/careerfit-before-demo.dump .\backup\careerfit-before-demo.dump
```

Để restore, dừng backend trước, sau đó chạy đúng thứ tự sau. Thao tác này thay toàn bộ dữ liệu database hiện tại:

```powershell
cd C:\CODING\Thesis
docker exec careerfit-postgres psql -U careerfit -d postgres -c "DROP DATABASE careerfit WITH (FORCE);"
docker exec careerfit-postgres psql -U careerfit -d postgres -c "CREATE DATABASE careerfit OWNER careerfit;"
docker cp .\backup\careerfit-before-demo.dump careerfit-postgres:/tmp/careerfit-before-demo.dump
docker exec careerfit-postgres pg_restore -U careerfit -d careerfit --no-owner /tmp/careerfit-before-demo.dump
```

Khởi động lại backend và mở frontend để kiểm tra dữ liệu đã quay về trạng thái trước demo.

## 17. Phiếu Ghi Kết Quả

| Test IDs | Pass/Fail/Blocked | Ảnh hoặc video | Ghi chú |
|---|---|---|---|
| PF-01..02 |  |  |  |
| G-01..05 |  |  |  |
| AUTH-01..04 |  |  |  |
| C-01..06 |  |  |  |
| C-07..11 |  |  |  |
| C-12..15 |  |  |  |
| R-01..06 |  |  |  |
| R-07..11 |  |  |  |
| A-01..06 |  |  |  |
| E-01 (tùy chọn) |  |  |  |
| N-01..12 |  |  |  |
| Responsive/Accessibility |  |  |  |
| Cleanup |  |  |  |

Evidence nên lưu:

- Screenshot UI trước/sau action.
- URL frontend hiện tại và thông báo thành công/lỗi đang hiển thị.
- Tên job/CV/candidate/application được tạo để tìm lại trên giao diện.
- Timestamp bắt đầu/kết thúc và commit đang demo.

## 18. Điều Kiện Kết Luận Demo Đạt

Demo được coi là đạt khi:

- Frontend chạy ổn định, không xuất hiện lỗi hệ thống bất ngờ hoặc loading vô hạn.
- Guest, Candidate, Recruiter và Admin đều hoàn thành ít nhất một luồng end-to-end thật.
- Không thể mở workspace sai role và Guest không nhìn thấy dữ liệu cá nhân.
- Apply/invite/Auto-Apply không tạo duplicate.
- Validation và error state hiển thị có thể hiểu được.
- Mọi thao tác destructive trong demo đã được hoàn tác hoặc ghi nhận rõ.
