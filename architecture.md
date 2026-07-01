# Architecture: Automation Agent, Control Panel and Email Action Channel

Tài liệu này mô tả kiến trúc automation chính của `CareerFit IT AutoPilot`.
Nó bổ sung cho [proposal.md](proposal.md) và [srs.md](srs.md), tập trung vào cách biến:

- web app thành job portal kiêm control panel,
- email thành action channel,
- backend thành automation agent có policy, audit và feedback learning.

---

## 1. Kiến Trúc Sản Phẩm

```text
Guest / Candidate / Recruiter
        |
        | Web: job portal + control panel
        | Email: action channel
        v
Spring Boot Backend Automation Agent
        |
        | Matching, Recommendation, AutoFit Policy, Audit, Feedback Learning
        v
PostgreSQL
```

Database triển khai theo hướng:

- development/demo trực tiếp: PostgreSQL local chạy bằng Docker Compose,
- schema migration: Flyway,
- optional demo/deploy online: Supabase PostgreSQL hoặc PostgreSQL cloud khác,
- file CV trong development: local storage,
- auth: Spring Security JWT/passwordless do backend tự triển khai, không phụ thuộc Supabase Auth.

### 1.1. Web App

Web app có hai vai trò:

- Với guest, web là job portal public: dashboard public, job market chart, job list, job detail và employer detail. Guest không thấy score/potential cá nhân và mọi action cần tài khoản phải đi qua login-required guard/modal.
- Với candidate, web vẫn là một job portal bình thường: job feed, search suggestion, search results, filter, job detail, employer detail, CV upload, Hồ sơ & CV, recommendations, applications, Advanced Analytics theo role.
- Với recruiter/admin, web là control panel: dashboard tổng quan, HR-style job management, ranking, potential pool, approval queue, AutoFit settings, audit log, analytics cơ bản và Advanced Analytics theo role.

### 1.2. Email Action Channel

Email là kênh hành động nhanh cho các quyết định nhỏ hoặc cần xác nhận:

- candidate bấm `Apply`, `Skip`, `Show Similar`,
- recruiter bấm `Invite`, `Reject`, `Mark Potential`,
- người dùng gửi feedback `Good Match`, `Potential`, `Bad Match`,
- người dùng đăng nhập bằng passwordless magic-link.

### 1.3. Backend Automation Agent

Backend là nơi giữ toàn bộ logic nghiệp vụ:

- nhận dữ liệu CV/JD/profile,
- validate dữ liệu,
- chạy matching/recommendation,
- đánh giá AutoFit policy,
- gửi email hoặc tự thực thi nếu có consent,
- ghi audit log,
- học từ feedback bằng Rocchio.

Frontend không quyết định automation. Email không chứa logic nghiệp vụ. Mọi quyết định phải đi qua backend.

---

## 2. Mục Tiêu

- Cho phép người dùng chỉ cần theo dõi và bấm Yes/No khi cần.
- Cho phép hệ thống tự động thực thi hành động nếu người dùng đã cấp quyền.
- Duy trì Human-in-the-Loop: hành động quan trọng vẫn có thể cần xác nhận.
- Ghi lại toàn bộ hành động vào audit log để kiểm tra lại được.
- Dùng email như một kênh giao tiếp chính, giảm phụ thuộc vào việc mở web liên tục.
- Dùng feedback từ web/email để cập nhật vector bằng Rocchio và cải thiện ranking/recommendation.
- Dùng job market analytics để hiển thị tổng số job đăng tuyển, xu hướng theo thời gian và phân bố theo nhóm IT/mức lương. Phần này tách biệt với analytics về matching.
- Advanced Analytics UI dùng route riêng `/candidate/advanced-analytics` và `/recruiter/advanced-analytics`; `/recruiter/analytics` vẫn là trang thống kê cơ bản/legacy.
- Tách rõ candidate CV, hồ sơ cố định và portfolio để tránh nhầm CV upload với dữ liệu profile dài hạn.
- Tách recruiter dashboard tổng quan khỏi trang job management HR Dashboard.

---

## 3. Khái Niệm Cốt Lõi

### 3.1. HITL

Human-in-the-Loop là mô hình trong đó:

- hệ thống tự động làm các tác vụ lặp lại,
- nhưng các hành động quan trọng vẫn do con người phê duyệt, từ chối hoặc override.

Trong project này, HITL có nghĩa là:

- recruiter có thể duyệt match tốt bằng email hoặc web,
- candidate có thể xác nhận auto-apply,
- hệ thống không tự ý thực hiện hành động nhạy cảm nếu chưa có consent.

### 3.2. AutoFit

AutoFit là lớp chính sách tự động hóa của hệ thống.

Nó quyết định:

- score bao nhiêu thì được gửi email,
- hành động nào được tự động hóa,
- hành động nào cần người duyệt,
- hành động nào chỉ ghi log và chờ xác nhận.
- bao lâu thì quét job mới,
- khi nào gửi ngay và khi nào gom vào digest,
- xử lý thế nào khi user bấm `Skip`, `Not Interested` hoặc `Show Similar`.
- có đang vượt quota email/ngày hay không,
- có đang nằm trong quiet hours của user hay không,
- notification cùng job có đang trong cooldown chống gửi lặp hay không.

