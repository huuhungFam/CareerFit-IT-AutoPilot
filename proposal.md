# ĐỀ CƯƠNG ĐỒ ÁN TỐT NGHIỆP: NỀN TẢNG TỰ ĐỘNG HÓA TUYỂN DỤNG TÍCH HỢP AI HỖ TRỢ ĐÁNH GIÁ VÀ GỢI Ý CV-JD VỚI HUMAN-IN-THE-LOOP

## TÊN ĐỀ TÀI

* **Tên website/ứng dụng:** CareerFit IT AutoPilot
* **Tiếng Việt:** Nền tảng tự động hóa tuyển dụng tích hợp AI hỗ trợ đánh giá và gợi ý CV-JD với Human-in-the-Loop.
* **Tiếng Anh:** Design and Implementation of a Human-in-the-Loop AI-Assisted Recruitment Automation Platform for CV-JD Evaluation and Recommendation in IT.
* **Phạm vi áp dụng:** Hệ thống tập trung vào bài toán tuyển dụng trong ngành công nghệ thông tin.

## ĐỊNH VỊ SẢN PHẨM

CareerFit IT AutoPilot không chỉ là một web tìm việc và cũng không chỉ là một công cụ chấm điểm CV-JD.

Hệ thống được định vị theo mô hình:

```text
Job Portal + Matching Engine + Recommendation Engine + AutoFit Automation + HITL Email Action Channel
```

Trong đó:

* **Web app:** vừa là job portal cho candidate, vừa là control panel cho recruiter/admin.
* **Email:** là kênh hành động nhanh để người dùng apply, skip, invite, reject, feedback hoặc xác nhận automation.
* **Backend:** là automation agent chạy matching, recommendation, policy evaluation, async jobs, audit log và feedback learning.

## ĐỊNH NGHĨA NHANH

* **HITL (Human-in-the-Loop):** Mô hình trong đó hệ thống tự động xử lý phần lớn tác vụ, nhưng các hành động quan trọng vẫn có người giám sát, phê duyệt hoặc can thiệp khi cần.
* **AutoFit:** Lớp tự động hóa chính sách của hệ thống, biến kết quả matching thành hành động phù hợp như auto-apply, invite, notify, gửi email xác nhận hoặc chuyển sang hàng đợi chờ duyệt.
* **Control Panel:** phần web dùng để cấu hình policy, xem trạng thái xử lý, xem audit log, kiểm tra lý do scoring và xử lý ngoại lệ.
* **Action Channel:** kênh tương tác nhanh qua email/magic-link, cho phép người dùng bấm hành động mà không cần mở dashboard đầy đủ.
* **Automation Agent:** backend service có vòng lặp `Perception -> Decision -> Action -> Learning`, tự động nhận dữ liệu, tính toán, quyết định action theo policy, thực thi hoặc xin xác nhận, rồi học từ feedback.

## MỤC TIÊU ĐỒ ÁN

Xây dựng một nền tảng tuyển dụng IT có khả năng:

* Cho candidate tìm kiếm, lọc, xem chi tiết và apply Job như một web tìm việc thông thường.
* Cho candidate nhập keyword, nhận gợi ý tìm kiếm, chuyển sang trang kết quả và lọc job theo điều kiện.
* Cho candidate xem nhà tuyển dụng nổi bật, mở trang chi tiết công ty và xem các job đang tuyển của công ty đó.
* Cho candidate quản lý nhiều CV, chọn CV mặc định, duy trì hồ sơ cố định và bổ sung portfolio/dự án.
* Cho recruiter tạo JD, xem CV đã apply, xem CV matching cao và xem candidate tiềm năng.
* Hiển thị dashboard thị trường việc làm IT dựa trên tổng số job đăng tuyển trên hệ thống, không nhầm với số CV-JD matching.
* Tự động trích xuất và phân tích nội dung từ CV PDF text-based hoặc CV nhập qua form.
* Kiểm tra tính hợp lệ của CV/JD, cảnh báo dữ liệu thiếu hoặc bất thường, và đề xuất sửa trước khi scoring.
* Chuyển đổi CV, JD và hồ sơ mong muốn thành vector bằng TF-IDF.
* Tính Matching Score và Recommendation Score bằng cosine similarity.
* Chuẩn hóa điểm về thang 0-100% và gắn nhãn `Low / Medium / High / Potential`.
* Tách rõ 2 luồng: ranking khi upload CV và recommendation khi candidate xem job/homepage.
* Học từ feedback `Good / Potential / Bad / Not Interested` bằng thuật toán Rocchio.
* Chạy các tác vụ nặng bằng background processing và scheduler.
* Tự động đánh giá policy AutoFit để quyết định notify, auto-apply, invite, gửi email xác nhận hoặc chờ duyệt.
* Cho phép người dùng thao tác qua actionable email bằng magic-link bảo mật.
* Ghi audit log cho toàn bộ hành động quan trọng, đặc biệt là automation và email action.
* Hỗ trợ song ngữ tiếng Việt và tiếng Anh cho giao diện và pipeline tiền xử lý.

