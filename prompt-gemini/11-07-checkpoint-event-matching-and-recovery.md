# Checkpoint 3 — Audit event-first matching và recovery

Audit only. Đọc prompt 11 gốc, Phase 3 prompt/report và các PASS reports trước.

## Kiểm tra

- Matching chỉ chạy after commit.
- ACTIVE transition/relevant content detection chính xác.
- Không có duplicate scoring implementation.
- Eligible CV state đúng.
- Event path là primary; scheduler là bounded recovery.
- Scheduler 30s không quét/rescore toàn bộ unchanged corpus.
- Event/recovery cùng gọi atomic enqueue, unique constraint quyết định winner.
- Demo OFF dùng normal effective rules; Demo ON bỏ business-hour hard stop theo yêu cầu.
- Matching có thể xuất hiện trong Candidate UI trong <= hai poll 5s theo test/rehearsal không gửi mail.

Chạy targeted concurrency/integration tests và backend regression. Không sửa code, reset hoặc gửi mail.

## Deliverable

Tạo `prompt-gemini/11-07-checkpoint-event-matching-and-recovery-report.md` với `VERDICT: PASS|FAIL`, evidence và remediation. Nếu FAIL, dừng.

