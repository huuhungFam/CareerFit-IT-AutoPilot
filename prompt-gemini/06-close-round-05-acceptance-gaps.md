# Vòng 06: Đóng đúng các acceptance gap còn lại của Remediation 05

## Kết luận audit

Vòng 05 **CHƯA ĐẠT acceptance**, dù toàn bộ lệnh hiện tại đều exit `0`. Reviewer đã chạy độc lập:

```text
company-normalization: 38/38
importer dry-run:       974 rows, 452 -> 433
integration:            exit 0
API smoke auto-ID:      exit 0, real 403
API smoke supplied-ID:  exit 0, real 403
Maven:                  143/143
git diff --check:        exit 0
```

Baseline thật hiện tại cũng sạch:

```text
Flyway 30
993 total jobs / 974 imported jobs
433 active imported recruiters
source/hash/company/profile/account-policy/orphan violations = 0
cv=14, application=10, matching=18, bookmark=0, report=0
full job-ID checksum = 804491c9154f42882fd76535fb02d14b
PostgreSQL và backend running/healthy
```

Không được dùng việc test pass để bỏ qua các gap dưới đây. Không sửa `V27`–`V30`, không dùng `flyway repair`, không commit/push/PR.

## P1 — Partial-dataset test đang kiểm tra sai hành vi đã duyệt

Code hiện tại tạo Alias A chỉ có một JD, Alias B có hai JD; partial payload chứa một JD của mỗi alias. Sau partial import, test lại kỳ vọng Alias A bị deactivate và profile bị xóa. Điều này trái với acceptance: phải chứng minh **một alias vẫn còn JD ngoài payload thì không được orphan/deactivate/merge/delete**.

Sửa fixture/test theo đúng chuỗi sau:

1. Tạo ít nhất hai alias accounts A và B cùng map về canonical MB Bank.
2. Cả A và B phải cùng tồn tại trước full import để test đúng trường hợp nhiều alias cùng canonical.
3. Chọn một alias (ví dụ B) sở hữu hai JD thật trong full dataset: JD B1 và JD B2.
4. Partial dataset chỉ chứa B1, không chứa B2 và không được chứa bất kỳ JD nào làm Alias A orphan trước full import.
5. Sau partial import assert exact:
   - B1 chuyển sang canonical;
   - B2 vẫn thuộc Alias B;
   - Alias B vẫn active;
   - profile B còn nguyên, chưa merge/delete;
   - canonical chưa nhận các field chỉ có ở profile B.
6. Chạy full import, lúc này A và B cùng trở thành orphan trong **cùng một importer transaction** và cùng map về MB Bank.
7. Sau full import assert cả hai account inactive/no jobs nhưng vẫn tồn tại; cả hai profile rows bị xóa; cả hai automation policies và mọi direct-user references vẫn tồn tại.

Không được thay thế test simultaneous multi-alias bằng hai alias được merge ở hai importer runs khác nhau.

## P1 — Hoàn thiện exact merge assertions và blank handling

Trong `scripts/test-integration.mjs`, assert exact toàn bộ canonical MB Bank profile:

```text
company_name
slug
logo_url
cover_url
summary
description
industry
company_size
location
website_url
benefits (deep-equal exact deterministic order, không chỉ includes)
is_featured
```

Đồng thời assert:

- canonical real value thắng alias real value;
- placeholder canonical thua alias real value;
- `NULL`, empty string và whitespace-only đều được coi là missing;
- nếu nhiều alias có real value cho cùng field thì alias có `old_recruiter_id ASC, employer_profile.id ASC` thắng;
- canonical có đúng một profile;
- exact alias profile IDs không còn;
- exact old alias slugs không còn resolve trong DB;
- application, matching, bookmark, report, policies và direct-user FK references vẫn giữ nguyên ID/link.

`scripts/import-scraped-jobs.mjs` hiện dùng `NULLIF(value, '')`, nên whitespace-only vẫn bị xem là real. Sửa bằng logic `btrim`/tương đương cho các string fields nhưng phải giữ original real value khi chọn. Benefits phải fail transaction nếu JSON shape không phải array; thêm fixture chứng minh error + rollback jobs/profiles/accounts. Không filter/bỏ qua silently.

Sau merge, thêm hậu điều kiện trong transaction trước khi delete alias profiles: mỗi canonical target phải tồn tại đúng một profile và dữ liệu aggregate cần thiết đã được áp dụng. Nếu không đạt thì raise exception để rollback.

## P1 — Khôi phục đầy đủ global regression assertions

Test hiện thiếu nhiều assertion đã được yêu cầu. Sau full import và sau pass idempotency/alias expansion, bắt buộc assert:

```text
total jobs = 993
imported jobs = 974
pass 1 checksum = pass 2 checksum = alias-expansion checksum
duplicate (source_platform, source_url) = 0
duplicate external_hash = 0
company/owner mismatch = 0
active IMPORTED recruiter profile count != 1 = 0
active IMPORTED recruiter count = 433
canonical imported company count = 433
password hash / role / is_active / email_verified / preferred_language violations = 0
automation policy missing or any of 6 toggles true = 0
active orphan IMPORTED account = 0
MB Bank / TPBank / LG CNS exact canonical owner and company
LOCAL collision raises expected error and rolls back entire transaction
application/matching/bookmark/report/direct-user references preserved
```

Lưu ý dòng `automation policy...` ở trên là một assertion riêng. Cả 6 toggle gồm email notifications, daily digest, high-match email, email action, auto invite và job scan.

Temp partial/expansion datasets tiếp tục dùng `os.tmpdir()` + `mkdtempSync()` và cleanup trong outer `finally`.

## P2 — API smoke phải kiểm tra child process đúng contract

