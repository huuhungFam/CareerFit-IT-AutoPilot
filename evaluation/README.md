# Algorithm Evaluation Benchmark

## Controlled Dataset
File `controlled-dataset.json` chứa dữ liệu benchmark (synthetic) do script `generate_dataset.mjs` tạo ra. Dữ liệu này bao gồm:
- **50 Jobs**: Thuộc nhiều lĩnh vực (Backend, Frontend, Mobile...).
- **60 Positive CVs**: Gồm Train CVs và Holdout CVs. Các CV này được cố tình chèn thêm "latent skills" (các kỹ năng tiềm ẩn không có trong JD ban đầu) để phục vụ cho bài test học máy nhân quả (Causal test) của thuật toán Rocchio.
- **Negative CVs**: Các CV lệch lĩnh vực hoặc chuyên môn được phân bổ ngẫu nhiên để test khả năng lọc nhiễu của thuật toán TF-IDF.

*Lưu ý: Dữ liệu hoàn toàn bằng tiếng Anh và có cấu trúc lý tưởng hóa, không chứa nhiễu OCR hay ngôn ngữ phức tạp. Mục đích chính là chứng minh luồng Rocchio Feedback Loop.*

## Metrics
- **nDCG@K**: Normalized Discounted Cumulative Gain, đánh giá thứ tự ranking của kết quả (CV nào relevance cao thì phải ở trên cùng).
- **Precision@K**: Độ chính xác ở top K, đếm số lượng CV relevant (relevance >= 2) trong top K chia cho K.
- **HitRate@K**: Tỷ lệ xuất hiện ít nhất một CV phù hợp trong top K.
- **MRR**: Mean Reciprocal Rank, vị trí trung bình của relevant CV đầu tiên.

## Chạy Benchmark
Evaluator đã được thiết kế thành Integration Test trong backend Spring Boot (`AlgorithmEvaluatorTest.java`) để tái sử dụng toàn bộ pipeline thật của production.
Cách chạy:
```bash
cd Backend/careerfit-backend
./mvnw.cmd test -Dtest=AlgorithmEvaluatorTest
```
Kết quả đo lường (Baseline và Sau Rocchio Feedback) sẽ được xuất ra file `evaluation/result.json`.
