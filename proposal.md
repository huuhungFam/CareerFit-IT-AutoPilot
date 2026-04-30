# ĐỀ CƯƠNG ĐỒ ÁN TỐT NGHIỆP: NỀN TẢNG TỰ ĐỘNG HÓA ĐÁNH GIÁ VÀ GỢI Ý CV-JD VỚI HUMAN-IN-THE-LOOP

## 🎓 TÊN ĐỀ TÀI
* **Tên website/ứng dụng:** CareerFit IT AutoPilot
* **Tiếng Việt:** Nền tảng tự động hóa đánh giá và gợi ý mức độ phù hợp giữa CV và Job Description cho ngành công nghệ thông tin với Human-in-the-Loop.
* **Tiếng Anh:** Design and Implementation of a Human-in-the-Loop CV Evaluation and Job Recommendation Automation Platform for IT.

## 🔎 ĐỊNH NGHĨA NHANH
* **HITL (Human-in-the-Loop):** Mô hình trong đó hệ thống tự động xử lý phần lớn tác vụ, nhưng các hành động quan trọng vẫn có người giám sát, phê duyệt hoặc can thiệp khi cần.
* **AutoFit:** Lớp tự động hóa chính sách của hệ thống, biến kết quả matching thành hành động phù hợp như auto-apply, invite, notify, hoặc chuyển sang hàng đợi chờ duyệt, tùy theo quyền người dùng và ngưỡng đã cấu hình.

## 🎯 MỤC TIÊU ĐỒ ÁN
Xây dựng một hệ thống Backend có khả năng:
* Tự động trích xuất và phân tích nội dung từ CV định dạng PDF và Job Description.
* Chuyển đổi dữ liệu văn bản thành không gian vector để tính toán Matching Score.
* Xếp hạng CV theo mức độ phù hợp một cách tự động.
* Gợi ý Job cho candidate theo 2 luồng riêng: ranking khi upload CV và recommendation khi người dùng khai báo hồ sơ mong muốn ở màn hình chính.
* Chuẩn hóa Matching Score về thang 100% để hiển thị trực quan.
* Gắn nhãn kết quả theo các mức Low / Medium / High / Potential, trong đó nhãn Potential dành cho các CV có điểm chưa cao nhưng có nền tảng kỹ năng chuyển đổi tốt.
* Tự động cập nhật trọng số đánh giá dựa trên phản hồi của người dùng (Feedback learning) sử dụng thuật toán Rocchio để điều chỉnh vector truy vấn.
* Xử lý chấm điểm bất đồng bộ (Asynchronous Automation) ngay khi file được tải lên.
* Hỗ trợ song ngữ tiếng Việt và tiếng Anh cho giao diện và pipeline tiền xử lý.
* Kết hợp cơ chế Human-in-the-Loop qua email/magic-link để người dùng có thể duyệt, từ chối hoặc cấp quyền tự động hóa mà không cần vào web liên tục.

## 🔍 ĐIỂM CẦN LÀM RÕ THÊM VÀ PHÂN TÁCH 2 LUỒNG CHỨC NĂNG
* **Luồng 1 - Ranking khi upload CV:** candidate upload CV, hệ thống chấm điểm từng JD và trả về danh sách phù hợp theo %.
* **Luồng 2 - Gợi ý JD ở màn hình chính:** candidate khai báo hồ sơ mong muốn, hệ thống dùng một profile vector riêng để đề xuất top JD phù hợp.
* Hai luồng trên dùng chung pipeline tiền xử lý, TF-IDF, cosine similarity và Rocchio, nhưng khác nhau ở query vector đầu vào.
* Nhãn `Potential` không chỉ dựa trên điểm số thô mà còn dựa trên nhóm kỹ năng có thể chuyển đổi, số năm kinh nghiệm và độ tương đồng theo skill family.
* Mô hình đề xuất cho project sẽ là **Matching Engine** cho CV-JD khi upload và **Recommendation Engine** cho candidate-to-job ở trang chính.

