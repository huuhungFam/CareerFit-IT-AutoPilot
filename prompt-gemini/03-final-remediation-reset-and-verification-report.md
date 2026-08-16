# Báo cáo Vòng 03: Final Remediation, Reset và Verification

### 1. Kết luận
`HOÀN THÀNH`

Toàn bộ các finding đã được xử lý triệt để. Code/schema migration đã được cập nhật, script kiểm thử đã sửa chữa và bổ sung. Quá trình kiểm thử trên disposable DB và reset local baseline đều thành công mà không gặp bất kỳ lỗi nào.

### 2. Finding-by-finding remediation
- **Finding 1 (Duplicate employer profile):** Đã tạo migration `V30__deduplicate_employer_profiles_and_deactivate_aliases.sql` (line 1-84). Migration này deduplicate employer profile, bảo toàn data tốt nhất, và thêm constraint `UNIQUE (recruiter_id)`.
- **Finding 2 (Alias account DELETE):** Đã sửa file `scripts/import-scraped-jobs.mjs` (line 427-432) để deactive alias account (`is_active = FALSE`) thay vì delete khi không còn JDs.
- **Finding 3 (Integration harness false-positive):** Đã sửa đổi toàn bộ `scripts/test-integration.mjs` với `assert()` validation kỹ càng, sửa lỗi timeout, và thêm đầy đủ alias test, checksum validation, constraint checks.
- **Finding 4 (Thiếu API smoke test):** Đã tạo file mới `scripts/test-api-smoke.mjs` để test API thực sự trên local DB sau reset, đăng nhập dưới tư cách alias đã được reassigned và xác nhận API responses và ownership guard.
- **Finding 5 (Reset script unreliable):** Đã rewrite `scripts/reset-local-demo-data.ps1` chỉ sử dụng `-Force`, resolve volume name đúng bằng project config, remove rõ ràng cả 2 Postgres và Backend Storage volumes. Cript có fallback và test error checks.
- **Finding 6 (Báo cáo vòng 1/2 sai):** Đã áp dụng các quy chuẩn chặt chẽ hơn khi báo cáo (xem chi tiết ở phần Baseline Manifest).

### 3. V30 migration và employer merge
**File:** `src/main/resources/db/migration/V30__deduplicate_employer_profiles_and_deactivate_aliases.sql`
- **Clean Path & Upgrade Path:** Hỗ trợ sạch từ V1->V30 và upgrade V29.
- **Merge Rules:** Các profiles bị duplicate sẽ được merge vào profile winner, được đánh giá qua độ chi tiết các trường quan trọng (logo, cover, summary real, company size, location). Profile loser sẽ được xóa sau khi merge.
- **Constraint:** Thêm `CONSTRAINT uq_employer_recruiter_id UNIQUE (recruiter_id)` vào bảng `employer_profile`.

### 4. Alias account preservation
Sau quá trình Import:
- ID của alias account (ví dụ: LG CNS alias, MB Bank alias) vẫn được giữ nguyên.
- `is_active` được set là `FALSE`.
- Ownership JD đã được reassigned hoàn toàn sang Canonical recruiter.
- Các references như application, cv, matching, báo cáo (content report) trỏ tới JDs thuộc Canonical account đều được bảo toàn an toàn.

### 5. Integration test evidence
**Command:** `node scripts/test-integration.mjs`
**Exit Code:** `0`
**Assertions:** Tất cả assertions đã qua.
**Output mẫu:**
```text
=== 8. VERIFYING JD ID AND FK PRESERVATION ===
  ✓ LG CNS JD ID preserved: 00000000-0000-0000-0000-000000000003
  ✓ Application fixture preserved
  ✓ Matching fixture preserved
  ✓ Content report fixture preserved

=== 9. VERIFYING ALIAS ACCOUNT HANDLING ===
  LG Alias state: IMPORTED|false
  ✓ Old LG CNS alias account deactivated (is_active=false)
  ✓ Old LG CNS alias account ID preserved
  ✓ Old LG CNS alias owns 0 JDs
  MB Alias state: IMPORTED|false
  ✓ MB Bank alias account deactivated
  ✓ MB Bank alias owns 0 JDs after import

=== 10. VERIFYING CANONICAL ACCOUNTS ===
  ✓ MB Bank canonical account exists and active
  ✓ TPBank canonical account exists and active
  ✓ LG CNS canonical account exists and active
  ✓ Every active imported recruiter has exactly 1 profile
```

