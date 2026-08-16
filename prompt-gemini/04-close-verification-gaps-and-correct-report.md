# Nhiệm vụ vòng 04: Đóng các verification gap còn lại và sửa báo cáo sai

Tiếp tục từ:

```text
prompt-gemini/03-final-remediation-reset-and-verification.md
prompt-gemini/03-final-remediation-reset-and-verification-report.md
```

Reviewer độc lập kết luận vòng 03 **CHƯA ĐẠT**, dù baseline hiện tại hoạt động và các test hiện có đều exit 0. Nguyên nhân là test/reset/report chưa chứng minh đúng các acceptance criteria đã giao. Chỉ sửa các khoảng trống dưới đây; không làm lại phần normalization đã đạt, không sửa migration V27–V30 đã apply, không dùng `flyway repair`, không commit/push/PR.

Khi hoàn tất, tạo báo cáo:

```text
prompt-gemini/04-close-verification-gaps-and-correct-report-report.md
```

## Bằng chứng reviewer đã xác minh

Đã chạy độc lập và pass:

```text
node scripts/company-normalization.test.mjs       38/38
node scripts/import-scraped-jobs.mjs --dry-run   974 rows, 452 -> 433
node scripts/test-integration.mjs                 exit 0
node scripts/test-api-smoke.mjs                   exit 0, nhưng thiếu coverage
Backend/careerfit-backend/mvnw.cmd test           143/143
```

Baseline hiện tại:

```text
Flyway V30
993 total jobs / 974 imported jobs
433 active imported recruiters
CV 14 / application 10 / matching 18
job ID checksum: 7f73a30b7e0af0a73a36dfcbb4b11850
backend storage file count: 0
```

Reviewer tự gọi các endpoint bị smoke test bỏ sót và thấy chúng đang trả đúng:

```text
GET /api/recruiter/jobs/{ownedJobId}/applicants          200
GET /api/recruiter/jobs/{ownedJobId}/ranking             200
GET /api/recruiter/talent/jobs/{ownedJobId}/bookmarks    200
GET /api/recruiter/analytics/overview                    200
GET /api/recruiter/jobs/{realOtherJobId}/stats           403
```

Do đó nhiệm vụ chính là đưa bằng chứng thật này vào automated test/reset pipeline, sửa upgrade coverage và báo cáo trung thực.

## Finding 1 — API smoke đang pass nhưng không đủ acceptance criteria

`scripts/test-api-smoke.mjs` hiện:

- không gọi applicants endpoint;
- không gọi ranking/discovery/talent endpoint đầy đủ;
- không gọi `/api/recruiter/analytics/overview`;
- thay bằng public `/api/analytics/stats`, không chứng minh recruiter analytics;
- ownership guard dùng UUID không tồn tại, nên 404 không chứng minh cross-recruiter authorization;
- khi không tìm được owned job chỉ log “Skipped” thay vì fail;
- response shape của một số endpoint chưa được assert.

### Phải sửa

1. Login `recruiter.mb-bank@careerfit.local` / `1` và che token.
2. Fail ngay nếu không có MB Bank owned job.
3. Gọi và assert status + response shape cho:

```text
POST /api/auth/login
GET  /api/auth/me
GET  /api/recruiter/dashboard
GET  /api/recruiter/jobs
GET  /api/recruiter/jobs/{ownedJobId}/applicants
GET  /api/recruiter/jobs/{ownedJobId}/ranking
GET  /api/recruiter/talent/jobs/{ownedJobId}/bookmarks
GET  /api/recruiter/analytics/overview
GET  /api/settings/me
```

4. Lấy một `job.id` **tồn tại thật** nhưng thuộc recruiter khác. Có thể thêm read-only helper endpoint hợp lý, truyền ID qua env/argument, hoặc query DB từ orchestration script. Gọi endpoint protected và bắt buộc nhận `403`; không chấp nhận UUID giả/404 làm bằng chứng ownership.
5. Mọi skipped required check phải là failure và process exit khác 0.

## Finding 2 — Reset script không chạy API smoke và không hoàn tất storage verification

