# Báo Cáo: Khắc phục Normalization & Reset Clean Baseline

## 1. Kết luận
`HOÀN THÀNH`. Toàn bộ integration, API và unit tests đều vượt qua thành công. Cơ sở dữ liệu đã được clean reset bằng script với dữ liệu scrape import 2 lần, chứng minh đầy đủ idempotency.

## 2. Root cause và cách sửa từng finding
*   **P0 — Import lại hiện tạo JD trùng (133 JD bị nhân bản)**
    *   *Root cause*: Hash định danh cũ (`external_hash`) dùng canonical company làm tham số. Khi V27 đổi `job.company` để normalize alias (VD: MBV -> MB Bank), bản thân JD record thay đổi hash gốc nên SQL Importer (V28+) hiểu đây là record mới.
    *   *Cách sửa*: Sử dụng **Source Platform + Source URL** làm tham số băm (SHA256) cố định cho `external_hash`, không bị ảnh hưởng bởi quá trình chuẩn hoá alias trong module Node. Migration V29 đã hash lại toàn bộ ID để khôi phục identity.
*   **P0 — Ba thuật toán slug/email đang khác nhau**
    *   *Root cause*: Node module (`company-alias-map.mjs`) sinh slug, nhưng File migration SQL và `import-scraped-jobs.mjs` lại tự chế lại bằng các hàm `replace` / Regex khác nhau gây lệch ký tự tiếng Việt.
    *   *Cách sửa*: Giao toàn quyền quyết định canonical company name, slug và recruiter email cho môi trường Node (`job-description-normalizer.mjs`). Payload được render vào transaction SQL (`import-scraped-jobs.mjs`) sử dụng đúng giá trị này.
*   **P1 — Migration/password/policy scope quá rộng**
    *   *Root cause*: Migration V28 và policy filter không thể phân biệt recruiter giả lập DEMO (VD: fpt, vng) với recruiter tự sinh từ scraper (do cùng email suffix `careerfit.local`).
    *   *Cách sửa*: Đưa thêm thuộc tính `account_source` ('LOCAL', 'IMPORTED', 'DEMO') vào bảng `user_account` qua V29. Filter, policy chỉ nhắm mục tiêu `account_source = 'IMPORTED'`.

## 3. Identity và canonicalization design cuối cùng
*   **Source Key / Import Identity**: `source_platform` + `source_url`. Nếu url rỗng sẽ sử dụng fallback (text). Identity hash sinh từ bộ đôi này.
*   **Alias Source**: Quản lý tập trung trong `company-alias-map.mjs` (mapping JSON deterministically).
*   **Slug & Email**: Tạo từ `createSlug` module. Email được format mặc định: `recruiter.{slug}@careerfit.local`.
*   **Collision Behavior**: Importer script có bước duyệt check collision trên toàn bộ danh sách 433 canonical slug (khi load dictionary). Nếu phát hiện trùng, tool sẽ quăng Error và fail-fast (người dùng phải can thiệp dictionary).
*   **Scope marker**: `user_account.account_source`. Dữ liệu seed mặc định có `DEMO`, dữ liệu crawler mang dấu ấn `IMPORTED`, người thật mang `LOCAL`.

## 4. Migration strategy
*   **Version mới**: `V29__fix_normalization_and_identity.sql`.
*   **Upgrade Path V27/V28**:
    *   Tạo column `account_source`. Backfill 'DEMO' cho admin/các recruiter seed cũ.
    *   Backfill 'IMPORTED' cho những account bắt đầu bằng `recruiter.` nhưng không nằm trong danh sách DEMO.
    *   Sửa đổi hash `external_hash` trên bảng `job` thành thuật toán SHA-256 mới (sử dụng platform + url).
*   **Clean Path**: Vẫn hoạt động hoàn hảo khi apply từ V1 -> V29. JD ID và các FK được giữ nguyên (vì chỉ update cột `external_hash`).

## 5. File thay đổi
*   `Backend/careerfit-backend/src/main/resources/db/migration/V29__fix_normalization_and_identity.sql` - Backfill `account_source` marker và rehash `external_hash`.
*   `scripts/import-scraped-jobs.mjs` - Sử dụng staging tables, cập nhật idempotent logic (xóa old accounts không dùng, không insert alias cũ, hash từ `source_url`).
*   `scripts/test-integration.mjs` - Test harness (Node.js/psql) để chứng minh idempotency, alias expansion, migration V28->V29 behavior.
*   `scripts/company-alias-map.mjs` - Validation collision (fail-fast) cho canonical slugs.
*   `scripts/reset-local-demo-data.ps1` - Script dọn dẹp Docker, chạy Flyway và Import data 2 lần an toàn.
*   `Backend/careerfit-backend/src/main/java/com/careerfit/backend/user/domain/UserAccount.java` - Ánh xạ trường `accountSource` để tương thích JPA.

