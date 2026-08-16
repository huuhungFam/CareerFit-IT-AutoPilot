# Kịch bản demo CareerFit với 2 tài khoản

## 1. Tài khoản sử dụng

- Candidate: `hungb2203557@student.ctu.edu.vn`
- Recruiter: `phamhuuhung216@gmail.com`
- Mật khẩu chung: `12345678`

Chỉ sử dụng hai tài khoản trên trong toàn bộ phần demo.

## 2. Dữ liệu đã chuẩn bị

Recruiter đã tạo và kích hoạt ba JD sau:

| Thứ tự | JD | Điểm dự kiến với CV demo | Mục đích |
|---|---|---:|---|
| 1 | `CF-DEMO-100 | Frontend Engineer` | 100,00% | Match hoàn toàn |
| 2 | `CF-DEMO-096 | Frontend + DevOps` | khoảng 96,01% | Match cao nhưng có thêm yêu cầu DevOps |
| 3 | `CF-DEMO-094 | Frontend Platform Engineer` | khoảng 93,87% | Match cao thấp dần, có nhiều yêu cầu Platform hơn |

CV để tải lên: `CV_Candidate_CF_Demo_Matching.docx`.

## 3. Thiết lập đã áp dụng

### Candidate

- Thông báo qua email: bật.
- Email việc phù hợp cao: bật.
- Ngưỡng match cao: 90%.
- Giới hạn email/ngày: 10.
- Thời gian chờ giữa thông báo tương tự: 0 giờ.
- Giờ yên lặng: tắt.
- Digest hằng ngày: tắt để tránh email ngoài kịch bản.
- Tự động ứng tuyển: tắt để mọi thao tác trong demo do người dùng chủ động.
- Gợi ý thay thế sau khi bỏ qua: bật, thời gian chờ 0 phút.

### Recruiter

- Cảnh báo CV điểm cao: bật.
- Tổng hợp chờ duyệt và nhắc JD sắp đóng: bật.

### Hệ thống

- Bộ quét email match cao chạy mỗi 30 giây.
- Mỗi cặp Candidate-JD chỉ gửi email match cao một lần, không lặp lại ở lượt quét sau.
- Một lượt quét có thể xử lý đồng thời tối đa 5 match cao.
- Liên kết hành động trong email mở trang xác nhận trước; chỉ khi bấm **Xác nhận** hệ thống mới ghi dữ liệu.

## 4. Trình tự trình diễn đề xuất

### Bước 1 - Cho thấy ba JD của Recruiter

1. Đăng nhập Recruiter.
2. Mở **Việc làm**.
3. Chỉ nhanh ba JD có tiền tố `CF-DEMO` và trạng thái `ACTIVE`.
4. Mở từng JD để giải thích: JD thứ hai và thứ ba bổ sung dần kỹ năng DevOps/Platform nên điểm sẽ giảm dần.
5. Đăng xuất Recruiter.

### Bước 2 - Candidate tải CV và nhận gợi ý

1. Đăng nhập Candidate.
2. Mở **Tải CV**.
3. Ở thẻ phân tích tài liệu, tải lên `CV_Candidate_CF_Demo_Matching.docx`.
4. Chờ trạng thái xử lý hoàn tất và mở danh sách việc làm phù hợp.
5. Kỳ vọng thấy ba điểm giảm dần: khoảng `100%`, `96%`, `94%`.
6. Email cho match tốt nhất có thể đến ngay sau khi CV được chấm; hai email còn lại đến trong lượt quét kế tiếp, tối đa khoảng 30 giây.

### Bước 3 - Tương tác bằng nút trong email Candidate

Thực hiện lần lượt để minh họa ba loại phản hồi:

1. Email JD `CF-DEMO-100`: bấm **Rất phù hợp**, sau đó bấm **Xác nhận**.
2. Email JD `CF-DEMO-096`: bấm **Tiềm năng**, sau đó bấm **Xác nhận**.
3. Email JD `CF-DEMO-094`: bấm **Bỏ qua**, sau đó bấm **Xác nhận**.

Kết quả mong đợi:

- Mỗi trang xác nhận báo hành động thành công.
- Phản hồi được ghi với nguồn `EMAIL`.
- Với thao tác **Bỏ qua**, Candidate nhận thêm email xác nhận hệ thống đã ghi nhận feedback.
- Mỗi phản hồi tạo một email thông báo tới Recruiter.

### Bước 4 - Recruiter nhận phản hồi

1. Mở hộp thư `phamhuuhung216@gmail.com`.
2. Tìm email có tiêu đề `CareerFit: Candidate da phan hoi JD cua ban`.
3. Email hiển thị Candidate, loại phản hồi (`GOOD_MATCH`, `POTENTIAL` hoặc `NOT_INTERESTED`), JD và điểm match.
4. Bấm **Xem ranking** để quay về workspace Recruiter.
5. Đăng nhập Recruiter nếu trình duyệt yêu cầu và mở ba JD để xem xếp hạng Candidate.

## 5. Nội dung CV dùng để đối sánh

```text
PHẠM HỮU HƯNG
FRONTEND ENGINEER
CAREERFIT DEMO LAB
CẦN THƠ, VIỆT NAM
HỒ SƠ MỤC TIÊU
Kỹ sư Frontend có 4 năm kinh nghiệm phát triển ứng dụng web bằng React và TypeScript. Thành thạo JavaScript, Redux, Next.js, Vite, HTML, CSS, thiết kế responsive, accessibility, Jest, REST API, Git, Agile và Scrum.
Xây dựng giao diện tìm kiếm việc làm bằng React và TypeScript, phát triển thư viện UI component tái sử dụng, quản lý trạng thái Redux, tích hợp REST API và kiểm thử tự động bằng Jest. Tối ưu hiệu năng tải trang 35 phần trăm bằng Vite, code splitting và caching.
Phát triển CareerFit IT AutoPilot, dashboard phân tích dữ liệu, biểu đồ tương tác, form xác thực, thông báo thời gian thực và trải nghiệm người dùng trên desktop lẫn mobile. Phối hợp cùng backend, product và designer trong quy trình Agile Scrum.
Tốt nghiệp Kỹ sư Công nghệ Thông tin. Có khả năng đọc hiểu tài liệu tiếng Anh, giao tiếp tốt, giải quyết vấn đề và làm việc độc lập.
KINH NGHIỆM
Frontend Engineer tại CareerFit Demo Lab từ 2022 đến 2026.
```

## 6. Câu nói ngắn khi báo cáo

> Em dùng cùng một CV để đối sánh với ba JD có độ lệch kỹ năng tăng dần. CareerFit chấm điểm bằng TF-IDF và cosine similarity, gửi email khi điểm từ 90% trở lên, cho phép Candidate phản hồi ngay trong email, rồi chuyển phản hồi đó về Recruiter mà không cần Candidate đăng nhập lại.

## 7. Kiểm tra nhanh trước giờ báo cáo

1. Xác nhận frontend mở được tại `http://127.0.0.1:5173`.
2. Xác nhận backend mở được tại `http://127.0.0.1:8080/actuator/health`.
3. Xác nhận ba JD `CF-DEMO` vẫn là `ACTIVE`.
4. Không tải CV demo trước khi bắt đầu nếu muốn trình diễn trọn luồng từ đầu.
5. Mở sẵn hai hộp thư trong hai tab riêng để không mất thời gian chuyển tài khoản.
