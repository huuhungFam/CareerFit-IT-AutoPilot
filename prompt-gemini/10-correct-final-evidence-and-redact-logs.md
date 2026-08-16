# Round 10 — Correct final evidence and redact logs (NO RESET)

Thực thi ngay, không trả về plan. Chức năng và baseline Round 09 hiện đã đạt; vòng này **chỉ** sửa log bảo mật và báo cáo sai bằng chứng. Tuyệt đối không reset volume/database, không chạy `reset-local-demo-data.ps1 -Force`, không import lại baseline, không sửa V27–V30, không commit/push/PR.

## Audit facts

Independent audit đã xác nhận:

```text
local DB: jobs=993, imported=974, active imported recruiters=433, canonical companies=433
cv=14, application=10, matching=18, bookmark=0, report=0
API smoke: exit 0, MB Bank login/UI endpoints pass, real cross-owner=403
integration: exit 0, SHA-256 output thực tế dài 64 ký tự
Maven: Tests run: 143, Failures: 0, Errors: 0, Skipped: 0; BUILD SUCCESS
normalization/dry-run/diff-check: exit 0
```

Nhưng report 09 đang sai ở hai chỗ:

- ghi Maven `Tests run: 62` thay vì `143`;
- ghi checksum `be5f2c4ef41a2c68c1799ee4900da6cd` dài 32 ký tự dưới phần SHA-256.

Ngoài ra log test hiện làm lộ dữ liệu không cần thiết:

- `test-integration.mjs` dump nguyên `row_to_json(user_account)` nên in BCrypt password hash;
- `assertDeepEqualState` có thể in raw account/profile state chứa password hash khi failure;
- `test-api-smoke.mjs` in prefix JWT `eyJ...` dù suffix đã redacted.

## Required changes

1. Trong `scripts/test-integration.mjs`, tạo sanitizer dùng cho mọi diagnostic dump/failure output:
   - redact keys `password_hash`, `passwordHash`, token/secret tương tự;
   - không thay đổi giá trị dùng nội bộ để deep-compare;
   - chỉ sanitize khi log;
   - dump Alias A/B phải hiển thị `"password_hash":"[REDACTED]"` hoặc bỏ field;
   - failure message của full-state snapshot không được in raw hash/secret.

2. Trong `scripts/test-api-smoke.mjs`:
   - không in bất kỳ phần nào của JWT;
   - chỉ log `Token: [REDACTED]` hoặc `accessToken present: true`.

3. Chạy lại, không reset:

```powershell
node scripts/test-integration.mjs
node scripts/test-api-smoke.mjs
node scripts/test-api-smoke.mjs http://localhost:8080 11111111-2222-4333-8444-555555555555  # expected 1
node scripts/test-api-smoke.mjs http://localhost:8080 not-a-uuid                           # expected 1
.\Backend\careerfit-backend\mvnw.cmd -f Backend/careerfit-backend/pom.xml test
git diff --check -- scripts/test-integration.mjs scripts/test-api-smoke.mjs prompt-gemini/09-repair-broken-baseline-and-close-proof-report.md prompt-gemini/10-correct-final-evidence-and-redact-logs-report.md
```

4. Chạy read-only SQL xác nhận baseline vẫn là `993/974/433/433`, fixture counts đúng và violations=0. Không mutate database chính.

5. Sửa `prompt-gemini/09-repair-broken-baseline-and-close-proof-report.md`:
   - thay Maven evidence bằng output thật `143/0/0/0`;
   - thay checksum 32-char bằng SHA-256 64-char từ integration run mới, hoặc ghi rõ checksum là per-run và đưa đủ Pass 1/2/3 64-char bằng nhau;
   - xóa/đính chính mọi bằng chứng không khớp output;
   - không ghi raw password hash/JWT/secret;
   - giữ nguyên reset evidence lịch sử, không reset lại.

6. Tạo `prompt-gemini/10-correct-final-evidence-and-redact-logs-report.md` ghi:
   - files changed;
   - bằng chứng log đã redacted;
   - exact integration exit 0 và 64-char SHA-256;
   - API positive/negative exit codes;
   - Maven exact `143/0/0/0`;
   - read-only baseline manifest;
   - diff-check;
   - xác nhận không reset/import/migration/repair/commit/push/PR.

Chỉ dừng khi report 09 đã chính xác, report 10 tồn tại, không còn raw hash/JWT trong test output và mọi gate trên pass.
