# Kịch Bản Demo CareerFit

## 1. Mục tiêu

Demo phải chứng minh một câu chuyện hoàn chỉnh, không phải đi tham quan mọi màn hình:

> Dữ liệu Candidate tạo ra matching có giải thích; Candidate ứng tuyển; Recruiter nhìn thấy và xử lý; hệ thống giữ quyền, trạng thái và dấu vết nhất quán.

## 2. Nguyên tắc demo

- Dùng dữ liệu đã chuẩn bị, tên dễ đọc.
- Chỉ mở tab cần thiết.
- Nói mục đích trước khi click.
- Sau mỗi thao tác, nói trạng thái nào vừa thay đổi.
- Không khẳng định email/monitoring hoạt động nếu chưa kiểm tra runtime ngay trước buổi bảo vệ.
- Không chỉnh dữ liệu benchmark để tạo kết quả đẹp.

## 3. Chuẩn bị trước ngày bảo vệ

### Tài khoản

- Một Candidate có hồ sơ, CV mặc định `SCORING_DONE` và portfolio; setting `showPortfolioAfterApply` được xác định trước.
- Một Recruiter sở hữu ít nhất một job đang active.
- Một Admin.
- Ghi role và thông tin đăng nhập trong file riêng, không đưa secret vào slide/repo.

### Dữ liệu

- CV Java/Spring có nội dung trích xuất được.
- JD Backend Developer có required/nice-to-have skills rõ.
- Một matching cao và một matching trung bình để so sánh.
- Một job chưa apply để demo thao tác.
- Một application có thể approve/reject nếu cần.

### Runtime

1. Docker Desktop và PostgreSQL hoạt động.
2. Backend health/API trả lời.
3. Frontend tải được và không dùng fallback mock.
4. Login cả ba role thành công; nếu demo magic-link, chuẩn bị token hợp lệ riêng.
5. Clock hệ thống đúng để JWT/token không lỗi.
6. Kiểm tra network/CORS.
7. Chạy smoke test phù hợp.
8. Chụp ảnh/video dự phòng của luồng chính.

## 4. Kịch bản demo chính 8–10 phút

### Cảnh 1 — Public job search (45 giây)

**Thao tác:** Mở `/jobs`, tìm “Java” hoặc kỹ năng đã chuẩn bị, mở job detail.

**Lời nói:**  
“Người chưa đăng nhập vẫn có thể khám phá tin tuyển dụng. Đây là dữ liệu công khai. Khi thực hiện hành động cá nhân như apply, hệ thống yêu cầu đăng nhập.”

**Điểm chứng minh:** public/protected boundary và search thực.

### Cảnh 2 — Candidate profile và CV (1 phút)

**Thao tác:** Đăng nhập Candidate, mở profile/upload, cho thấy CV mặc định, detail/status và portfolio. Nếu tạo CV mới, dùng file PDF/PNG/JPG/DOCX hoặc form thủ công rồi chờ UI polling đến `SCORING_DONE`.

**Lời nói:**  
“CV mặc định là đầu vào trực tiếp của matching. Xử lý nền chỉ bắt đầu sau khi transaction tạo CV commit. Portfolio là bằng chứng recruiter có thể xem sau apply nếu Candidate cho phép; hiện portfolio chưa tham gia công thức score.”

Không upload file mới trong demo chính nếu parsing có thể tốn thời gian. Có thể upload trong phần hỏi đáp.

### Cảnh 3 — Matching có giải thích (1 phút)

**Thao tác:** Mở recommendations/job feed, chọn card điểm cao.

**Lời nói:**  
“Backend trả score cosine, nhãn và các term/domain trùng nhau làm lý do. Required/optional skills thuộc JD được hiển thị riêng; hệ thống chưa tính missing skills cá nhân riêng. Điểm dùng để ưu tiên đọc, không phải quyết định tuyển dụng.”

**Điểm kỹ thuật:** normalization → TF-IDF/cosine → `ScoringService` → matching card.

### Cảnh 4 — Candidate apply (1 phút)