## PHÂN TÁCH LUỒNG CHỨC NĂNG

### Luồng 1: Job Portal Cho Candidate

Candidate vào web để:

* xem job feed,
* tìm kiếm job theo keyword và nhận gợi ý tìm kiếm,
* chuyển sang trang kết quả tìm kiếm sau khi bấm Search,
* lọc theo skill, location, seniority, language, salary, score,
* xem job detail,
* xem nhà tuyển dụng nổi bật và chi tiết nhà tuyển dụng,
* quản lý nhiều CV trong trang Hồ sơ & CV,
* khai báo hồ sơ cố định và portfolio dự án,
* apply thủ công,
* xem job recommendation cá nhân.

### Luồng 2: Ranking Khi Upload CV

Candidate upload CV hoặc nhập CV form.
Hệ thống parse, validate, vector hóa CV và chấm điểm với các JD active.
Kết quả trả về danh sách job phù hợp theo score %, label và lý do match.

### Luồng 3: Recommendation Theo Hồ Sơ Mong Muốn

Candidate khai báo desired title, skills, location, seniority, language.
Hệ thống tạo profile vector riêng và gợi ý top JD phù hợp ở homepage/job feed.

### Luồng 4: Recruiter Control Panel

Recruiter vào dashboard để:

* tạo và quản lý JD,
* xem ranking CV theo từng JD,
* xem CV đã apply,
* xem candidate matching cao nhưng chưa apply,
* xem candidate `Potential`,
* invite candidate,
* feedback để dạy hệ thống.

### Luồng 5: HITL Email Action Channel

Khi hệ thống phát hiện match quan trọng, backend gửi email có CTA.

Ví dụ:

* Candidate nhận email `Apply / Skip / Show Similar`.
* Recruiter nhận email `Invite / Reject / Mark Potential`.
* Người dùng nhận email `Good Match / Potential / Bad Match` để feedback.
* Magic-link mở confirm page, POST mới thực thi action.

## PHẠM VI HỆ THỐNG (SCOPE)

**Hệ thống làm:**

* Job portal cơ bản cho candidate: job feed, search suggestion, search result page, filter, job detail, apply.
* Employer experience cho candidate: featured employers, employer detail, danh sách job đang mở của từng công ty.
* Candidate profile experience: Hồ sơ & CV với 3 tab `CV đã tạo`, `Hồ sơ cố định`, `Portfolio / Dự án`.
* Recruiter dashboard: JD management, ranking, applicants, potential pool, analytics.
* Upload CV text-based PDF hoặc nhập CV qua form.
* Validate CV/JD bằng hard validation và soft warning.
* Trích xuất từ khóa/đặc trưng và vector hóa bằng TF-IDF với static corpus.
* Tính similarity score bằng cosine similarity trên tầng service của Java.
* Ranking CV-JD và recommendation candidate-to-job bằng hai luồng riêng.
* Chuẩn hóa kết quả về 0-100% và phân loại `Low / Medium / High / Potential`.
* AutoFit policy: auto-apply, notify, invite, email approval, pending approval.
* Feedback learning bằng Rocchio.
* Actionable email, magic-link, passwordless login cơ bản.
* Audit log cho action tự động, email action, feedback, policy update và login.
* Background processing bằng `@Async` và scheduler bằng `@Scheduled`.
* Hỗ trợ tiếng Việt và tiếng Anh.

**Hệ thống không làm trong core scope:**

