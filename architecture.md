# Architecture: Automation Agent, Control Panel and Email Action Channel

Tài liệu này mô tả kiến trúc automation chính của `CareerFit IT AutoPilot`.
Nó bổ sung cho [proposal.md](proposal.md) và [srs.md](srs.md), tập trung vào cách biến:

- web app thành job portal kiêm control panel,
- email thành action channel,
- backend thành automation agent có policy, audit và feedback learning.

---

## 1. Kiến Trúc Sản Phẩm

```text
Candidate / Recruiter
        |
        | Web: job portal + control panel
        | Email: action channel
        v
Spring Boot Backend Automation Agent
        |
        | Matching, Recommendation, AutoFit Policy, Audit, Feedback Learning
        v
PostgreSQL / Supabase
```

### 1.1. Web App

Web app có hai vai trò:

- Với candidate, web vẫn là một job portal bình thường: job feed, search, filter, job detail, CV upload, recommendations, applications.
- Với recruiter/admin, web là control panel: JD management, ranking, potential pool, approval queue, AutoFit settings, audit log, analytics.

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

### 5.1. Matching and Recommendation Services

Trách nhiệm:

- nhận vector CV/JD/profile,
- tính cosine similarity,
- normalize score,
- gắn nhãn `Low / Medium / High / Potential`,
- tạo reason chips cho UI/email,
- trigger AutoFit khi có kết quả quan trọng.

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

---

## 6. Data Model Đề Xuất

### 6.1. `automation_policy`

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

### 6.2. `email_action`

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

### 6.3. `email_token`

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

### 6.4. `audit_log`

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

### 6.5. `notification_job`

Lưu job gửi email / digest.

Trường gợi ý:

- `id`
- `job_type`
- `payload` (JSONB)
- `status`
- `retry_count`
- `next_retry_at`
- `created_at`

### 6.6. `recommendation_interaction`

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

---

## 8. API Đề Xuất

### 8.1. Email / Action

- `POST /api/automation/email-actions`
- `GET /api/automation/actions/confirm?token=...`
- `POST /api/automation/actions/confirm`
- `POST /api/automation/actions/reject`

### 8.2. Magic-Link Login

- `POST /api/auth/passwordless/request`
- `GET /api/auth/passwordless/verify?token=...`
- `POST /api/auth/passwordless/verify`

### 8.3. AutoFit Policy

- `GET /api/automation/policies/me`
- `POST /api/automation/policies/me`
- `PUT /api/automation/policies/me`

### 8.4. Recommendation Interaction

- `POST /api/recommendations/{jobId}/interactions`
- `GET /api/recommendations/interactions`

### 8.5. Feedback

- `POST /api/matchings/{matchingId}/feedback`
- `POST /api/automation/actions/feedback`

### 8.6. Audit

- `GET /api/audit-logs`
- `GET /api/audit-logs/{id}`

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
12. confirmation landing pages

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
- audit log ghi được toàn bộ action
- feedback từ web/email cập nhật được Rocchio vector
- web có control panel để xem policy, queue, action history và audit summary
- replay và link scanner không làm hỏng state
