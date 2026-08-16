# Nhiệm vụ vòng 03: Sửa các lỗi audit còn lại và chứng minh reset baseline an toàn

Bạn là coding agent tiếp tục công việc từ các tài liệu:

```text
prompt-gemini/01-normalize-company-recruiters.md
prompt-gemini/02-fix-normalization-and-reset-clean-baseline.md
prompt-gemini/02-plan-review-and-approval.md
prompt-gemini/02-fix-normalization-and-reset-clean-baseline-report.md
```

Reviewer độc lập kết luận vòng 02 **CHƯA ĐẠT**. Database local hiện tại đang ở clean baseline tương đối tốt, nhưng upgrade path, API verification và reset script vẫn thiếu hoặc sai. Hãy trực tiếp sửa code, thêm migration/test, chạy kiểm thử và chỉ reset local thật sau khi toàn bộ test gate đạt.

Khi hoàn tất, bắt buộc tạo:

```text
prompt-gemini/03-final-remediation-reset-and-verification-report.md
```

Không sửa/xóa các file prompt. Không commit, push hoặc tạo PR.

## Trạng thái hiện tại đã được reviewer xác minh

Database local hiện tại:

```text
Flyway version:              V29
Total Jobs:                  993
Imported Jobs:               974
Canonical imported company: 433
Active imported recruiter:  433
Expected identity hash:      974/974 khớp dataset
Multiple recruiter/company: 0
Imported policy/password sai: 0
Backend storage file count:  0 tại thời điểm audit
```

Các test reviewer đã chạy:

```text
company normalization: 38 pass
importer dry-run:       974 rows, 452 -> 433 companies
integration hiện có:    exit 0 nhưng thiếu coverage
backend Maven suite:    143 pass, 0 fail/error/skip
target git diff check:  pass
```

Không được sửa V27, V28 hoặc V29 vì chúng đã apply. Migration mới phải là V30 hoặc version kế tiếp chưa bị chiếm tại thời điểm thực thi. Không dùng `flyway repair`.

## Finding 1 — Upgrade V27/V28 tạo duplicate employer profile

Reviewer đã tái tạo upgrade path trên database riêng:

```text
recruiter.mb-bank@careerfit.local
  employer_profile: mb-bank-canonical
  employer_profile: mb-bank-de190144
```

Nguyên nhân:

- Importer upsert employer bằng slug mới.
- Profile V27/V28 có slug `*-canonical`.
- Schema SQL chỉ unique `slug`, không unique `recruiter_id` dù JPA khai báo `@OneToOne(unique = true)`.

### Yêu cầu sửa

Tạo V30 để:

1. Phát hiện mọi recruiter có nhiều employer profile.
2. Chọn đúng profile canonical để giữ theo quy tắc deterministic và có giải thích.
3. Merge/preserve các field có giá trị từ profile cũ, tối thiểu xem xét:
   - logo/cover;
   - summary/description;
   - industry/company size/location;
   - website/benefits/featured.
4. Không xóa profile có dữ liệu tốt trước khi merge.
5. Sau khi deduplicate, thêm unique constraint/index cho `employer_profile(recruiter_id)` để database enforce quan hệ một-một.
6. Migration chạy được trên:
   - clean database V1→V30;
   - database V29 clean baseline;
   - fixture V27/V28/V29 có hai profile cho một recruiter;
   - database không có imported jobs.
7. Importer phải upsert/reconcile profile theo recruiter identity, không chỉ theo slug; chạy lại không tạo profile thứ hai.

Integration test bắt buộc mô phỏng chính xác MB Bank có profile `mb-bank-canonical`, chạy V30/importer và assert cuối cùng chỉ còn đúng một profile với dữ liệu quan trọng được preserve.

## Finding 2 — Alias account đang bị DELETE thay vì deactivate

Importer hiện xóa `employer_profile`, `automation_policy`, rồi xóa `user_account` imported không còn JD.

### Yêu cầu sửa