## 📦 PHẠM VI HỆ THỐNG (SCOPE)
**Hệ thống CHỈ làm:**
* Upload CV (chỉ parse PDF định dạng text-based) hoặc nhập liệu qua Form.
* Khai báo hồ sơ mong muốn của candidate để phục vụ luồng gợi ý Job trên màn hình chính.
* Nhập Job Description (JD).
* Trích xuất từ khóa/đặc trưng và vector hóa (Sử dụng Static Corpus để chuẩn hóa hệ số IDF).
* Tính similarity score (Cosine Similarity) trực tiếp trên tầng Service của Java.
* Ranking CV khi upload và gợi ý Job theo hồ sơ mong muốn bằng hai luồng riêng.
* Chuẩn hóa kết quả về thang điểm 0-100% và phân loại thành Low / Medium / High / Potential.
* Cho phép candidate bật/tắt cơ chế auto-apply nội bộ khi điểm vượt ngưỡng thiết lập.
* Feedback (Good / Bad match) để hệ thống tự điều chỉnh weight (Thuật toán Rocchio).
* Chấm điểm ngầm tự động với luồng quản lý trạng thái (Background processing).
* Hỗ trợ song ngữ tiếng Việt và tiếng Anh cho dữ liệu đầu vào và giao diện.
* Kiểm tra tính hợp lệ của dữ liệu CV/JD đầu vào, cảnh báo khi thiếu hoặc sai định dạng, và đề xuất sửa thay vì chỉ báo lỗi thô.

**KHÔNG làm:**
* Hệ thống tuyển dụng full-flow (phỏng vấn, gửi email thủ công, v.v.).
* Microservices phức tạp hoặc Parse file PDF dạng ảnh scan (OCR).

## 🔎 VALIDATION & SANITY CHECK
Để tránh đưa dữ liệu bẩn vào pipeline vector hóa, hệ thống cần có lớp kiểm tra dữ liệu đầu vào trước khi scoring:
* **CV PDF:** kiểm tra file có đúng định dạng PDF text-based, dung lượng hợp lệ, không phải file rỗng hoặc ảnh scan.
* **CV Form:** kiểm tra email, số điện thoại, thời gian kinh nghiệm, kỹ năng, học vấn, vị trí mong muốn, và các trường bắt buộc.
* **JD:** kiểm tra title, mô tả công việc, kỹ năng bắt buộc, seniority, location, ngôn ngữ, và mức độ đầy đủ của nội dung.
* **Validation mềm:** nếu dữ liệu thiếu nhưng vẫn có thể xử lý, hệ thống không chặn ngay mà hiển thị cảnh báo, tô đỏ trường thiếu, và đề xuất nội dung cần bổ sung.
* **Validation cứng:** nếu file sai định dạng, text trống, hoặc dữ liệu mâu thuẫn nghiêm trọng, hệ thống chặn xử lý và trả lỗi rõ ràng.
* **Sanity suggestions:** khi phát hiện bất thường như thời gian kinh nghiệm âm, ngày tháng không hợp lệ, skill không khớp ngôn ngữ, hoặc JD quá ngắn, hệ thống phải đề xuất sửa trước khi chạy scoring.

## 🖥️ KIẾN TRÚC GIAO DIỆN (SINGLE WEB APP)
Tối ưu hóa nguồn lực Frontend để tập trung sức mạnh cho Backend, điều hướng hiển thị dựa trên Role:
* **Role Ứng viên (Candidate):** Giao diện cực kỳ tối giản (vibe coding). Bao gồm:
    * Trang kéo thả file PDF để upload CV.
    * Trang nhập liệu Form CV (Dành cho ứng viên không có sẵn file PDF, đóng vai trò như một CV ảo để trích xuất thông tin).
    * Trang khai báo hồ sơ mong muốn để hệ thống gợi ý Job ở màn hình chính.
    * Trang theo dõi trạng thái xử lý hồ sơ (Đang chờ / Đã đánh giá).
    * Danh sách các Job phù hợp được xếp hạng điểm matching từ cao xuống thấp, hiển thị score theo dạng %.
    * Tùy chọn đặt ngưỡng auto-apply và bật/tắt chế độ tự động ứng tuyển nội bộ khi vượt ngưỡng.