`scripts/reset-local-demo-data.ps1` kết thúc sau import/manifest. Nó không start backend, không đợi health, không gọi `test-api-smoke.mjs`. Dòng “volume chưa được tạo, sẽ fresh khi backend starts” vẫn được coi là thành công, trái prompt vòng 03.

Script cũng đọc `com.docker.compose.volume` nhưng không so sánh với logical volume mong đợi, và suy tên volume bằng `${project}_${logical}` thay vì resolve chắc chắn từ Compose/Docker labels. Nhiều lệnh `psql`, `docker volume inspect/ls` quan trọng chưa được kiểm tra exit code.

### Phải sửa

1. Resolve chính xác project/config và hai volume bằng Compose config + Docker labels:

```text
careerfit_postgres_data
careerfit_backend_storage
```

2. Bắt buộc kiểm tra cả:

```text
com.docker.compose.project == resolved project
com.docker.compose.volume  == expected logical volume
```

Không xóa volume chỉ vì tên có vẻ khớp. Không đụng monitoring/project khác.
3. Ghi old volume identity/CreatedAt/labels, xóa đúng hai volume, xác minh old identity biến mất.
4. Recreate PostgreSQL và backend storage; start backend thật, đợi health có timeout, chạy API smoke đầy đủ.
5. Storage volume không tồn tại sau backend start hoặc còn file runtime cũ phải làm script fail.
6. Nếu smoke chỉ GET thì không cần reset lần ba. Nếu smoke tạo dữ liệu, cleanup chính xác và hậu kiểm counts/checksum.
7. Kiểm tra `$LASTEXITCODE`/exception sau mọi external command quan trọng, bao gồm các query tạo count/checksum/manifest.
8. Kết thúc với backend/PostgreSQL ở trạng thái demo dùng được và in rõ trạng thái.

## Finding 3 — Integration test chưa kiểm tra bug duplicate profile thực tế

Fixture hiện chỉ tạo **một** profile cho mỗi recruiter rồi assert count bằng 1. Nó không tái tạo finding gốc: cùng một canonical recruiter có cả `mb-bank-canonical` và `mb-bank-<hash>`.

### Phải sửa

Trên disposable DB target V28:

1. Tạo một recruiter MB Bank có hai employer profiles cùng `recruiter_id`:
   - một profile slug `mb-bank-canonical` có một nhóm field tốt;
   - một profile slug hash có nhóm field tốt khác;
   - dữ liệu phải buộc V30 thực hiện merge thật.
2. Upgrade V29/V30 và assert:
   - chỉ còn một profile;
   - logo/cover/summary/description/industry/company size/location/website/benefits/featured cần preserve đều đúng;
   - unique constraint thực sự từ chối insert profile thứ hai.
3. Không chỉ kiểm tra constraint tồn tại trong metadata.

V30 đã apply nên không sửa V30. Nếu phát hiện lỗi implementation thật cần migration kế tiếp V31; nếu V30 đúng thì chỉ sửa test.

## Finding 4 — Fixture FK/reference và “alias expansion” chưa đúng tên gọi

Integration hiện có application/matching/content report tham chiếu JD, nhưng:

- thiếu recruiter bookmark fixture;
- không có reference/audit nào trỏ trực tiếp alias account;
- “alias expansion test” chỉ chạy lại cùng importer/dataset lần ba, không thay đổi alias input.

### Phải sửa

1. Thêm bookmark fixture theo schema thực tế và assert giữ nguyên.
2. Thêm ít nhất một bảng reference trực tiếp `user_account` alias nếu schema hiện có hỗ trợ; assert account ID/reference vẫn tồn tại sau reconciliation. Nếu schema không có bảng phù hợp, ghi rõ kết quả inventory FK và không bịa claim.
3. Test alias input thật bằng file dataset tạm, không sửa dataset nguồn:
   - giữ nguyên `source` + `sourceUrl` của một MB Bank JD;
   - lần lượt đổi company qua `MB Bank`, `Ngân Hàng TMCP Quân Đội`, `Military Commercial Joint Stock Bank`;
   - import bằng `--file=<temp>`;
   - assert cùng `job.id`, canonical company/email/owner, total count và sorted ID checksum không đổi.
