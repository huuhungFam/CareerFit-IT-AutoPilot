# Phase 6 — Reset integration, live E2E calibration và thesis runbook

Chỉ bắt đầu khi tất cả Checkpoint 1–5 đều `VERDICT: PASS`.

Đây là phase duy nhất được phép chạy reset phá dữ liệu. **Trước khi chạy reset, dừng và yêu cầu người dùng xác nhận rằng dữ liệu local hiện tại có thể bị xóa.** Nếu chưa có xác nhận trong lượt hiện tại, chỉ chuẩn bị code/tests/runbook và ghi `WAITING FOR RESET APPROVAL`; không tự reset.

## A — Reset script integration

Mở rộng, không thay thế, `scripts/reset-local-demo-data.ps1`. Giữ exact physical-volume name/label safety và canonical command. Update latest Flyway assertion và kiểm:

- 993 total, 974 imported, 433 active imported recruiters, 433 canonical companies;
- imported ownership/normalization/idempotency/duplicates;
- `ca/re/ad` active đúng role và login password `1`;
- `ca/re` effective Demo Mode ON; `ad` unaffected;
- hai live-demo emails absent sau reset;
- imported automation/email disabled;
- không có outbox rows của deleted live accounts;
- baseline fixture counts đúng;
- storage clean, backend healthy, smoke pass.

## B — Calibrate reusable demo artifacts

1. Chuẩn bị DOCX CV và ba bilingual JD dùng nội dung thật, không seed ba job.
2. Chạy scoring implementation thật để đạt Job 1 HIGH >=90 (ưu tiên 95–100), Job 2 khoảng 80–89, Job 3 khoảng 65–74.
3. Không hard-code IDs/scores hoặc special-case hai live emails.
4. Lưu artifacts/docs ở vị trí hợp lý và ghi cách dùng.

## C — Live two-role E2E sau khi được phép reset

1. Chạy đúng canonical reset command một lần.
2. Register qua real UI/API Candidate `hungb2203557@student.ctu.edu.vn` và Recruiter `phamhuuhung216@gmail.com`, cùng password `12345678`.
3. Thực hiện verification flow thật nếu app yêu cầu; không bypass security.
4. Assert Demo Mode default ON cho cả hai.
5. Upload DOCX, đợi SCORING_DONE, kiểm extracted text/summary/skills.
6. Recruiter tạo và activate ba job; owner chỉ là live recruiter; total jobs = 996.
7. Ghi timestamps activation, matching, UI visibility <= hai poll 5s, first mail 10–15s và later mail >=30s.
8. Cho event/recovery xử lý cùng logical match; chứng minh một outbox/một send.
9. Click Candidate email action; correct owning Recruiter nhận immediate alert exactly once.
10. Apply một internal live job; Recruiter thấy application; cross-owner imported access bị chặn.
11. Kiểm exact/near duplicate UX.

## D — Restore baseline

Sau khi thu đủ E2E evidence và khi người dùng cho phép, chạy canonical reset lần cuối để xóa live accounts/jobs/runtime artifacts và restore 993/974/433. Xác nhận `ca/re/ad`, live emails absent và outbox sạch.

## Verification và deliverables

- full backend tests;
- frontend type-check/lint/build/tests và browser E2E;
- API smoke;
- reset manifest trước live, after-live 996 và after-restore 993;
- mail timestamps + DB outbox/delivery evidence;
- `prompt-gemini/11-12-reset-e2e-calibration-and-runbook-report.md`;
- thesis demo runbook trong docs với normal path, fallback `ca/re`, SMTP troubleshooting và canonical reset;
- calibrated CV/JD artifacts.

Không tuyên bố hoàn tất nếu chưa chạy complete two-account scenario từ verified reset baseline. Phân biệt app enqueue/dispatch success với SMTP provider delivery và ghi environmental risk thật.

