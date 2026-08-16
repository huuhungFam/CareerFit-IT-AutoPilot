# Phase 5 — Duplicate job protection và internal/imported ownership flow

Chỉ bắt đầu khi Checkpoint 4 PASS. Đọc prompt 11 gốc và reports trước.

## Mục tiêu

Bảo vệ job mới khỏi duplicate và làm rõ application flow của internal versus imported jobs, không thay đổi baseline corpus hay company model.

## Công việc

1. Exact duplicate fingerprint cho job mới dựa trên normalized canonical company/title/location/employment type/full description hash.
2. Check ở publish/activation, không chỉ draft edit.
3. Block exact duplicate trong phạm vi same recruiter/canonical company phù hợp account-centric model.
4. Nếu thêm DB support, không tạo constraint làm fail vì imported baseline hiện hữu.
5. Near duplicate: threshold documented/deterministic, trả warning/details, explicit confirmation cho phép tiếp tục và không hard-block ba demo jobs có skill overlap.
6. Internal/imported behavior:
   - ba live jobs là internal và có full apply/recruiter management;
   - imported jobs giữ owner/source URL;
   - nếu imported job không nên internal-apply, route rõ đến source URL bằng minimal source/application-mode distinction;
   - không reassign imported jobs và không bật hàng trăm imported logins.
7. Ownership guards: live recruiter chỉ thấy applications/feedback cho job của họ; cross-owner imported job/application access bị chặn.

## Tests bắt buộc

- exact duplicate blocked on activation;
- draft có thể tồn tại nhưng duplicate publish fails cleanly;
- normalization variants collide đúng;
- near duplicate warning và confirm override;
- ba intended overlapping demo jobs được phép;
- internal apply xuất hiện cho owning recruiter;
- imported source routing đúng;
- cross-owner applications/feedback denied;
- baseline imported count/ownership unchanged.

Không reset DB chính, không tạo live accounts thật và không gửi mail thật.

## Deliverable

Tạo `prompt-gemini/11-10-duplicate-protection-and-internal-ownership-report.md` với fingerprint design, API/UI evidence, tests và baseline read-only comparison. Dừng sau report; không chạy Phase 6.