Ví dụ AutoFit:

- score > 95% và candidate bật auto-apply -> tạo application nội bộ tự động
- score 85-95% -> gửi email xác nhận để người dùng bấm Yes/No
- score thấp nhưng có tín hiệu `Potential` -> gửi vào digest hoặc gắn cờ cho recruiter
- job mới match candidate >= 90% -> gửi email ngay nếu user bật high-match alert
- job match trung bình -> gom vào daily digest

### 3.3. Actionable Email

Email chứa lời kêu gọi hành động rõ ràng:

- Yes / No
- Approve / Reject
- Apply / Skip
- Invite / Ignore

Email không chỉ là thông báo, mà là một giao diện rút gọn để thao tác nhanh.

### 3.4. Magic-Link

Magic-link là link có token bảo mật, thời hạn ngắn và dùng một lần.

Nó dùng cho:

- passwordless login
- xác nhận consent
- xác nhận hành động từ email

### 3.5. Auto-Apply

Auto-apply là hành động hệ thống tự tạo bản ghi ứng tuyển nội bộ khi thỏa policy.

Nó không đồng nghĩa với việc hệ thống tự bấm vào website bên thứ ba.

Trong phạm vi đồ án, auto-apply nên hiểu là:

- tạo `Application` trong hệ thống,
- cập nhật trạng thái,
- thông báo cho recruiter hoặc candidate,
- ghi audit log.

### 3.6. Feedback Learning

Feedback learning là cơ chế dùng phản hồi từ candidate/recruiter để cập nhật vector bằng Rocchio.

Nguồn feedback:

- web feedback,
- email one-click feedback,
- recruiter đánh dấu `Good / Potential / Bad`,
- candidate đánh dấu `Not Interested` hoặc `Show Similar`.

Quy tắc:

- `Good Match` tăng trọng số dương mạnh,
- `Potential` tăng trọng số nhẹ hơn,
- `Bad Match` đẩy vector ra xa,
- `Skip` không tự động tương đương `Bad Match`.

### 3.7. Audit Log

Audit log là nhật ký bất biến ghi lại:

- ai làm gì,
- vào lúc nào,
- từ đâu,
- với token nào,
- kết quả ra sao.

Không có audit log thì automation rất khó kiểm soát.

---

## 4. Nguyên Tắc Thiết Kế

1. **Consent-first:** hành động nhạy cảm phải có quyền hoặc xác nhận.
2. **Token ngắn hạn:** token email phải hết hạn và có thể thu hồi.
3. **One-time use:** một token chỉ dùng một lần.
4. **Idempotent actions:** bấm lại không tạo bản ghi trùng.
5. **Audit by default:** mọi action đều sinh log.
6. **Safe fallback:** token lỗi thì quay về web/confirm page, không fail im lặng.
7. **Không tin email client:** link scanners có thể chạm vào link, nên không nên thực thi side effect nặng chỉ bằng GET trần.
8. **Backend owns decisions:** frontend và email chỉ gửi intent, backend mới quyết định action cuối cùng.

---

## 5. Thành Phần Hệ Thống

### 5.0. Infrastructure & Persistence

Thành phần hạ tầng dữ liệu:

- PostgreSQL là primary database.
- Docker Compose chạy PostgreSQL local cho development và demo trên máy cá nhân.
- Flyway chạy migration khi backend khởi động để tạo bảng, index, constraint và enum.
- Local filesystem lưu file CV trong development, ví dụ `storage/cv`.
- Storage service phải được abstract bằng interface để sau này đổi sang Supabase Storage hoặc S3 mà không đổi logic nghiệp vụ.
- Spring Security quản lý JWT, role-based access và passwordless token, không dùng Supabase Auth làm nguồn sự thật.

### 5.1. Matching and Recommendation Services

Trách nhiệm:

- nhận vector CV/JD/profile,
- tính cosine similarity,
- normalize score,
- gắn nhãn `Low / Medium / High / Potential`,
- tạo reason chips cho UI/email,
- trigger AutoFit khi có kết quả quan trọng.

### 5.1.1. Job Portal Search Service

Trách nhiệm:

- trả dữ liệu public cho guest mà không kèm score/potential cá nhân,
- nhận keyword, filter và sort từ candidate-facing job portal,
- trả danh sách job dạng phân trang,
- trả search suggestions theo skill, job title và employer,
- trả metadata phục vụ filter bar hoặc filter modal,
- bảo đảm homepage chỉ cần tải một số job mới/nổi bật, còn danh sách đầy đủ nằm ở trang search results.

### 5.1.2. Employer Profile Service

Trách nhiệm:

- trả danh sách nhà tuyển dụng nổi bật,
- trả hồ sơ chi tiết nhà tuyển dụng,
- trả danh sách job đang mở theo employer,
- liên kết recruiter/company ownership với dữ liệu hiển thị public cho candidate.

