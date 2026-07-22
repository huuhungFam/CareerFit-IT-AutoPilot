# Kịch Bản Thuyết Trình CareerFit

## 1. Thông điệp xuyên suốt

> CareerFit hỗ trợ hai phía của tuyển dụng IT bằng matching có giải thích, feedback learning và automation có chính sách kiểm soát. Hệ thống hỗ trợ con người ra quyết định, không thay thế hoàn toàn Candidate hay Recruiter.

## 2. Phân bổ thời gian 10 phút

| Thời gian | Nội dung |
|---|---|
| 0:00–0:45 | Mở đầu và bài toán |
| 0:45–1:45 | Người dùng và nhu cầu |
| 1:45–3:10 | Giải pháp và chức năng |
| 3:10–5:20 | Matching, feedback, automation |
| 5:20–6:40 | Kiến trúc kỹ thuật |
| 6:40–7:30 | Bảo mật và kiểm soát |
| 7:30–8:20 | Kiểm thử và đánh giá |
| 8:20–9:15 | Giới hạn và Production |
| 9:15–10:00 | Kết luận và chuyển demo |

## 3. Kịch bản nói 10 phút

### Slide 1 — Mở đầu

“Kính chào thầy cô. Đề tài của em là CareerFit IT AutoPilot, một nền tảng hỗ trợ tuyển dụng IT theo hai chiều. Hệ thống giúp ứng viên nhận biết công việc phù hợp, đồng thời giúp nhà tuyển dụng ưu tiên và tìm ứng viên phù hợp. Mục tiêu của đề tài không phải thay thế quyết định tuyển dụng, mà giảm công việc sàng lọc lặp lại và làm cho gợi ý dễ giải thích hơn.”

### Slide 2 — Bài toán

“Ứng viên phải đọc nhiều JD nhưng khó biết công việc nào đáng ưu tiên. Nhà tuyển dụng lại phải đọc nhiều CV và có thể bỏ sót ứng viên tiềm năng chưa chủ động apply. Nếu chỉ tìm kiếm theo từ khóa, cùng một kỹ năng có thể được viết khác nhau; nếu chỉ dùng một điểm AI, người dùng khó biết vì sao có kết quả đó.”

### Slide 3 — Người dùng

“CareerFit có ba nhóm chính. Candidate quản lý hồ sơ, CV, portfolio, nhận job matching và ứng tuyển. Recruiter quản lý JD, xem applicant, ranking, candidate tiềm năng và portfolio được Candidate cho phép. Admin giám sát tài khoản, job, audit và email action. Mỗi role có màn hình và quyền API riêng.”

### Slide 4 — Luồng sản phẩm

“Luồng Candidate bắt đầu từ CV dạng PDF, ảnh, DOCX hoặc form thủ công. Sau khi transaction lưu CV commit, worker mới trích xuất/OCR, chuẩn hóa, tạo vector, tính matching và frontend polling trạng thái. Candidate có thể apply, withdraw, feedback và cấu hình AutoFit. Ở phía Recruiter, JD được dùng để xếp hạng candidate; recruiter có thể invite hoặc xử lý application.”

### Slide 5 — Matching

“Pipeline matching sử dụng chuẩn hóa văn bản, TF-IDF và cosine similarity. Score hiện là cosine nhân 100; seniority không cộng vào score mà chỉ hỗ trợ heuristic phát hiện potential. Lý do là các term chung có trọng số cao và domain của job. Ưu điểm là nhẹ, tái lập và giải thích được; hạn chế là chưa hiểu ngữ nghĩa sâu như embedding và chưa tính missing skills riêng.”

### Slide 6 — Feedback learning

“Feedback trên web hiện thuộc Candidate và backend kiểm tra matching đúng là của Candidate đó. GOOD_MATCH, POTENTIAL và BAD_MATCH kích hoạt Rocchio sau khi transaction feedback commit; NOT_INTERESTED chỉ được lưu. Rocchio cập nhật learned vector rồi đánh dấu matching cần tính lại. Recruiter trên web dùng invite và application status, không dùng endpoint feedback Candidate.”

### Slide 7 — Automation

“AutoFit không chạy vô điều kiện. Người dùng cấu hình enable, ngưỡng và email policy. Trước khi auto-apply, backend kiểm tra CV mặc định đã scoring, matching, job active, application trùng và giới hạn tối đa ba application mỗi lượt. Các hành động được audit. API pause/resume có tồn tại nhưng chưa lưu pausedUntil và chưa dừng auto-apply, nên em xem đây là giới hạn cần hoàn thiện.”

### Slide 8 — Kiến trúc