* OCR cho PDF scan.
* Microservices phức tạp.
* Full ATS flow như phỏng vấn, offer, payroll.
* Tự apply sang website bên thứ ba.
* LLM agent tự lập kế hoạch phức tạp.

## VALIDATION & SANITY CHECK

Để tránh dữ liệu bẩn đi vào pipeline vector hóa, hệ thống phải kiểm tra đầu vào trước khi scoring.

* **CV PDF:** kiểm tra đúng PDF, dung lượng hợp lệ, extract được text, không phải file rỗng hoặc ảnh scan.
* **CV Form:** kiểm tra email, số điện thoại, năm kinh nghiệm, kỹ năng, học vấn, vị trí mong muốn và trường bắt buộc.
* **JD:** kiểm tra title, mô tả công việc, kỹ năng bắt buộc, seniority, location, language, salary mode và độ đầy đủ nội dung.
* **Validation mềm:** dữ liệu thiếu nhưng vẫn xử lý được thì hiển thị warning và đề xuất bổ sung.
* **Validation cứng:** file sai định dạng, text trống hoặc dữ liệu mâu thuẫn nghiêm trọng thì chặn xử lý.
* **Sanity suggestions:** đề xuất sửa khi phát hiện kinh nghiệm âm, ngày tháng sai, skill mismatch, JD quá ngắn hoặc language mismatch.
* **Salary validation:** không bắt recruiter nhập đủ mọi trường lương; hệ thống dùng `salary_mode` để validate có điều kiện. Nếu chọn `NEGOTIABLE` hoặc `HIDDEN` thì không cần min/max. Nếu chọn `RANGE` thì cần min/max và `min <= max`. Nếu chọn `UP_TO` thì cần `salary_max`. Nếu chọn `FROM` thì cần `salary_min`.

## KIẾN TRÚC TRẢI NGHIỆM: JOB PORTAL + CONTROL PANEL + EMAIL CHANNEL

### Candidate Web Experience

Candidate vẫn có trải nghiệm như một web tìm việc bình thường:

* Homepage/job feed.
* Search suggestion, search result page và filter job.
* Job detail page.
* Featured employers và employer detail page.
* Upload CV.
* Upload CV có 2 tab: `Document Parser` để upload file và `Manual Creation` để nhập CV bằng form.
* Hồ sơ & CV: quản lý nhiều CV, chọn CV mặc định, chỉnh hồ sơ cố định và portfolio dự án.
* Recommendations.
* Applications history.
* AutoFit settings: bật/tắt auto-apply, đặt threshold, giới hạn số auto-apply/ngày.
* Notification/history cho các action tự động.

### Recruiter Web Experience

Recruiter dùng web như control panel tuyển dụng:

* Dashboard tổng quan với job market chart, metric cards và bảng ranking/applicant/potential pool tóm tắt.
* Trang Việc làm dạng HR Dashboard để quản lý requisition, xem job detail và Applied CVs/AI Potential Matches.
* Ranking CV theo JD.
* Applicants.
* Potential pool.
* Invite candidate.
* Feedback Good/Potential/Bad.
* Automation policy.
* Analytics/trend chart, trong đó job market chart dùng số lượng job đăng tuyển trên hệ thống.
* Audit summary.

### Email Action Experience

Email không thay thế web, mà là kênh hành động nhanh.

Các email chính:

* Candidate job match: `Apply / Skip / Show Similar`.
* Candidate auto-apply consent: `Allow Auto-Apply / Deny / Change Threshold`.
* Recruiter high-match CV: `Invite / Reject / Mark Potential`.
* Recruiter potential candidate: `Review / Invite / Ignore`.
* Feedback request: `Good Match / Potential / Bad Match`.
* Daily digest: `Open Dashboard / Review Top Matches`.
* Passwordless login: `Sign In`.

### Automation Timing & Notification Policy

Hệ thống không quét và gửi email liên tục. AutoFit phải có lịch chạy và giới hạn rõ ràng để tránh spam, giảm tải hệ thống và dễ giải thích khi bảo vệ.

Default khuyến nghị:

* **Ranking khi candidate upload CV:** chạy ngay bằng async worker.
* **Ranking khi recruiter tạo/cập nhật JD:** chạy ngay hoặc đưa vào background queue.
* **Scan job mới cho candidate:** chạy mỗi 1 giờ nếu candidate bật tự động quét job.
* **Gửi email ngay:** chỉ gửi khi match rất cao, ví dụ `>= 90%`, và user bật email alert.
* **Daily digest:** gửi 1 lần/ngày, mặc định `08:00` theo timezone của user.
* **Weekly summary:** gửi 1 lần/tuần nếu user bật báo cáo tổng hợp.
* **Analytics/job trend:** cập nhật mỗi ngày hoặc mỗi 6 giờ tùy cấu hình demo.
* **Job market dashboard:** line chart hiển thị tổng job đăng tuyển theo thời gian; chart phân bố bên phải cho phép xem theo nhóm vị trí IT hoặc salary band.
* **Email quota:** giới hạn số email/ngày theo từng user, ví dụ tối đa 5 email/ngày.
* **Cooldown chống lặp:** không gửi lại cùng một job đã được notify/skip trong một khoảng thời gian, ví dụ 7 ngày, trừ khi JD thay đổi đáng kể.
* **Quiet hours:** nếu user bật khung giờ yên lặng, hệ thống không gửi email ngay trong khung đó mà dời sang digest hoặc thời điểm tiếp theo.

Khi candidate bấm `Skip`:

* **Trên web:** job bị ẩn ngay và job kế tiếp hiển thị ngay.
* **Qua email:** không gửi job kế tiếp ngay lập tức; hệ thống ghi nhận `SKIPPED` và đưa job khác vào lần scan/digest tiếp theo.
* **Nếu bật Autopilot tìm job thay thế:** hệ thống có thể gửi job kế tiếp sau `30-60 phút`, nhưng phải giới hạn số email/ngày.
* `Skip` không được xem là `Bad Match`; nó chỉ là tín hiệu yếu để giảm ưu tiên job đó.

UI AutoFit Settings cần có:

* bật/tắt tự động quét job mới,
* tần suất quét: `1 giờ / 6 giờ / mỗi ngày`,
* bật/tắt gửi email ngay khi match cao,
* ngưỡng gửi ngay, ví dụ `90%`,
* bật/tắt daily digest,
* giờ nhận digest, ví dụ `08:00`,
* timezone nhận thông báo,
* giới hạn email/ngày,
* khung giờ yên lặng nếu user muốn,
* bật/tắt Autopilot tìm job thay thế sau khi skip.

Quy tắc ưu tiên khi AutoFit ra quyết định:

1. Kiểm tra consent và role.
2. Kiểm tra job/application còn hợp lệ.
3. Kiểm tra interaction cũ như `SKIPPED`, `NOT_INTERESTED`, `APPLIED`.
4. Kiểm tra cooldown chống gửi lặp lại.
5. Kiểm tra quota email/ngày.
6. Kiểm tra quiet hours và timezone.
7. Nếu đủ điều kiện thì auto execute, gửi email ngay, gom vào digest hoặc chờ duyệt.

## MÔ HÌNH HOẠT ĐỘNG NỘI BỘ

Hệ thống hoạt động như một automation agent chuyên biệt trong miền tuyển dụng:

1. **Perception:** đọc CV, JD, candidate preference, feedback và automation policy.
2. **Decision:** tính matching/recommendation score, gắn label, đánh giá AutoFit policy.
3. **Action:** trả kết quả qua API, tạo application, gửi invite, gửi email action, đưa vào queue chờ duyệt hoặc ghi notification.
4. **Learning:** nhận feedback từ web/email và cập nhật learned vector bằng Rocchio.
5. **Audit:** ghi lại toàn bộ quyết định quan trọng để giải thích và kiểm tra lại.

Hai engine lõi:

* **Matching Engine:** chấm CV so với JD khi upload CV hoặc khi recruiter tạo JD.
* **Recommendation Engine:** gợi ý JD cho candidate dựa trên profile vector.

Cả hai dùng chung pipeline tiền xử lý, vocabulary, TF-IDF, cosine similarity và feedback learning.

## CÔNG NGHỆ AI / NLP ÁP DỤNG

