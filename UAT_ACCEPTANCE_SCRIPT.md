# Kịch Bản Nghiệm Thu Người Dùng (UAT Acceptance Script)

Tài liệu này hướng dẫn người dùng cuối (Candidate, Recruiter, Admin) thực hiện các bước kiểm tra (User Acceptance Testing) đối với hệ thống CareerFit IT AutoPilot.

## Quy ước chung

- **Status**: Ghi lại một trong các trạng thái: `PASS`, `FAIL`, hoặc `PENDING_USER_ACCEPTANCE` (khi chưa được nghiệm thu).
- **Severity**: Nếu Fail, đánh giá mức độ nghiêm trọng: `P0` (Blocker), `P1` (Nghiêm trọng), `P2` (Nhẹ).
- Trước khi thực hiện, đảm bảo ứng dụng Frontend, Backend và Database (PostgreSQL) đang chạy bình thường.

---

## 1. Luồng Người Ứng Tuyển (Candidate)

### Test ID: CND-01 - Tải lên CV và xem danh sách Job Matches
**Precondition**: Có sẵn 1 file PDF CV hợp lệ.
**Steps**:
1. Đăng nhập vào hệ thống với tài khoản Candidate.
2. Điều hướng đến trang **Profile / CV**.
3. Upload file PDF CV.
4. Chờ hệ thống Parsing và Scoring.
5. Điều hướng đến trang **Matches**.
**Expected Result**:
- CV được parse thành công, trích xuất được kỹ năng.
- Danh sách Job Matches được hiển thị, sắp xếp theo Score (từ cao xuống thấp).
**Actual Result**: 
**Status**: PENDING_USER_ACCEPTANCE *(Note: Flow đăng nhập đã được automated qua Playwright, phần Upload CV cần user nghiệm thu tay)*
**Severity**: 

### Test ID: CND-02 - Gửi yêu cầu ứng tuyển (Apply)
**Precondition**: Có ít nhất 1 Job Match trên 50%.
**Steps**:
1. Từ danh sách Job Matches, chọn một Job.
2. Bấm nút **Apply**.
**Expected Result**:
- Trạng thái Job chuyển thành `APPLIED`.
- Nhận được thông báo thành công.
**Actual Result**: 
**Status**: PENDING_USER_ACCEPTANCE
**Severity**: 

---

## 2. Luồng Nhà Tuyển Dụng (Recruiter)

### Test ID: REC-01 - Đăng tin tuyển dụng (Job Posting)
**Precondition**: Đăng nhập với tài khoản Recruiter hợp lệ.
**Steps**:
1. Điều hướng đến trang **Jobs** -> **Create New Job**.
2. Nhập các thông tin bắt buộc: Title, JD (Original Text), Seniority, Location, Salary Mode.
3. Bấm **Save / Publish**.
**Expected Result**:
- Job mới được tạo thành công và xuất hiện trong danh sách Active Jobs.
**Actual Result**: 
**Status**: PENDING_USER_ACCEPTANCE *(Note: Form access đã được automated qua Playwright)*
**Severity**: 

### Test ID: REC-02 - Xử lý vòng đời ứng viên
**Precondition**: Đã có ít nhất 1 Candidate Apply vào Job của Recruiter.
**Steps**:
1. Vào chi tiết Job, xem danh sách **Applicants**.
2. Approve hoặc Reject một application test.
3. Với Candidate chưa apply nhưng đủ điều kiện, kiểm tra action Invite.
**Expected Result**:
- Application status hoặc invitation được lưu thành công.
- Recruiter không thấy Rocchio feedback controls; Candidate feedback endpoint trả `403` với token Recruiter.
- Ranking không bị thay đổi chỉ vì cập nhật application lifecycle.
**Actual Result**: 
**Status**: PENDING_USER_ACCEPTANCE
**Severity**: 

---

## 3. Luồng Quản Trị Viên (Admin)

### Test ID: ADM-01 - Quản lý Tài Khoản
**Precondition**: Đăng nhập với tài khoản Admin.
**Steps**:
1. Điều hướng đến bảng điều khiển Admin (Admin Dashboard).
2. Tìm một tài khoản User và Suspend.
**Expected Result**:
- Trạng thái User chuyển sang Suspended. User đó không thể đăng nhập.
**Actual Result**: 
**Status**: PENDING_USER_ACCEPTANCE *(Note: Access trang Dashboard/Users đã được automated qua Playwright)*
**Severity**: 

---

## Form Xác Nhận Nghiệm Thu (Sign-off)

- **Người thực hiện test**: 
- **Ngày thực hiện**: 
- **Xác nhận**: [ ] Bằng việc đánh dấu, tôi xác nhận đã thực hiện UAT và cập nhật trạng thái thực tế.
