# Kế hoạch rút gọn nội dung bảng Use Case

Ngày cập nhật: 11/08/2026  
Trạng thái: Đã thực hiện ngày 11/08/2026.

## Kết quả thực hiện

- Đã rút gọn nội dung trong đúng 14 bảng Use Case.
- Số từ trong các trường được chỉnh sửa giảm từ 6.561 xuống 4.549, tương đương 30,7%.
- Báo cáo giảm từ 125 xuống 116 trang sau khi Word cập nhật pagination.
- Phần Use Case giảm khoảng 9 trang.
- Không thay đổi đoạn văn ngoài bảng, bảng khác, Use Case ID, Use Case Name, actor, priority, heading, caption, hình hoặc sơ đồ.
- Tất cả bảng vẫn có header và 13 trường; toàn bộ nội dung bảng vẫn là Times New Roman 13 pt.
- Đã cập nhật TOC/List of Tables theo pagination mới và kiểm tra trực quan toàn bộ trang Use Case.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260811-shortened-usecases.docx`.
- Script: `scripts/shorten-usecase-tables-20260811.py`.

## 1. Phạm vi cố định

Chỉ rút gọn nội dung bên trong 14 bảng đặc tả Use Case.

Giữ nguyên hoàn toàn:

- Đủ 14 Use Case từ `UC-01` đến `UC-14`.
- Thứ tự Candidate, Recruiter, Shared và Administrator hiện tại.
- Use Case ID và Use Case Name.
- Primary Actor(s), Secondary Actor(s) và Priority.
- Cấu trúc 13 trường của mỗi bảng.
- Heading 1.5.1–1.5.14.
- Caption Table 1.5–Table 1.18.
- Vị trí các bảng, hình và sơ đồ.
- Figure 1.2 và NOTE hiện có.
- Functional Requirements, các chương khác, Appendix và traceability.
- Font, cỡ chữ, lề, line spacing, table style, caption style và các thiết lập định dạng Word hiện tại. Không chủ động chèn/xóa manual page break, nhưng chấp nhận pagination tự thay đổi do nội dung bảng ngắn hơn.

Không thực hiện:

- Không chuyển bảng sang Appendix.
- Không tạo bảng catalogue thay thế.
- Không gộp, tách hoặc xóa Use Case.
- Không đổi ID hoặc actor.
- Không thêm chức năng.
- Không thay đổi implementation.
- Không rút gọn nội dung ngoài các bảng Use Case.

## 2. Hiện trạng cần xử lý

- Mười bốn bảng hiện có khoảng 6.561 từ trong các trường nội dung nghiệp vụ.
- Phần Use-Case Analysis chiếm khoảng 37 trang.
- Nguồn dài chủ yếu nằm ở Alternative Flows, Exception Flows, Preconditions và Postconditions.
- Một số điều kiện được nhắc lại ở nhiều trường của cùng một bảng.
- Một số nhánh có quá nhiều bước cho một empty state, validation failure hoặc thao tác phụ.

Mục tiêu dự kiến:

- Giảm tổng nội dung bảng xuống khoảng 4.200–4.700 từ.
- Giảm khoảng 28–36% số từ trong bảng.
- Dự kiến tiết kiệm khoảng 8–13 trang tùy Word phân trang.
- Không làm mất business rule hoặc khả năng truy vết.

## 3. Quy tắc rút gọn chung

### Description

- Giữ 1–2 câu.
- Chỉ nêu actor, mục tiêu nghiệp vụ và kết quả chính.
- Không liệt kê lại các hành động đã có trong Main/Alternative Flow.

### Preconditions

- Chỉ giữ điều kiện phải đúng trước khi Use Case bắt đầu.
- Không đặt vào Preconditions điều kiện được kiểm tra tự nhiên trong lúc thực thi.
- Không lặp account active, authenticated và ownership nhiều lần nếu có thể diễn đạt ngắn trong cùng một dòng.
- Không lặp một điều kiện đồng thời trong Preconditions và Exception Flows, trừ khi điều kiện có thể thay đổi trong quá trình thực hiện.

### Trigger

- Chỉ dùng một câu.
- Không nhắc lại actor, authentication hoặc Preconditions không cần thiết.

### Main Flow

- Tập trung vào normal successful path.
- Mục tiêu khoảng 6–10 bước cho mỗi Use Case.
- Gộp các bước nhỏ liên tiếp như mở trang, hệ thống tải dữ liệu và hiển thị dữ liệu khi chúng không đại diện cho business rule riêng.
- Không mô tả controller, repository, persistence, transaction, OCR, vectorization, TF-IDF, cosine, Rocchio, scheduler hoặc SMTP.

### Alternative Flows

- Chỉ giữ các lựa chọn hợp lệ làm thay đổi đường đi nghiệp vụ.
- Không tạo nhánh riêng chỉ để mô tả filter, sorting, pagination hoặc empty state đơn giản nếu có thể ghi trong 1–2 câu.
- Gộp các thao tác gần nhau khi cùng actor, cùng mục tiêu và cùng kết quả.
- Vẫn giữ reference đến Main Flow step khi cần.

### Exception Flows

- Giữ lỗi nghiệp vụ quan trọng và actor có thể quan sát.
- Gộp các validation failure có cùng thông báo và cùng kết quả.
- Không ghi generic network, database, server, repository hoặc transaction error.
- Không biến mọi trường hợp `not found` thành một chuỗi ba bước nếu một câu đã đủ rõ.

### Postconditions

- Chỉ giữ trạng thái nghiệp vụ cuối cùng.
- Tối đa 2–3 success postconditions và 1–2 minimal guarantees.
- Không kể lại Main Flow.
- Gộp các guarantee có cùng ý nghĩa “business state remains unchanged”.

### Related Use Cases

- Chỉ giữ các quan hệ nghiệp vụ trực tiếp.
- Mỗi Use Case một dòng, không giải thích dài.

## 4. Nội dung bắt buộc phải giữ

### UC-01 — Manage Career Profile

- Candidate Profile và Portfolio.
- Upload/manual CV, review, edit và confirm.
- Default CV và delete CV.
- `SCORING_DONE` và trường hợp không có eligible Job dưới dạng kết quả, không biến thành workflow xem Matching.

### UC-02 — Explore Jobs

- Candidate là primary actor; Guest là secondary context.
- Search/filter và xem Job detail.
- Chỉ hiển thị Job đủ điều kiện công khai.

### UC-03 — Manage Job Applications

- Apply, history, withdraw và invitation response.
- Duplicate Application được kiểm tra trong execution.
- Job/CV eligibility quan trọng.

### UC-04 — Provide Matching Feedback

- Feedback mới và thay đổi Feedback trước đó.
- Ownership và supported Feedback type.
- Kết quả có thể ảnh hưởng later personalized ranking.

### UC-05 — Review Personalized Career Insights

- CV–Job Matching và profile/preference Job Recommendation là hai workflow độc lập.
- Candidate analytics là view/alternative riêng.
- Missing profile, recommendation hoặc analytics data là limited-data/empty state.

### UC-06 — Manage AutoFit

- Threshold 50–100.
- Enable, pause/resume và default `SCORING_DONE` CV.
- Manual execution và system-configured automatic execution.
- A6 save configuration without running.
- ACTIVE Job, duplicate check và giới hạn tối đa ba auto-application mỗi run.
- Không đưa quota, cooldown, quiet hours hoặc notification preference vào AutoApply eligibility.

### UC-07 — Respond Through Actionable Email

- Confirm-then-POST behavior.
- Matching Feedback và Recruiter invitation response.
- Redeemed, expired, invalid hoặc unavailable resource.
- Không mô tả `VIEW_JOB` và `UNSUBSCRIBE_DIGEST` như successful behavior.

### UC-08 — Manage Employer Profile and Job Postings

- Employer Profile.
- Create/update/publish/draft/close/delete là flows trong cùng Use Case.
- Happy path kết thúc bằng ACTIVE Job.

### UC-09 — Review and Process Applicants

- Applicant list/detail và decision.
- Recruiter ownership.
- BANNED CV ngăn thay đổi Application decision.

### UC-10 — Manage Talent Pool and Invitations

- High/Potential CV discovery.
- Bookmark, invitation và invitation withdrawal.
- Job ownership, ACTIVE Job và duplicate state.

### UC-11 — Review Recruitment Analytics

- Recruitment analytics và supported filter/view.
- Không đưa notification-preference configuration vào detailed Use Case.

### UC-12 — Report Suspicious Recruitment Content

- Candidate reporting ACTIVE Job.
- Recruiter reporting a visible CV through an owned Job.
- Hai đường đi phải còn phân biệt được.
- Duplicate pending report và visibility/ownership rules.

### UC-13 — Administer Platform Access and Job Visibility

- Suspend/activate User.
- Hide/restore Job.
- Self-suspension restriction và allowed Job transitions.

### UC-14 — Review and Resolve Content Reports

- Review grouped report case.
- Dismiss và ban target.
- Empty queue, unavailable target và no pending report.
- Job/CV ban state và report resolution state.

## 5. Mục tiêu độ dài từng bảng

| Use Case | Hiện tại | Mục tiêu | Mức giảm dự kiến |
|---|---:|---:|---:|
| UC-01 | khoảng 940 từ | 500–560 | 40–47% |
| UC-02 | 542 | 320–360 | 34–41% |
| UC-03 | 672 | 390–440 | 35–42% |
| UC-04 | 305 | 250–285 | 7–18% |
| UC-05 | 449 | 320–360 | 20–29% |
| UC-06 | 487 | 350–400 | 18–28% |
| UC-07 | 507 | 350–400 | 21–31% |
| UC-08 | 548 | 360–410 | 25–34% |
| UC-09 | 343 | 270–310 | 10–21% |
| UC-10 | 440 | 310–350 | 20–30% |
| UC-11 | 265 | 210–235 | 11–21% |
| UC-12 | 356 | 270–310 | 13–24% |
| UC-13 | 376 | 285–325 | 14–24% |
| UC-14 | 331 | 260–295 | 11–21% |

UC-04, UC-05, UC-06 và actionable email UC-07 được rút nhẹ hơn về business rules. UC-14 hiện là moderation, không phải actionable email sau lần đổi ID ngày 10/08/2026.

## 6. Cách thực hiện sau khi được duyệt

### Bước 1 — Soạn ngoài Word

1. Trích 14 bảng sang bản làm việc Markdown.
2. Viết lại UC-01, UC-02 và UC-03 trước.
3. So sánh bản cũ và bản rút gọn để bảo đảm không mất rule.
4. Trình ba bảng mẫu cho người dùng duyệt mức độ rút gọn.

### Bước 2 — Viết UC-04 đến UC-14

1. Giữ đúng writing style đã duyệt.
2. Không tăng số Alternative/Exception Flow.
3. Kiểm tra mọi hành vi nhạy cảm với implementation hiện tại.
4. Kiểm tra Related Use Cases theo ID mới.

### Bước 3 — Áp dụng vào Word

Chỉ thực hiện khi người dùng xác nhận:

1. Tạo backup.
2. Thay nội dung trong các ô của 14 bảng.
3. Không di chuyển bảng hoặc sửa nội dung ngoài bảng.
4. Giữ nguyên style, font 13 và caption.
5. Refresh page number, TOC và List of Tables chỉ khi pagination thay đổi.

### Bước 4 — QA

1. So sánh đủ 13 trường và 14 ID.
2. Kiểm tra các business rule bắt buộc ở Mục 4.
3. Kiểm tra caption vẫn ở trên table và figure caption vẫn ở dưới hình.
4. Render toàn bộ trang chứa Use Case để kiểm tra row split, blank page và heading/caption bị tách.
5. Báo số từ và số trang giảm thực tế.

## 7. Tiêu chí hoàn thành

- Word chỉ thay đổi nội dung bên trong 14 bảng Use Case.
- Không thay đổi cấu trúc hoặc nội dung khác.
- Vẫn đủ 14 bảng, 13 trường và đúng ID/tên/actor.
- Không mất business rule đã xác minh.
- Alternative/Exception Flow ngắn hơn nhưng vẫn phân biệt valid alternative với actual error.
- Không có nội dung kỹ thuật nội bộ không cần thiết.
- Tổng nội dung bảng giảm tối thiểu khoảng 25%, mục tiêu 28–36%.
- Không phát sinh lỗi định dạng hoặc tham chiếu.
