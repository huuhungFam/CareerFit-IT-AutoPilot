# Architecture: HITL Automation Layer for CareerFit IT AutoPilot

Tài liệu này mô tả lớp tự động hóa bằng email, magic-link, auto-apply và audit log cho `CareerFit IT AutoPilot`.
Nó bổ sung cho [proposal.md](proposal.md) và tập trung vào câu hỏi: hệ thống sẽ tự động làm gì, khi nào cần người duyệt, và mọi hành động được truy vết ra sao.

---

## 1. Mục Tiêu

- Cho phép người dùng chỉ cần theo dõi và bấm Yes/No khi cần.
- Cho phép hệ thống tự động thực thi hành động nếu người dùng đã cấp quyền.
- Duy trì Human-in-the-Loop: hành động quan trọng vẫn có thể cần xác nhận.
- Ghi lại toàn bộ hành động vào audit log để kiểm tra lại được.
- Dùng email như một kênh giao tiếp chính, giảm phụ thuộc vào việc mở web liên tục.

---

## 2. Khái Niệm Cốt Lõi

### 2.1. HITL

Human-in-the-Loop là mô hình trong đó:

- hệ thống tự động làm các tác vụ lặp lại,
- nhưng các hành động quan trọng vẫn do con người phê duyệt, từ chối hoặc override.

Trong project này, HITL có nghĩa là:

- recruiter có thể duyệt match tốt bằng email hoặc web,
- candidate có thể xác nhận auto-apply,
- hệ thống không tự ý thực hiện hành động nhạy cảm nếu chưa có consent.

### 2.2. AutoFit

AutoFit là lớp chính sách tự động hóa của hệ thống.

Nó quyết định:

- score bao nhiêu thì được gửi email,
- hành động nào được tự động hóa,
- hành động nào cần người duyệt,
- hành động nào chỉ ghi log và chờ xác nhận.

Ví dụ AutoFit:

- score > 95% và candidate bật auto-apply -> tạo application nội bộ tự động
- score 85-95% -> gửi email xác nhận để người dùng bấm Yes/No
- score thấp nhưng có tín hiệu `Potential` -> gửi vào digest hoặc gắn cờ cho recruiter

### 2.3. Actionable Email

Email chứa lời kêu gọi hành động rõ ràng:

- Yes / No
- Approve / Reject
- Apply / Skip
- Invite / Ignore

Email không chỉ là thông báo, mà là một giao diện rút gọn để thao tác nhanh.

### 2.4. Magic-Link

Magic-link là link có token bảo mật, thời hạn ngắn và dùng một lần.

Nó dùng cho:

- passwordless login
- xác nhận consent
- xác nhận hành động từ email

### 2.5. Auto-Apply

Auto-apply là hành động hệ thống tự tạo bản ghi ứng tuyển nội bộ khi thỏa policy.

Nó không đồng nghĩa với việc hệ thống tự bấm vào website bên thứ ba.

Trong phạm vi đồ án, auto-apply nên hiểu là:

- tạo `Application` trong hệ thống,
- cập nhật trạng thái,
- thông báo cho recruiter hoặc candidate,
- ghi audit log.

### 2.6. Audit Log

Audit log là nhật ký bất biến ghi lại:

- ai làm gì,
- vào lúc nào,
- từ đâu,
- với token nào,
- kết quả ra sao.

Không có audit log thì automation rất khó kiểm soát.

---

## 3. Nguyên Tắc Thiết Kế

1. **Consent-first:** hành động nhạy cảm phải có quyền hoặc xác nhận.
2. **Token ngắn hạn:** token email phải hết hạn và có thể thu hồi.
3. **One-time use:** một token chỉ dùng một lần.
4. **Idempotent actions:** bấm lại không tạo bản ghi trùng.
5. **Audit by default:** mọi action đều sinh log.
6. **Safe fallback:** token lỗi thì quay về web/confirm page, không fail im lặng.
7. **Không tin email client:** link scanners có thể chạm vào link, nên không nên thực thi side effect nặng chỉ bằng GET trần.

---

## 4. Thành Phần Hệ Thống

### 4.1. Email Template Renderer

Trách nhiệm:

- render email HTML đẹp
- chèn logo, tiêu đề, score, lý do match
- tạo CTA buttons

Công nghệ:

- Thymeleaf
- HTML email responsive
- inline CSS

### 4.2. Notification Service

Trách nhiệm:

- gửi email actionable
- gửi daily digest
- gửi notification khi có match cao
- retry khi mail provider lỗi tạm thời

Công nghệ:

- Spring `@Async`
- Spring Scheduler
- JavaMailSender hoặc SendGrid API

### 4.3. Token Service

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

### 4.4. AutoFit Policy Engine

Trách nhiệm:

- quyết định action nào được tự động hóa
- kiểm tra threshold
- kiểm tra consent của candidate/recruiter
- chọn channel: email, web, internal queue

### 4.5. Action API

Trách nhiệm:

- nhận xác nhận Yes/No
- thực thi action sau khi verify token
- cập nhật trạng thái matching/application
- trả confirmation page hoặc JSON response

### 4.6. Audit Log Service

Trách nhiệm:

