# Prompt dành cho Gemini

Thư mục này chứa các prompt hoàn chỉnh để giao cho agent AI khác thực hiện công việc trong dự án CareerFit.

## Cách dùng

1. Mỗi yêu cầu nên được viết thành một file Markdown riêng.
2. Sao chép toàn bộ nội dung file prompt và gửi cho agent tại thư mục gốc của repository.
3. Agent phải tự khảo sát code hiện tại, triển khai, chạy kiểm thử và báo cáo bằng bằng chứng thực tế.
4. Không chấp nhận kết luận “đã xong” nếu chưa chạy các kiểm tra phù hợp hoặc chưa giải thích rõ vì sao không thể chạy.

File `00-master-prompt-template.md` là khuôn mẫu dùng để tạo prompt mới. Các phần nằm trong dấu `{{...}}` phải được thay bằng yêu cầu cụ thể trước khi giao cho agent.

## Workflow Demo Mode hai vai trò

Yêu cầu tổng nằm tại `11-default-demo-mode-and-live-two-role-workflow.md`.

Không giao toàn bộ yêu cầu này cho một agent chạy một lượt. Bắt đầu từ `11-00-phased-workflow-index.md`, thực hiện tuần tự `11-01` đến `11-13`. Sau mỗi phase implementation phải chạy checkpoint tương ứng và chỉ đi tiếp khi report ghi `VERDICT: PASS`. Reset phá dữ liệu chỉ được thực hiện trong `11-12` sau khi người dùng xác nhận rõ ràng.

## Quy ước đặt tên

```text
NN-ten-tac-vu-ngan-gon.md
```

Ví dụ: `01-fix-candidate-saved-jobs.md`.
