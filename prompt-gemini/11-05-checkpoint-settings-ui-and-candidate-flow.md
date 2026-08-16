# Checkpoint 2 — Audit Settings UI, polling, catalog và CV flow

Chỉ audit, không sửa. Đọc prompt 11 gốc, Phase 2 prompt/report và Checkpoint 1 PASS report.

## Kiểm tra

- Candidate/Recruiter đều dùng cùng component hoặc cùng logic nguồn, không duplicate timing constants.
- Banner chỉ tồn tại trên Settings routes.
- Effective timings đến từ backend resolver.
- Toggle OFF giữ stored normal preferences và không bị forced ON.
- Poll 5s chỉ khi Demo ON; normal mode không bị tăng tải.
- Manual Refresh không enqueue scoring/email.
- Candidate catalog fetch độc lập matching và vẫn có 993 active/seeded/imported semantics phù hợp.
- No-CV state có giải thích, không hiển thị zero jobs giả.
- DOCX kết thúc SCORING_DONE hoặc FAILED rõ ràng; không polling vô hạn.
- UI wording không còn PDF-only cho DOCX.
- Accessibility/loading/error states hợp lý.

Chạy backend contract tests, frontend type-check/lint/build/tests và browser test liên quan nếu môi trường hỗ trợ. Không reset và không sửa code.

## Deliverable

Tạo `prompt-gemini/11-05-checkpoint-settings-ui-and-candidate-flow-report.md` với `VERDICT: PASS|FAIL`, findings theo mức độ, commands và remediation bắt buộc. Nếu FAIL, dừng.