- ghi mọi event quan trọng
- log bất biến
- phục vụ debug, tra soát, demo và kiểm toán

---

## 5. Data Model Đề Xuất

### 5.1. `automation_policy`

Lưu policy automation theo user hoặc role.

Trường gợi ý:

- `id`
- `user_id`
- `role`
- `auto_apply_enabled`
- `auto_apply_threshold`
- `auto_invite_enabled`
- `daily_digest_enabled`
- `email_action_enabled`
- `passwordless_enabled`
- `created_at`
- `updated_at`

### 5.2. `email_action`

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

### 5.3. `email_token`

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

### 5.4. `audit_log`

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

### 5.5. `notification_job`

Lưu job gửi email / digest.

Trường gợi ý:

- `id`
- `job_type`
- `payload` (JSONB)
- `status`
- `retry_count`
- `next_retry_at`
- `created_at`

---

## 6. Luồng Nghiệp Vụ

### 6.1. Recruiter nhận email actionable

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

### 6.2. Candidate nhận gợi ý job và auto-apply

Luồng:

1. Recommendation Engine tạo top JD phù hợp.
2. Nếu candidate bật auto-apply hoặc auto-notify, hệ thống gửi email phù hợp.
3. Nếu score vượt ngưỡng, AutoFit policy kiểm tra consent.
4. Nếu cho phép, tạo `Application` nội bộ.
5. Nếu chưa cho phép, gửi email Yes/No để candidate xác nhận.
6. Audit log ghi nhận toàn bộ quyết định.

### 6.3. Passwordless Login

Luồng:

1. Người dùng nhập email.
2. Backend sinh magic-link hoặc OTP.
3. Token được lưu dưới dạng hash, có TTL ngắn.
4. Người dùng bấm link từ email.
5. Backend verify token.
6. Backend phát JWT / session.
7. Token được đánh dấu `used`.
8. Audit log ghi sự kiện login.

### 6.4. Daily Digest

Luồng:

1. Scheduler quét match mới và policy.
2. Hệ thống gom các CV / JD / candidate đáng chú ý.
3. Gửi 1 email digest vào giờ cố định.
4. Email chứa summary ngắn, score, tag, và CTA.
5. Mỗi CTA đi qua token riêng.

---

## 7. API Đề Xuất

### 7.1. Email / Action

- `POST /api/automation/email-actions`
- `GET /api/automation/actions/confirm?token=...`
- `POST /api/automation/actions/confirm`
- `POST /api/automation/actions/reject`

### 7.2. Magic-Link Login

- `POST /api/auth/passwordless/request`
- `GET /api/auth/passwordless/verify?token=...`
- `POST /api/auth/passwordless/verify`

### 7.3. AutoFit Policy

- `GET /api/automation/policies/me`
- `POST /api/automation/policies/me`
- `PUT /api/automation/policies/me`

### 7.4. Audit

- `GET /api/audit-logs`
- `GET /api/audit-logs/{id}`

---

## 8. Bảo Mật

### 8.1. Chống đoán token

- token phải đủ dài
- phải được ký
- phải hết hạn
- phải có scope rõ ràng
- phải one-time use

### 8.2. Chống link scanner

Email client hoặc gateway có thể tự mở link.

Để tránh trigger sai:

- action nhạy cảm nên đi qua confirm page
- chỉ POST mới thực thi thay đổi trạng thái
- GET chỉ dùng để hiển thị thông tin xác nhận

### 8.3. Chống replay

- token dùng rồi phải vô hiệu hóa
- action API phải idempotent
- log phải lưu trạng thái thực thi

### 8.4. Role guard

- recruiter chỉ xem / duyệt dữ liệu thuộc phạm vi được cấp
- candidate chỉ thao tác trên hồ sơ của mình
- admin mới xem audit rộng

---

## 9. Failure Modes

### 9.1. Token hết hạn

Xử lý:

- báo token expired
- cho phép resend nếu policy cho phép
- không thực thi action

### 9.2. Token bị dùng lại

Xử lý:

- trả trạng thái `already used`
- không tạo action mới
- ghi log cảnh báo

### 9.3. Mail không gửi được

Xử lý:

- retry có backoff
- chuyển sang queue `failed`
- hiển thị trạng thái trong dashboard

### 9.4. Policy không rõ ràng

Xử lý:

- default là an toàn
- không auto-apply nếu không có consent
- yêu cầu người dùng cấu hình lại

### 9.5. Nội dung email sai dữ liệu

Xử lý:

- email template phải lấy từ DTO đã validate
- không render từ raw user input trực tiếp

---

## 10. Triển Khai Khuyến Nghị

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
10. confirmation landing pages

Lý do:

- audit và token là nền an toàn
- policy là lớp quyết định
- email và landing page là lớp hiển thị

---

## 11. Definition of Done

Lớp automation này chỉ coi là xong khi:

- gửi được email actionable
- token hết hạn và one-time hoạt động đúng
- magic-link login hoạt động
- auto-apply có policy và consent
- recruiter/candidate có thể yes/no qua email hoặc confirm page
- audit log ghi được toàn bộ action
- replay và link scanner không làm hỏng state

