                 # CareerFit Dưới Góc Nhìn Sản Phẩm Và Người Dùng Thực Tế

## 1. Tài liệu này dùng để làm gì?

Tài liệu giúp người bảo vệ đồ án trả lời ba câu hỏi quan trọng:

1. CareerFit giải quyết vấn đề gì?
2. Người dùng nhận được giá trị gì?
3. Nếu triển khai thật, hệ thống cần vận hành và kiểm soát như thế nào?

CareerFit không nên được giới thiệu đơn giản là “website tìm việc có AI”. Cách diễn đạt chính xác hơn là:

> CareerFit là nền tảng hỗ trợ tuyển dụng IT theo hai chiều: giúp ứng viên tìm công việc phù hợp, đồng thời giúp nhà tuyển dụng tìm và ưu tiên ứng viên phù hợp. Các hành động tự động bị giới hạn bởi chính sách và vẫn giữ con người trong vòng quyết định.

## 2. Bài toán thực tế

### 2.1. Vấn đề của ứng viên

- Tin tuyển dụng nhiều nhưng khó biết công việc nào thực sự phù hợp.
- Cùng một kỹ năng có thể được viết bằng nhiều tên khác nhau.
- Ứng viên thường chỉ thấy yêu cầu công việc, không thấy lý do mình được xếp hạng cao hay thấp.
- Việc tìm kiếm, đọc JD và nộp hồ sơ lặp lại gây tốn thời gian.

### 2.2. Vấn đề của nhà tuyển dụng

- Một tin tuyển dụng có thể nhận nhiều CV không phù hợp.
- Đọc thủ công toàn bộ CV tốn thời gian và dễ thiếu nhất quán.
- Tìm ứng viên tiềm năng ngoài danh sách đã ứng tuyển là công việc khó.
- Quyết định tuyển dụng cần có dấu vết để kiểm tra, không nên chỉ dựa vào một điểm số bí ẩn.

### 2.3. CareerFit giải quyết ở mức nào?

CareerFit hỗ trợ sàng lọc và ưu tiên, không thay thế quyết định của con người. Hệ thống:

- Chuẩn hóa nội dung CV và JD.
- Tính độ tương đồng và các tín hiệu phù hợp.
- Trình bày các lý do phù hợp và yêu cầu kỹ năng của JD; phiên bản hiện tại chưa tính một danh sách `missing skills` riêng.
- Cho Candidate apply, withdraw và gửi feedback trên chính matching của mình.
- Cho Recruiter xem ranking, mời ứng viên và xử lý application.
- Cho phép automation hoạt động trong giới hạn policy.
- Lưu audit log cho các hành động quan trọng.

## 3. Ba nhóm người dùng chính

### 3.1. Candidate

Candidate tạo hồ sơ, tải hoặc nhập CV, thêm portfolio, tìm việc, xem gợi ý, ứng tuyển và quản lý automation. Giá trị chính là giảm thời gian tìm việc và hiểu rõ hơn vì sao một việc làm phù hợp.

### 3.2. Recruiter

Recruiter quản lý tin tuyển dụng, xem ứng viên đã apply, tìm ứng viên tiềm năng, xem ranking và thực hiện invite/approve/reject. Giá trị chính là giảm khối lượng sàng lọc ban đầu.

### 3.3. Admin

Admin quản lý tài khoản, tin tuyển dụng, audit log, email action/token và tác vụ rebuild matching. Admin không quyết định thay recruiter; vai trò là bảo đảm hệ thống vận hành đúng chính sách.

## 4. Hành trình Candidate

### Bước 1: Tạo tài khoản và hồ sơ

Candidate đăng ký, đăng nhập bằng mật khẩu hoặc hoàn tất đăng nhập qua magic-link. Frontend kiểm tra lại phiên bằng `/api/auth/me`; backend xác định role từ tài khoản và chỉ cho phép truy cập đúng nhóm chức năng.

### Bước 2: Cung cấp dữ liệu nghề nghiệp

Candidate có thể tải CV dạng PDF, PNG, JPG hoặc DOCX, hoặc nhập CV thủ công. File scan/ảnh được đưa qua OCR. Xử lý CV chạy nền sau khi transaction lưu metadata đã commit; frontend polling trạng thái cho đến `SCORING_DONE` hoặc `FAILED`. Candidate có thể xem chi tiết, đặt CV mặc định và xóa CV không phải mặc định.

CV mặc định là đầu vào trực tiếp cho matching. Portfolio gồm link và dự án là bằng chứng bổ sung để recruiter xem theo chính sách riêng tư; portfolio hiện chưa được đưa vào vector TF-IDF hoặc công thức score.

### Bước 3: Nhận danh sách công việc

