# Phase 1 — Schema, effective Demo policy và durable outbox foundation

Chỉ bắt đầu khi `11-01-baseline-audit-and-failure-reproduction-report.md` tồn tại và không có blocker chưa xử lý. Đọc đầy đủ prompt 11 gốc và report Phase 0.

## Mục tiêu

Xây nền backend/schema cho Demo Mode và outbox idempotent, chưa triển khai dispatcher timing đầy đủ, Settings UI hoặc live E2E.

## Công việc bắt buộc

1. Thêm migration kế tiếp sau version hiện tại, không sửa migration cũ:
   - `automation_policy.demo_mode_enabled`;
   - default phù hợp cho human Candidate/Recruiter mới;
   - imported/synthetic accounts vẫn outbound-disabled;
   - durable notification outbox với các field/status/timestamps/attempts cần thiết;
   - database unique identity tương đương recipient + email type + target type/key;
   - index phục vụ due-item polling, recipient scheduling và recovery.
2. Cập nhật entity/repository/DTO/API contracts.
3. Tạo `EffectiveAutomationPolicyResolver` hoặc abstraction tương đương:
   - Demo OFF trả stored normal policy;
   - Demo ON overlay 5s/30s/12s/cooldown 0/quiet-hours disabled;
   - không overwrite stored normal preferences;
   - Admin không cần Demo Mode;
   - imported/synthetic outbound vẫn disabled.
4. Đồng bộ default ở registration-created policy, lazy-created policy, entity/service và seed/reset expectations.
5. Bảo đảm `ca` và `re` có Demo Mode ON qua migration/seed-compatible behavior; `ad` không bị ảnh hưởng.
6. Implement idempotent atomic outbox enqueue primitive. Hai producer cạnh tranh phải tạo đúng một logical record nhờ DB constraint/upsert, không nhờ pre-check.
7. Chưa gửi email từ outbox và chưa thêm scheduler timing business ở phase này.

## Tests bắt buộc

- Candidate/Recruiter registration default ON;
- lazy policy defaults account-source-aware;
- imported account outbound disabled;
- toggle ON/OFF không làm mất stored normal preferences;
- exact effective timings on/off;
- Admin unaffected;
- concurrent/duplicate enqueue tạo một outbox row;
- unique identity dùng matchingId khi có matching, jobId chỉ khi không có matching.

Chạy targeted tests và full backend regression. Không reset database chính.

## Deliverable

Tạo `prompt-gemini/11-02-schema-policy-and-outbox-foundation-report.md` với changed files, migration SQL, schema/index/constraint evidence, exact tests và remaining risks.

## Điều kiện dừng

Dừng sau report. Không triển khai UI, event-first scoring, dispatcher, duplicate-job UX hoặc reset/E2E. Không tự chạy Phase 2.

