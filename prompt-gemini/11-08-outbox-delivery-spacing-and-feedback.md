# Phase 4 — Outbox dispatcher, email spacing và Candidate feedback

Chỉ bắt đầu khi Checkpoint 3 PASS. Đọc prompt 11 gốc và reports trước.

## Mục tiêu

Hoàn thiện durable delayed delivery, spacing theo recipient, deduplication end-to-end và Candidate-email-action → owning Recruiter alert.

## Công việc

1. Implement outbox dispatcher:
   - claim due rows atomic/locked;
   - status/attempt/last_error/sent_at;
   - retry an toàn, không double-send trong competing workers;
   - delivery log là audit, không là concurrency guard duy nhất.
2. Demo suggestion scheduling:
   - first eligible slot `now + 12s`;
   - subsequent same-recipient suggestions >=30s sau latest queued/sent suggestion;
   - transaction/locking chống concurrent same-slot;
   - recruiter immediate alerts và verification/security email không bị chặn sau suggestion spacing.
3. Mọi matching email producer và recovery dùng cùng enqueue/scheduling path.
4. Candidate email actions:
   - signed/hashed token + expiry;
   - idempotent action exactly once;
   - feedback update exactly once;
   - resolve recruiter qua `matching.job.recruiter_id`;
   - immediate recruiter outbox item, DB dedup;
   - browser result cho success/already-used/expired/invalid.
5. Mail allowlist configurable qua config/env, gồm hai live emails ở rehearsal; không hard-code trong MailService; không gửi `@careerfit.local` synthetic recipients.

## Tests bắt buộc

- first-slot and subsequent-slot calculation;
- concurrent enqueue/slot allocation;
- competing dispatchers claim once;
- retry and failure state;
- event/recovery race yields one sent logical email;
- immediate alert not delayed by suggestion spacing;
- feedback success/replay/expired/invalid;
- correct owning Recruiter and cross-owner denial;
- allowlist and `.local` suppression;
- effective quiet hours/cooldown normal vs demo.

Dùng fake SMTP/test mail sink ở phase này; chưa chạy live two-account E2E hoặc destructive reset.

## Deliverable

Tạo `prompt-gemini/11-08-outbox-delivery-spacing-and-feedback-report.md` với DB rows/timestamps, concurrency evidence, mail-sink evidence và tests.

## Điều kiện dừng

Dừng sau report; không làm Phase 5.

