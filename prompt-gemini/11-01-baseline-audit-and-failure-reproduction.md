# Phase 0 — Baseline audit và tái hiện lỗi hiện tại

Đọc đầy đủ `prompt-gemini/11-default-demo-mode-and-live-two-role-workflow.md` và `prompt-gemini/11-00-phased-workflow-index.md` trước khi làm.

## Mục tiêu

Tạo bằng chứng baseline và bản đồ code trước khi thay đổi behavior. Đây là phase audit/read-only; không triển khai Demo Mode, migration hoặc outbox.

## Phạm vi

1. Kiểm tra `git status`, xác định thay đổi có sẵn và không đụng file ngoài phạm vi.
2. Đọc schema, migration hiện tại, registration flow, AutomationPolicy, Settings API/UI, matching services, schedulers, notification/email action, Candidate Jobs data source và CV ingestion.
3. Xác nhận database chính là `careerfit`; không tạo demo DB/schema.
4. Chạy read-only baseline manifest và xác nhận các giá trị hiện hành: 993 total jobs, 974 imported, 433 active imported recruiters, 433 canonical companies cùng fixture counts hiện có.
5. Xác nhận `ca/re/ad` đăng nhập bằng mật khẩu `1`; hai live-demo email chưa tồn tại.
6. Tái hiện và ghi bằng chứng hiện tại cho:
   - Candidate không có completed CV vẫn thấy hay không thấy active job catalog;
   - DOCX upload state/extracted data và khả năng kẹt ở VALIDATING;
   - hành vi khi job chuyển ACTIVE và thời gian tạo matching;
   - producer/scheduler notification hiện tại và race/deduplication gap;
   - Settings hiện có và nơi policy được lazy-create.
7. Chạy targeted backend/frontend tests không phá dữ liệu. Không reset, không đăng ký hai live account, không gửi mail thật.

## Deliverable

Tạo `prompt-gemini/11-01-baseline-audit-and-failure-reproduction-report.md`, gồm:

- exact commands/exit codes;
- baseline SQL manifest;
- code-path map có file/line;
- failures đã tái hiện và expected/actual;
- current timing/config values;
- test inventory cho các phase sau;
- risks/blockers;
- danh sách file dự kiến cho Phase 1, nhưng không viết implementation plan lan sang các phase khác.

## Điều kiện dừng

Dừng sau khi tạo report. Không sửa production code, migration, reset script hay dữ liệu chính. Kết thúc bằng `BASELINE AUDIT: COMPLETE` hoặc `BASELINE AUDIT: BLOCKED` cùng lý do thật.