* **Role Nhà tuyển dụng (Recruiter):** Giao diện Dashboard quản trị chuyên nghiệp. Bao gồm:
    * Quản lý danh sách Job Description.
    * Xem bảng Ranking chi tiết của từng Job.
    * Xem danh sách các CV đã apply vào Job.
    * Xem toàn bộ các CV matching cao với Job kể cả khi chưa apply.
    * Mời các CV tiềm năng hoặc matching cao chưa apply.
    * Thống kê số lượng CV đã apply và số lượng CV matching cho một Job cụ thể.
    * Cung cấp nút Feedback để trực tiếp "dạy" hệ thống tối ưu hóa thuật toán.
* **Chung / Shared:**
    * Giao diện và dữ liệu đầu vào hỗ trợ song ngữ tiếng Việt và tiếng Anh.
    * Biểu đồ đường hiển thị xu hướng công việc theo thời gian hoặc theo nhóm kỹ năng.
    * Cơ chế auto refresh / timeout để làm mới dữ liệu JD và ranking mới nhất khi người dùng quay lại màn hình chính.

## 🤖 MÔ HÌNH HOẠT ĐỘNG NỘI BỘ
Vòng lặp xử lý:
1. **Perception (Nhận thức):** Đọc CV/JD và hồ sơ mong muốn bằng Apache PDFBox, trích xuất đặc trưng (Feature extraction) thành vector bằng TF-IDF, hỗ trợ cả tiếng Việt và tiếng Anh.
2. **Decision (Quyết định):** Tính toán khoảng cách Cosine Similarity trên tầng Service (Java) cho 2 luồng riêng: Matching Engine khi upload CV và Recommendation Engine khi candidate ở màn hình chính.
3. **Action (Hành động):** Xếp hạng CV/JD, chuẩn hóa điểm về 0-100%, gắn nhãn (Low / Medium / High / Potential) và trả kết quả qua API; nếu vượt ngưỡng thì tạo trạng thái apply nội bộ.
4. **Learning (Học tập):** Nhận Feedback $\rightarrow$ Cập nhật tịnh tiến vector hồ sơ đánh giá (Learned Profile Vector) đại diện cho Job và profile mong muốn của Candidate bằng Thuật toán Rocchio.

* **Mô hình lõi đề xuất:** Hai engine dùng chung pipeline tiền xử lý, vocabulary, TF-IDF và cosine similarity, nhưng khác nhau ở query vector đầu vào.

## 🧠 CÔNG NGHỆ AI / NLP ÁP DỤNG (THỰC CHIẾN & CHUẨN BACKEND)
* **Hướng tiếp cận được lựa chọn (Truyền thống nhưng đào sâu):** Tự xây dựng TF-IDF Vectorization thuần bằng Java kết hợp với Thuật toán Rocchio cho cơ chế Feedback. Cách này giúp kiểm soát hoàn toàn thuật toán và thể hiện rõ năng lực lập trình lõi. Bộ vector này sẽ được tái sử dụng cho cả Matching Engine và Recommendation Engine.
* *(Hướng bắt trend - KHÔNG chọn để tránh loãng scope): Spring AI gọi API của OpenAI/Gemini để trích xuất JSON/Vector.*


## ⚙️ AUTOMATION & OPTIMIZATION TRONG HỆ THỐNG
* **Xử lý bất đồng bộ (`@Async`):** Khi CV được upload, hệ thống trả về ID thành công ngay lập tức. Tiến trình parse file và tính điểm ma trận được đẩy xuống chạy ngầm (background process), không làm treo hay chậm giao diện người dùng.
* **Job Scheduler (`@Scheduled`):** Tự động quét và cập nhật lại toàn bộ bảng Ranking theo định kỳ mỗi khi trọng số của Job thay đổi (sau khi hệ thống thực hiện bước Learning).
* **Auto refresh / polling:** Frontend tự làm mới dữ liệu theo chu kỳ hoặc khi người dùng quay lại màn hình chính để luôn lấy được JD và ranking mới nhất.

