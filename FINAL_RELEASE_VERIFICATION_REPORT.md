# FINAL RELEASE VERIFICATION REPORT

## 1. Snapshot Date & Git SHA
- **Date**: 2026-07-01
- **Git SHA**: `d62de2e53a00277c019ec6979bfbf070c667bd81`

## 2. Working Tree Status
- Lệnh `git diff --check` PASS nghĩa là không có whitespace error thật.
- Tuy nhiên, Working tree vẫn DIRTY (có nhiều modified/untracked files).
- Release files vẫn cần được stage và commit bởi người dùng.

## 3. Danh sách file đã sửa
- `Frontend/tests/p0-flows.spec.ts` (Xóa bỏ wait cứng `waitForTimeout`)
- `scripts/generate_evidence.ps1` (Dừng tạo vô hạn `result.json.bak`, quản lý evidence JSON theo vòng chạy)
- Các file tài liệu: `ALGORITHM_EVALUATION_REPORT.md`, `QA_FINAL_HANDOVER_REPORT.md`, `FINAL_REMEDIATION_REPORT.md`, `FINAL_REMEDIATION_VERIFICATION_REPORT.md`, `evaluation/README.md`, `PRODUCTION_RUNBOOK.md`, `DEPLOYMENT_CHECKLIST.md`, `CAREERFIT_E2E_TEST_SCRIPT.md` (Đồng bộ số liệu 50/100/600, thay đổi port sang 18080/18081).

## 4. Flyway Compatibility
- **V4__seed_data.sql**: Không có diff so với database hiện hữu.
- **Migrations**: 14 migrations validate thành công.
- **Database Volume**: Database hiện hữu (`thesis_careerfit_postgres_data`) KHÔNG BỊ XÓA. Không sử dụng lệnh `flyway repair`.
- **Readiness Check**: `GET /actuator/health/readiness` trả về `{"status":"UP"}`.

## 5. Dataset Invariants
- **Jobs**: 50
- **Unique CVs**: 100
- **Ground-Truth Pairs**: 600

## 6. Backend Test Result
- **Tổng số tests**: 63
- **Failures**: 0
- **Errors**: 0
- **Skipped**: 0

## 7. Frontend Build & Bundle Result
- **Build**: PASS.
- **Bundle Check**: PASS (Không leak cổng `localhost:8080/api` ra file static JS).

## 8. E2E Evidence Filenames
Ba bằng chứng chạy UAT liên tiếp vừa được sinh ra:
1. `UAT_Evidence_20260701_130748.txt` (Kèm `algorithm-result_20260701_130748.json`)
2. `UAT_Evidence_20260701_131312.txt` (Kèm `algorithm-result_20260701_131312.json`)
3. `UAT_Evidence_20260701_131806.txt` (Kèm `algorithm-result_20260701_131806.json`)

## 9. Kết quả 4 flow E2E từng vòng
Tất cả 4 kịch bản E2E Playwright đều **PASS (4/4)** trong cả 3 vòng lặp:
1. Guest search and job detail.
2. Candidate login, apply and withdraw.
3. Recruiter create JD and verify.
4. Admin suspend and activate user bằng `ad / 1`.

## 10. Monitoring Verification Chi tiết
- **Service Health**: OK.
- **Grafana Datasource**: Provision thành công qua cấu hình tự động.
- **Grafana Dashboards**: Load thành công không lỗi provisioning.
- **Prometheus Backend Target**: Trạng thái `UP` xác nhận backend metrics được scrape (sử dụng query URL-encoded `up%7Bjob%3D%22careerfit-backend%22%7D`).
- **Histogram**: Các metric đo HTTP request bucket được ghi nhận chính xác.
- **Alert Rules**: Kiểm tra trạng thái rules file hoàn toàn khỏe mạnh.

## 11. Baseline / Rocchio Metrics & Delta
Đọc trực tiếp từ `evaluation/result.json` mới nhất:
- **Baseline NDCG@5**: 0.0377
- **Rocchio NDCG@5**: 0.8177
- **Delta NDCG@5**: +0.78
- **Delta HR@5**: +0.78
- **Delta MRR**: +0.76

## 12. Technical Debt Còn Lại
- **Bundle Size**: Frontend build bundle vẫn lớn hơn 800 kB. Cần thiết lập Lazy Loading.
- **Algorithm Validation**: Rocchio chỉ mới được chứng minh trên benchmark nhân quả giả lập (synthetic causal benchmark), chưa có Semantic Embeddings thật.

## 13. Khuyến nghị
- **Production Deploy & Human UAT**: Chưa thực hiện. Hệ thống mới được xác thực ở mức độ Local Release. Cần triển khai lên cloud (VPS/AWS) với TLS Offloading (HTTPS) và để người dùng thực tế sử dụng.
- Chưa có nhãn dán đánh giá từ phía chuyên gia nhân sự (human-reviewed production labels).

## 14. KẾT LUẬN CUỐI CÙNG
Local release verification PASS