### 5.1.3. Candidate Profile & CV Service

Trách nhiệm:

- quản lý nhiều CV cho một candidate,
- lưu nguồn CV: uploaded document hoặc manual creation,
- chọn một CV mặc định cho matching chính,
- lưu hồ sơ cố định của candidate,
- lưu portfolio links và portfolio projects,
- trả dữ liệu cho trang `Hồ sơ & CV` gồm 3 tab: `CV đã tạo`, `Hồ sơ cố định`, `Portfolio / Dự án`.

### 5.1.4. Recruiter Workspace Service

Trách nhiệm:

- trả dữ liệu dashboard tổng quan cho `/recruiter`,
- trả requisition list, job detail, Applied CVs và AI Potential Matches cho `/recruiter/jobs`,
- giữ job management HR Dashboard tách khỏi overview dashboard.

### 5.2. Feedback Learning Service

Trách nhiệm:

- ghi nhận feedback từ web/email,
- phân loại feedback thành positive/weak positive/negative/preference signal,
- cập nhật learned vector bằng Rocchio,
- đánh dấu ranking/recommendation cần recompute.

### 5.3. AutoFit Policy Engine

Trách nhiệm:

- quyết định action nào được tự động hóa,
- kiểm tra threshold,
- kiểm tra consent của candidate/recruiter,
- kiểm tra giới hạn số action/email mỗi ngày,
- kiểm tra tần suất scan job mới,
- kiểm tra interaction cũ để không đề xuất lại job đã bị skip/not interested,
- kiểm tra quota email, timezone, quiet hours và cooldown,
- chọn channel: web, email, internal queue, auto execute.

### 5.4. Automation Orchestrator

Trách nhiệm:

- nhận event từ matching/recommendation/feedback,
- gọi policy engine,
- tạo application/invite nếu được phép,
- tạo email action nếu cần HITL,
- ghi audit log cho quyết định.

### 5.5. Email Template Renderer

Trách nhiệm:

- render email HTML đẹp
- chèn logo, tiêu đề, score, lý do match
- tạo CTA buttons

Công nghệ:

- Thymeleaf
- HTML email responsive
- inline CSS

### 5.6. Notification Service

Trách nhiệm:

- gửi email actionable
- gửi daily digest
- gửi notification khi có match cao
- retry khi mail provider lỗi tạm thời

Công nghệ:

- Spring `@Async`
- Spring Scheduler
- JavaMailSender hoặc SendGrid API

### 5.7. Token Service

Trách nhiệm:

- sinh token
- ký token
- hash token trước khi lưu
- xác minh token
- thu hồi token

Quy tắc:

- token phải có `purpose`
- token phải có `expiresAt`
- token phải có `usedAt`
- token nên lưu hash, không lưu raw token nếu có thể

### 5.8. Action API

Trách nhiệm:

- nhận xác nhận Yes/No
- thực thi action sau khi verify token
- cập nhật trạng thái matching/application
- trả confirmation page hoặc JSON response

### 5.9. Audit Log Service

Trách nhiệm:

- ghi mọi event quan trọng
- log bất biến
- phục vụ debug, tra soát, demo và kiểm toán

### 5.10. Job Market Analytics Service

Trách nhiệm:

- tổng hợp snapshot số lượng job đăng tuyển theo ngày hoặc theo cấu hình demo,
- trả summary gồm tổng job, job active, job mới và số employer có job,
- trả trend line dựa trên tổng job đăng tuyển, không dựa trên matching count,
- trả distribution theo nhóm vị trí IT hoặc salary band,
- cung cấp tooltip data cho frontend khi hover biểu đồ.

---

## 6. Data Model Đề Xuất

### 6.1. `job`

Lưu Job Description và metadata phục vụ job portal, matching, recommendation và email template.

Trường gợi ý:

- `id`
- `recruiter_id`
- `title`
- `company`
- `original_text`
- `required_skills`
- `nice_to_have_skills`
- `seniority_level`
- `employment_type`
- `location`
- `remote_type`
- `salary_mode`
- `salary_min`
- `salary_max`
- `salary_currency`
- `salary_type`
- `salary_is_visible`
- `salary_display_text`
- `learned_profile_vector` (JSONB)
- `language`
- `status`
- `created_at`
- `updated_at`

Quy tắc salary:

- `salary_mode` là bắt buộc, gồm `NEGOTIABLE`, `RANGE`, `UP_TO`, `FROM`, `HIDDEN`.
- `salary_min` và `salary_max` được nullable tùy `salary_mode`.
- `salary_display_text` dùng cho UI/email, còn min/max/currency/type dùng cho filter, sort và recommendation.

### 6.1.1. `employer_profile`

Lưu hồ sơ public của nhà tuyển dụng.

Trường gợi ý:

