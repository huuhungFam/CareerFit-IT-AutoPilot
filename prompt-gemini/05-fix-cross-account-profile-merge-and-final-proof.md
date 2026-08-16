# Vòng 05: Sửa mất dữ liệu khi merge alias profile và hoàn tất bằng chứng cuối

Reviewer kết luận vòng 04 **CHƯA ĐẠT** dù các test hiện có đều pass. Không sửa V27–V30, không dùng Flyway repair, không commit/push/PR. Chỉ sửa các finding dưới đây và tạo:

```text
prompt-gemini/05-fix-cross-account-profile-merge-and-final-proof-report.md
```

## Trạng thái đã đạt — không làm lại

Reviewer đã chạy độc lập:

```text
company normalization: 38/38
importer dry-run:       974 rows, 452 -> 433
integration hiện có:   exit 0
API smoke hiện có:     exit 0, đủ endpoint chính và real 403
Maven:                  143/143
```

Baseline hiện tại dùng được:

```text
Flyway V30
993 total jobs / 974 imported jobs
433 active imported recruiters
active imported profile violations: 0
company/owner violations: 0
duplicate source/hash: 0
imported email-policy violations: 0
backend storage files: 0
```

Không reset ngay. Sửa code/test, chạy toàn bộ pre-reset gates, sau đó mới chạy reset thật nếu cần để chứng minh pipeline cuối.

## Finding P1 — Importer làm mất dữ liệu alias profile

Code hiện tại tại phần `Merge profiles for orphaned aliases` dùng:

```sql
summary      = COALESCE(canonical.summary, alias.summary)
description  = COALESCE(canonical.description, alias.description)
industry     = COALESCE(canonical.industry, alias.industry)
company_size = COALESCE(canonical.company_size, alias.company_size)
location     = COALESCE(canonical.location, alias.location)
```

Canonical profile do importer tạo luôn có placeholder không-null:

```text
Imported from scraped Vietnamese IT job postings.
This employer profile was generated from scraped job data...
Technology
UNKNOWN
Vietnam
```

Vì vậy dữ liệu thật của alias không được merge, nhưng alias profile vẫn bị DELETE.

Reviewer đã tái tạo trên disposable DB với **hai alias MB Bank cùng map về một canonical recruiter**. Kết quả canonical sau import:

```text
summary:      Imported from scraped Vietnamese IT job postings.     (SAI, mất real summary)
description:  This employer profile was generated...                (SAI, mất real description)
logo:         NULL                                                   (SAI, mất logo alias 1)
cover:        https://alias-two/cover.png
industry:     Technology                                             (SAI, mất Banking)
company_size: UNKNOWN                                                (SAI, mất 1000+)
location:     Vietnam                                                (SAI, mất Hanoi)
website:      https://alias-two.example
benefits:     ["real benefit"]
featured:     true
alias profiles remaining: 0
```

Ngoài placeholder, một câu `UPDATE ... FROM` khi nhiều alias cùng map về một canonical target có nhiều source rows; PostgreSQL không đảm bảo merge tất cả rows. Nó có thể chọn một alias không deterministic rồi xóa toàn bộ alias profiles.

### Yêu cầu sửa importer

1. Giữ transfer-map/orphan-after-upsert scope an toàn hiện có.
2. Chỉ xử lý old account `account_source='IMPORTED'`, chỉ orphan thật sự không còn JD, không chạm LOCAL.
3. Merge **tất cả** alias profiles map tới cùng canonical recruiter theo quy tắc deterministic; không dùng một `UPDATE ... FROM` có nhiều source matches không xác định.
4. Định nghĩa thứ tự deterministic, ví dụ alias recruiter UUID/profile UUID tăng dần, và merge field-by-field theo chất lượng.
5. Placeholder canonical phải được coi là missing/low-quality:

```text
summary bắt đầu "Imported from"
description bắt đầu "This employer profile was generated"
industry = Technology
company_size = UNKNOWN
location = Vietnam
benefits null hoặc []
```

6. Preserve tối thiểu logo, cover, real summary, real description, industry, company size, location, website, benefits và featured.
7. Nếu nhiều alias cùng có real value cho một field, chọn deterministic và ghi rõ rule; không nối chuỗi tùy tiện trừ benefits có union deterministic hợp lý.
8. Chỉ DELETE alias employer profiles sau khi merge thành công. Alias user account/policy/reference vẫn tồn tại và inactive.
9. Toàn bộ thao tác vẫn trong một transaction; bất kỳ collision/merge error nào phải rollback jobs, profiles và accounts.

Không cần migration V31 nếu chỉ sửa importer runtime. Chỉ thêm migration mới nếu có thay đổi schema thật sự cần thiết; tuyệt đối không sửa V30.

## Finding P1 — Integration chưa test cross-account merge sau importer

Test hiện chỉ chứng minh V30 merge hai profile có cùng recruiter trước importer. Sau importer nó chỉ kiểm tra alias inactive/no jobs; không kiểm tra canonical đã nhận dữ liệu alias, alias profile bị xóa hay old slug/profile không còn public.

### Yêu cầu test mới

Trong fixture V28:

1. Giữ test V30 same-account duplicate hiện có.
2. Tạo ít nhất **hai alias recruiter accounts khác nhau** cùng map về MB Bank canonical.
3. Mỗi alias có profile với các field real phân tán:
   - alias A: logo, summary, một phần benefits;
   - alias B: cover, description, Banking, 1000+, Hanoi, website, benefits khác, featured.
4. Mỗi alias có ít nhất một JD với source identity thật trong dataset để importer chuyển ownership.
5. Sau importer assert exact:
   - canonical profile chứa toàn bộ expected fields theo deterministic rules;
   - placeholder không thắng real value;
   - cả alias profile rows đã bị xóa;
   - alias users/policies/references vẫn tồn tại, inactive và không JD;
   - canonical có đúng một profile;
   - old alias slugs/profile IDs không còn resolve thành company page hoạt động. Nếu integration không start backend, assert repository-equivalent DB state và bổ sung API/public check trên disposable backend hoặc test backend phù hợp.
6. Thêm test partial dataset: nếu alias còn một JD không nằm trong payload thì importer không merge/delete profile và không deactivate alias.
7. Giữ/khôi phục các global assertions đã có ở vòng 03:
   - mọi active imported recruiter đúng một profile;
   - password/role/language/verified/policy đúng;
   - duplicate source identity/hash = 0;
   - company/owner mismatch = 0;
   - MB Bank/TPBank/LG ownership đúng;
   - application/matching/bookmark/report/reference preserved.
8. Alias-expansion temp file phải dùng `os.tmpdir()`/`mkdtemp`, không ghi `scraped-data/temp-alias-jobs.json`; cleanup trong `finally`.

## Finding P2 — Reset volume resolution vẫn dựa vào naming convention

Script vẫn gán:

```powershell
$resolved = "${composeProject}_${vol}"
```

Trong khi acceptance yêu cầu resolve từ Compose config và labels. Lưu ý `docker compose config --format json` không bật profile backend chỉ hiện postgres volume. Phải dùng config có profile backend:

```powershell
docker compose --profile backend config --format json
```

và đọc:

```text
volumes.<logical>.name
```

### Yêu cầu sửa reset

1. Resolve exact physical names từ parsed Compose config có backend profile; không tự ghép project/name.
2. Trước delete, volume hiện hữu phải khớp cả project label và logical volume label. Sai/thiếu label thì fail, không fallback.
3. Sau recreate, verify **cả postgres và backend-storage** physical name, labels và CreatedAt mới hơn old timestamp (so sánh thời gian, không chỉ khác string).
4. Check exit code riêng sau count/checksum queries pass 1 và pass 2, query non-owned job, Docker inspect/ls và mọi final-manifest query quan trọng.
5. Final manifest phải là assertion gate, không chỉ print:
   - Flyway latest success;
   - expected jobs/imported/recruiters;
   - source/hash/company/profile/policy violations đều 0;
   - CV/application/matching/bookmark/report counts;
   - full pass-1/pass-2 checksum bằng nhau;
   - storage file count 0;
   - backend healthy và API smoke pass.
6. Không đụng monitoring/project khác.

## Finding P2 — API smoke chưa validate ID được truyền vào

Nếu `NON_OWNED_JOB_ID` được truyền từ env/argument, script hiện không tự chứng minh ID tồn tại và owner khác MB Bank.

Sửa để DB validation luôn chạy cho cả ID tự query và ID truyền vào:

```text
job exists = true
owner email != recruiter.mb-bank@careerfit.local
```

Child process phải check status/signal/output. Guard vẫn bắt buộc exact 403.

## Finding P1 — Report 04 không đáp ứng report contract

Report 04 chỉ có 50 dòng, thiếu phần lớn bằng chứng bắt buộc và tuyên bố “hoàn tất” quá mức. Report 05 phải supersede report 04 và có:

- kết luận chính xác;
- file/line remediation cho từng finding;
- full commands + exit codes;
- integration counts và full checksums;
- exact cross-account profile values trước/sau;
- exact old/new physical volume names, CreatedAt, labels cho cả hai volumes;
- final storage file count;
- Flyway/account/job/company/profile/hash/policy manifest;
- CV/application/matching/bookmark/report counts;
- API endpoint/status/shape và real cross-owner 403;
- top 10 imported recruiter logins với password `1`;
- files changed chỉ thuộc vòng 05;
- target git status/diff stat/diff check;
- remaining risks trung thực.

## Test gates

Trước reset thật, bắt buộc pass:

```text
node scripts/company-normalization.test.mjs
node scripts/import-scraped-jobs.mjs --dry-run
node scripts/test-integration.mjs
node scripts/test-api-smoke.mjs
Backend/careerfit-backend/mvnw.cmd test
git diff --check -- <target files>
```

Sau mọi pre-reset gate pass, được phép chạy reset hẹp đã được người dùng phê duyệt:

```powershell
.\scripts\reset-local-demo-data.ps1 -Force
```

Script reset phải tự chạy double import, backend health, full API smoke, both-volume verification và final assertion manifest.

## Quy tắc kết thúc

- Không dừng ở kế hoạch.
- Không sửa V27–V30 hoặc dùng Flyway repair.
- Không nhận thay đổi cũ/không liên quan là của vòng 05.
- Không reset trước khi pre-reset gates pass.
- Không ghi `HOÀN THÀNH` nếu cross-account data preservation chưa được chứng minh chính xác hoặc report còn thiếu evidence.