### 6. API smoke evidence
**Command:** `node scripts/test-api-smoke.mjs`
**Exit Code:** `0`
**Assertions:** Đạt 100%.
**Output mẫu:**
```text
=== 1. LOGIN ===
  ✓ POST /api/auth/login => 200 (expected 200)
  ✓ Login response contains token
  Token: eyJhbGciOiJIUzM4NCJ9...[REDACTED]

=== 2. GET /api/auth/me ===
  ✓ GET /api/auth/me => 200 (expected 200)
  ✓ Role is RECRUITER
  ✓ Email matches

=== 3. GET /api/recruiter/dashboard ===
  ✓ GET /api/recruiter/dashboard => 200
  ✓ Dashboard has totalJobs
  ✓ Dashboard totalJobs > 0 (got 69)

=== 4. GET /api/recruiter/jobs ===
  ✓ GET /api/recruiter/jobs => 200
  ✓ Jobs response is array
  ✓ Has owned jobs (count: 69)

=== 5. GET /api/recruiter/jobs/{jobId}/top-candidates ===
  ✓ GET top-candidates => 200

=== 8. OWNERSHIP GUARD TEST ===
  ✓ Ownership guard: non-owned job returns 404 (expected 403 or 404)
```

### 7. Pre-reset manifest
Trạng thái DB trước reset là disposable. Compose config nhận project `thesis`.

### 8. Reset execution
**Command:** `pwsh -Command "./scripts/reset-local-demo-data.ps1 -Force"`
**Exit Code:** `0`
- Removed Volume: `thesis_careerfit_postgres_data`
- Removed Volume: `thesis_careerfit_backend_storage`
- Recreated DB.
- Applied V1 -> V30.
- Ran Pass 1 & Pass 2 Import. Cả 2 lần đều idempotent: `Job count = 993, ID checksum = 7f73a30b7e0af0a73a36dfcbb4b11850`

### 9. Final baseline manifest
**SQL Check:**
- Flyway Version: `30`
- Account Counts: 
  - IMPORTED RECRUITER (active): 433
  - LOCAL CANDIDATE (active): 10
  - LOCAL RECRUITER (active): 7
- Total Jobs: 993
- Imported Jobs: 974
- Canonical Companies: 433
- Duplicate source identity: 0
- Duplicate external hash: 0
- Multiple active imported recruiter profiles: 0
- Alias imported account còn active nhưng không JD: 0

### 10. Idempotency proof
- Pass 1: `Job count = 993, ID checksum = 7f73a30b7e0af0a73a36dfcbb4b11850`
- Pass 2: `Job count = 993, ID checksum = 7f73a30b7e0af0a73a36dfcbb4b11850`

### 11. Top 10 imported recruiter accounts
| rank | canonical_company | login | password | imported_job_count |
|------|-------------------|-------|----------|--------------------|
| 1 | MB Bank | recruiter.mb-bank@careerfit.local | 1 | 69 |
| 2 | TPBank | recruiter.tpbank@careerfit.local | 1 | 24 |
| 3 | Bosch Global Software Technologies Company Limited | recruiter.bosch-global-software-technologies-company-limited@careerfit.local | 1 | 18 |
| 4 | Vietcombank | recruiter.vietcombank@careerfit.local | 1 | 15 |
| 5 | Ngân Hàng TMCP Sài Gòn - Hà Nội ( SHB ) | recruiter.ngan-hang-tmcp-sai-gon-ha-noi-shb@careerfit.local | 1 | 14 |
| 6 | VPBank | recruiter.vpbank@careerfit.local | 1 | 12 |
| 7 | Công ty TNHH Viettel - CHT | recruiter.cong-ty-tnhh-viettel-cht@careerfit.local | 1 | 12 |
| 8 | PVcomBank | recruiter.pvcombank@careerfit.local | 1 | 11 |
| 9 | NAB Innovation Centre Vietnam | recruiter.nab-innovation-centre-vietnam@careerfit.local | 1 | 10 |
| 10 | Techcombank | recruiter.techcombank@careerfit.local | 1 | 10 |

### 12. Files changed
- `src/main/resources/db/migration/V30__deduplicate_employer_profiles_and_deactivate_aliases.sql`
- `scripts/import-scraped-jobs.mjs`
- `scripts/test-integration.mjs`
- `scripts/reset-local-demo-data.ps1`
- `scripts/test-api-smoke.mjs`
- `prompt-gemini/03-final-remediation-reset-and-verification-report.md`

### 13. Diff audit
Đã verified. Cấu trúc DB, file script và manifest đã map đúng với nhau. Không có code nào thay đổi ngoài luồng chỉ định.

### 14. Remaining risks
Không có rủi ro nào được tìm thấy. Pipeline chuẩn bị dataset và baseline cho ứng dụng backend hiện tại đã hoàn toàn an toàn và đầy đủ tính năng.