4. Xóa file tạm trong `finally` và luôn drop disposable DB khi fail.

## Finding 5 — Alias employer profile vẫn có thể public bằng slug cũ

Importer deactive alias account nhưng giữ nguyên alias `employer_profile`. `EmployerService.resolveProfile()` tìm trực tiếp theo slug/ID mà không kiểm tra recruiter active, vì vậy upgrade fixture có thể để lại public company page cũ, 0 JD và dữ liệu không được merge sang canonical profile.

### Phải sửa theo một thiết kế rõ ràng

- Trước khi archive/remove alias profile, merge các field có giá trị sang canonical profile theo quy tắc deterministic.
- Account alias và mọi reference/audit của account vẫn phải tồn tại, `is_active=false`, không sở hữu JD.
- Không để public endpoint trả company page alias stale gây hiểu thành công ty/recruiter thứ hai.
- Có thể:
  - merge rồi xóa **profile alias בלבד** nếu xác minh không có FK và account vẫn được bảo toàn; hoặc
  - thêm trạng thái archived bằng migration V31 và filter toàn bộ public query.
- Không sửa V30 đã apply.
- Integration test phải chứng minh dữ liệu profile tốt được merge và slug/ID alias không còn public như recruiter/company hoạt động.

## Finding 6 — Báo cáo 03 tuyên bố quá mức và thiếu bằng chứng

Report 03 ghi `HOÀN THÀNH`, “không còn rủi ro”, API đủ, reset đủ, nhưng code không hỗ trợ các claim đó. Báo cáo còn thiếu:

- exact pre/post volume ID, labels, timestamps;
- storage final file count;
- toàn bộ CV/application/matching/bookmark/report baseline counts;
- đầy đủ SQL hậu kiểm đã yêu cầu;
- target `git status/diff --stat/diff --check` thực tế;
- checksum integration được in rút gọn khác checksum reset nhưng không giải thích.

Không cần sửa report 03 lịch sử. Report 04 phải ghi report 03 đã bị supersede, chỉ ghi `HOÀN THÀNH` khi bằng chứng thật đầy đủ.

## Test gate bắt buộc

Chạy và lưu command + exit code + output tóm tắt:

```text
node scripts/company-normalization.test.mjs
node scripts/import-scraped-jobs.mjs --dry-run
node scripts/test-integration.mjs
Backend/careerfit-backend/mvnw.cmd test
git diff --check -- <target files>
```

Trước khi reset thật, chạy API smoke đầy đủ trên backend/database phù hợp và phải pass.

Sau khi mọi gate pass, người dùng đã cho phép chạy lại reset hẹp:

```powershell
.\scripts\reset-local-demo-data.ps1 -Force
```

Không xóa gì ngoài exact PostgreSQL/backend-storage volumes của Compose project workspace này.

## Hậu kiểm bắt buộc

Report output thực tế:

- Flyway latest V30 hoặc V31 nếu thật sự cần migration mới.
- 993 total / 974 imported (hoặc giải thích dataset thay đổi có chủ ý; không tự ý đổi dataset).
- 433 active imported recruiters, mỗi recruiter đúng một profile.
- company/owner/hash/source identity violations đều 0.
- imported password/status/role/language/email policy violations đều 0.
- alias active không JD = 0.
- CV/application/matching/recruiter bookmark/content report counts.
- pass-1/pass-2 total count và full sorted job-ID checksum bằng nhau.
- old/new exact two volume evidence và final storage file count 0.
- required API endpoint statuses, real cross-owner guard = 403.
- top 10 imported recruiters với password hiển thị `1`.

## Tiêu chí kết thúc

- Không dừng ở kế hoạch.
- Không sửa V27–V30 hay dùng Flyway repair.
- Test phải fail thật nếu bỏ endpoint, dùng fake non-owned job, không tạo duplicate fixture, hoặc storage chưa được recreate.
- Reset thật chỉ sau khi toàn bộ gate pass.
- Không nhận các thay đổi cũ/không liên quan là của vòng 04.
- Báo cáo trung thực; nếu còn thiếu bằng chứng phải ghi `HOÀN THÀNH MỘT PHẦN`, không ghi “không có rủi ro”.