- `id`
- `recruiter_id`
- `company_name`
- `slug`
- `logo_url`
- `cover_url`
- `summary`
- `description`
- `industry`
- `company_size`
- `location`
- `website_url`
- `benefits` (JSONB)
- `is_featured`
- `created_at`
- `updated_at`

### 6.2. `automation_policy`

Lưu policy automation theo user hoặc role.

Trường gợi ý:

- `id`
- `user_id`
- `role`
- `auto_apply_enabled`
- `auto_apply_threshold`
- `auto_invite_enabled`
- `daily_digest_enabled`
- `daily_digest_time`
- `user_timezone`
- `job_scan_enabled`
- `job_scan_frequency`
- `high_match_email_enabled`
- `high_match_threshold`
- `max_email_per_day`
- `quiet_hours_enabled`
- `quiet_hours_start`
- `quiet_hours_end`
- `notification_cooldown_hours`
- `replacement_after_skip_enabled`
- `replacement_delay_minutes`
- `email_action_enabled`
- `passwordless_enabled`
- `created_at`
- `updated_at`

### 6.3. `email_action`

Lưu một email có hành động.

Trường gợi ý:

- `id`
- `recipient_user_id`
- `action_type`
- `target_type`
- `target_id`
- `subject`
- `template_name`
- `status`
- `created_at`
- `sent_at`
- `opened_at`
- `executed_at`

### 6.4. `email_token`

Lưu token xác thực cho action hoặc login.

Trường gợi ý:

- `id`
- `token_hash`
- `purpose`
- `user_id`
- `action_id`
- `target_type`
- `target_id`
- `expires_at`
- `used_at`
- `revoked_at`
- `created_at`

### 6.5. `audit_log`

Lưu lịch sử hành động.

Trường gợi ý:

- `id`
- `actor_type`
- `actor_id`
- `action_type`
- `target_type`
- `target_id`
- `result`
- `source_channel`
- `ip_address`
- `user_agent`
- `metadata` (JSONB)
- `created_at`

### 6.6. `notification_job`

Lưu job gửi email / digest.

Trường gợi ý:

- `id`
- `job_type`
- `payload` (JSONB)
- `status`
- `retry_count`
- `next_retry_at`
- `created_at`

### 6.7. `recommendation_interaction`

Lưu hành vi của candidate với từng job để hệ thống không đề xuất lặp lại sai cách.

Trường gợi ý:

- `id`
- `candidate_id`
- `job_id`
- `action`
- `source`
- `created_at`
- `metadata` (JSONB)

`action` gợi ý:

- `VIEWED`
- `SKIPPED`
- `APPLIED`
- `SAVED`
- `NOT_INTERESTED`
- `SHOW_SIMILAR`

`source` gợi ý:

- `WEB`
- `EMAIL`
- `DIGEST`
- `AUTOPILOT`

### 6.8. `candidate_portfolio_link`

Lưu link cá nhân của candidate.

Trường gợi ý:

- `id`
- `candidate_id`
- `type`
- `url`
- `created_at`
- `updated_at`

### 6.9. `candidate_portfolio_project`

Lưu dự án nổi bật của candidate.

Trường gợi ý:

- `id`
- `candidate_id`
- `name`
- `role`
- `summary`
- `tech_stack` (JSONB)
- `project_url`
- `impact`
- `created_at`
- `updated_at`

### 6.10. `job_market_snapshot`

Lưu dữ liệu tổng hợp cho dashboard thị trường việc làm.

Trường gợi ý:

- `id`
- `snapshot_date`
- `total_posted_jobs`
- `active_jobs`
- `new_jobs`
- `employer_count`
- `distribution_by_role` (JSONB)
- `distribution_by_salary` (JSONB)
- `created_at`

Quy tắc:

- `total_posted_jobs` là số lượng job đăng tuyển trên hệ thống trong phạm vi thống kê.
- Không dùng trường này để biểu diễn số CV-JD matching.
- Nếu cần hiển thị matching analytics, dùng endpoint/DTO riêng với tên rõ ràng như `matchingCount`.

---

## 7. Luồng Nghiệp Vụ

### 7.1. Recruiter nhận email actionable

Luồng:

1. Hệ thống phát hiện CV có score cao hoặc `Potential`.
2. AutoFit policy quyết định gửi email cho recruiter.
3. Notification Service render email HTML.
4. Email có nút `Approve` / `Reject`.
5. Nút mở landing page có token đã ký.
6. Người dùng xác nhận lại hành động nếu policy yêu cầu.
7. Action API ghi kết quả.
8. Audit Log Service lưu toàn bộ sự kiện.

Khuyến nghị:

- Với action có hậu quả thật, không nên thực thi ngay từ link GET trần nếu chưa có bước confirm.
- Landing page nên là nơi chốt hành động cuối cùng.

### 7.2. Candidate nhận gợi ý job và auto-apply

Luồng:

1. Recommendation Engine tạo top JD phù hợp.
2. Nếu candidate bật auto-apply hoặc auto-notify, hệ thống gửi email phù hợp.
3. Nếu score vượt ngưỡng, AutoFit policy kiểm tra consent.
4. Nếu cho phép, tạo `Application` nội bộ.
5. Nếu chưa cho phép, gửi email Yes/No để candidate xác nhận.
6. Audit log ghi nhận toàn bộ quyết định.