“Frontend là React SPA có login mật khẩu/magic-link, CV polling và API mapper không dùng mock job để lấp dữ liệu. Backend là Spring Boot chia theo domain, controller, service, repository và PostgreSQL. `AfterCommitExecutor` chỉ khởi chạy CV/job matching sau commit. Scheduler xử lý matching cũ, digest, high match, token hết hạn và auto-apply. Email action dùng GET để xác nhận, POST mới thực thi.”

### Slide 9 — Kiểm thử và bảo mật

“Backend có unit test cho scoring, Rocchio, auto-apply, after-commit, auth, CV ingestion và feedback ownership; có integration/contract test cho API và security. Frontend có type-check, lint, build và Playwright gồm P0, contract và resilience. Em chỉ kết luận theo kết quả chạy thực tế tại thời điểm demo, không suy ra Production-ready từ một nhóm test.”

### Slide 10 — Giới hạn và hướng phát triển

“Để triển khai Production cần bổ sung queue/outbox cho email và batch, object storage và malware scan cho CV, observability, backup/restore, load test, distributed lock và quy trình bảo vệ dữ liệu cá nhân. Về thuật toán, hướng hợp lý là hybrid giữa kỹ năng có cấu trúc, TF-IDF và embedding nhưng vẫn giữ khả năng giải thích.”

### Kết luận

“Đóng góp chính của CareerFit là kết nối vòng lặp Candidate–Recruiter trong một hệ thống có matching giải thích được, phản hồi có tác động và automation bị kiểm soát. Sau đây em xin demo hành trình chính từ Candidate đến Recruiter.”

## 4. Bản 15 phút

Giữ nguyên phần 10 phút và mở rộng:

- Thêm 1 phút giải thích dữ liệu CV/JD và entity.
- Thêm 1 phút minh họa công thức cosine/Rocchio.
- Thêm 1 phút về application state và candidate discovery.
- Thêm 1 phút về email token, chống replay và audit.
- Thêm 1 phút về chiến lược đánh giá precision@K/NDCG và Production roadmap.

## 5. Nếu chỉ có 5 phút

1. Bài toán: 30 giây.
2. Ba role và hai chiều tuyển dụng: 45 giây.
3. Luồng CV/JD → matching → application: 1 phút.
4. Feedback + policy automation: 1 phút.
5. Kiến trúc và security: 45 giây.
6. Giới hạn + đóng góp: 1 phút.

## 6. Câu chuyển slide tự nhiên

- Từ vấn đề sang giải pháp: “Từ hai nhóm khó khăn đó, em thiết kế CareerFit theo một vòng lặp hai chiều.”
- Từ chức năng sang thuật toán: “Để tạo ra danh sách ưu tiên này, dữ liệu đi qua pipeline matching sau.”
- Từ thuật toán sang automation: “Điểm số chỉ tạo gợi ý; hành động tiếp theo còn phải đi qua policy.”
- Từ kỹ thuật sang demo: “Các thành phần này thể hiện rõ nhất khi đi qua một hành trình thực tế.”

## 7. Câu dự phòng khi bị ngắt

**“Điểm mới nhất là gì?”**  
“Điểm em bảo vệ là sự kết hợp giữa matching hai chiều có giải thích, feedback loop và automation có policy/audit, không phải tuyên bố tạo thuật toán AI mới.”

**“Đi thẳng vào kỹ thuật.”**  
“Pipeline chính là transaction lưu CV → after-commit worker → extraction/OCR → normalization → TF-IDF → cosine score/matching → persistence; Candidate feedback hợp lệ dùng Rocchio cập nhật learned vector và scheduler tính lại.”

**“Hãy demo ngay.”**  
“Em sẽ demo Candidate nhận matching và apply, sau đó chuyển sang Recruiter xem candidate và xử lý application.”

## 8. Cách diễn đạt nên tránh

| Tránh nói | Nên nói |
|---|---|
| AI chọn chính xác người tốt nhất | Hệ thống ưu tiên ứng viên theo tín hiệu đã thiết kế |
| Hoàn toàn tự động | Tự động trong policy và có Human-in-the-Loop |
| Production-ready 100% | Đã triển khai các lớp nền tảng; còn các hạng mục Production nêu rõ |
| Không có bias | Có rủi ro bias và cần đo/giám sát |
| TF-IDF tốt hơn LLM | TF-IDF phù hợp phạm vi vì nhẹ và giải thích được |

## 9. Checklist luyện nói

- Nói được thông điệp 30 giây không nhìn tài liệu.
- Phân biệt matching, recommendation và application.
- Giải thích TF-IDF/cosine bằng ngôn ngữ đơn giản.
- Nêu ít nhất ba điều kiện AutoFit.
- Nêu một ưu điểm và một hạn chế thật.
- Không đọc nguyên văn slide.
- Luôn kết nối chi tiết kỹ thuật với ý nghĩa người dùng.
