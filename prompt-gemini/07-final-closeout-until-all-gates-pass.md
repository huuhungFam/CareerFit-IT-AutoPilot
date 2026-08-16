# FINAL CLOSEOUT — Làm đến khi tất cả acceptance gates thực sự đạt mới được dừng

## Chỉ thị thực thi

Bạn là coding agent cuối cùng của remediation này. **Không trả về plan, không xin xác nhận lại, không dừng ở phân tích và không tuyên bố hoàn tất chỉ vì test hiện tại đang xanh.** Hãy inspect code/schema, thêm adversarial tests làm lộ các false-positive hiện tại, sửa implementation, chạy lại tests, tự sửa mọi lỗi trong phạm vi và chỉ dừng khi toàn bộ Definition of Done cuối file đạt.

Persistence ở đây không mở rộng quyền phá dữ liệu: chỉ được reset đúng hai label-verified workspace volumes, chỉ sau pre-reset gates, và không được reset lặp để che lỗi.

Tạo báo cáo cuối duy nhất:

```text
prompt-gemini/07-final-closeout-until-all-gates-pass-report.md
```

Báo cáo 07 supersede report 05 và 06.

## 1. Kết luận audit độc lập hiện tại: CHƯA ĐẠT

Reviewer đã chạy lại và xác nhận các lệnh hiện tại đều pass:

```text
company normalization: 38/38
dry-run:               974 rows, 452 -> 433
integration:           exit 0
API auto real ID:      exit 0, real cross-owner 403
API absent UUID:       expected exit 1
API malformed UUID:    expected exit 1
Maven:                 143/143, BUILD SUCCESS
git diff --check:       exit 0
```

Baseline thật hiện tại:

```text
Flyway=30
jobs=993, imported=974, active imported recruiters=433
strict profile/policy violations=0
cv=14, application=10, matching=18, bookmark=0, report=0
current job-ID MD5=ab074eb26e743ee434bd6a83d93ebf33
PostgreSQL/backend running and healthy
```

Các số trên chỉ chứng minh baseline sạch, không chứng minh implementation chịu được dữ liệu drift/fault. Các finding dưới đây là bắt buộc.

## 2. Finding P1 — Importer không tắt đủ sáu policy toggles khi conflict

Trong `scripts/import-scraped-jobs.mjs`, nhánh:

```sql
ON CONFLICT (user_id) DO UPDATE
```

hiện chỉ reset bốn cờ:

```text
email_notifications_enabled
daily_digest_enabled
high_match_email_enabled
email_action_enabled
```

nhưng bỏ sót:

```text
auto_invite_enabled
job_scan_enabled
```

Đây là bug runtime thật: active imported recruiter đã có policy với hai cờ trên `TRUE` sẽ vẫn giữ `TRUE` sau import.

### Sửa bắt buộc

- Nhánh insert và conflict update đều phải đặt cả sáu toggles `FALSE` cho active imported recruiters.
- Không chạm LOCAL policies.
- Thêm adversarial integration fixture: trước importer, canonical MB Bank policy tồn tại và cả sáu toggles `TRUE`; sau successful importer, assert cùng policy row/ID còn tồn tại và cả sáu `FALSE`.
- Alias A và Alias B đều phải có policy ID riêng; sau merge cả hai policy IDs còn tồn tại và cả sáu toggles `FALSE`.

## 3. Finding P1 — “Exact postcondition” trong report không tồn tại

Code hiện chỉ kiểm tra mỗi canonical recruiter có đúng một profile:

```sql
HAVING COUNT(p.id) != 1
```

Nó không đối chiếu `logo`, `cover`, `summary`, `description`, `industry`, `company_size`, `location`, `website`, `benefits`, `featured`. Report 06 tuyên bố đã kiểm tra exact properties là sai với code.

### Sửa bắt buộc

1. Materialize một temp aggregate table đúng một row cho mỗi canonical target, chứa:
   - source alias count;
   - canonical-before values;
   - chosen deterministic alias values;
   - exact expected final values cho toàn bộ fields;
   - exact sorted-distinct benefits union;
   - exact featured OR.
2. `UPDATE employer_profile` từ temp aggregate này.
3. Trước delete alias profiles, query exact equality giữa canonical-after và expected row cho mọi field bằng null-safe comparisons (`IS DISTINCT FROM`/equivalent).
4. Raise exception nếu:
   - target profile count khác 1;
   - update target missing;
   - source alias count không đúng;
   - bất kỳ merged field khác expected.
5. Chỉ delete/deactivate sau exact postcondition pass.

### Adversarial postcondition test bắt buộc

Trong disposable integration DB, tạo temporary `BEFORE UPDATE` trigger cho canonical MB Bank profile để cố tình giữ lại một old field trong merge update. Chạy full importer và assert:

- importer exit non-zero vì exact postcondition mismatch;
- full state rollback;
- alias profiles/accounts/jobs/policies/references không đổi.

Sau đó drop trigger và mới chạy successful full import. Không thêm production-only bypass/test flag để giả lập lỗi.

## 4. Finding P1 — Integration coverage vẫn thiếu các proof đã cam kết

Sửa `scripts/test-integration.mjs` mà không bỏ các test đã đạt.

### 4.1 Canonical-real-wins

Fixture hiện chỉ có canonical placeholders/null; chưa test canonical real thắng alias real.

- Trước full merge, đặt ít nhất một canonical field thành real nonblank value, trong khi Alias A/B cũng có real values khác cho cùng field.
- Assert exact canonical real value được giữ sau merge.
- Vẫn giữ một field khác có hai alias real candidates để assert winner theo:

```text
old_recruiter_id ASC, employer_profile.id ASC
```

- Giữ whitespace-only candidate để assert nó bị bỏ qua.

### 4.2 Simultaneous alias count

Test phải query/log và assert source alias count cho MB Bank aggregate bằng exact `2` trong successful full-import transaction. Không chỉ suy luận vì final fields lấy từ A/B. Nếu temp table bị drop ở commit, importer phải output một audit-safe result hoặc test phải dùng transaction-observable mechanism phù hợp; không thêm persistent schema/migration chỉ để test.

### 4.3 Partial state phải deep-compare

Trước/sau partial import, deep-compare exact Alias A/B profile JSON, active state, policy IDs/toggles và direct references; không chỉ count profile.

### 4.4 Invalid-benefits rollback phải so toàn bộ state

Test hiện chỉ so job-ID checksum. Bắt buộc snapshot/deep-compare trước/sau expected failure:

```text
full sorted job-ID checksum
A1/B1/B2 owner IDs
canonical profile JSON
Alias A/B profile JSON/count
Alias A/B account active state
Alias A/B policy JSON/IDs
direct-user FK reference IDs/count
application/matching/bookmark/report IDs và links
```

JSONB invalid fixture là valid JSON có shape object/string/number, không phải malformed SQL literal. Error phải nói đúng invalid benefits shape và transaction rollback.

### 4.5 Direct-user reference và preserved entities

- Tạo ít nhất một FK reference tới alias user ở một table khác `automation_policy`; inspect schema để chọn table an toàn, seed exact ID và assert nó còn trỏ tới same alias user sau merge.
- Assert cả `application`, `matching`, `recruiter_cv_bookmark`, `content_report` bằng exact IDs và target/job links. Test hiện bỏ sót matching/report sau merge.
- Assert alias A/B user rows tồn tại, exact IDs, inactive và no jobs.
- Assert Alias A/B profile IDs và old slugs không còn.
- Assert canonical profile exact `company_name` và `slug`, không chỉ các descriptive fields.

### 4.6 Collision rollback

LOCAL collision test phải assert:

- non-zero exit;
- expected collision message;
- full sorted job checksum unchanged;
- profiles/accounts/policies/references involved unchanged;
- LOCAL account/profile never mutated.

### 4.7 Pass 2 và alias-expansion

Sau pass 1, pass 2 và alias-expansion, capture và assert riêng:

```text
total jobs=993
imported jobs=974
full sorted job-ID SHA-256 checksum nonblank, 64 hex chars
all global invariants=0
MB Bank/TPBank/LG CNS exact ownership/company/profile slug
```

Assert all three SHA-256 values equal. In log/report, không thay SHA-256 bằng reset MD5 32 chars.

## 5. Finding P1 — Global profile/policy gates có false negatives

### 5.1 Profile count query

Current integration/reset query bắt đầu từ `employer_profile`, nên active imported recruiter có zero profile không xuất hiện và có thể pass.

Sửa query bắt đầu từ active imported `user_account`, `LEFT JOIN employer_profile`, group theo user ID và `HAVING COUNT(profile.id) <> 1`.

Thêm adversarial test cho gate/query helper nếu hợp lý: một active imported recruiter tạm thời thiếu profile phải làm gate fail, sau đó cleanup fixture.

### 5.2 Null-safe account/policy validation

Reset manifest hiện dùng `!=`, khiến `NULL` có thể không bị đếm do SQL three-valued logic. Dùng `IS DISTINCT FROM` hoặc điều kiện explicit để bắt:

```text
password_hash null/wrong
role null/wrong
email_verified null/not false
preferred_language null/not vi
missing policy
each of six toggles null/not false
```

