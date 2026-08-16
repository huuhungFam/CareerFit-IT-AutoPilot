# Round 08 — Absolute final acceptance proof, no shortcuts

Bạn phải **thực thi ngay**, không trả về implementation plan, không xin xác nhận và không dừng chỉ vì suite hiện tại đang xanh. Round 07 đang false-green: implementation chính đã tốt hơn nhưng `scripts/test-integration.mjs` và report 07 chưa chứng minh đầy đủ Definition of Done của `prompt-gemini/07-final-closeout-until-all-gates-pass.md`.

Đọc đầy đủ các file sau trước khi sửa:

- `prompt-gemini/07-final-closeout-until-all-gates-pass.md`
- `prompt-gemini/07-final-closeout-until-all-gates-pass-report.md`
- `scripts/import-scraped-jobs.mjs`
- `scripts/test-integration.mjs`
- `scripts/test-api-smoke.mjs`
- `scripts/reset-local-demo-data.ps1`
- schema/migrations V1–V30 liên quan các FK được test

Không sửa V27–V30, không dùng `flyway repair`, không commit/push/PR. Không được xóa hoặc reset dữ liệu ngoài đúng hai Compose volumes đã resolve và kiểm tra label. Không che lỗi bằng cách nới assertion hay hard-code output.

## 1. Các gap bắt buộc phải đóng

### 1.1 Global invariant helper còn false-negative

Trong `fetchGlobalInvariants()`:

- Thay kiểm tra sáu policy toggles bằng biểu thức null-safe, mỗi field dùng `IS DISTINCT FROM FALSE`.
- Gate profile phải bắt đầu từ active imported recruiter bằng `LEFT JOIN employer_profile`, `GROUP BY ua.id HAVING COUNT(p.id) != 1`.
- Xóa query profile cũ dư thừa bắt đầu từ `employer_profile`, tránh cộng hai gate gây hiểu nhầm.
- Tách hoặc trả về object có tên từng violation để log cho biết gate nào fail; không chỉ cộng một tổng số mù.
- Thêm adversarial self-test: tạo một active imported recruiter không có profile, chứng minh gate profile trả violation > 0, cleanup fixture, chứng minh gate trở lại 0.
- Thêm adversarial policy NULL/TRUE nếu schema cho phép NULL; nếu cột `NOT NULL`, ít nhất seed đủ mọi toggle TRUE và chứng minh gate phát hiện trước importer, rồi importer sửa cả sáu về FALSE.

### 1.2 Alias B chưa có policy và chưa được chứng minh

- Seed policy ID riêng cho Alias A và policy ID riêng cho Alias B.
- Sau partial import, assert exact policy IDs còn nguyên. Những toggle mà importer có chủ đích normalize phải chuyển đúng từ state trước sang cả sáu FALSE; các field/ID khác phải giữ nguyên. Không gọi đây là “unchanged” nếu toggles thực tế thay đổi.
- Sau full merge, assert cả hai alias user vẫn tồn tại, `is_active=FALSE`, profile A/B bị xóa, slug A/B không còn truy cập, hai policy IDs vẫn tồn tại và cả sáu toggle FALSE.
- Assert exact ownership của A1, B1, B2 sau full import.

### 1.3 Partial import phải deep-compare đúng state

Tạo helper snapshot deterministic (JSON với key/order ổn định) cho toàn bộ fixture state. Trước và sau partial import phải chứng minh:

- exact Alias A profile JSON;
- exact Alias B profile JSON;
- exact Alias A/B account state;
- exact policy IDs và toàn bộ sáu toggles, với chỉ transition được importer contract cho phép;
- exact direct-user FK reference;
- B1 được chuyển hay giữ theo dataset đã thiết kế, B2 còn thuộc Alias B;
- Alias B vẫn active và profile không đổi vì còn JD chưa transfer.

### 1.4 Hai rollback test hiện chỉ so checksum là không đủ

Cho cả invalid-benefits rollback và exact-postcondition fault-trigger rollback, snapshot trước lệnh import và deep-compare sau khi lệnh fail toàn bộ:

- sorted job IDs SHA-256 64 hex;
- exact job IDs, owners và company của A1/B1/B2;
- canonical MB profile JSON;
- Alias A/B profile JSON;
- canonical/A/B account state;
- canonical/A/B policy IDs và sáu toggles;
- direct-user FK;
- exact application, matching, recruiter bookmark và content report IDs + links.

Importer phải exit non-zero và error phải đúng nguyên nhân. Sau fault-trigger phải drop trigger trong `finally` nhưng chỉ sau khi đã snapshot/verify rollback. Không được chỉ assert checksum hoặc một job owner.

### 1.5 Collision rollback phải chứng minh full rollback và LOCAL safety

Với F88 LOCAL collision:

- Snapshot cùng full-state helper trước/sau.
- Assert importer exit non-zero và message collision.
- Assert LOCAL account vẫn `account_source='LOCAL'`, không bị đổi role/password/active/profile/policy.
- Assert toàn bộ fixture jobs/profiles/accounts/policies/references không đổi, không chỉ checksum.

### 1.6 Full merge assertions phải exact, không lấy mẫu

Sau successful full import, assert canonical MB profile exact cho mọi field:

- `company_name`, `slug`, `logo_url`, `cover_url`, `summary`, `description`, `industry`, `company_size`, `location`, `website_url`, `benefits`, `is_featured`;
- benefits deep-equal array đã union distinct và deterministic order;
- canonical real values thắng placeholder; alias ordering deterministic đúng rule;
- source alias count log đúng 2;
- A/B users, profiles, slugs, policies và A1/B1/B2 như mục trên;
- `application`, `matching`, `recruiter_cv_bookmark`, `content_report` đều assert bằng exact fixture ID và exact foreign-key targets, không dùng count-only.

### 1.7 Pass 1, pass 2 và alias-expansion pass 3 đều phải chạy full manifest

Sau từng pass, assert riêng và log:

- SHA-256 sorted JD IDs dài đúng 64 hex; ba checksum bằng nhau;
- total jobs `993`, imported jobs `974`;
- active imported recruiters `433`, canonical companies `433`;
- duplicate `(source_platform, source_url)=0`, duplicate `external_hash=0`;
- company/profile mismatch=0;
- active imported recruiter profile violations=0;
- active imported orphan=0;
- password/role/email_verified/language violations=0;
- missing policy=0 và sáu toggle violations null-safe=0;
- exact MB Bank, TPBank, LG CNS company/owner/email/slug assertions.

Không gói tất cả thành một số tổng duy nhất. Mỗi invariant phải có tên và failure message riêng.

## 2. Implementation review

Review lại `scripts/import-scraped-jobs.mjs` sau khi adversarial tests được bổ sung. Chỉ sửa implementation nếu test mới làm lộ bug thật. Phải giữ:

- transaction rollback toàn bộ khi validation/postcondition fail;
- exact expected-profile postcondition chạy trước delete alias profiles;
- policy upsert/update reset đủ sáu toggle;
- imported user drift được sửa về demo contract;
- LOCAL account không bị importer chiếm dụng;
- stable external identity và JD IDs không đổi.

Nếu phát hiện `benefits` JSONB `null` hoặc shape scalar có thể lọt validation rồi lỗi mơ hồ ở `jsonb_array_elements`, chuẩn hóa validation để fail sớm với message “invalid benefits JSON shape”; thêm test tương ứng.

## 3. Reset script

Review và giữ fail-closed:

- resolve exact physical volume names từ Compose config;
- inspect phân biệt `FOUND`, exact `NOT_FOUND`, `ERROR`;
- `.Name`, project label và logical-volume label phải exact;
- Docker/parse/permission error phải abort, không được coi là absent;
- chỉ xóa hai volume của workspace;
- old/new raw UTC `CreatedAt`, physical name và labels được log;
- new timestamp phải strictly newer nếu old volume tồn tại;
- storage mới 0 runtime files;
- final manifest dùng null-safe assertions và chạy query riêng fail-fast;
- reset tự chạy double import, backend health và API smoke.

Không chạy reset trước khi toàn bộ pre-reset gates xanh. Vì baseline hiện đã sạch, chỉ chạy destructive reset **một lần ở cuối** sau khi code/test hoàn tất. Nếu reset fail do code, sửa nguyên nhân; trước mọi retry phải re-resolve names và re-check exact labels, ghi lý do retry.