### 7.2.1. Candidate quản lý Hồ sơ & CV

Luồng:

1. Candidate mở `/candidate/profile`.
2. Frontend hiển thị tab `CV đã tạo` mặc định để quản lý nhiều CV.
3. Candidate upload CV mới hoặc tạo CV bằng form ở `/candidate/upload`.
4. Candidate chọn một CV mặc định cho matching chính.
5. Candidate chuyển sang tab `Hồ sơ cố định` để chỉnh dữ liệu nền/preference.
6. Candidate chuyển sang tab `Portfolio / Dự án` để khai báo link cá nhân và dự án nổi bật.

Quy tắc:

- Upload CV và Manual Creation là hai tab trong `/candidate/upload`.
- Portfolio không nằm trong `/candidate/upload`; nó nằm trong `Hồ sơ & CV`.
- Candidate profile không phải portfolio.

### 7.3. Feedback qua email

Luồng:

1. Hệ thống gửi email yêu cầu feedback sau khi recruiter/candidate xem match.
2. Email có các CTA `Good Match`, `Potential`, `Bad Match` hoặc `Not Interested`.
3. User bấm CTA và đi qua confirm page nếu cần.
4. Backend verify token, ghi feedback và audit log.
5. Feedback Learning Service cập nhật vector bằng Rocchio.
6. Ranking/recommendation liên quan được đánh dấu recompute.

### 7.4. Passwordless Login

Luồng:

1. Người dùng nhập email.
2. Backend sinh magic-link hoặc OTP.
3. Token được lưu dưới dạng hash, có TTL ngắn.
4. Người dùng bấm link từ email.
5. Backend verify token.
6. Backend phát JWT / session.
7. Token được đánh dấu `used`.
8. Audit log ghi sự kiện login.

### 7.5. Daily Digest

Luồng:

1. Scheduler quét match mới và policy.
2. Hệ thống gom các CV / JD / candidate đáng chú ý.
3. Gửi 1 email digest vào giờ cố định.
4. Email chứa summary ngắn, score, tag, và CTA.
5. Mỗi CTA đi qua token riêng.

### 7.6. Job scan và high-match notification

Luồng:

1. Scheduler chạy theo `job_scan_frequency`, mặc định mỗi 1 giờ.
2. Hệ thống tìm job mới hoặc job vừa cập nhật.
3. Recommendation Engine score job đó với candidate phù hợp.
4. AutoFit kiểm tra policy, interaction cũ, quota, cooldown và quiet hours.
5. Nếu user đã `SKIPPED`, `NOT_INTERESTED` hoặc `APPLIED`, job đó không được gửi lại trong cùng luồng recommendation.
6. Nếu score >= `high_match_threshold`, mặc định 90%, user bật high-match email, chưa vượt quota, không nằm trong quiet hours và không bị cooldown, hệ thống tạo actionable email.
7. Nếu không đủ điều kiện gửi ngay, hệ thống gom vào daily digest hoặc giữ trong web recommendation.

### 7.6.1. Thứ tự quyết định AutoFit

Thứ tự này giúp code không mâu thuẫn khi nhiều điều kiện cùng xảy ra:

1. Check role, quyền truy cập và consent.
2. Check target còn hợp lệ: job active, CV active, chưa apply trùng.
3. Check interaction cũ: `APPLIED`, `SKIPPED`, `NOT_INTERESTED`, `SHOW_SIMILAR`.
4. Check cooldown chống gửi lặp cùng job/candidate.
5. Check quota email/ngày.
6. Check quiet hours theo `user_timezone`.
7. Chọn action cuối: `AUTO_EXECUTE`, `SEND_EMAIL_ACTION`, `ADD_TO_DIGEST`, `CREATE_PENDING_APPROVAL`, `DO_NOTHING`.

### 7.7. Skip và job kế tiếp

Luồng web:

1. Candidate bấm `Skip` trên job feed hoặc recommendation card.
2. Backend ghi `RecommendationInteraction(action=SKIPPED, source=WEB)`.
3. Frontend ẩn job ngay và hiển thị job kế tiếp từ danh sách hiện có.
4. Lần recommendation tiếp theo loại job đã skip khỏi danh sách ưu tiên.

Luồng email:

1. Candidate bấm `Skip` trong email.
2. Backend ghi `RecommendationInteraction(action=SKIPPED, source=EMAIL)`.
3. Hệ thống không gửi job kế tiếp ngay để tránh spam.
4. Nếu `replacement_after_skip_enabled = true`, hệ thống có thể tạo notification job sau `replacement_delay_minutes`, mặc định 30-60 phút.
5. Nếu không bật, job kế tiếp chỉ xuất hiện trong web hoặc daily digest tiếp theo.

Quy tắc:

