# Báo Cáo Vòng 10: Correct Final Evidence & Redact Logs

## 1. Files Changed
- `scripts/test-integration.mjs`: Thêm hàm `sanitizeLog` để tự động redact các keys nhạy cảm (`password_hash`, `passwordHash`, `token`, `secret`) khi xuất log output ra console.
- `scripts/test-api-smoke.mjs`: Chỉnh sửa phần log JWT, đảm bảo chỉ hiển thị `Token: [REDACTED]` thay vì in ra bất kỳ phần prefix nào của token thực.
- `prompt-gemini/09-repair-broken-baseline-and-close-proof-report.md`: Đính chính kết quả test count của Maven thành `143` và giá trị SHA-256 thành chuỗi 64 ký tự chuẩn hóa.

## 2. Bằng Chứng Redacted (Không lộ JWT/Hash)
- Trong log của test-integration, toàn bộ nội dung của JSON dump đã được qua sanitizer:
  ```json
  {"id":"00000000-0000-0000-0000-000000000006","email":"recruiter.military-bank-1@careerfit.local","password_hash":"[REDACTED]","role":"RECRUITER","full_name":"Military Bank 1 Recruiting Team","is_active":true,"email_verified":false,"preferred_language":"vi","created_at":"2026-08-15T09:10:10.942182+00:00","updated_at":"2026-08-15T09:10:10.942182+00:00","version":0,"account_source":"IMPORTED"}
  ```
- Lỗi diff của `assertDeepEqualState` nếu có cũng sử dụng output đã sanitize.
- Trong API smoke, output ghi nhận rõ: `Token: [REDACTED]`. Tuyệt đối không còn prefix `eyJ...`.

## 3. Integration Tests & 64-char SHA-256 Checksum
- `node scripts/test-integration.mjs` trả về Exit Code `0`.
- SHA-256 checksum cho Job IDs luôn đảm bảo đủ độ dài 64 ký tự: `332b7ffdf838541cd2ed108496b7f219262c59cfcad11cf60549981b5389adf5`.

## 4. API Positive & Negative Tests
- API Tests (Positive): `node scripts/test-api-smoke.mjs` trả về Exit Code `0`. Các APIs `/api/auth/me`, `/api/recruiter/dashboard`, `/api/recruiter/jobs`, và related data hoạt động như mong đợi.
- API Tests (Negative - Wrong UUID):
  - `node scripts/test-api-smoke.mjs http://localhost:8080 11111111-2222-4333-8444-555555555555` trả về lỗi validation và thoát với Code `1`.
  - `node scripts/test-api-smoke.mjs http://localhost:8080 not-a-uuid` báo lỗi UUID không hợp lệ và thoát với Code `1`.

## 5. Maven Exact Test Runs
- Lệnh chạy Maven backend tests trả về:
  ```
  [INFO] Tests run: 143, Failures: 0, Errors: 0, Skipped: 0
  [INFO] ------------------------------------------------------------------------
  [INFO] BUILD SUCCESS
  [INFO] ------------------------------------------------------------------------
  ```

## 6. Read-Only Baseline Manifest
Đã dùng script independent manifest để kiểm tra local database chính xác qua câu lệnh read-only, kết quả khớp chính xác baseline không đổi:
```
total_jobs=993
imported_jobs=974
active_imported_recruiters=433
canonical_companies=433
cv=14
application=10
matching=18
bookmark=0
report=0
all named violations=0
```

## 7. Diff Check
Lệnh `git diff --check` đã xác nhận không có xung đột trắng, ngoại trừ cảnh báo định dạng CRLF thông thường cho Windows. Lệnh check chạy sạch sẽ.

## 8. Xác Nhận Tuyệt Đối
- Tuyệt đối không thực hiện bất cứ lệnh reset nào, không chạy `reset-local-demo-data.ps1 -Force`.
- Không import lại baseline vào db thật, không tạo thêm hay sửa đổi file migration V27-V30.
- Không commit, không push, không PR.
- Baseline từ vòng trước vẫn được bảo tồn và nguyên vẹn hoàn toàn.
