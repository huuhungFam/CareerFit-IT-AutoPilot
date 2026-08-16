# Final acceptance audit — Default Demo Mode và Live Two-Role Workflow

Audit cuối, không sửa implementation và không reset. Chỉ bắt đầu khi Phase 6 report tồn tại và baseline đã restore.

Đọc prompt 11 gốc, workflow index, toàn bộ reports, code, migrations, tests, reset script, runbook và artifacts.

## Audit bắt buộc

1. Map từng acceptance criterion mục 16 của prompt gốc tới evidence code/test/runtime.
2. Chạy lại mọi verification không phá dữ liệu: backend tests, frontend type-check/lint/build/tests, API smoke, read-only SQL manifest, migration validation và scoped diff-check.
3. Xác nhận baseline 993/974/433/433, `ca/re/ad`, live emails absent, không live outbox leftovers.
4. Audit một DB `careerfit`, effective policy, durable outbox unique dedup và migration history không bị sửa.
5. Audit registration default ON, Settings-only banner, 5s refresh, catalog without CV, bounded DOCX states, after-commit matching, recovery, 12s/30s observed timings, race dedup, feedback owner, internal/imported ownership và duplicates.
6. Kiểm reports/logs không chứa raw password hash, JWT, token hoặc secret.
7. Phân biệt defect, thiếu evidence và environmental risk.

## Deliverable

Tạo `prompt-gemini/11-13-final-acceptance-audit-report.md`:

```text
FINAL VERDICT: PASS | FAIL
Acceptance matrix: criterion -> evidence -> result
Blocking findings
Non-blocking findings/risks
Commands and exact results
Baseline manifest
Recommended next action
```

Nếu FAIL, viết remediation prompt mới chỉ cho exact findings; không tự sửa. Nếu PASS, xác nhận không còn phase bắt buộc.