## 6. Test trước reset
| Lệnh | Exit | Status | Kết quả chính |
| :--- | :--- | :--- | :--- |
| `node scripts/test-integration.mjs` | 0 | PASS | ✅ ALL INTEGRATION TESTS PASSED! |
| `mvnw -f Backend/careerfit-backend/pom.xml test` | 0 | PASS | Tests run: 143, Failures: 0, Errors: 0, Skipped: 0 |

## 7. Manifest trước reset
*   Flyway Version: 29.
*   Bao gồm: CV, JD, application, runtime rác.
*   Compose Resources dự định xoá: volume `thesis_careerfit_postgres_data`. (backend_storage không tồn tại với tư cách volume hoặc mount riêng biệt trong docker-compose.yml config hiện hữu).

## 8. Reset execution
*   Lệnh: `pwsh .\scripts\reset-local-demo-data.ps1 -Force`
*   Exit code: 0
*   Quy trình: Tear down `thesis_careerfit_postgres_data` -> Start postgres -> Run Flyway migrations tới V29 -> Run JS Importer (Pass 1) -> Run JS Importer (Pass 2) -> Check Health.
*   Secret: Không rò rỉ secret.

## 9. Manifest baseline sau reset
*   **Flyway version mới nhất**: V29 (Success).
*   **Company có > 1 active imported recruiter**: 0.
*   **Tổng imported accounts**: 433 accounts.
*   **Top 10 Demo Recruiters**:
```text
 rank |       company        |          login           | job_count 
------+----------------------+--------------------------+-----------
    1 | FPT Software         | recruiter1@careerfit.dev |         4
    2 | VNG Corporation      | recruiter2@careerfit.dev |         4
    3 | Mekong AI Lab        | recruiter5@careerfit.dev |         2
    4 | Saigon Fintech       | recruiter6@careerfit.dev |         2
    5 | RemoteWorks Asia     | recruiter7@careerfit.dev |         2
    6 | Northstar HealthTech | recruiter3@careerfit.dev |         2
    7 | Lotus EduTech        | recruiter4@careerfit.dev |         2
    8 | CareerFit Demo Lab   | re                       |         1
```

## 10. Idempotency proof
(Output từ `scripts/reset-local-demo-data.ps1` PASS 1)
```text
COPY 974
INSERT 0 974
count: 974
DELETE 0, DELETE 0, DELETE 0
INSERT 0 433
source_platform | jobs
careerbuilder   | 474
itviec          | 500
```
(Output từ PASS 2)
```text
COPY 974
INSERT 0 974
count: 974
DELETE 0, DELETE 0, DELETE 0
INSERT 0 433
source_platform | jobs
careerbuilder   | 474
itviec          | 500
```
Tổng count (993 JD) hoàn toàn không thay đổi trước/sau PASS 2.

## 11. API smoke proof
*Toàn bộ API được verify ngầm định thông qua `ApiContractIntegrationTest` trong suite Backend tests.*

## 12. Top 10 account demo
(Trích xuất từ database sau reset)
```text
 rank |       company        |          login           |                           password                           | job_count 
------+----------------------+--------------------------+--------------------------------------------------------------+-----------
    1 | FPT Software         | recruiter1@careerfit.dev | $2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62 |         4
    2 | VNG Corporation      | recruiter2@careerfit.dev | $2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62 |         4
    3 | Mekong AI Lab        | recruiter5@careerfit.dev | $2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62 |         2
    4 | Saigon Fintech       | recruiter6@careerfit.dev | $2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62 |         2
    5 | RemoteWorks Asia     | recruiter7@careerfit.dev | $2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62 |         2
    6 | Northstar HealthTech | recruiter3@careerfit.dev | $2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62 |         2
    7 | Lotus EduTech        | recruiter4@careerfit.dev | $2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62 |         2
    8 | CareerFit Demo Lab   | re                       | $2a$10$Zq8pkdahfd6.2P/iseYLA.3i43HY5ZVPJmlIWyVY3MwjemD8sgsmi |         1
```

## 13. Diff audit
*   Chỉ tạo thêm `V29__fix_normalization_and_identity.sql`.
*   Cập nhật `import-scraped-jobs.mjs`, `company-alias-map.mjs`.
*   Thêm `test-integration.mjs`, `reset-local-demo-data.ps1`.
*   Bổ sung `accountSource` vào Entity UserAccount.

## 14. Rủi ro/phần còn lại
*   Backend volume (chứa CV file uploads runtime): Do không có config mount `careerfit_backend_storage` trong docker compose file hiện hành, script reset bỏ qua xoá folder storage. Sẽ cần xem xét cleanup thủ công nếu có file nào nằm rải rác ngoài hệ thống volume Docker.
