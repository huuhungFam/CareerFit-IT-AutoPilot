# Báo Cáo Đánh Giá Thuật Toán (Algorithm Evaluation Report)

*Lưu ý: Đây là báo cáo được tạo ra dựa trên bộ dữ liệu kiểm soát (Synthetic Benchmark). Các kết quả dưới đây nhằm mục đích chứng minh thuật toán Rocchio hoạt động đúng về mặt nhân quả (Causal Scenario) khi hệ thống tiếp nhận feedback, chứ không phản ánh chất lượng đánh giá cuối cùng trên dữ liệu Production hữu cơ.*

## 1. Thông Tin Dataset (Controlled Dataset)

- **Số lượng Job**: 50 (Đa dạng domain: Backend, Frontend, Data, DevOps, QA, Security, Mobile).
- **Số lượng CV**: 100 CV duy nhất. Mỗi job có đúng 2 positive CV (`_0`: train positive, `_1`: holdout positive).
- **Tổng số Pair đánh giá**: 600 pairs.
- **Latent Skills (Kỹ năng tiềm ẩn)**: Để chứng minh thuật toán Rocchio có thể học hỏi, bộ sinh dữ liệu cố tình thiết kế các CV Positive chứa một "kỹ năng tiềm ẩn" (Ví dụ: `Redis` cho Backend, `Kubernetes` cho DevOps) mà Job Description ban đầu KHÔNG hề đề cập.

## 2. Kịch Bản Nhân Quả (Causal Scenario)

1. **Baseline**: CV Holdout có chứa "latent skill" nhưng chưa được Job Description đề cập, do đó điểm số ban đầu (Baseline) chỉ ở mức khá, chưa thể hiện sự vượt trội so với các CV khác có cùng Keyword thông thường.
2. **Feedback Loop**: Hệ thống nhận feedback `GOOD_MATCH` từ CV Train (cũng chứa latent skill này).
3. **Rocchio Update**: Thuật toán Rocchio trích xuất Vector của CV Train, nhận thấy "latent skill" xuất hiện với tần suất cao. Rocchio cập nhật Vector của Job, cộng thêm trọng số cho "latent skill".
4. **Kết quả**: Khi chấm điểm lại (Recompute) với Job Vector mới, CV Holdout lập tức được TĂNG điểm số (Score/Rank) do khớp được "latent skill" mà hệ thống vừa học được.

## 3. Kết Quả Benchmark

*Số liệu được sinh ra tự động từ `AlgorithmEvaluatorTest` sau khi chạy `mvn test`.*

- **Sự cải thiện của Holdout CV**: Hệ thống ghi nhận các metric của Holdout CV tăng trưởng rõ rệt so với Baseline sau khi có feedback từ CV Train:
  - **Baseline nDCG@5**: khoảng `0.037737`.
  - **Rocchio nDCG@5**: khoảng `0.817737`.
  - **Delta nDCG@5**: `+0.78`.
  - **Delta HitRate@5**: `+0.78`.
  - **Delta MRR**: khoảng `+0.764862`.
- **Idempotency**: Thuật toán đã được thiết kế lại để tính toán Rocchio dựa trên `tfidfVectorJson` gốc và toàn bộ lịch sử feedback, nhằm tránh hiện tượng "cumulative drift" (trôi lệch cộng dồn sai lệch khi tính lại nhiều lần).

## 4. Hạn chế (Limitations)

- **Vector Representation**: Hiện tại hệ thống chỉ mới sử dụng mô hình Bag-of-Words / TF-IDF. Các mô hình Semantic Vectors (như Word2Vec, BERT) sẽ được tích hợp trong các pha nghiên cứu tiếp theo.
- **Tính tự nhiên của Dữ liệu**: Dữ liệu là Synthetic, thiếu sự ngẫu nhiên của các Recruiter thực tế. Do đó, mặc dù ROCCHIO chứng minh được việc *có học hỏi* từ Feedback, tỉ lệ tăng trưởng chính xác trên Production cần phải được đo đạc lại qua hệ thống A/B Testing hoặc phân tích log người dùng.