Candidate có thể tìm kiếm công khai hoặc xem các matching card cá nhân. Card có điểm, nhãn, các term/domain trùng nhau dùng làm lý do và metadata về trạng thái kết quả. Danh sách required/optional skills của JD vẫn được hiển thị, nhưng backend hiện chưa tính một danh sách “missing skills” riêng cho từng Candidate.

### Bước 4: Ra quyết định

Candidate xem chi tiết job và employer, sau đó apply hoặc bỏ qua. Application tạo ra trạng thái nghiệp vụ riêng, không đồng nghĩa với việc đã được tuyển.

### Bước 5: Quản lý quá trình ứng tuyển

Candidate xem danh sách application và có thể withdraw khi phù hợp với business rule.

### Bước 6: Phản hồi và automation

Candidate có thể gửi `GOOD_MATCH`, `POTENTIAL`, `BAD_MATCH` hoặc `NOT_INTERESTED` cho matching thuộc CV của mình. Ba loại đầu kích hoạt Rocchio sau khi transaction feedback commit; `NOT_INTERESTED` được lưu nhưng không kích hoạt Rocchio. Candidate cũng có thể cấu hình AutoFit, ngưỡng điểm, quota thông báo và email.

API `pause/resume` có tồn tại nhưng `pausedUntil` hiện chưa được lưu trong schema, và scheduler auto-apply chưa kiểm tra trạng thái pause. Vì vậy không nên giới thiệu pause/resume là cơ chế đã kiểm soát hoàn chỉnh Auto-Apply.

## 5. Hành trình Recruiter

### Bước 1: Tạo và quản lý JD

Recruiter tạo job với nội dung, kỹ năng, cấp bậc, loại hình làm việc và thông tin liên quan. Chất lượng JD ảnh hưởng trực tiếp đến chất lượng matching.

### Bước 2: Nhận danh sách ứng viên

Hệ thống hỗ trợ hai nguồn:

- Applicant: ứng viên đã chủ động apply.
- Candidate discovery: ứng viên phù hợp được hệ thống tìm thấy nhưng chưa apply.

### Bước 3: Đọc ranking có giải thích

Recruiter xem điểm, nhãn, `matchReasons`, kỹ năng bắt buộc/tùy chọn của JD và dữ liệu phân xử khi đồng điểm. Backend hiện chưa tính một danh sách `missing skills` riêng. Ranking là công cụ ưu tiên đọc CV, không phải quyết định tuyển dụng cuối cùng.

### Bước 4: Thực hiện hành động

Recruiter có thể invite một candidate hoặc cập nhật trạng thái application. Những hành động quan trọng cần được kiểm tra quyền sở hữu job và lưu dấu vết.

### Bước 5: Xem portfolio và xử lý ứng viên

Recruiter dùng invite và application status để xử lý nghiệp vụ. Portfolio chỉ được trả cho recruiter sau khi Candidate đã apply và setting `showPortfolioAfterApply` cho phép; trước thời điểm đó backend trả lý do bị ẩn. Luồng Recruiter trên web hiện không dùng endpoint feedback Candidate và các quyết định approve/reject chưa được đưa trực tiếp vào Rocchio.

## 6. Matching, recommendation và feedback khác nhau thế nào?

- **Matching** trả lời: CV này và JD này giống nhau ở mức nào theo các tín hiệu đã thiết kế?
- **Recommendation** trả lời: với một người dùng cụ thể, nên đưa những kết quả nào lên trước?
- **Feedback learning** trả lời: sau khi Candidate đánh giá matching, vector ưu tiên của job nên điều chỉnh theo hướng nào?

Không nên gọi mọi thành phần là “AI”. TF-IDF, cosine similarity và Rocchio là các kỹ thuật truy hồi thông tin/học từ phản hồi có thể giải thích được.

## 7. Web, email và automation phối hợp

- Web là control panel: người dùng xem dữ liệu, cấu hình policy và ra quyết định.
- Email là kênh thông báo hoặc kênh hành động qua token có thời hạn. Với email action, `GET` chỉ hiển thị trang xác nhận và `POST` mới thay đổi trạng thái, giúp giảm rủi ro mail scanner kích hoạt nhầm.
- Scheduler kiểm tra các tác vụ định kỳ như matching cũ, digest, high match, token hết hạn và auto-apply.
- Audit log là dấu vết để kiểm tra automation đã làm gì.

Một automation an toàn phải thỏa mãn đồng thời: đúng role, đúng policy, đúng ngưỡng, chưa xử lý trước đó, chưa vượt giới hạn và có thể truy vết.

## 8. Ví dụ end-to-end

Lan là Java developer có CV với Spring Boot, PostgreSQL và Docker. Một recruiter đăng JD Backend Developer yêu cầu Java, Spring Boot, SQL và Kubernetes.

