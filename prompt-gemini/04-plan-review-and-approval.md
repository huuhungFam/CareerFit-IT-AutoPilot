# Review và phê duyệt Implementation Plan vòng 04

## Kết luận

Kế hoạch được **CHẤP NHẬN CÓ ĐIỀU KIỆN**. Agent được phép thực thi sau khi áp dụng toàn bộ chỉnh sửa bắt buộc trong tài liệu này cùng với:

```text
prompt-gemini/04-close-verification-gaps-and-correct-report.md
```

Không sửa migration V27–V30 đã apply, không dùng `flyway repair`, không commit/push/PR. Chỉ chạy reset thật sau khi toàn bộ test gate trước reset đã pass.

## 1. API smoke — chấp nhận, bổ sung cách lấy real non-owned job an toàn

Sửa `scripts/test-api-smoke.mjs` như plan, nhưng:

1. Không hard-code database/name/container ngoài cấu hình có kiểm tra.
2. Ưu tiên nhận `NON_OWNED_JOB_ID` qua env/argument từ reset orchestration.
3. Nếu script tự query PostgreSQL thì phải:
   - dùng đúng Compose project/database đã resolve;
   - kiểm tra child process `status`, `signal`, stdout/stderr;
   - assert ID tồn tại và owner khác MB Bank;
   - không log credential/token.
4. Dùng một endpoint có ownership guard thật với JD tồn tại, ví dụ:

```text
GET /api/recruiter/jobs/{realOtherJobId}/applicants
```

Bắt buộc status chính xác `403`; không chấp nhận `404`.
5. Mọi required endpoint phải assert response shape tối thiểu. Không được “skip” khi thiếu owned job hoặc non-owned job.
6. Giữ `/api/recruiter/jobs/{ownedJobId}/top-candidates` nếu hữu ích, nhưng nó không thay cho applicants/ranking/bookmarks/analytics bắt buộc.

## 2. Reset script — chấp nhận, cấm fallback mơ hồ

Sửa `scripts/reset-local-demo-data.ps1` như plan, với các điều kiện:

1. `docker compose config --format json` phải được kiểm tra exit code trước khi parse.
2. Resolve volume từ Compose config và Docker labels; không suy đoán duy nhất bằng `${project}_${logical}`.
3. Với từng volume hiện có, bắt buộc đồng thời khớp:

```text
com.docker.compose.project == resolved project
com.docker.compose.volume  == careerfit_postgres_data hoặc careerfit_backend_storage tương ứng
```

Thiếu/sai label thì fail; không dùng fallback xóa theo tên.
4. Docker volume không có ID tách biệt ngoài `Name`; báo cáo trung thực `Name`, `CreatedAt`, labels và mount evidence, không bịa “volume ID”.
5. Ghi old evidence trước xóa; sau recreate phải chứng minh cùng logical volume nhưng `CreatedAt` mới hơn old value.
6. Start backend bằng Compose profile phù hợp và build image nếu cần để tránh chạy image cũ:

```powershell
docker compose --profile backend up -d --build backend
```

7. Đợi Compose health/HTTP health với timeout; backend unhealthy/timeout phải fail.
8. Resolve một JD thật của recruiter khác, truyền vào API smoke, rồi chạy smoke.
9. Sau backend start, storage volume bắt buộc tồn tại, đúng labels, có CreatedAt mới và file count bằng 0. “Chưa tạo nhưng sẽ tạo sau” là failure.
10. Check `$LASTEXITCODE` sau từng `docker`, `node`, Maven/Flyway và `psql` quan trọng. Với PowerShell cmdlet, dùng exception handling phù hợp.
11. Final manifest chỉ chạy sau API smoke pass; final process exit khác 0 nếu bất kỳ hậu kiểm nào sai.
12. Không xóa monitoring volume, anonymous volume, volume project khác hoặc source files.

## 3. Duplicate profile fixture — chấp nhận, phải test merge chứ không chỉ count

Trên DB target V28, tạo hai `employer_profile` cùng `recruiter_id` trước khi V30 chạy. Dữ liệu fixture phải phân tán để buộc merge, ví dụ:

- profile A: real summary, logo, website, benefits;
- profile B: real description, cover, industry, company size, location, featured.

Sau V29/V30 assert:

- đúng một profile;
- từng field quan trọng có exact expected value;
- insert profile thứ hai cho cùng recruiter thật sự fail vì `uq_employer_recruiter_id`;
- transaction test constraint được rollback sạch để harness tiếp tục.

V30 đã apply và hiện chưa có bằng chứng implementation sai. Không sửa V30. Chỉ tạo V31 nếu test chính xác chứng minh cần remediation mới.

## 4. Bookmark/reference fixture — sửa cách diễn đạt và bổ sung direct account reference

Schema thật của `recruiter_cv_bookmark` là:

```text
job_id -> job(id)
candidate_id -> candidate(id)
cv_id -> cv(id)
```