## 🗄️ DATABASE SCHEMA (SUPABASE - POSTGRESQL)
**Cấu trúc các bảng cốt lõi (Sẽ cập nhật thêm khi code):**
* **Candidate:** `id`, `name`, `email`, `user_account_id`
* **CandidatePreference:** `id`, `candidate_id`, `desired_title`, `desired_skills`, `preferred_location`, `seniority_level`, `auto_apply_threshold`, `auto_apply_enabled`, `preferred_language`
* **CV:** `id`, `candidate_id`, `raw_text`, `extracted_terms` (JSONB), `language`
* **Job:** `id`, `title`, `original_text`, `learned_profile_vector` (JSONB), `language`
* **Matching:** `id`, `cv_id`, `job_id`, `raw_score`, `normalized_score`, `label`, `is_potential`
* **Application:** `id`, `candidate_id`, `job_id`, `matching_id`, `status`, `is_auto_applied`, `created_at`
* **Feedback:** `id`, `matching_id`, `good_match`
* **JobTrendSnapshot (nếu cần):** `id`, `job_id`, `snapshot_date`, `view_count`, `apply_count`, `match_count`

## 🧱 KIẾN TRÚC HỆ THỐNG (GỌN)
```text
Spring Boot Application (Java 21+)
├── Security Layer (Spring Security + JWT Authentication)
├── REST API Layer (Controllers with Role-based Routing)
├── AI & Processing Module
│    ├── PDF Extraction (Apache PDFBox)
│    ├── Vectorization Engine (TF-IDF with Static Corpus)
│    └── Feedback Learning Engine (Rocchio)
├── Core Services
│    ├── Matching Service (Cosine Similarity Calculation)
│    ├── Recommendation Service (Candidate Profile to Job Suggestion)
│    └── Async Processing Workers
├── Schedulers (Automation Tasks)
└── Data Access Layer (Spring Data JPA + Supabase DB)
```

## TECH STACK
Core: Java 21+, Spring Boot.
Database: Supabase (PostgreSQL hỗ trợ lưu trữ JSONB).
Xử lý File: Apache PDFBox (chuẩn công nghiệp cho xử lý tài liệu Java).
Đa luồng/Tự động: Spring @Async, Spring @Scheduled.