Chỉ active canonical imported recruiters cần bắt buộc active/profile/policy; inactive preserved aliases vẫn phải có role/password/verified/language đúng nếu contract yêu cầu imported accounts đăng nhập/audit consistency. Tách queries rõ ràng, không dùng một biểu thức mơ hồ.

### 5.3 Imported user upsert consistency

Kiểm tra nhánh `user_account ON CONFLICT`. Nếu imported canonical account đã drift password/role/email_verified/language/status, importer phải đưa về demo contract:

```text
password hash của password 1
role=RECRUITER
is_active=true
email_verified=false
preferred_language=vi
account_source=IMPORTED
```

Không được biến LOCAL collision thành IMPORTED. Thêm adversarial fixture cho canonical imported account drift và assert importer sửa đúng.

## 6. Finding P2 — Reset volume inspection vẫn có thể coi Docker error là “absent”

Các pipeline dạng:

```powershell
docker volume inspect ... 2>$null | ConvertFrom-Json -ErrorAction SilentlyContinue
```

hiện coi mọi empty result là volume absent, không phân biệt exact not-found với Docker daemon/permission/parse failure; cũng chưa assert returned `.Name` exact.

### Sửa bắt buộc

- Tạo helper exact-volume-inspect trả một trong ba state rõ ràng:

```text
FOUND with parsed object
NOT_FOUND only when Docker explicitly reports no such volume
ERROR for daemon/permission/invalid JSON/other failures
```

- `ERROR` phải abort; chỉ `NOT_FOUND` mới được coi absent.
- Với FOUND trước delete/sau recreate, assert:

```text
.Name exact physical name
project label exact
logical volume label exact
CreatedAt parseable
```

- Sau `docker volume rm`, exact inspect phải trả NOT_FOUND; error không được pass.
- Không dùng substring/name filters.
- Native command helper phải check status/output ngay từng call.

Không cần phá Docker để test daemon error, nhưng code path phải rõ ràng và có unit/helper-level test bằng injectable/mock output nếu khả thi. Ít nhất static structure không được dùng `if (!$inspectJson) => absent` cho mọi lỗi.

## 7. Finding P1 — Active policy update và reset manifest phải chống drift

Reset final manifest phải có từng named assertion, không gộp khiến NULL lọt qua:

```text
Flyway latest successful version=30
total=993, imported=974
active canonical imported recruiters=433
canonical companies=433
duplicate (source_platform,source_url)=0
duplicate external_hash=0
company/owner mismatch=0
active imported profile count !=1 =0 using user LEFT JOIN profile
password violations=0 null-safe
role violations=0 null-safe
email_verified violations=0 null-safe
preferred_language violations=0 null-safe
missing policy=0
six individual/null-safe toggle violations=0
active orphan imported aliases=0
cv=14, application=10, matching=18, bookmark=0, report=0
pass1 count=pass2 count=current count=993
pass1 MD5=pass2 MD5=current MD5 and nonblank 32 hex
storage files=0
PostgreSQL healthy
backend healthy
API smoke and real cross-owner 403 pass
```

Pass 1/pass 2 queries phải fail-fast riêng. Reset report phải log raw UTC `CreatedAt`, `.Name`, project/logical labels cho old/new cả hai volumes.

## 8. Finding P1 — Report 06 có claim sai/thiếu evidence

Report 06 không được chỉnh vài chữ rồi tái dùng. Report 07 phải được dựng từ outputs thật sau final code:

- Không ghi “exact postcondition” nếu code chỉ count.
- Integration SHA-256 phải là 64 hex; reset MD5 là 32 hex và phải ghi nhãn riêng.
- Ghi exact canonical merged JSON gồm company/slug/all fields/benefits.
- Ghi exact before/after state của invalid-benefits rollback và postcondition-fault rollback.
- Ghi source alias count=2 evidence.
- Ghi canonical-real-wins và alias-ordering evidence.
- Ghi Alias A/B policy IDs và direct-user reference.
- Ghi pass 1/2/expansion counts, SHA-256 và invariants.
- Ghi all command exit codes, including expected-negative tests.
- Ghi old/new physical volume `.Name`, UTC CreatedAt, both labels và comparison.
- Ghi final SQL manifest exact values.
- Ghi top 10 recruiter accounts/password `1`.
- Ghi target git status/diff stat/diff check và phân biệt pre-existing dirty files.
- Remaining risks phải trung thực; không ghi “không còn rủi ro gì” hoặc “production ready” cho một local demo importer chưa có production load/concurrency proof.

## 9. Quy trình red-green bắt buộc

Trước khi sửa implementation, thêm hoặc điều chỉnh adversarial tests tối thiểu để chứng minh current code fail ở:

1. canonical existing policy `auto_invite_enabled=true`, `job_scan_enabled=true` không được reset;
2. canonical-real-wins chưa được cover;
3. invalid-benefits rollback full-state chưa được cover;
4. exact postcondition fault trigger chưa bị bắt bởi current count-only check;
5. active imported recruiter zero-profile false-negative query.

Ghi expected failures ngắn gọn vào report. Sau đó sửa code và chạy đến green. Không được giữ một intentionally failing test trong final suite.

## 10. Full pre-reset gates

Sau code/test fix, chạy:

```text
node scripts/company-normalization.test.mjs
node scripts/import-scraped-jobs.mjs --dry-run
node scripts/test-integration.mjs
node scripts/test-api-smoke.mjs
node scripts/test-api-smoke.mjs http://localhost:8080 <real-cross-owner-id>
node scripts/test-api-smoke.mjs http://localhost:8080 <well-formed-absent-uuid>  # expected non-zero
node scripts/test-api-smoke.mjs http://localhost:8080 not-a-uuid                # expected non-zero before psql
Backend/careerfit-backend/mvnw.cmd test
git diff --check -- scripts/import-scraped-jobs.mjs scripts/test-integration.mjs scripts/test-api-smoke.mjs scripts/reset-local-demo-data.ps1 prompt-gemini/07-final-closeout-until-all-gates-pass-report.md
```

Expected-negative invocations phải được wrapper/harness assert đúng non-zero và đúng failure stage. Positive gates phải exit 0. Maven phải:

```text
Tests run: 143, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

Nếu gate fail: tìm root cause, sửa trong phạm vi, chạy lại affected gate rồi chạy lại full pre-reset suite. Không hạ assertion, xóa fixture hay đổi expected value chỉ để xanh.

## 11. Final reset

Chỉ sau full pre-reset green, chạy reset hẹp:

```powershell
.\scripts\reset-local-demo-data.ps1 -Force
```

Reset phải tự chạy double import, volume verification, backend health, API smoke và final manifest. Nếu reset fail do code, sửa và kiểm tra lại. Chỉ retry destructive reset khi đã re-resolve exact physical names từ Compose config và label verification chứng minh vẫn đúng hai workspace volumes; ghi mọi retry và lý do vào report. Không reset loop mù.

Sau thành công giữ PostgreSQL/backend running/healthy và baseline không có runtime junk.

## 12. Không được sửa/không được làm

- Không sửa migrations V27–V30.
- Không tạo V31 nếu không có schema change thực sự.
- Không dùng Flyway repair.
- Không commit/push/PR.
- Không chạm LOCAL accounts/policies.
- Không xóa alias user accounts.
- Không xóa monitoring/project/volume khác.
- Không dừng ở một implementation plan mới.
- Không ghi hoàn thành nếu report/evidence không khớp code/output.

## 13. Definition of Done — chỉ được dừng khi tất cả TRUE

```text
[ ] policy ON CONFLICT reset đủ 6 toggles, adversarial test pass
[ ] imported canonical account drift được sửa đúng demo contract
[ ] exact expected aggregate materialized một row/canonical
[ ] exact field-by-field postcondition chạy trước alias delete
[ ] postcondition fault-trigger test raises + full rollback
[ ] partial deep-state preservation pass
[ ] invalid-benefits full-state rollback pass
[ ] simultaneous alias count exact 2 pass
[ ] canonical-real-wins pass
[ ] deterministic alias ordering pass
[ ] both alias policies + non-policy direct-user FK preserved
[ ] application/matching/bookmark/report exact links preserved
[ ] pass1/pass2/expansion counts + 64-char SHA-256 equal
[ ] all invariants rerun after every pass
[ ] profile gate bắt zero-profile bằng LEFT JOIN từ user
[ ] account/policy gates null-safe
[ ] exact volume inspect distinguishes NOT_FOUND vs ERROR and checks .Name
[ ] API positive/negative gates pass
[ ] Maven 143/143 pass
[ ] diff check pass
[ ] final reset manifest pass
[ ] PostgreSQL/backend healthy
[ ] report 07 complete, accurate, evidence-based
```

Nếu bất kỳ checkbox chưa TRUE, tiếp tục làm; chưa được dừng hoặc tuyên bố hoàn tất.

## Lệnh giao agent

```text
Thực thi toàn bộ prompt-gemini/07-final-closeout-until-all-gates-pass.md ngay. Không trả về plan khác. Bắt đầu bằng adversarial red tests cho các false-positive được nêu, sửa implementation đến green, chạy full pre-reset gates, sau đó reset hẹp an toàn và tạo prompt-gemini/07-final-closeout-until-all-gates-pass-report.md bằng output thật. Chỉ dừng khi toàn bộ Definition of Done đều TRUE. Không sửa V27–V30, không dùng flyway repair, không commit/push/PR.
```