## 4. Commands bắt buộc

Chạy và lưu exact exit code/output cần thiết:

```powershell
node scripts/company-normalization.test.mjs
node scripts/import-scraped-jobs.mjs --dry-run
node scripts/test-integration.mjs
node scripts/test-api-smoke.mjs
node scripts/test-api-smoke.mjs http://localhost:8080 11111111-2222-4333-8444-555555555555  # expected exit 1: absent
node scripts/test-api-smoke.mjs http://localhost:8080 not-a-uuid                           # expected exit 1: malformed
.\Backend\careerfit-backend\mvnw.cmd -f Backend/careerfit-backend/pom.xml test
git diff --check -- scripts/import-scraped-jobs.mjs scripts/test-integration.mjs scripts/test-api-smoke.mjs scripts/reset-local-demo-data.ps1 prompt-gemini/08-absolute-final-acceptance-proof-report.md
```

Sau pre-reset green:

```powershell
pwsh -NoProfile -File scripts/reset-local-demo-data.ps1 -Force
```

Sau reset, chạy lại read-only final SQL manifest và API smoke. Backend Maven phải thực sự báo `Tests run: 143, Failures: 0, Errors: 0, Skipped: 0` (hoặc nhiều hơn nếu có test mới), không chỉ exit 0 bị suy diễn.

## 5. Report bắt buộc

Tạo/sửa duy nhất báo cáo:

`prompt-gemini/08-absolute-final-acceptance-proof-report.md`

Report phải có bằng chứng thật, không viết “100% robust”, “0 risks” hoặc kết luận tuyệt đối không được output hỗ trợ. Bắt buộc gồm:

- files changed và lý do;
- từng command, exit code, số test;
- adversarial red-before/fix/green-after evidence nếu thực sự chạy được trên pre-fix code; không bịa red run;
- exact canonical merged MB profile JSON;
- Alias A/B account IDs, policy IDs và direct-user FK;
- exact full-state before/after cho collision, invalid-benefits và postcondition-fault rollback;
- exact fixture IDs/links của application/matching/bookmark/report;
- pass 1/2/3 SHA-256 64-char và full named manifest mỗi pass;
- API endpoint/status evidence, real cross-owner 403, absent/malformed expected failures; không log JWT/password hash/secret;
- old/new physical volume names, UTC timestamps, both labels và comparison;
- final SQL manifest values;
- top 10 recruiter demo accounts theo JD count, password chung chỉ ghi `1`;
- `git status --short`, scoped diff stat và scoped `git diff --check` result; phân biệt pre-existing unrelated changes;
- remaining risks trung thực (ví dụ Flyway/PostgreSQL compatibility warning nếu còn);
- xác nhận không sửa V27–V30, không commit/push/PR.

## 6. Definition of Done — không được dừng trước khi tất cả TRUE

- [ ] global profile gate thực sự bắt zero-profile adversarial fixture;
- [ ] policy gate null-safe, policy upsert sửa đủ sáu toggles;
- [ ] Alias A và B đều có policy ID riêng và được assert đầy đủ;
- [ ] partial import deep-state proof đầy đủ;
- [ ] collision full-state rollback + LOCAL safety pass;
- [ ] invalid-benefits full-state rollback pass;
- [ ] exact-postcondition fault full-state rollback pass;
- [ ] full merge exact all profile fields pass;
- [ ] A1/B1/B2 và mọi exact FK fixture links pass;
- [ ] pass 1/2/3 full named manifests và SHA-256 equality pass;
- [ ] normalization, dry-run, integration, API positive/negative, Maven và diff-check pass;
- [ ] safe one-time final reset pass;
- [ ] post-reset SQL manifest và API smoke pass;
- [ ] report 08 đầy đủ, chính xác, khớp code/output;
- [ ] không sửa migrations V27–V30, không commit/push/PR.

Nếu bất kỳ mục nào chưa đạt, tiếp tục inspect → thêm/fix test → sửa code → chạy lại. Chỉ dừng khi toàn bộ checklist trên có bằng chứng thật trong report 08.
