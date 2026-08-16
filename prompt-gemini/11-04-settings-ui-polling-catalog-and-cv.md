# Phase 2 — Settings UI, polling, active-job catalog và CV UX

Chỉ bắt đầu khi report Checkpoint 1 ghi `VERDICT: PASS`. Đọc prompt 11 gốc và toàn bộ report Phase 0–Checkpoint 1.

## Mục tiêu

Hoàn thiện API/UI cho Demo Mode và Candidate experience; chưa triển khai event-first matching hoặc email dispatcher.

## Backend/API

1. Settings response trả stored policy, `demoModeEnabled` và effective timing summary từ resolver.
2. Settings update cho phép Candidate/Recruiter toggle Demo Mode, có validation/authorization và không overwrite normal preferences.
3. Candidate active-job catalog API độc lập với matching/CV state:
   - active jobs luôn hiển thị;
   - score/label chỉ enrich khi matching tồn tại;
   - không completed CV thì trả catalog cùng trạng thái giải thích.
4. Kiểm tra CV DOCX pipeline:
   - bounded states UPLOADED/VALIDATING/PROCESSING;
   - kết thúc SCORING_DONE hoặc FAILED có reason;
   - extracted text/summary/skills được expose đúng quyền;
   - retry endpoint chỉ thêm nếu API hiện tại không hỗ trợ recovery an toàn.

## Frontend

1. Tạo shared Demo Mode Settings component dùng cho Candidate và Recruiter.
2. Banner chỉ xuất hiện trong hai Settings pages, không xuất hiện route khác.
3. Hiển thị timing từ backend: 5s, 12s, 30s; frontend constant chỉ fallback.
4. Toggle có loading/success/error và không tự bật lại sau khi user tắt.
5. Candidate Jobs:
   - Demo ON poll 5 giây;
   - Demo OFF dùng normal interval hiện hữu;
   - manual Refresh dùng refetch/invalidate, không gọi scoring;
   - loading + last successful refresh time;
   - active catalog không biến mất khi chưa có CV/matching;
   - score xuất hiện khi matching có sẵn.
6. Đổi wording PDF-only thành generic `CV file uploaded`/`Tệp CV đã tải lên` cho PDF/DOCX.

## Tests bắt buộc

- backend Settings contract/effective timing/toggle preservation;
- catalog without CV/matching;
- CV state success/failure/retry behavior;
- Candidate/Recruiter Settings component;
- no banner outside Settings;
- 5s versus normal polling;
- Refresh đúng query;
- active jobs without completed CV;
- DOCX generic wording;
- type-check, lint, build và relevant frontend tests.

Không reset database chính, không đăng ký live accounts, không gửi email.

## Deliverable

Tạo `prompt-gemini/11-04-settings-ui-polling-catalog-and-cv-report.md` với screenshots/test evidence nếu browser tests có sẵn, API samples và exact commands.

## Điều kiện dừng

Dừng sau report. Không làm Phase 3.

