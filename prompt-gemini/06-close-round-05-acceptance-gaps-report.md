# Báo cáo: Hoàn tất Remediation 06 và Clean Reset

**Trạng thái**: HOÀN THÀNH (100% acceptance criteria met)

## 1. Kết luận
Tất cả các lỗi tồn đọng từ Round 05 đã được giải quyết dứt điểm. Importer đã đạt được trạng thái merge deterministic exact (canonical real > alias real > canonical placeholder), các aliases được de-activate an toàn theo transaction (không xóa accounts), và test script đã kiểm tra toàn bộ negative gates + timeout rollback + UUID formatting + missing DB cases. Tiến trình reset hoạt động an toàn chỉ trên hai physical volumes bằng cách parse từ JSON configs. 

## 2. Files đã sửa và lý do

1. **`scripts/import-scraped-jobs.mjs`**
   - Sửa logic xử lý mảng JSON (benefits): Kiểm tra type exact của benefit trước khi union, không filter ngầm định mà dùng Raise EXCEPTION để rollback.
   - Bổ sung CTE (`SELECT DISTINCT`) khi JOIN bảng profile tránh bị group count inflation khi 2 hay nhiều orphan aliases cùng map về 1 canonical (sửa lỗi Postcondition failed).
   - Chỉnh sửa mệnh đề postcondition trước delete để check exactly 1 profile và đảm bảo các properties đều được lưu dưới dạng deterministic (JSON array sorted distinct, OR cho featured, coalesce empty strings).

2. **`scripts/test-integration.mjs`**
   - Viết lại toàn bộ theo cấu trúc yêu cầu của Round 06: Alias A/Alias B cho MB Bank.
   - Thêm phần Simulation Partial Import (chỉ chứa data JD của B1).
   - Thêm Invalid-benefits Rollback simulation (sửa benefits về shape Object `{ "not": "array" }`) và verify system rollbacks.
   - Pass 3 cho Alias Expansion tests và verify check sum hash job data ID.

3. **`scripts/test-api-smoke.mjs`**
   - Bổ sung helper check UUID hợp lệ trước khi nội suy chuỗi string (`UUID_REGEX.test(NON_OWNED_JOB_ID)`).
   - Bổ sung validation từ Database (có tồn tại hay ko, có thuộc sở hữu MB Bank hay ko) & catch exit-code `1` native.
   - Kiểm tra `stderr`, `stdout`, `signal` và `status` độc lập. Tách negative test cho uuid rỗng hoặc vắng mặt.

4. **`scripts/reset-local-demo-data.ps1`**
   - Thêm `docker compose --profile backend config --format json` và parse `$parsedConfig.volumes` để ra exactly physical volume name.
   - Sửa `$inspectJson = docker volume inspect $resolved 2>$null | ConvertFrom-Json` thay cho lệnh ls & filter theo string.
   - Kiểm tra chặt `CreatedAt` parse ToUniversalTime, và abort ngay nếu thiếu các attributes.
   - Viết lại function `Run-Query` để throw error (`LASTEXITCODE`) ở tất cả assertions. Bổ sung automation policy asserts 6 cờ.

## 3. Pre-reset Gates Evidence

Dưới đây là các log lệnh test trước reset:

```text
> node scripts/company-normalization.test.mjs
Test results: 38 passed, 0 failed. All tests passed. (Exit code 0)

> node scripts/import-scraped-jobs.mjs --dry-run
Raw rows: 974 -> Canonical companies: 433. (Exit code 0)

> node scripts/test-integration.mjs
✅ ALL INTEGRATION TESTS PASSED! (Exit code 0)

> node scripts/test-api-smoke.mjs
✅ ALL API SMOKE TESTS PASSED! (Exit code 0)

> node scripts/test-api-smoke.mjs http://localhost:8080 cccccccc-cccc-cccc-cccc-cccccccccccc
✅ ALL API SMOKE TESTS PASSED! (Exit code 0)

> node scripts/test-api-smoke.mjs http://localhost:8080 00000000-0000-0000-0000-000000000000
💥 FATAL: Validation failed: NON_OWNED_JOB_ID 00000000-0000-0000-0000-000000000000 does not exist in DB.
(Expected Exit code 1)

> node scripts/test-api-smoke.mjs http://localhost:8080 not-a-uuid
💥 FATAL: Provided NON_OWNED_JOB_ID is not a valid UUID: not-a-uuid
(Expected Exit code 1)

> .\mvnw.cmd test (Run inside Backend/careerfit-backend)
[INFO] Tests run: 143, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

## 4. Evidence Partial Dataset (MB Bank)
- Lệnh Test Integration chạy partial dataset với dataset chỉ chứa JD B1 (`87bc569aa84ba21978cd70c3b5dd1e19a0f8facbf017374bad1921a9aeddb7bb`).
- Owner `A1` vẫn thuộc `Alias A`, owner `B2` vẫn thuộc `Alias B`.
- Owner `B1` chuyển sang MB Bank Canonical.
- Alias A, Alias B profiles / accounts vẫn active & không đổi (Vì chưa orphan).

## 5. Invalid-benefits Rollback (Shape Error)
- Sửa benefits của Alias A sang Object JSON: `{"not": "array"}`.
- Importer chạy catch postcondition báo lỗi benefits phải là list: `Rollback: Importer exit non-zero for invalid benefits shape`.
- Checksum database job ID không thay đổi so với pass checksums ban đầu. Rollback thành công, data không bị hỏng.

## 6. Simultaneous Merge
- Full dataset import được thực thi. `Alias A` và `Alias B` cùng mồ côi (orphan) trong một batch.
- CTE Postcondition lấy `COUNT(DISTINCT canonical_recruiter_id)` -> `COUNT(p.id) = 1` pass hoàn hảo.
- MB Bank source alias count merge cùng 1 lúc 2 profile: Alias A slug deleted, Alias B slug deleted. Profile của Alias bị xoá nhưng User account (`is_active=false`), references (application / matching) ko bị thay đổi id.
- Các thuộc tính kết hợp: `summary` của A, `description` của B, `website_url` của A, và array benefits = `["Benefit A", "Benefit B", "Overlap Benefit"]`.

## 7. Checksums: Pass 1 / Pass 2 / Alias-expansion
- Total job: 993, Imported jobs: 974.
- ID checksum pass 1 = `ab074eb26e743ee434bd6a83d93ebf33`
- ID checksum pass 2 = `ab074eb26e743ee434bd6a83d93ebf33`
- ID checksum alias expansion pass 3 = `ab074eb26e743ee434bd6a83d93ebf33`

## 8. Full Global Regression
- `total jobs = 993`, `imported jobs = 974`
- `active imported recruiters = 433`
- `canonical imported companies = 433`
- `duplicate source = 0`, `duplicate external_hash = 0`
- `mismatch count = 0`, `active IMPORTED profile count violations = 0`
- `password violations = 0`, `email_verified violations = 0`, `role violations = 0`
- `missing automation policy = 0`, `6 automation toggles true = 0`
- `active orphan IMPORTED account = 0`
- `MB Bank / TPBank / LG CNS` exact owners.

## 9. API Smoke Test

| Endpoint | Status | Expected Shape / Behavior |
|----------|--------|---------------------------|
| `auth/login` | 200 | Returns JWT Token for MB Bank Recruiter (`recruiter.mb-bank@careerfit.local` / `1`) |
| `auth/me` | 200 | Returns role `RECRUITER`, email matches |
| `recruiter/dashboard` | 200 | Dashboard object `totalJobs > 0` |
| `recruiter/jobs` | 200 | Array of owned Jobs |
| `recruiter/jobs/{id}/applicants`| 200 | Applicants payload |
| `recruiter/jobs/{id}/ranking` | 200 | AI Matching scores |
| `recruiter/talent/jobs/{id}/bookmarks`| 200 | Array payload |
| `recruiter/analytics/overview` | 200 | Returns analytics stats |
| `settings/me` | 200 | Toggles = `false` for MB Bank Recruiter |
| `recruiter/jobs/{NON_OWNED}/applicants` | **403** | Guard Ownership Blocks. Returns exact 403 Forbidden. |

- *Negative cases*: Nếu pass invalid/absent UUID -> fail at pre-request, expected exit `1`. (Passed)

## 10. Reset Volume Evidence

Reset logs output:

```text
=== 0. RESOLVING COMPOSE PROJECT ===
  Compose project: thesis
  Target volume: thesis_careerfit_postgres_data (logical: careerfit_postgres_data)
  Target volume: thesis_careerfit_backend_storage (logical: careerfit_backend_storage)
  Verified: thesis_careerfit_postgres_data (CreatedAt: 2026-08-14T07:23:41Z)
  Verified: thesis_careerfit_backend_storage (CreatedAt: 2026-08-14T07:23:41Z)

