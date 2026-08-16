# Checkpoint 4 — Audit outbox delivery, timing và feedback

Audit only. Đọc prompt 11 gốc, Phase 4 prompt/report và PASS reports trước.

## Kiểm tra

- DB uniqueness/atomic claim thực sự ngăn duplicate, không chỉ pre-check.
- Dispatcher crash/retry semantics không đánh dấu SENT sai hoặc gửi lặp dễ thấy.
- First slot 12s và later spacing >=30s theo recipient.
- Immediate recruiter/security mail không bị suggestion queue trì hoãn.
- Event + recovery race chứng minh one logical outbox và one send.
- Feedback token security, expiry, idempotency và correct recruiter ownership.
- Result pages đủ success/reused/expired/invalid.
- Configurable allowlist; không hard-code live emails trong MailService; `.local` không được gửi.
- Normal mode policy không bị demo overlay vĩnh viễn.

Chạy concurrency/persistence/integration tests với test mail sink. Không gửi mail thật, reset hoặc sửa code.

## Deliverable

Tạo `prompt-gemini/11-09-checkpoint-outbox-email-and-feedback-report.md` với `VERDICT: PASS|FAIL`, findings, exact commands và remediation. Nếu FAIL, dừng.

