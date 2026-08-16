# Round 09 — Repair broken baseline and close the remaining proof gaps

Thực thi ngay, không trả về plan và không xin xác nhận. Round 08 **chưa đạt** và đã để local baseline ở trạng thái hỏng. Chỉ dừng khi code, test, reset và report đều có bằng chứng thật.

## Sự thật audit bắt buộc phải xử lý

Audit độc lập sau Round 08 cho kết quả:

```text
current local DB:
total_jobs=19
imported_jobs=0
active_imported_recruiters=0
cv=14
application=10
matching=18

node scripts/test-api-smoke.mjs => exit 1
recruiter.mb-bank@careerfit.local login => 401
```

Nguyên nhân thể hiện ngay trong report 08: agent đã chạy trực tiếp `docker volume rm ...`, rồi chỉ start Postgres/backend, không chạy `scripts/reset-local-demo-data.ps1 -Force`, không import 974 JD và bỏ qua cơ chế exact-name/label verification. Đây là vi phạm safety và Definition of Done. Không được lặp lại cách làm này.

Đọc lại đầy đủ:

- `prompt-gemini/08-absolute-final-acceptance-proof.md`
- `prompt-gemini/08-absolute-final-acceptance-proof-report.md`
- `scripts/test-integration.mjs`
- `scripts/import-scraped-jobs.mjs`
- `scripts/reset-local-demo-data.ps1`
- `scripts/test-api-smoke.mjs`

Không sửa V27–V30, không dùng `flyway repair`, không commit/push/PR.

## 1. Sửa các false-green còn lại trong integration test

### 1.1 Invalid-benefits rollback đang test sai

Hiện test snapshot state **trước khi** ghi benefits invalid, sau importer fail lại tự sửa benefits về hợp lệ rồi mới snapshot và so sánh. Cách này chỉ chứng minh thao tác sửa tay phục hồi state, không chứng minh importer rollback.

Phải sửa đúng thứ tự:

1. Ghi valid JSONB có invalid shape vào alias profile.
2. Snapshot full state ngay sau khi corruption đã tồn tại, trước importer.
3. Chạy importer, expect non-zero và đúng error.
4. Snapshot ngay sau importer fail, trước bất kỳ cleanup nào.
5. Deep-equal toàn bộ state với snapshot bước 2, bao gồm benefits invalid vẫn còn nguyên.
6. Chỉ sau assertion mới cleanup fixture về array hợp lệ và assert cleanup thành công.

### 1.2 Partial state chưa assert đầy đủ

- `accountBPost !== accountBPre` hiện chỉ log; phải assert exact Alias B account state theo contract.
- `policyAPre` và `policyBPre` đang capture nhưng không được dùng. Assert policy IDs/immutable fields giữ nguyên và chỉ sáu toggle chuyển từ state trước sang FALSE theo importer contract.
- Deep-assert exact direct-user FK và exact application/matching/bookmark/report fixture IDs + links sau partial, không chỉ reporter FK.

### 1.3 Full merge còn bỏ Alias B policy và B1/B2

Sau full import phải assert:

- canonical, Alias A và Alias B exact policy IDs đều còn tồn tại;
- cả sáu toggle của cả ba policy đều FALSE bằng null-safe checks;
- A1, B1, B2 đều có exact recruiter owner/email canonical và exact normalized `job.company`;
- Alias A/B users tồn tại nhưng inactive; profiles/slugs A/B không còn;
- application/matching/bookmark/content_report exact IDs và toàn bộ relevant FK targets.

### 1.4 Không được hợp thức hóa canonical drift

Test hiện coi các giá trị drift sau là kết quả đúng:

```text
company_name = MB Bank Canonical Real
slug = mb-bank-drift
```

Điều này trái yêu cầu gốc: canonical company phải là `MB Bank`, recruiter email `recruiter.mb-bank@careerfit.local`, slug phải đúng deterministic canonical slug mà importer tạo. Chỉ các profile content fields thật như website/logo/summary/... mới được ưu tiên hơn placeholder.

Phải:

- thêm red assertion chứng minh current drift sai;
- sửa importer nếu cần để luôn normalize exact `company_name` và `slug` của canonical profile;
- sửa full profile assertions và Pass 1/2/3 MB assertions về exact canonical values đúng;
- assert imported `job.company='MB Bank'` và profile `company_name='MB Bank'`, mismatch=0.

Không được đổi expected sang giá trị drift để làm test xanh.

### 1.5 Full manifest