- `Skip` không phải `Bad Match`.
- `Not Interested` là tín hiệu mạnh hơn `Skip`.
- `Show Similar` là tín hiệu tích cực cho nhóm job tương tự.
- `Bad Match` mới được dùng làm negative feedback mạnh cho Rocchio.

### 7.8. Candidate search results

Luồng:

1. Candidate nhập keyword ở homepage hoặc trang việc làm.
2. Frontend gọi `GET /api/jobs/search/suggestions` khi input focus và keyword đủ dài; nếu backend chưa sẵn sàng, UI fallback sang suggestions từ dữ liệu mock.
3. Candidate bấm Search hoặc chọn suggestion.
4. Frontend chuyển sang trang search results với keyword/filter trong query string.
5. Backend trả danh sách job, tổng số kết quả, pagination và filter metadata.
6. Candidate mở job detail bằng cách bấm card, tên job hoặc nút chi tiết.

Quy tắc:

- Suggestions không phải là phần cố định của trang kết quả; chỉ hiển thị trong trạng thái nhập liệu.
- Trang tổng quan chỉ hiển thị một phần job mới/nổi bật và có link `Xem tất cả`.
- Khi danh sách rỗng, frontend hiển thị no-match CTA như reset filter, clear search, update profile hoặc upload CV khác tùy role/context.
- Khi toàn bộ kết quả là Low/điểm thấp, frontend cảnh báo nhẹ và không ưu tiên auto-apply CTA.
- Khi nhiều kết quả cùng điểm, frontend giữ sort ổn định và hiển thị tie-break note nếu backend trả metadata.

### 7.8.1. Recruiter candidate filtering

Luồng:

1. Recruiter mở `/recruiter/jobs/{jobId}/applicants` hoặc `/potential`.
2. Frontend giữ tab `Applied CVs` và `AI Potential Matches`.
3. Frontend áp thêm filter `match=HIGH|POTENTIAL|HIGH_OR_POTENTIAL|APPLIED|NOT_APPLIED` trên URL.
4. Backend nên trả `label`, `isPotential`, `applicationStatus`, `normalizedScore` và tie-break metadata nếu có.
5. Nếu filter không có kết quả, frontend hiển thị empty state riêng và CTA xem toàn bộ ranking hoặc xóa search.

Backend vẫn là nguồn sự thật cho score, label, potential và application status. Frontend chỉ hiển thị/lọc theo dữ liệu trả về hoặc fallback mock khi backend chưa sẵn sàng.

### 7.8.2. Guest access và login redirect

Luồng:

1. Guest mở `/` hoặc `/jobs`.
2. Frontend hiển thị dashboard/job list public và ẩn score, potential, reason match cá nhân.
3. Guest bấm Apply trên job public.
4. Frontend mở modal yêu cầu đăng nhập với nút Login và Cancel.
5. Guest mở tab cần tài khoản như Upload CV, Hồ sơ & CV, Applications hoặc AutoFit.
6. Frontend hiển thị login-required guard.
7. Guard/modal truyền `next` vào `/login?next=...`.
8. Sau login, frontend/backend session chuyển người dùng về `next` nếu role phù hợp; nếu không phù hợp thì chuyển về dashboard của role đăng nhập.

Backend thật phải enforce cùng rule bằng role-based authorization; frontend guard chỉ là UX.
Frontend hiện lưu access token và account summary trong `localStorage`. `POST /api/auth/login` là đường chính; mock account `ca`/`re` chỉ là fallback development khi backend chưa chạy.

### 7.9. Employer detail

Luồng:

1. Frontend gọi danh sách featured employers cho candidate home/job page.
2. Candidate bấm employer card.
3. Frontend mở trang employer detail.
4. Backend trả employer profile và danh sách job đang mở.
5. Candidate có thể mở từng job để xem detail/apply.

### 7.10. Job market dashboard

Luồng:

1. Scheduler hoặc analytics service tạo `job_market_snapshot`.
2. Candidate/recruiter dashboard gọi job-market APIs.
3. Frontend vẽ line chart bằng `total_posted_jobs`.
4. Frontend vẽ bar chart theo `distribution_by_role` hoặc `distribution_by_salary`.
5. Tooltip chỉ hiện khi hover và dùng nhãn `jobs đăng tuyển` hoặc `việc làm`.
6. Advanced Analytics route kết hợp market widgets public với panel role-scoped từ `/api/candidate/analytics/*` hoặc `/api/recruiter/analytics/*`.

### 7.11. Recruiter overview và HR dashboard

Luồng:

1. `/recruiter` hiển thị dashboard tổng quan: job market chart, metric cards và ranking/applicant/potential summary.
2. `/recruiter/jobs` hiển thị HR Dashboard chuyên cho job management.
3. HR Dashboard có requisition list bên trái và job detail + Applied CVs/AI Potential Matches bên phải.
4. Các route `/recruiter/jobs/{jobId}/ranking`, `/applicants`, `/potential` dùng cùng surface job management nhưng chọn đúng job/subview.

---

## 8. API Đề Xuất

### 8.1. Email / Action