**Thao tác:** Nhấn Apply, xác nhận thông báo, mở Applications.

**Lời nói:**  
“Application là entity nghiệp vụ độc lập với matching. Backend kiểm tra job, candidate và application trùng trước khi tạo trạng thái mới.”

Nếu nhấn lại, có thể dùng lỗi duplicate để chứng minh business rule, nhưng chỉ làm khi đã kiểm tra trước.

### Cảnh 5 — Automation policy (1 phút)

**Thao tác:** Mở Automation, cho thấy enable Auto-Apply, ngưỡng, email toggle và nút run-now. Chỉ chạy run-now nếu đã chuẩn bị một matching đủ ngưỡng và chưa có application.

**Lời nói:**  
“Automation không chạy chỉ vì có score. Backend kiểm tra policy enable, CV mặc định `SCORING_DONE`, job active, threshold, application trùng và giới hạn tối đa ba application mỗi lượt. Pause/resume chưa hoàn thiện nên không dùng trong demo.”

### Cảnh 6 — Recruiter nhận application (1,5 phút)

**Thao tác:** Đăng nhập Recruiter, mở job vừa dùng, vào Applicants/Ranking.

**Lời nói:**  
“Recruiter nhìn thấy người vừa apply. Ngoài applicant, candidate discovery tìm ứng viên phù hợp chưa apply. Ranking có score, lý do và tie metadata. Portfolio chỉ hiện sau apply nếu setting của Candidate cho phép; candidate chưa apply phải nhận trạng thái portfolio bị ẩn.”

### Cảnh 7 — Recruiter xử lý (1 phút)

**Thao tác:** Approve/reject hoặc invite candidate đã chuẩn bị.

**Lời nói:**  
“Backend kiểm tra recruiter có quyền trên job trước khi cập nhật. Thay đổi trạng thái được phản ánh về phía Candidate và có thể tạo notification/audit.”

### Cảnh 8 — Admin và kết luận (1 phút)

**Thao tác:** Mở Admin dashboard, audit logs hoặc email monitor.

**Lời nói:**  
“Admin giám sát tài khoản, job và hành động hệ thống. Audit giúp biết ai đã thực hiện hành động nào. Đây là lớp cần thiết khi automation tác động đến người dùng.”

**Kết:**  
“Demo vừa đi qua vòng lặp từ dữ liệu CV, matching, application đến quyết định của recruiter và giám sát admin.”

### Phần mở rộng — Passwordless và email action

- Passwordless: request token, mở `/auth/magic-link/verify?token=...`, cho thấy bước inspect, bấm xác nhận để POST verify, sau đó `/auth/me` khôi phục identity.
- Email action: `GET /api/email-action/redeem?token=...` chỉ hiển thị trang xác nhận; submit form mới tạo `POST` và thực thi một lần. Mở lại token phải cho kết quả đã xử lý.
- Profile dev có thể dùng `NoOpMailService`; khi đó chứng minh delivery/action record và log thay vì chờ email Internet.

## 5. Phiên bản 5 phút

1. Public job: 20 giây.
2. Candidate CV + matching: 1 phút.
3. Apply + application list: 1 phút.
4. Recruiter applicants/ranking + status: 1 phút 30 giây.
5. Automation policy + audit: 50 giây.
6. Kết luận: 20 giây.

## 6. Demo kỹ thuật khi hội đồng yêu cầu

### Theo dõi một request

1. Mở DevTools Network.
2. Thực hiện Apply.
3. Chỉ ra `POST /api/applications` và Bearer token.
4. Mở `ApplicationController`.
5. Đi đến `ApplicationService` và rule duplicate/ownership.
6. Chỉ ra Repository/Entity.

### Giải thích matching

1. Mở `ScoringService.score`.
2. Chỉ ra vector CV/JD.
3. Chỉ ra cosine/signal và `assignLabel`.
4. Chỉ ra `buildMatchReasons`.
5. Mở test scoring tương ứng.

### Giải thích feedback Candidate