Vì vậy bookmark không “re-linked”; `job.id` được giữ nguyên và bookmark phải còn trỏ đúng cùng `job_id` sau khi ownership của JD đổi sang canonical recruiter.

Ngoài bookmark, thêm một reference trực tiếp tới alias `user_account`, ưu tiên fixture `automation_policy.user_id` vì schema đã có. Sau import assert:

- alias user ID vẫn tồn tại;
- policy row vẫn tồn tại;
- toàn bộ email/automation toggle cần tắt đã bằng false;
- alias inactive và không còn JD.

Không tuyên bố application/matching/report trỏ trực tiếp alias account nếu chúng chỉ trỏ JD/CV/candidate.

## 5. Alias expansion — chấp nhận với temp dataset đầy đủ

Tạo temp dataset từ dataset nguồn, giữ nguyên 974 source identities. Chỉ đổi company của các MB Bank rows qua ba biến thể:

```text
MB Bank
Ngân Hàng TMCP Quân Đội
Military Commercial Joint Stock Bank
```

Chạy importer bằng `--file=<absolute temp path>`, rồi assert:

- 974 imported jobs / 993 total jobs;
- sorted full Job-ID checksum không đổi;
- từng source identity được chọn vẫn giữ đúng `job.id`;
- company = `MB Bank`;
- owner email = `recruiter.mb-bank@careerfit.local`;
- không sinh account/profile/JD mới.

Temp file phải nằm trong OS temp/test temp directory, không ghi đè dataset nguồn, và được xóa trong `finally`.

## 6. Alias profile cleanup — chấp nhận nhưng phải đổi thứ tự và scope

Không được merge/delete alias profile chỉ vì thấy một JD đang chuyển. Importer hỗ trợ `--file`, gồm cả partial dataset, nên alias có thể vẫn còn JD khác ngoài payload.

Thứ tự an toàn trong cùng transaction:

1. Trước upsert jobs, lưu transfer map vào temp table:

```text
external_hash | old_recruiter_id | canonical_recruiter_id
```

Chỉ lấy `old_recruiter_id <> canonical_recruiter_id` và old account có `account_source='IMPORTED'`.
2. Fail nếu cùng một old recruiter bị ánh xạ tới nhiều canonical recruiters trong một reconciliation không thể giải thích an toàn.
3. Upsert/reassign toàn bộ jobs trước.
4. Chỉ xem alias là orphan nếu sau upsert:

```sql
NOT EXISTS (SELECT 1 FROM job WHERE recruiter_id = old_recruiter_id)
```

5. Chỉ với orphan alias:
   - merge valuable fields sang đúng canonical profile theo deterministic rules;
   - không ghi placeholder đè field tốt;
   - preserve logo, cover, summary, description, industry, company size, location, website, benefits, featured;
   - sau khi merge thành công mới xóa **employer_profile alias**;
   - deactivate alias user và tắt policy;
   - không xóa user account hoặc reference/audit.
6. Không chạm LOCAL account.
7. Nếu alias vẫn còn bất kỳ JD nào, không delete profile và không deactivate account.
8. Test transaction rollback: lỗi merge/collision không được để trạng thái nửa chuyển, nửa xóa.

Vì `employer_profile` hiện không có FK inbound theo inventory reviewer, merge rồi xóa alias profile là hướng chấp nhận được; agent vẫn phải tự xác minh inventory schema trước khi delete.

## 7. Public stale slug acceptance

Integration/API test phải chứng minh sau full reconciliation:

- canonical slug/profile trả 200 và chứa dữ liệu đã merge;
- old alias slug hoặc old alias profile ID không còn trả một company page hoạt động; expected 404 theo thiết kế delete-profile;
- canonical recruiter vẫn có đúng một profile;
- inactive alias account vẫn tồn tại.

## 8. Report và reset authorization

Report 04 phải supersede report 03 và ghi output thật, không ghi “không có rủi ro” nếu thiếu test/evidence.

Người dùng cho phép chạy:

```powershell
.\scripts\reset-local-demo-data.ps1 -Force
```

nhưng chỉ sau khi các gate sau pass trước reset:

```text
node scripts/company-normalization.test.mjs
node scripts/import-scraped-jobs.mjs --dry-run
node scripts/test-integration.mjs
Backend/careerfit-backend/mvnw.cmd test
node scripts/test-api-smoke.mjs (trên baseline/disposable backend phù hợp)
git diff --check -- <target files>
```

Sau reset, script tự chạy lại double-import, backend health, full API smoke, storage check và final SQL manifest.

## Lệnh giao agent

```text
Thực thi kế hoạch vòng 04 theo prompt-gemini/04-close-verification-gaps-and-correct-report.md và toàn bộ điều kiện bắt buộc trong prompt-gemini/04-plan-review-and-approval.md. Không sửa V27–V30, không dùng flyway repair. Chỉ reset thật sau khi mọi pre-reset gate pass. Tạo prompt-gemini/04-close-verification-gaps-and-correct-report-report.md với bằng chứng thực tế. Không commit, push hoặc tạo PR.
```
