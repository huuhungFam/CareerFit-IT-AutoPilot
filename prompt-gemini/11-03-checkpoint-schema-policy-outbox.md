# Checkpoint 1 — Audit schema, policy và outbox foundation

Đây là prompt kiểm tra, không phải prompt sửa code. Đọc prompt 11 gốc, Phase 0 report, Phase 1 prompt và `11-02-schema-policy-and-outbox-foundation-report.md`.

## Kiểm tra trực tiếp

- Migration mới additive, không sửa V27–V30 hoặc migration lịch sử.
- Không có demo DB/schema thứ hai.
- Demo Mode persisted và defaults account-source-aware.
- `ca/re` ON, `ad` unaffected, imported automation/outbound disabled.
- Effective resolver overlay mà không phá stored normal settings.
- Outbox durable có due/status/attempt/error/sent timestamps phù hợp.
- DB-enforced unique dedup identity đúng matching/job semantics.
- Atomic enqueue chịu được competing producers.
- DTO/API không lộ entity internals hoặc secret.
- Backend tests thực sự cover persistence/concurrency, không chỉ mocks làm mất ý nghĩa unique constraint.

Chạy lại migration validation, targeted tests và backend regression phù hợp. Không reset dữ liệu chính và không sửa production code.

## Deliverable

Tạo `prompt-gemini/11-03-checkpoint-schema-policy-outbox-report.md` theo format:

```text
VERDICT: PASS | FAIL
Blocking findings: ...
Non-blocking findings: ...
Commands/evidence: ...
Required remediation before Phase 2: ...
```

Nếu FAIL, ghi file/line và acceptance condition bị vi phạm. Không tự sửa; dừng để người dùng giao lại Phase 1.