Refactor DB query/validation thành helper dùng tham số an toàn hoặc tối thiểu validate supplied ID là UUID trước khi đưa vào SQL. Với mọi `spawnSync`, kiểm tra rõ:

```text
result.error == null
result.signal == null
result.status == 0
stdout có đúng shape mong đợi
stderr không chứa lỗi psql
```

Luôn validate chính `NON_OWNED_JOB_ID` được sử dụng, bất kể tự query hay truyền từ argv/env:

```text
job count = 1
owner email nonblank
owner email != recruiter.mb-bank@careerfit.local
```

Giữ exact HTTP `403`, không log JWT đầy đủ hoặc DB secret. Thêm negative invocation với UUID không tồn tại/owned ID để chứng minh script exit non-zero.

## P1 — Reset script còn false-positive gates

Sửa `scripts/reset-local-demo-data.ps1`:

1. Tiếp tục resolve exact physical names từ `docker compose --profile backend config --format json`; fail nếu name rỗng hoặc trùng nhau.
2. Không dùng `docker volume ls --filter name=...` vì filter là substring và prompt đã cấm dùng nó để quyết định delete/existence. Dùng `docker volume inspect <exact-name>` và phân biệt exact `not found` với lỗi Docker khác.
3. Trước delete và sau recreate, assert `.Name` đúng physical name, project label và logical-volume label đúng.
4. Ghi old/new `Name`, `CreatedAt`, cả hai labels cho **cả hai** volumes. Nếu old tồn tại, parse UTC và assert `new > old`.
5. Tạo helper native command/query fail-fast. Kiểm tra exit code riêng ngay sau từng query pass-1 count, pass-1 checksum, pass-2 count, pass-2 checksum, non-owned job lookup, inspect và mọi final query. Không chạy hai command rồi chỉ đọc `$LASTEXITCODE` cuối.
6. Final manifest phải query/assert lại pass-1/pass-2 full checksum, không chỉ tin biến có thể lấy từ command lỗi.
7. Source identity duplicate phải group theo `(source_platform, source_url)`, không phải email imported.
8. Account/policy violation gate phải bắt đủ: password hash, role, active canonical status, `email_verified=false`, `preferred_language='vi'`, missing policy, và cả 6 toggle đều false. Không cho `LEFT JOIN ... p.id IS NULL` pass.
9. Profile gate phải chứng minh mỗi active IMPORTED recruiter có **exactly one** profile.
10. Giữ exact seed counts `cv=14`, `application=10`, `matching=18`, `bookmark=0`, `report=0`; storage files `0`; Flyway latest successful `30`; services/API healthy.

Script chỉ xóa hai exact label-verified volumes trong workspace này. Sau reset thành công giữ PostgreSQL/backend running/healthy.

## P1 — Report 05 chưa đúng sự thật và thiếu evidence

Report 05 không được coi là final vì:

- mô tả lỗi cũ thành `ON CONFLICT ... affect row a second time`, trong khi reproduction thực tế là nondeterministic `UPDATE ... FROM` âm thầm chọn một alias rồi xóa profiles;
- không ghi exact merged values;
- không có old volume timestamps/labels;
- không có final manifest values thật;
- không liệt kê top 10 recruiter logins;
- chỉ ghi hai commands, thiếu full gates/exit codes;
- tuyên bố 100% dù acceptance chưa đạt.

Tạo report mới:

```text
prompt-gemini/06-close-round-05-acceptance-gaps-report.md
```

Report 06 supersede report 05 và phải chứa output thật:

- kết luận không phóng đại;
- file/line remediation từng finding;
- full commands + exit codes;
- simultaneous multi-alias, partial-dataset, invalid-benefits rollback evidence;
- exact pre/post canonical fields và exact benefits order;
- pass 1/2/alias-expansion counts + full SHA-256 checksums;
- full global assertion values;
- API endpoints/status/shape, supplied-ID validation và real 403;
- exact old/new volume Name/CreatedAt/labels của cả hai volumes;
- storage count, service health, complete final SQL manifest;
- top 10 imported recruiters theo số JD: company, email, JD count, password demo `1`;
- files changed chỉ trong vòng 06, target git status/diff stat/diff check;
- remaining risks trung thực.

## Test gates và thứ tự thực thi

Trước reset thật:

```text
node scripts/company-normalization.test.mjs
node scripts/import-scraped-jobs.mjs --dry-run
node scripts/test-integration.mjs
node scripts/test-api-smoke.mjs
node scripts/test-api-smoke.mjs http://localhost:8080 <real-non-owned-id>
Backend/careerfit-backend/mvnw.cmd test
git diff --check -- <target files>
```

Thêm negative API smoke invocations cần thiết và ghi exit code mong đợi. Chỉ khi mọi pre-reset gate pass mới chạy một lần:

```powershell
.\scripts\reset-local-demo-data.ps1 -Force
```

Không dừng ở kế hoạch. Không sửa migrations V27–V30. Không nhận thay đổi cũ/không liên quan là thay đổi vòng 06. Không reset lại nhiều lần để che lỗi. Không ghi `HOÀN THÀNH` nếu bất kỳ acceptance nào còn thiếu.

## Lệnh giao agent

```text
Thực thi toàn bộ prompt-gemini/06-close-round-05-acceptance-gaps.md. Sửa code/test trước, chạy đủ pre-reset gates, chỉ sau đó mới chạy reset hẹp một lần. Giữ PostgreSQL và backend running/healthy sau reset. Tạo prompt-gemini/06-close-round-05-acceptance-gaps-report.md với bằng chứng output thật. Không sửa V27–V30, không dùng flyway repair, không commit/push/PR.
```
