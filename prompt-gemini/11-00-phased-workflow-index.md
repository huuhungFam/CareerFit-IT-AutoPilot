# Workflow chia nhỏ — Default Demo Mode và Live Two-Role Demo

File này là chỉ mục điều phối cho yêu cầu gốc:

`prompt-gemini/11-default-demo-mode-and-live-two-role-workflow.md`

Yêu cầu gốc là nguồn sự thật. Các prompt con chỉ chia nhỏ phạm vi, không được thay đổi quyết định đã chốt trong file gốc.

## Nguyên tắc vận hành

1. Chạy đúng thứ tự dưới đây.
2. Mỗi prompt implementation chỉ làm đúng một phần, chạy test liên quan, tạo report rồi dừng.
3. Sau mỗi implementation phải chạy prompt checkpoint tương ứng bằng một agent/audit turn khác.
4. Checkpoint chỉ được đọc, chạy test không phá dữ liệu và viết báo cáo PASS/FAIL. Không tự sửa code.
5. Chỉ chuyển sang phase tiếp theo khi checkpoint hiện tại ghi `VERDICT: PASS`.
6. Nếu checkpoint FAIL, đưa report checkpoint cho agent implementation của phase đó sửa tiếp; không mở rộng sang phase sau.
7. Không chạy reset phá dữ liệu trước Phase 6. Phase 6 vẫn phải có xác nhận rõ ràng của người dùng ngay trước khi chạy reset.
8. Không commit, push hoặc tạo PR trừ khi người dùng yêu cầu riêng.
9. Bảo toàn mọi thay đổi không liên quan trong working tree.

## Thứ tự prompt

| Thứ tự | Prompt | Loại |
|---:|---|---|
| 1 | `11-01-baseline-audit-and-failure-reproduction.md` | Audit ban đầu |
| 2 | `11-02-schema-policy-and-outbox-foundation.md` | Implementation |
| 3 | `11-03-checkpoint-schema-policy-outbox.md` | Checkpoint |
| 4 | `11-04-settings-ui-polling-catalog-and-cv.md` | Implementation |
| 5 | `11-05-checkpoint-settings-ui-and-candidate-flow.md` | Checkpoint |
| 6 | `11-06-event-first-matching-and-recovery.md` | Implementation |
| 7 | `11-07-checkpoint-event-matching-and-recovery.md` | Checkpoint |
| 8 | `11-08-outbox-delivery-spacing-and-feedback.md` | Implementation |
| 9 | `11-09-checkpoint-outbox-email-and-feedback.md` | Checkpoint |
| 10 | `11-10-duplicate-protection-and-internal-ownership.md` | Implementation |
| 11 | `11-11-checkpoint-duplicates-and-ownership.md` | Checkpoint |
| 12 | `11-12-reset-e2e-calibration-and-runbook.md` | Final implementation/E2E |
| 13 | `11-13-final-acceptance-audit.md` | Audit cuối |

## Trạng thái phase

Không tick trước. Chỉ cập nhật sau khi checkpoint tương ứng PASS.

- [x] Phase 0 baseline audit
- [ ] Phase 1 schema/policy/outbox foundation
- [ ] Phase 2 Settings UI, polling, catalog, CV UX
- [ ] Phase 3 event-first matching và recovery
- [ ] Phase 4 timed delivery và Candidate feedback
- [ ] Phase 5 duplicate protection và ownership/application flow
- [ ] Phase 6 reset, live E2E, calibration và runbook
- [ ] Final acceptance audit