1. Gửi feedback trên UI Candidate; Network phải cho thấy `POST /api/matches/{matchingId}/feedback?type=...&channel=WEB` và không có JSON role tự khai báo.
2. Mở `FeedbackService`.
3. Mở `RocchioService.updateJobVector`.
4. Chỉ ra ownership check và việc Rocchio chỉ chạy sau commit cho ba learning signals.
5. Giải thích alpha, beta, gamma và `needsRecompute`; scheduler mới tính lại matching.

## 7. Ma trận thao tác và dữ liệu

| Thao tác | API chính | Dữ liệu thay đổi |
|---|---|---|
| Login | `POST /api/auth/login` | Token phía client; không tạo session server truyền thống |
| Magic-link | `GET` inspect, `POST /api/auth/passwordless/verify` | Tiêu thụ token và lưu JWT trong `sessionStorage` |
| Upload CV | `POST /api/cv/upload` | CV, text/vector, trạng thái xử lý |
| Xem card | `GET /api/matches/me/cards` | Chỉ đọc matching |
| Apply | `POST /api/applications` | Application và dấu vết liên quan |
| Feedback | `POST /api/matches/{id}/feedback?type=...&channel=WEB` | Upsert feedback; learning signal cập nhật vector sau commit và đánh dấu recompute |
| Sửa policy | `PATCH /api/automation/policy` | Automation policy |
| Invite | `POST /api/recruiter/jobs/{jobId}/candidates/{candidateId}/invite` | Application/invite và notification |
| Đổi status | `PATCH /api/recruiter/applications/{id}/status` | Application status |

Recruiter không dùng endpoint `/api/matches/{id}/feedback`; gọi bằng Recruiter token phải trả `403`. Recruiter dùng invite và application lifecycle.

## 8. Xử lý sự cố

### Backend không phản hồi

- Không click liên tục.
- Kiểm tra process/container và log gần nhất.
- Chuyển sang video/ảnh dự phòng, giải thích request và dữ liệu mong đợi.

### 401

- Đăng nhập lại để lấy token mới.
- Không sửa role/token bằng DevTools để “qua” lỗi.

### Không thấy matching

- Kiểm tra CV mặc định và trạng thái xử lý.
- Kiểm tra job active.
- Dùng dữ liệu đã chuẩn bị; không sửa score trực tiếp trong database.

### Email không tới

- Trình bày delivery log/email monitor nếu có.
- Nói rõ mail provider là phụ thuộc ngoài.
- Không chờ hộp thư quá lâu; chuyển sang chứng minh record/action flow.

### UI hiển thị sai dữ liệu

- Mở Network để phân biệt backend response với mapping/render.
- API mapper phải dùng response thật hoặc giá trị trung tính; không chèn `mockJobs` để che lỗi. Một số hằng UI cục bộ trong `src/data/mock.ts` không được trình bày như dữ liệu backend.

## 9. Kịch bản dự phòng không có mạng

CareerFit local không nhất thiết cần Internet nếu database, backend và frontend đã có đủ dependency/image. Chuẩn bị:

- Build artifact và Docker image cần thiết.
- Database seed cục bộ.
- Video MP4 1080p của luồng chính.
- Ảnh chụp từng trạng thái.
- JSON response mẫu và đoạn code cần mở.

Video dự phòng phải được giới thiệu là bản ghi đã chuẩn bị, không nói đó là hệ thống đang chạy trực tiếp.

## 10. Checklist 15 phút trước demo

- [ ] Đúng branch/commit.
- [ ] Database và migration đúng.
- [ ] Backend API trả lời.
- [ ] Frontend đúng API base URL.
- [ ] Candidate login được.
- [ ] Recruiter login được.
- [ ] Admin login được.
- [ ] CV mặc định tồn tại.
- [ ] Job demo đang active.
- [ ] Chưa có application trùng.
- [ ] Matching card có lý do.
- [ ] Tắt notification của hệ điều hành.
- [ ] Zoom trình duyệt và font code đủ lớn.
- [ ] Video dự phòng mở được.