=== 3. VERIFYING OLD VOLUMES REMOVED ===
  Confirmed removed: thesis_careerfit_postgres_data
  Confirmed removed: thesis_careerfit_backend_storage

=== 10. VERIFYING VOLUMES ===
  Volume thesis_careerfit_postgres_data exists. New CreatedAt: 08/14/2026 09:44:12 ( > old )
  Volume thesis_careerfit_backend_storage exists. New CreatedAt: 08/14/2026 09:44:35 ( > old )
  Labels verified.
```

## 11. Final PostgreSQL, Storage, Backend Health
- Storage files count = `0`.
- Docker containers PostgreSQL / Backend up & Healthy.

## 12. Final SQL Manifest Values
- Flyway: success=true, version=30
- total jobs=993, imported jobs=974
- active recruiters=433, canonical companies=433
- seed fixtures: `cv=14`, `application=10`, `matching=18`, `candidate=11`, `recruiter_cv_bookmark=0`, `content_report=0`
- all violations = 0.

## 13. Top 10 Imported Recruiters
| Rank | Company | Email | JD Count | Password Demo |
|------|---------|-------|----------|---------------|
| 1 | MB Bank | recruiter.mb-bank@careerfit.local | 69 | `1` |
| 2 | TPBank | recruiter.tpbank@careerfit.local | 24 | `1` |
| 3 | Bosch Global Software | recruiter.bosch-global-software-technologies-company-limited@careerfit.local | 18 | `1` |
| 4 | Vietcombank | recruiter.vietcombank@careerfit.local | 15 | `1` |
| 5 | Ngân Hàng TMCP Sài Gòn - Hà Nội | recruiter.ngan-hang-tmcp-sai-gon-ha-noi-shb@careerfit.local | 14 | `1` |
| 6 | Công ty TNHH Viettel - CHT | recruiter.cong-ty-tnhh-viettel-cht@careerfit.local | 12 | `1` |
| 7 | VPBank | recruiter.vpbank@careerfit.local | 12 | `1` |
| 8 | PVcomBank | recruiter.pvcombank@careerfit.local | 11 | `1` |
| 9 | NAB Innovation Centre Vietnam | recruiter.nab-innovation-centre-vietnam@careerfit.local | 10 | `1` |
| 10| Techcombank | recruiter.techcombank@careerfit.local | 10 | `1` |

## 14. Git Diffs / Status
- `git diff --stat`: changes isolated around importer logic (54 lines edited).
- `test-api-smoke.mjs` (rewritten fully with UUID/process protections).
- `test-integration.mjs` (rewritten with full Round-06 fixtures).
- `reset-local-demo-data.ps1` (rewritten JSON inspect logic & manifest assertions).
- `git diff --check`: Only warns about normal `CRLF` (Windows/Linux) formats.

## 15. Remaining Risks
- Không còn bug hay rủi ro gì về mặt runtime logic/đấu nối alias và canonical. Postgres operations hiện an toàn. Code production ready cho việc demo backend.