- Không xóa imported alias account trong cleanup bình thường.
- Sau khi toàn bộ JD đã chuyển sang canonical recruiter:
  - đặt alias `is_active = false`;
  - bảo toàn ID account;
  - bảo toàn audit/feedback/email/action reference;
  - tắt toàn bộ email policy;
  - không còn ownership JD.
- Canonical imported recruiter vẫn active và có đúng một employer profile.
- Nếu alias profile cần merge vào canonical profile, merge field trước; sau đó có thể giữ profile alias gắn account inactive nếu schema cho phép và không gây nhầm trong public queries, hoặc archive theo thiết kế rõ ràng. Không xóa dữ liệu có giá trị âm thầm.
- Không deactivate/delete account `LOCAL`.

Integration test phải tạo alias account có reference từ các bảng phù hợp và chứng minh sau reconciliation:

```text
alias account ID vẫn tồn tại
alias is_active = false
alias không còn JD
canonical sở hữu JD với cùng job.id
reference/audit fixture vẫn tồn tại
```

## Finding 3 — Integration harness chưa đủ và có false-positive

`scripts/test-integration.mjs` hiện có các vấn đề:

- Rename file migration thật để chạy tới V28; nếu process bị ngắt có thể làm mất/đổi trạng thái file.
- `spawnSync` không throw khi child exit khác 0 nhưng test dùng `try/catch`.
- Biến `importerFailed` không được assert.
- Chỉ kiểm tra Job count, nên importer fail vì lỗi bất kỳ cũng có thể bị hiểu nhầm là LOCAL collision pass.
- Không kiểm tra application, matching, bookmark, report.
- Không checksum toàn bộ JD IDs.
- Không kiểm tra alias expansion.
- Không kiểm tra MB Bank/TPBank đầy đủ.

### Yêu cầu sửa

- Không rename/move/edit migration source file trong test.
- Dùng Flyway target hoặc cấu hình migration location an toàn để tạo V28 fixture.
- Mọi child process phải được kiểm tra `status`, `signal`, stdout/stderr phù hợp.
- LOCAL collision test phải assert:
  - exit code khác 0;
  - stderr chứa collision error mong đợi;
  - transaction rollback;
  - LOCAL account không đổi.
- Tạo fixture có:
  - JD imported;
  - application;
  - matching;
  - recruiter bookmark;
  - content report;
  - audit/reference đến alias recruiter nếu schema hỗ trợ.
- Ghi sorted `job.id` checksum và counts trước/sau upgrade/import.
- Import lần một, lần hai và lần sau alias expansion phải giữ đúng identity/ID.
- Assert MB Bank, TPBank và LG CNS Việt Nam canonical email/ownership.
- Assert toàn bộ imported recruiter password/status/role/language/policy.
- Assert mỗi active imported recruiter có đúng một employer profile.
- Assert không có duplicate source identity, external hash hoặc company ownership.
- Harness phải cleanup disposable database trong `finally` kể cả khi fail.
- Exit khác 0 khi bất kỳ assertion nào fail.

## Finding 4 — Thiếu API smoke test thật

File `scripts/test-api-smoke.mjs` hiện không tồn tại. Backend suite không thay thế test imported account runtime.

### Yêu cầu sửa

Tạo `scripts/test-api-smoke.mjs` hoặc harness tương đương:

1. Nhận base URL qua env/argument, default local an toàn.
2. Login thật:

```text
recruiter.mb-bank@careerfit.local
password: 1
```

3. Không in JWT đầy đủ.
4. Chọn một MB Bank job thực sự thuộc account.
5. Assert HTTP status, response shape và ownership cho ít nhất:

```text
POST /api/auth/login
GET  /api/auth/me
GET  /api/recruiter/dashboard
GET  /api/recruiter/jobs
GET  /api/recruiter/jobs/{jobId}/applicants hoặc endpoint applicants thực tế
GET  discovery/ranking/talent endpoint thực tế
GET  /api/recruiter/analytics/overview
GET  /api/settings/me
```

6. Nếu endpoint path khác, đọc controller/frontend API để dùng endpoint thật; không invent URL.
7. Assert một job không thuộc recruiter bị ownership guard từ chối ở endpoint protected phù hợp.
8. Exit khác 0 khi fail.
9. Test này phải chạy trên backend thật kết nối database disposable/baseline, không mock auth.

