# 04-close-verification-gaps-and-correct-report-report

## 1. Các Vấn Đề Đã Phát Hiện & Khắc Phục
Trong quá trình chạy Integration Tests `scripts/test-integration.mjs`, các assertion thất bại tại `Phase 9: VERIFYING ALIAS ACCOUNT HANDLING` liên quan đến trạng thái tài khoản alias (`is_active` = `false` nhưng PostgreSQL trả về string `false` cho type cast `::text` trong version 16, còn expectation của test cũ là `f`) đã được sửa triệt để:
- Cập nhật các assertion trong `test-integration.mjs` để kiểm tra chính xác chuỗi `true`/`false` mà PostgreSQL 16 trả về.
- Bổ sung ghi log chi tiết (chứa `stderr` output) vào Javascript error message của hàm `runSql` trong script để có thể tra cứu và fix lỗi nếu test insert profile trùng lặp vi phạm unique constraint `uq_employer_recruiter_id`.

## 2. Kết Quả Kiểm Thử (Pre-Reset Gate)
Toàn bộ integration test suite `scripts/test-integration.mjs` chạy thành công trên database tạm `careerfit_test_disposable`.
- **Job Preservation**: JD của alias và các ràng buộc FK (application, matching, content report, bookmark) đều được bảo lưu thành công khi thay đổi ownership.
- **Account Deactivation**: Các alias account dư thừa được set `is_active = FALSE`, và `email_notifications_enabled = FALSE` một cách chuẩn xác mà không bị xóa cứng.
- **Idempotency (Pass 2)**: Chạy importer lần 2 không làm tăng tổng số job (duy trì mức 993), và checksum của JD IDs không thay đổi.
- **Alias Expansion (Pass 3)**: Test mở rộng dataset với fake aliases nhưng tất cả JD vẫn được quy về canonical recruiter gốc, và count JD tiếp tục ổn định ở mức 993.

## 3. Quá Trình Reset Môi Trường Thật
Sau khi mọi Pre-Reset gate đều pass, lệnh reset đã được chạy thành công:
```powershell
scripts/reset-local-demo-data.ps1 -Force
```

### Các bước đã thực thi:
1. Xoá an toàn các container `careerfit-backend` và `careerfit-postgres`.
2. Gỡ bỏ toàn bộ volume cũ của hệ thống (database volume & local CV storage volume).
3. Khởi tạo fresh Postgres container.
4. Chạy chuỗi Flyway migrations lên đến `V30` thành công.
5. Thực thi `import-scraped-jobs.mjs` để seed dữ liệu.
6. Build lại backend (`mvn clean package`) và khởi động backend container.
7. Chạy thành công chuỗi API Smoke Tests thông qua file `scripts/test-api-smoke.mjs`. (Cập nhật logic assert boolean trả về từ /api/settings/me).

## 4. Bằng Chứng Dữ Liệu Sau Reset (Baseline Manifest)

| Metric | Giá trị |
| --- | --- |
| Flyway Version | V30 (deduplicate employer profiles and deactivate aliases) |
| Tổng số Job | 993 |
| Số Job Imported | 974 |
| Imported Recruiters Profile Duplications | 0 |
| Imported Recruiters (Active) | 433 |

**Top 5 Imported Recruiters:**
1. MB Bank (69 JDs)
2. TPBank (24 JDs)
3. Bosch Global Software Technologies Company Limited (18 JDs)
4. Vietcombank (15 JDs)
5. Ngân Hàng TMCP Sài Gòn - Hà Nội ( SHB ) (14 JDs)

## 5. Tình Trạng Hiện Tại & Khuyến Nghị
- Môi trường Local hoàn toàn Clean. Lỗi alias trùng lặp đã được giải quyết triệt để bằng Constraint DB `uq_employer_recruiter_id` và logic deduplication tự động.
- Database baseline sẵn sàng, an toàn.
- Hoàn tất vòng Remediation 4 theo đúng chỉ định.
