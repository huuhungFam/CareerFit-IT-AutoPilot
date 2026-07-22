## 11A. Candidate CV và Fixed Profile
# UI
- http://127.0.0.1:5173/candidate/upload?tab=manual thì phần "Cấp bậc nó còn thiếu level intern và fresher. Các cấp bậc cần được theo thứ tự tăng dần.
- Thực hiện theo hướng dẫn OK không có lỗi.
# API
PS C:\CODING\Thesis> Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/candidates/me" -Headers $candidateHeaders
Invoke-RestMethod:                                                                                                      
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "details": null,
    "fieldErrors": null
  },
  "meta": {
    "requestId": "7784e0a5-b77d-40b8-b7d7-efd3d1c28c11"
  }
}
PS C:\CODING\Thesis> Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/candidates/me/cvs" -Headers $candidateHeaders
Invoke-RestMethod:                                                                                                      
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "details": null,
    "fieldErrors": null
  },
  "meta": {
    "requestId": "32af748b-95c6-446c-87a4-bf0510c554dc"
  }
}
## 11B. Recruiter tạo JD
- Tôi làm theo thấy thấy tạo job thành công.
- Điều chỉnh: khi nhập tiền tệ tự động thêm dấu "," sau 3 số 0. Và hiển thị mặc định là VND đi đừng để dollar.
- Tôi thấy nó chạy còn phần Kết quả mong đợi thì tôi không biết kiểm tra sao. Có gì bạn tự động chạy test rồi kiểm  tra lại giúp tôi phần này.