Giữ từng invariant có tên và null-safe. `canonicalCompanies` phải thực sự dùng `COUNT(DISTINCT company_name)` nếu tên biến/contract là số canonical companies, không chỉ count profile rows. Sau từng pass assert đầy đủ 993/974/433/433, duplicates, mismatch, profile, orphan, account và policy violations; ba SHA-256 64-char bằng nhau.

## 2. Khôi phục baseline đúng cách

Không được chạy thủ công `docker volume rm`, `docker compose rm` hoặc chuỗi reset tự chế.

Sau khi toàn bộ pre-reset gates xanh, chạy đúng:

```powershell
pwsh -NoProfile -File scripts/reset-local-demo-data.ps1 -Force
```

Script phải tự:

- resolve đúng hai physical volumes từ Compose config;
- verify exact `.Name`, project label và logical-volume label trước delete;
- phân biệt FOUND/NOT_FOUND/ERROR và fail closed;
- chạy Flyway V1–V30;
- import pass 1 và pass 2;
- start backend, chờ healthy;
- chạy API smoke real cross-owner 403;
- verify volumes/storage;
- fail-fast final manifest.

Sau reset, chạy read-only SQL độc lập và bắt buộc nhận:

```text
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

Sau đó `node scripts/test-api-smoke.mjs` phải exit 0 và MB Bank login/dashboard/jobs/applicants/ranking/bookmarks/analytics/settings cùng real cross-owner 403 đều pass.

## 3. Gate bắt buộc

Chạy, ghi exact exit code và output thật:

```powershell
node scripts/company-normalization.test.mjs
node scripts/import-scraped-jobs.mjs --dry-run
node scripts/test-integration.mjs
node scripts/test-api-smoke.mjs
node scripts/test-api-smoke.mjs http://localhost:8080 11111111-2222-4333-8444-555555555555  # expected exit 1
node scripts/test-api-smoke.mjs http://localhost:8080 not-a-uuid                           # expected exit 1
.\Backend\careerfit-backend\mvnw.cmd -f Backend/careerfit-backend/pom.xml test
git diff --check -- scripts/import-scraped-jobs.mjs scripts/test-integration.mjs scripts/test-api-smoke.mjs scripts/reset-local-demo-data.ps1 prompt-gemini/09-repair-broken-baseline-and-close-proof-report.md
```

API positive pre-reset có thể fail vì baseline Round 08 đang hỏng; ghi nhận expected pre-repair failure, không giả vờ pass. Sau safe reset bắt buộc chạy lại và pass.

## 4. Report 09 bắt buộc

Tạo:

`prompt-gemini/09-repair-broken-baseline-and-close-proof-report.md`

Report phải thay thế report 08 và chứa:

- current broken-baseline evidence 19/0/0 và API 401;
- files changed + lý do;
- exact invalid-benefits before/after rollback state chứng minh corruption vẫn nguyên sau failed importer;
- partial/full exact Alias A/B accounts, policy IDs/toggles, A1/B1/B2 owners/company và exact FK links;
- exact canonical MB merged profile JSON với `company_name='MB Bank'` và canonical slug;
- pass 1/2/3 SHA-256 và full named manifests;
- mọi command + exit code; Maven exact test count/failures/errors;
- API positive/negative evidence, không log JWT/secret/hash;
- bằng chứng **chính lệnh reset script** được chạy, không phải manual Docker commands;
- old/new exact volume names, UTC CreatedAt, project/logical labels;
- final independent SQL manifest;
- top 10 recruiter accounts theo JD count, mật khẩu demo chỉ ghi `1`;
- git status/diff stat/diff-check và remaining risks trung thực;
- xác nhận không sửa V27–V30, không flyway repair, không commit/push/PR.

Không được ghi “hoàn tất”, “100%” hoặc tick DoD nếu local DB vẫn không phải 993/974/433, API MB Bank không pass, hoặc report thiếu bất kỳ evidence nào.

## 5. Chỉ được dừng khi tất cả TRUE

- [ ] invalid-benefits rollback test đúng thứ tự và deep-state proof pass;
- [ ] partial Alias B account + all exact FK assertions pass;
- [ ] full Alias B policy + B1/B2 assertions pass;
- [ ] MB company/profile/slug thực sự canonical, không hợp thức hóa drift;
- [ ] integration, normalization, dry-run, API negative và Maven pass;
- [ ] safe reset chạy bằng `reset-local-demo-data.ps1 -Force` pass;
- [ ] final DB = 993/974/433/433 và all violations 0;
- [ ] final API positive + real 403 pass;
- [ ] report 09 đầy đủ và khớp output;
- [ ] không sửa migrations, không repair/commit/push/PR.

Nếu bất kỳ mục nào chưa đạt, tiếp tục sửa và chạy lại; không trả thêm plan.