- `GET /api/email-action/redeem?token=...`

### 8.2. Magic-Link Login

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/passwordless/request`
- `GET /api/auth/passwordless/verify?token=...`
- `POST /api/auth/passwordless/verify`

### 8.3. AutoFit Policy

- `GET /api/automation/policy`
- `PATCH /api/automation/policy`
- `PATCH /api/automation/policy/email-notifications`
- `POST /api/automation/auto-apply/run-now`
- `POST /api/automation/pause?until=...`
- `POST /api/automation/resume`

### 8.4. Recommendation Interaction

- `POST /api/recommendations/{jobId}/interactions`
- `GET /api/recommendations/interactions`

### 8.5. Candidate Profile & CV

- `GET /api/cv/me`
- `GET /api/candidates/me`
- `PATCH /api/candidates/me`
- `GET /api/candidates/me/cvs`
- `POST /api/cv/{cvId}/set-default`
- `GET /api/candidates/me/portfolio`
- `POST /api/candidates/me/portfolio/links`
- `PATCH /api/candidates/me/portfolio/links/{linkId}`
- `DELETE /api/candidates/me/portfolio/links/{linkId}`
- `POST /api/candidates/me/portfolio/projects`
- `PATCH /api/candidates/me/portfolio/projects/{projectId}`
- `DELETE /api/candidates/me/portfolio/projects/{projectId}`

### 8.6. Job Portal

- `GET /api/jobs/search`
- `GET /api/jobs`
- `GET /api/jobs/search/suggestions`
- `GET /api/jobs/suggestions`
- `GET /api/jobs/{jobId}`
- `GET /api/matches/me/cards`
- `GET /api/recruiter/jobs/{jobId}/candidates?match=HIGH_OR_POTENTIAL&applicationStatus=...&minScore=...&sort=...`

### 8.7. Employer

- `GET /api/employers/featured`
- `GET /api/employers/{id}`
- `GET /api/employers/{id}/jobs`

### 8.8. Recruiter Workspace

- `GET /api/recruiter/dashboard`
- `GET /api/recruiter/jobs`
- `GET /api/recruiter/jobs/{jobId}/ranking`
- `GET /api/recruiter/jobs/{jobId}/stats`
- `GET /api/recruiter/jobs/{jobId}/top-candidates`

### 8.9. Feedback

- `POST /api/matches/{matchingId}/feedback?type=GOOD_MATCH&channel=WEB&role=CANDIDATE`
- `POST /api/matches/{matchingId}/feedback?type=POTENTIAL&channel=WEB&role=CANDIDATE`
- `POST /api/matches/{matchingId}/feedback?type=BAD_MATCH&channel=WEB&role=CANDIDATE`
- `POST /api/matches/{matchingId}/feedback?type=NOT_INTERESTED&channel=WEB&role=CANDIDATE`
- `POST /api/matches/{matchingId}/feedback?type=GOOD_MATCH&channel=WEB&role=RECRUITER`
- `POST /api/matches/{matchingId}/feedback?type=POTENTIAL&channel=WEB&role=RECRUITER`
- `POST /api/matches/{matchingId}/feedback?type=BAD_MATCH&channel=WEB&role=RECRUITER`
- `GET /api/email-action/redeem?token=...`

### 8.10. Analytics

API analytics cơ bản vẫn giữ:

- `GET /api/analytics/stats`
- `GET /api/analytics/trend`
- `GET /api/analytics/roles`

Advanced Analytics bổ sung namespace riêng:

- `GET /api/analytics/market/overview`
- `GET /api/analytics/market/skills`
- `GET /api/analytics/market/salary`
- `GET /api/analytics/market/trends`
- `POST /api/analytics/events`
- `GET /api/candidate/analytics/overview`
- `GET /api/candidate/analytics/skill-demand`
- `GET /api/candidate/analytics/profile-gaps`
- `GET /api/candidate/analytics/match-trends`
- `GET /api/recruiter/analytics/overview`
- `GET /api/recruiter/analytics/jobs/{jobId}/funnel`
- `GET /api/recruiter/analytics/jobs/{jobId}/skill-gap`
- `GET /api/recruiter/analytics/trends`

`/api/analytics/market/*` trả dữ liệu thị trường việc làm theo số job đăng tuyển, skill demand, salary distribution và trend public.
Các endpoint candidate/recruiter analytics phải role-scoped để không lộ score, CV, application hoặc funnel riêng tư.
`POST /api/analytics/events` lưu event như job view/search/match card click để các metric view/search không phải đoán từ entity nghiệp vụ.

### 8.11. Audit

- `GET /api/admin/audit-logs`

Audit log là dữ liệu vận hành nhạy cảm, chỉ role `ADMIN` được xem qua Admin control panel. Candidate/Recruiter không có endpoint audit log riêng.

---

## 9. Bảo Mật

### 9.1. Chống đoán token

- token phải đủ dài
- phải được ký
- phải hết hạn
- phải có scope rõ ràng
- phải one-time use

### 9.2. Chống link scanner

Email client hoặc gateway có thể tự mở link.

Để tránh trigger sai:

- action nhạy cảm nên đi qua confirm page
- chỉ POST mới thực thi thay đổi trạng thái
- GET chỉ dùng để hiển thị thông tin xác nhận

### 9.3. Chống replay

- token dùng rồi phải vô hiệu hóa
- action API phải idempotent
- log phải lưu trạng thái thực thi

### 9.4. Role guard

- guest chỉ truy cập public endpoints, không được nhận score/reason/potential cá nhân,
- recruiter chỉ xem / duyệt dữ liệu thuộc phạm vi được cấp
- candidate chỉ thao tác trên hồ sơ của mình
- admin mới xem audit rộng

---

## 10. Failure Modes

### 10.1. Token hết hạn

Xử lý:

- báo token expired
- cho phép resend nếu policy cho phép
- không thực thi action

### 10.2. Token bị dùng lại

Xử lý:

- trả trạng thái `already used`
- không tạo action mới
- ghi log cảnh báo

### 10.3. Mail không gửi được

Xử lý:

- retry có backoff
- chuyển sang queue `failed`
- hiển thị trạng thái trong dashboard

### 10.4. Policy không rõ ràng

Xử lý:

- default là an toàn
- không auto-apply nếu không có consent
- yêu cầu người dùng cấu hình lại

### 10.5. Nội dung email sai dữ liệu

Xử lý:

- email template phải lấy từ DTO đã validate
- không render từ raw user input trực tiếp

---

## 11. Triển Khai Khuyến Nghị

Ưu tiên triển khai theo thứ tự:

1. `audit_log`
2. `email_token`
3. `automation_policy`
4. `notification_job`
5. `email_action`
6. email template + send service
7. magic-link login
8. auto-apply policy
9. daily digest
10. job scan + high-match notification policy
11. recommendation interaction
12. job portal search + employer profile APIs
13. candidate CV/profile/portfolio APIs
14. recruiter overview + HR workspace APIs
15. job market analytics snapshots
16. confirmation landing pages

Lý do:

- audit và token là nền an toàn
- policy là lớp quyết định
- email và landing page là lớp hiển thị

---

## 12. Definition of Done

Kiến trúc automation chỉ coi là xong khi:

- gửi được email actionable
- token hết hạn và one-time hoạt động đúng
- magic-link login hoạt động
- auto-apply có policy và consent
- recruiter/candidate có thể yes/no qua email hoặc confirm page
- high-match email chỉ gửi ngay khi vượt ngưỡng và không vượt quota
- skip qua web ẩn job ngay, skip qua email không spam job kế tiếp
- search suggestion và search results hoạt động đúng query/filter
- candidate job results có no-match CTA, low-match-only warning và tie-score stable ranking/tie-break note
- employer detail trả được profile và job đang mở
- candidate quản lý được nhiều CV, hồ sơ cố định và portfolio
- recruiter overview tách khỏi HR job management dashboard
- recruiter job workspace lọc được High, Potential, High or Potential, Applied và Not applied mà không thay thế tab Applied CVs / AI Potential Matches
- job market dashboard hiển thị số job đăng tuyển, không hiển thị nhầm matching count
- validation suggestion phân biệt hard error, warning và quality flag, hiển thị gần field liên quan
- audit log ghi được toàn bộ action
- feedback từ web/email cập nhật được Rocchio vector
- web có control panel để xem policy, queue, action history và audit summary
- replay và link scanner không làm hỏng state

---

## 12. Updates từ Production Security & UAT Evaluation

### 12.1. Network Isolation & Nginx Actuator Security
- Backend và DB giao tiếp thông qua network `internal` (isolated). Frontend truy cập backend thông qua `edge` network và Nginx proxy.
- Các endpoint `/actuator` nhạy cảm bị chặn truy cập từ internet tại level Nginx. Chỉ cho phép `/actuator/health` được public cho purpose monitoring/load balancing. `/actuator/prometheus` chỉ được truy cập nội bộ bởi container Prometheus.

### 12.2. Thuật toán Rocchio & Evaluation
- Tích hợp TextNormalizationService cho cả test evaluator và production service, loại bỏ sai lệch về chuẩn hóa chữ viết thường và Unicode tiếng Việt.
- Cơ chế feedback Rocchio Learning cập nhật vector asynchoronously thông qua Message Queue / Scheduler để re-compute `learnedProfileVectorJson`, giúp cải thiện ranking cá nhân hóa cho từng recruiter/job mà không blocking thao tác người dùng.
- Thêm cơ chế test đánh giá qua nDCG, MRR với baseline threshold P@5 > 80% (System đạt 86.6% P@5, và > 0.9 nDCG@5 trên tập dataset mở rộng).

### 12.3. APIs Mới Bổ Sung

- `POST /api/admin/users/{userId}/suspend` - Admin suspend User Account.
- Role/Permission: `ADMIN` mới được phép call các api bắt đầu bằng `/api/admin/*`.