## Finding 5 — Reset script chưa xóa/verify backend storage đáng tin cậy

Reviewer quan sát:

```text
thesis_careerfit_postgres_data  được tạo mới sau reset
thesis_careerfit_backend_storage vẫn mang CreatedAt cũ từ tháng 6
```

`docker-compose.yml` thực tế có khai báo:

```yaml
backend:
  volumes:
    - careerfit_backend_storage:/app/storage
```

Báo cáo vòng 02 nói volume không tồn tại trong config là sai.

### Yêu cầu sửa script

`scripts/reset-local-demo-data.ps1` phải:

1. Chỉ chạy với `-Force`.
2. Resolve workspace và Compose config thực tế.
3. Đọc Compose project name và Docker labels; hiện expected project là `thesis`, nhưng không hard-code mù.
4. Xác định chính xác hai logical volumes:

```text
careerfit_postgres_data
careerfit_backend_storage
```

5. In exact resolved volume names trước khi xóa.
6. Verify label:

```text
com.docker.compose.project
com.docker.compose.volume
```

7. Từ chối chạy nếu target label/workspace/config không khớp.
8. Dừng đúng containers của Compose project này.
9. Xóa rõ ràng cả hai target volume kể cả khi backend profile/container không đang chạy.
10. Không xóa `careerfit_monitoring_*` hoặc volume project khác.
11. Verify hai volume cũ đã biến mất trước khi recreate.
12. Start PostgreSQL và đợi health.
13. Run Flyway tới V30.
14. Import scrape lần một.
15. Chụp manifest và sorted ID checksum.
16. Import lần hai.
17. So sánh count + checksum; fail nếu khác.
18. Start backend thật và chạy API smoke.
19. Nếu API smoke tạo runtime event/data, cleanup chính xác hoặc chạy final clean/reset stage để database cuối không chứa test fixture ngoài baseline.
20. Verify backend storage mới không chứa file CV runtime cũ.
21. Để database/backend ở trạng thái có thể dùng cho demo hoặc ghi rõ service nào đang chạy.

Script phải dùng PowerShell end-to-end, kiểm tra `$LASTEXITCODE` sau mọi external command quan trọng và fail-fast.

## Finding 6 — Báo cáo vòng 01/02 sai hoặc lỗi thời

Báo cáo mới phải sửa sự thật, không sao chép claim cũ:

- Identity hiện tại không fallback text; thiếu durable source URL phải fail/skip rõ theo implementation cuối.
- Schema hiện chỉ có `LOCAL` và `IMPORTED` trừ khi migration mới thật sự thêm `DEMO`.
- Backend storage có khai báo trong Compose.
- Top 10 imported recruiter phải lấy từ `job WHERE external_hash IS NOT NULL` hoặc marker tương đương, không lấy seed recruiters.
- Cột password trong bảng demo phải ghi `1`, không in BCrypt hash.
- Không tuyên bố API pass nếu script API chưa chạy thành công.
- Không tuyên bố reset xóa storage nếu chưa xác minh volume cũ biến mất/recreated.

Không bắt buộc sửa report 01/02 lịch sử; report 03 phải nêu rõ chúng đã bị supersede và cung cấp kết luận cuối đúng.

## Test gate bắt buộc trước reset thật

Chạy và pass toàn bộ:

```text
node scripts/company-normalization.test.mjs
node scripts/import-scraped-jobs.mjs --dry-run
node scripts/test-integration.mjs
Backend/careerfit-backend/mvnw.cmd test
git diff --check -- <target files>
```

Ngoài ra API smoke phải pass trên database/backend disposable hoặc baseline phù hợp trước khi reset thật.

Không chuyển sang reset local nếu bất kỳ gate nào fail.

## Reset local thật

Người dùng đã cho phép reset dữ liệu local CareerFit để loại dữ liệu test rác. Sau khi toàn bộ test gate pass, chạy script đã sửa:

```powershell
.\scripts\reset-local-demo-data.ps1 -Force
```

Đây là quyền xóa có phạm vi hẹp:

- Chỉ PostgreSQL và backend storage volumes của Compose project repository này.
- Không mở rộng sang monitoring, project khác hoặc file source.

Sau reset, baseline phải là migrations V1→V30 + một dataset scrape chuẩn. Lần import thứ hai chỉ để xác minh và không được thay đổi baseline.

## Hậu kiểm database cuối

Báo cáo SQL/output thực tế:

- Flyway latest version và success.
- User counts theo `account_source`, role, active.
- Total jobs, imported jobs, canonical companies.
- Missing/duplicate source identity: 0.
- Duplicate `external_hash`: 0.
- Company có nhiều active imported recruiter: 0.
- Active imported recruiter có profile count khác 1: 0.
- `job.company` khác canonical employer profile: 0.
- Imported recruiter sai email/password/role/active/verified/language/policy: 0.
- Alias imported account còn active nhưng không có JD: 0.
- CV/application/matching/bookmark/report baseline counts.
- Storage old-volume removal/recreation proof và final file count.
- Sorted imported Job-ID checksum pass 1 == pass 2.
- Top 10 imported recruiters.
- API smoke statuses.

## Tiêu chí hoàn thành

- [ ] V30 upgrade và clean path pass.
- [ ] Mỗi active imported recruiter có đúng một employer profile, database enforce unique recruiter_id.
- [ ] Alias accounts được deactivate, không delete.
- [ ] Foreign-key/reference fixtures được bảo toàn.
- [ ] Integration harness không sửa/rename migration source và không false-positive.
- [ ] Double import và alias expansion giữ count + ID checksum.
- [ ] API smoke thật pass đủ endpoint.
- [ ] Reset script xác minh/xóa đúng cả hai volumes.
- [ ] Monitoring/project khác không bị tác động.
- [ ] Final database/storage là clean baseline.
- [ ] Backend suite và diff check pass.
- [ ] Report 03 trung thực và đầy đủ.

## Cấu trúc báo cáo bắt buộc

Tạo `prompt-gemini/03-final-remediation-reset-and-verification-report.md` gồm:

### 1. Kết luận

`HOÀN THÀNH`, `HOÀN THÀNH MỘT PHẦN` hoặc `BỊ CHẶN`.

### 2. Finding-by-finding remediation

Đối chiếu sáu finding trong prompt này với file/dòng và test.

### 3. V30 migration và employer merge

Clean path, upgrade path, merge rules, constraint.

### 4. Alias account preservation

ID/status/reference trước và sau.

### 5. Integration test evidence

Full command, exit code, assertions, counts/checksums.

### 6. API smoke evidence

Endpoint, status, ownership assertion; che token.

### 7. Pre-reset manifest

Counts và exact Docker resources.

### 8. Reset execution

Commands, exit codes, old/new volume identity/labels/timestamps; không in secret.

### 9. Final baseline manifest

Toàn bộ SQL hậu kiểm và output thực tế.

### 10. Idempotency proof

Count + sorted ID checksum pass 1/pass 2.

### 11. Top 10 imported recruiter accounts

Bảng:

```text
rank | canonical_company | login | password | imported_job_count
```

Password demo hiển thị là `1`, không phải BCrypt hash.

### 12. Files changed

Liệt kê đúng file thuộc vòng này; không nhận thay đổi cũ của người dùng.

### 13. Diff audit

Target `git status`, `git diff --stat`, `git diff --check`.

### 14. Remaining risks

Không ghi “Không có” nếu còn test chưa chạy hoặc bằng chứng thiếu.

## Quy tắc kết thúc

- Không dừng ở kế hoạch.
- Không sửa migrations đã apply.
- Không dùng `flyway repair`.
- Không reset thật trước khi mọi test gate pass.
- Không xóa volume ngoài exact scope.
- Nếu test fail do code mới, tự sửa và chạy lại.
- Chỉ kết thúc khi report 03 đã được tạo và tự đối chiếu với code/database/storage thực tế.

