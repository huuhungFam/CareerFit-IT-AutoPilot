# Checkpoint 5 — Audit duplicate protection và ownership/application flow

Audit only. Đọc prompt 11 gốc, Phase 5 prompt/report và PASS reports trước.

## Kiểm tra

- Fingerprint stable, normalized, không dùng volatile IDs/timestamps.
- Exact duplicate check ở activation/publish và không phá imported baseline.
- Near duplicate warning-only, explicit confirmation, threshold documented.
- Không có Company/membership refactor ngoài scope.
- Internal jobs hỗ trợ apply + owning Recruiter management.
- Imported jobs giữ source/owner và route đúng.
- Cross-owner applications/feedback bị 403/denied.
- Ba demo jobs coexist mà không special-case score/email/account.
- Read-only baseline counts và imported ownership không đổi.

Chạy targeted backend/frontend/ownership tests. Không sửa code, reset hay live-send.

## Deliverable

Tạo `prompt-gemini/11-11-checkpoint-duplicates-and-ownership-report.md` với `VERDICT: PASS|FAIL`, findings và remediation. Nếu FAIL, dừng.