## TÍNH NĂNG NÂNG CẤP (NẾU DƯ THỜI GIAN HOÀN THIỆN)
Nếu phase cốt lõi hoàn thành sớm, đồ án sẽ được tích hợp thêm các module sau để đạt đến mức độ hoàn hảo của một hệ thống thực tế:
1. Hệ thống Phân quyền Bảo mật (Spring Security + JWT)
Đây là "bài toán bắt buộc" của mọi hệ thống thực tế.
Tính năng: Xây dựng cơ chế đăng nhập, cấp phát Token (JSON Web Token).
Điểm nhấn Backend: Thiết lập bộ lọc (Filter) để đảm bảo chỉ có Role RECRUITER mới được gọi API xem Ranking và gửi Feedback. Người ngoài gọi API sẽ bị chặn lỗi 403 Forbidden.
2. Giao tiếp Tự động (JavaMailSender + RabbitMQ/Kafka cơ bản)
Bổ sung thêm "hành động" (Action) cho hệ thống.
Tính năng: Khi một CV được chấm điểm trên mức 80% (High Fit), hệ thống tự động soạn một email báo hỷ gửi đến hòm thư của ứng viên.
Điểm nhấn Backend: Tích hợp JavaMailSender và đưa tác vụ gửi email này vào một luồng chạy ngầm bất đồng bộ khác, hoặc sử dụng một Message Broker nhẹ nhàng để hàng đợi email không làm chậm hệ thống chính.
3. Tối ưu Hiệu năng với Caching (Redis)
Nếu dữ liệu bắt đầu lớn lên, việc liên tục query vào PostgreSQL sẽ tốn tài nguyên.
Tính năng: Lưu tạm thời (cache) danh sách Job Description và Top 10 CV của mỗi Job vào bộ nhớ đệm.
Điểm nhấn Backend: Cấu hình Spring Cache với Redis. Khi nhà tuyển dụng F5 trang Web liên tục, hệ thống trả data từ Redis (tốc độ mili-giây) thay vì bắt Database phải tính toán lại từ đầu.
4. Xuất báo cáo chuyên nghiệp (Apache POI)
Tính năng rất được các doanh nghiệp ưa chuộng.
Tính năng: Nhấn 1 nút trên Web App, tải về file .xlsx (Excel) chứa danh sách các ứng viên đã được chấm điểm, sắp xếp từ cao xuống thấp kèm link tải CV.
Điểm nhấn Backend: Thể hiện khả năng xử lý stream file, thao tác với cấu trúc file nhị phân của Office thông qua thư viện Apache POI chuẩn công nghiệp.
5. Hybrid OCR: Gọi API của OpenAI để xử lý ngoại lệ cho các file PDF dạng ảnh scan (nếu có).
6. Human-in-the-Loop Automation qua Email/Magic-Link (AutoFit)
Tính năng: Gửi email hành động cho recruiter hoặc candidate với nút Yes/No, dùng magic-link có token hết hạn để xác nhận hành động, hỗ trợ passwordless login, auto-apply theo ngưỡng và audit log để truy vết toàn bộ quyết định.
Điểm nhấn Backend: Xây dựng Email Service, Token Service, Policy Engine cho AutoFit, và Audit Log Service để tất cả hành động tự động đều có người giám sát và có thể kiểm tra lại.

## 🎤 DEMO KHI BẢO VỆ (RẤT DỄ ĂN ĐIỂM)
Đăng nhập bằng account HR, khởi tạo 1 Job Description.
Đăng nhập bằng account Ứng viên, Upload 3-5 CV cùng lúc. Mở console cho hội đồng xem các luồng (Thread) chạy bất đồng bộ để phân tích file.
Load lại trang HR $\rightarrow$ Hệ thống hiện bảng Ranking.
Bấm "Good match" cho 1 CV điểm thấp $\rightarrow$ Hệ thống auto-learning $\rightarrow$ Điểm CV đó và các CV có đặc trưng tương tự tự động tăng lên.
Ứng viên mở màn hình chính $\rightarrow$ Hệ thống đề xuất danh sách Job theo hồ sơ mong muốn, hiển thị điểm theo % và nhãn Low / Medium / High / Potential.
Thiết lập ngưỡng auto-apply, ví dụ 95% $\rightarrow$ Khi score vượt ngưỡng thì hệ thống tự tạo bản ghi apply nội bộ.
HR mở dashboard $\rightarrow$ Xem danh sách CV đã apply, danh sách CV matching cao chưa apply, và có thể bấm mời các CV tiềm năng.
Chuyển ngôn ngữ Việt/Anh $\rightarrow$ Giao diện và dữ liệu đầu vào đổi theo ngôn ngữ đã chọn.
Mở trang thống kê $\rightarrow$ Hiển thị biểu đồ đường về xu hướng công việc theo thời gian hoặc theo kỹ năng.
## 📌 CÂU CHỐT KHI BẢO VỆ
"Hệ thống của em tập trung giải quyết bài toán đánh giá và gợi ý mức độ phù hợp CV-JD cho ngành công nghệ thông tin, kết hợp xử lý văn bản bất đồng bộ, phân quyền đa luồng, và hai luồng chức năng matching/recommendation dùng chung một pipeline TF-IDF/Rocchio. Hệ thống không chỉ tự động phân tích và tính toán qua luồng xử lý nền, mà còn biết học hỏi qua cơ chế phản hồi bằng thuật toán tịnh tiến vector. Toàn bộ logic tính toán được xử lý tối ưu trên tầng Service của Java, kết hợp với lưu trữ trạng thái đồng bộ trên nền tảng Supabase."