1. CV và JD được chuẩn hóa và biểu diễn thành vector.
2. Matching engine tính cosine similarity; seniority chỉ hỗ trợ nhận diện trường hợp tiềm năng.
3. Lan thấy job có điểm cao và lý do phù hợp là Java/Spring Boot/PostgreSQL. Yêu cầu Kubernetes nằm trong JD để Lan tự đối chiếu; backend chưa kết luận đây là `missing skill` của riêng Lan.
4. Lan apply. Recruiter thấy application trong danh sách ứng viên.
5. Lan đánh giá matching là `GOOD_MATCH` hoặc `POTENTIAL` trên web/email.
6. Sau khi feedback commit, Rocchio cập nhật learned vector của job và đánh dấu các matching liên quan cần tính lại; scheduler recompute xử lý chúng sau đó.

Ví dụ này thể hiện giá trị của hệ thống: ưu tiên, giải thích và hỗ trợ quyết định; không chứng minh rằng hệ thống dự đoán chắc chắn ai sẽ làm việc tốt nhất.

## 9. Giá trị đối với stakeholder

| Stakeholder | Giá trị | Chỉ số nên theo dõi |
|---|---|---|
| Candidate | Giảm thời gian tìm job, hiểu lý do phù hợp và yêu cầu kỹ năng | CTR, apply rate, thời gian đến application |
| Recruiter | Giảm thời gian sàng lọc, tìm thêm ứng viên | time-to-shortlist, precision@K, invite acceptance |
| Admin | Kiểm soát vận hành và rủi ro | lỗi, retry, token abuse, audit completeness |
| Doanh nghiệp | Chuẩn hóa quy trình tuyển dụng | time-to-hire, conversion funnel, chi phí xử lý |

## 10. Điểm khác biệt có thể bảo vệ

Không nên tuyên bố CareerFit tốt hơn toàn diện so với sản phẩm thương mại. Điểm khác biệt có thể bảo vệ là:

- Tập trung vào tuyển dụng IT và dữ liệu kỹ năng kỹ thuật.
- Có vòng lặp hai chiều: Candidate tìm job và Recruiter tìm candidate.
- Điểm matching có lý do, dễ kiểm tra hơn mô hình hộp đen.
- Automation bị ràng buộc bởi policy, ngưỡng, giới hạn mỗi lượt và Human-in-the-Loop; riêng pause/resume vẫn là giới hạn kỹ thuật cần hoàn thiện.
- Web là nơi kiểm soát, email là kênh hành động, audit log là kênh truy vết.
- Kiến trúc có thể self-host trong bối cảnh cần kiểm soát dữ liệu.

## 11. Giới hạn cần nói trung thực

- TF-IDF không hiểu ngữ nghĩa sâu như embedding hoặc LLM.
- Chất lượng kết quả phụ thuộc mạnh vào CV, JD và từ điển chuẩn hóa.
- Dữ liệu feedback ít có thể làm Rocchio chưa ổn định.
- Điểm phù hợp không đo được văn hóa, kỹ năng mềm hoặc hiệu suất tương lai.
- Demo kỹ thuật không tự động chứng minh khả năng chịu tải Production.
- Email, quan sát hệ thống, backup, DR và quản trị secret cần hạ tầng Production riêng.

## 12. Muốn triển khai Production cần bổ sung gì?

1. Xác thực email, chính sách mật khẩu/token và quản trị secret chuẩn.
2. Mã hóa dữ liệu nhạy cảm, retention policy và chức năng xóa dữ liệu.
3. Object storage và quét malware cho CV.
4. Queue cho email/batch, retry có backoff và idempotency.
5. Metrics, log tập trung, trace, alert và on-call runbook.
6. Backup, restore test và disaster recovery.
7. Load test, capacity planning và database tuning.
8. Đánh giá fairness, drift và chất lượng ranking định kỳ.
9. Quy trình khiếu nại và can thiệp thủ công.
10. Tuân thủ quy định bảo vệ dữ liệu áp dụng tại thị trường triển khai.

## 13. Cách nói khi bảo vệ

Nên nói:

> Hệ thống tạo một lớp hỗ trợ quyết định có thể giải thích. Recruiter vẫn là người chịu trách nhiệm với quyết định tuyển dụng; automation chỉ hoạt động trong policy đã cấu hình.

Không nên nói:

> AI tự động chọn chính xác ứng viên tốt nhất và thay thế recruiter.

## 14. Tóm tắt 30 giây

CareerFit kết nối hai phía của tuyển dụng IT. Candidate quản lý CV, nhận job phù hợp và ứng tuyển; recruiter quản lý JD, xem ranking và tìm ứng viên; admin kiểm soát vận hành. Điểm cốt lõi không phải “AI mạnh nhất”, mà là matching có giải thích, feedback learning, automation có chính sách và khả năng truy vết.