* **TF-IDF Vectorization:** tự xây dựng bằng Java để kiểm soát thuật toán và dễ giải thích khi bảo vệ.
* **Cosine Similarity:** tính độ tương đồng giữa CV vector, JD vector và candidate profile vector.
* **Rocchio Feedback Learning:** cập nhật learned vector dựa trên feedback `Good / Potential / Bad`.
* **Potential Heuristic:** phát hiện candidate có kỹ năng chuyển đổi tốt dù score chưa cao, ví dụ Java có thể chuyển sang Go nếu có backend foundation tốt.
* **Static Corpus / Controlled IDF:** dùng corpus cố định hoặc cập nhật có kiểm soát để score ổn định.

Hướng không chọn làm core:

* Gọi LLM/OpenAI/Gemini để làm vector hoặc tự động quyết định toàn bộ, vì scope sẽ khó kiểm soát và khó giải thích hơn.

## AUTOMATION, POLICY, EMAIL, AUDIT

### AutoFit Policy Engine

AutoFit quyết định hành động dựa trên:

* role của user,
* score,
* label,
* `isPotential`,
* user consent,
* threshold,
* giới hạn số email/action mỗi ngày,
* tần suất scan job mới,
* daily digest time,
* timezone và quiet hours,
* cooldown chống gửi lặp notification,
* trạng thái interaction trước đó như `SKIPPED`, `APPLIED`, `NOT_INTERESTED`, `SHOW_SIMILAR`,
* trạng thái job/application hiện tại.

Kết quả policy:

* `DO_NOTHING`,
* `NOTIFY_ONLY`,
* `SEND_EMAIL_ACTION`,
* `CREATE_PENDING_APPROVAL`,
* `AUTO_EXECUTE`.

### Actionable Email

Email được render bằng template HTML, có CTA rõ ràng và token riêng cho từng action.

Nguyên tắc:

* mỗi email tối đa 2 CTA chính và 1 CTA phụ,
* CTA đi qua magic-link,
* token hết hạn và dùng một lần,
* GET chỉ hiển thị confirm page,
* POST mới thực thi hành động,
* mọi kết quả đều ghi audit log.

### Audit Log

Audit log ghi:

* actor,
* action,
* target,
* source channel,
* policy snapshot,
* score/label liên quan,
* result,
* timestamp.

Audit log là phần bắt buộc để chứng minh automation có kiểm soát.

## DATABASE & STORAGE STRATEGY

Định hướng database của project:

* **Primary DB:** PostgreSQL là database lõi của hệ thống.
* **Development DB:** PostgreSQL local chạy bằng Docker Compose để tránh phụ thuộc giới hạn free tier và dễ tái tạo môi trường.
* **Optional demo/deploy DB:** Supabase PostgreSQL có thể dùng khi cần demo online hoặc deploy nhanh, nhưng không phải phụ thuộc bắt buộc.
* **Migration:** Flyway quản lý toàn bộ schema, index và migration SQL để local PostgreSQL và Supabase PostgreSQL có cùng cấu trúc.
* **File CV:** môi trường dev lưu file CV bằng local storage; về sau có thể đổi sang Supabase Storage hoặc S3-compatible storage.
* **Auth:** Spring Security JWT/passwordless tự triển khai trong backend, không phụ thuộc Supabase Auth.

## DATABASE SCHEMA (POSTGRESQL)

Các bảng cốt lõi:

* **UserAccount:** `id`, `email`, `role`, `status`, `created_at`
* **Candidate:** `id`, `name`, `email`, `user_account_id`
* **Recruiter:** `id`, `name`, `email`, `company_name`, `user_account_id`
* **EmployerProfile:** `id`, `recruiter_id`, `company_name`, `slug`, `logo_url`, `cover_url`, `summary`, `description`, `industry`, `company_size`, `location`, `website_url`, `benefits` JSONB, `is_featured`
* **CandidatePreference:** `id`, `candidate_id`, `desired_title`, `desired_skills`, `preferred_location`, `seniority_level`, `auto_apply_threshold`, `auto_apply_enabled`, `preferred_language`
* **CV:** `id`, `candidate_id`, `display_name`, `source`, `is_default`, `raw_text`, `extracted_terms` JSONB, `top_skills` JSONB, `language`, `status`
* **CandidatePortfolioLink:** `id`, `candidate_id`, `type`, `url`
* **CandidatePortfolioProject:** `id`, `candidate_id`, `name`, `role`, `summary`, `tech_stack` JSONB, `project_url`, `impact`
* **Job:** `id`, `recruiter_id`, `title`, `company`, `original_text`, `required_skills`, `nice_to_have_skills`, `seniority_level`, `employment_type`, `location`, `remote_type`, `salary_mode`, `salary_min`, `salary_max`, `salary_currency`, `salary_type`, `salary_is_visible`, `salary_display_text`, `learned_profile_vector` JSONB, `language`, `status`, `created_at`, `updated_at`
* **Matching:** `id`, `cv_id`, `job_id`, `raw_score`, `normalized_score`, `label`, `is_potential`, `reasons` JSONB
* **Application:** `id`, `candidate_id`, `job_id`, `matching_id`, `status`, `is_auto_applied`, `created_at`
* **Feedback:** `id`, `matching_id`, `actor_id`, `feedback_type`, `reason_tags` JSONB, `created_at`
* **AutomationPolicy:** `id`, `user_id`, `role`, `auto_apply_enabled`, `auto_apply_threshold`, `auto_invite_enabled`, `daily_digest_enabled`, `daily_digest_time`, `user_timezone`, `job_scan_enabled`, `job_scan_frequency`, `high_match_email_enabled`, `high_match_threshold`, `max_email_per_day`, `quiet_hours_enabled`, `quiet_hours_start`, `quiet_hours_end`, `notification_cooldown_hours`, `replacement_after_skip_enabled`, `replacement_delay_minutes`, `email_action_enabled`
* **RecommendationInteraction:** `id`, `candidate_id`, `job_id`, `action`, `source`, `created_at`, `metadata` JSONB
* **EmailAction:** `id`, `recipient_user_id`, `action_type`, `target_type`, `target_id`, `status`, `sent_at`, `executed_at`
* **EmailToken:** `id`, `token_hash`, `purpose`, `user_id`, `action_id`, `target_type`, `target_id`, `expires_at`, `used_at`, `revoked_at`
* **AuditLog:** `id`, `actor_type`, `actor_id`, `action_type`, `target_type`, `target_id`, `source_channel`, `result`, `metadata` JSONB, `created_at`
* **NotificationJob:** `id`, `job_type`, `payload` JSONB, `status`, `retry_count`, `next_retry_at`
* **JobTrendSnapshot:** `id`, `job_id`, `snapshot_date`, `view_count`, `apply_count`, `match_count`
* **JobMarketSnapshot:** `id`, `snapshot_date`, `total_posted_jobs`, `active_jobs`, `new_jobs`, `employer_count`, `distribution_by_role` JSONB, `distribution_by_salary` JSONB

Lưu ý: `JobMarketSnapshot.total_posted_jobs` phục vụ biểu đồ thị trường việc làm và không được dùng thay cho số lượng CV-JD matching.

## KIẾN TRÚC HỆ THỐNG

```text
Spring Boot Application (Java 21+)
├── Security Layer
│   ├── JWT Authentication
│   ├── Passwordless Magic-Link
│   └── Role-based Access Control
├── REST API Layer
│   ├── Candidate APIs
│   ├── Recruiter APIs
│   ├── Job Portal APIs
│   ├── Automation APIs
│   └── Audit/Analytics APIs
├── AI & NLP Module
│   ├── PDF Extraction (Apache PDFBox)
│   ├── Text Normalization (VI/EN)
│   ├── TF-IDF Vectorization
│   ├── Cosine Similarity
│   ├── Potential Detection
│   └── Rocchio Feedback Learning
├── Automation Agent Module
│   ├── AutoFit Policy Engine
│   ├── Automation Orchestrator
│   ├── Email Action Service
│   ├── Magic-Link Token Service
│   ├── Notification/Digest Service
│   └── Audit Log Service
├── Background Workers
│   ├── CV Parsing Worker
│   ├── Matching/Recompute Worker
│   ├── Email Sending Worker
│   └── Token Cleanup Worker
└── Data Access Layer
    └── Spring Data JPA + PostgreSQL
```

## TECH STACK

* **Backend:** Java 21+, Spring Boot, Spring Web, Spring Data JPA, Spring Security, Bean Validation.
* **Database:** PostgreSQL local qua Docker cho development/demo trực tiếp; Supabase PostgreSQL là lựa chọn optional khi deploy/demo online.
* **Migration:** Flyway.
* **Storage:** local filesystem cho CV trong development; có thể đổi sang Supabase Storage/S3-compatible storage ở phase deploy.
* **File Processing:** Apache PDFBox.
* **AI/NLP:** TF-IDF, cosine similarity, Rocchio tự triển khai bằng Java.
* **Automation:** Spring `@Async`, Spring `@Scheduled`, idempotent background jobs.
* **Email:** JavaMailSender hoặc SendGrid, Thymeleaf HTML email templates.
* **Frontend:** React + TypeScript hoặc stack tương đương, i18n, chart library.
* **Documentation:** OpenAPI/Swagger cho backend contract.

## MVP BẮT BUỘC

MVP nên hoàn thành theo thứ tự:

1. Auth + role candidate/recruiter.
2. Job portal cơ bản: job feed, search suggestion, search result page, filter, job detail.
3. Candidate Hồ sơ & CV: nhiều CV, Document Parser, Manual Creation, hồ sơ cố định và portfolio cơ bản.
4. JD CRUD cho recruiter.
5. TF-IDF vectorization + cosine matching.
6. Recommendation candidate-to-job.
7. Score 0-100%, label và Potential heuristic.
8. Feedback Good/Potential/Bad + Rocchio update.
9. AutoFit policy cơ bản: auto-apply threshold, notify/email action.
10. Một luồng actionable email hoàn chỉnh bằng magic-link.
11. Audit log cho action chính.
12. Dashboard candidate/recruiter, job market analytics và bilingual UI cơ bản.

## TÍNH NĂNG PHASE SAU

Sau khi MVP chạy ổn, có thể bổ sung:

1. Redis cache cho ranking/job feed.
2. Apache POI export Excel.
3. Hybrid OCR cho PDF scan.
4. Message broker như RabbitMQ/Kafka cho email queue lớn.
5. Advanced analytics.
6. Admin console đầy đủ.
7. Tích hợp ATS hoặc job board bên ngoài.

## DEMO KHI BẢO VỆ

Luồng demo đề xuất:

1. Candidate mở homepage như web tìm việc, tìm kiếm/lọc job.
2. Candidate bấm Search để chuyển sang trang kết quả, dùng filter và mở job detail.
3. Candidate mở nhà tuyển dụng nổi bật và xem job đang mở của công ty.
4. Candidate mở Upload CV, chuyển giữa `Document Parser` và `Manual Creation`.
5. Candidate mở Hồ sơ & CV, chọn CV mặc định và bổ sung portfolio dự án.
6. Candidate upload CV, backend trả trạng thái xử lý và chạy parse/scoring async.
7. Candidate xem job recommendation với score %, label và lý do match.
8. Recruiter mở tổng quan để xem chart/metrics/ranking summary.
9. Recruiter mở trang Việc làm HR Dashboard để xem requisition, applicants và AI Potential Matches.
10. Candidate bật auto-apply threshold, ví dụ 95%.
11. Backend phát hiện job đủ điều kiện, tạo application nội bộ hoặc gửi email xin xác nhận tùy policy.
12. Mở email demo, bấm `Apply` hoặc `Invite`, magic-link mở confirm page.
13. Confirm action, hệ thống thực thi bằng POST và ghi audit log.
14. Recruiter feedback `Good/Potential/Bad`, hệ thống cập nhật vector bằng Rocchio và recompute ranking.
15. Mở audit log để chứng minh mọi automation đều truy vết được.
16. Chuyển ngôn ngữ Việt/Anh và mở chart xu hướng công việc đăng tuyển.

## CÂU CHỐT KHI BẢO VỆ

"Hệ thống của em là một nền tảng tuyển dụng IT tích hợp job portal, CV-JD matching, job recommendation và automation có Human-in-the-Loop. Web app đóng vai trò job portal kiêm control panel, email là kênh hành động nhanh qua magic-link, còn backend là automation agent chịu trách nhiệm tính score, đánh giá policy, thực thi action, ghi audit log và học từ feedback bằng Rocchio. Nhờ đó hệ thống không chỉ chấm điểm CV-JD, mà còn có thể tự động đề xuất, xin xác nhận, thực thi và cải thiện kết quả theo phản hồi của người dùng."
