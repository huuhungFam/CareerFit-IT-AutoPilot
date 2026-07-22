# Thuật toán chính trong CareerFit

Tài liệu này giải thích thuật toán lõi của project CareerFit theo hướng dễ hiểu, bám sát implementation hiện tại trong backend. Mục tiêu của thuật toán là trả lời ba câu hỏi:

1. CV của ứng viên phù hợp với JD/tin tuyển dụng đến mức nào?
2. Vì sao hệ thống cho rằng CV đó phù hợp?
3. Hệ thống có thể học thêm từ feedback của người dùng hay không?

Về bản chất, CareerFit không dùng một thuật toán đơn lẻ, mà dùng một chuỗi thuật toán/kỹ thuật phối hợp với nhau. Phần tính điểm chính là TF-IDF + cosine similarity; phần học từ feedback là Rocchio; các phần còn lại là bước hỗ trợ để dữ liệu sạch hơn và kết quả dễ giải thích hơn.

## 1. Tổng quan các thuật toán/kỹ thuật được dùng

| Thành phần | Thuật toán/kỹ thuật | Vai trò trong hệ thống | Output chính |
|---|---|---|---|
| Tiền xử lý văn bản | Text normalization, tokenization, stopword removal | Làm sạch CV/JD để chỉ giữ lại các token có ý nghĩa | Danh sách token |
| Nhận diện ngôn ngữ | Heuristic đếm ký tự tiếng Việt có dấu | Chọn bộ stopword phù hợp cho tiếng Việt hoặc tiếng Anh | `vi` hoặc `en` |
| Biểu diễn văn bản | TF-IDF | Biến CV/JD thành vector trọng số từ khóa | `Map<String, Double>` |
| Tính độ phù hợp | Cosine similarity | Đo mức giống nhau giữa vector CV và vector JD/job | Điểm thô `0.0 - 1.0` |
| Chuẩn hóa điểm | Score normalization | Đổi cosine sang thang điểm dễ hiểu hơn | Điểm `0 - 100` |
| Phân loại kết quả | Threshold-based labeling | Gán nhãn LOW/MEDIUM/HIGH theo ngưỡng cấu hình | `LOW`, `MEDIUM`, `HIGH` |
| Nhận diện tiềm năng | Rule-based potential heuristic | Bắt các CV chưa đạt HIGH nhưng có tín hiệu chuyển đổi tốt | `isPotential = true/false` |
| Giải thích kết quả | Top shared weighted terms | Chọn các kỹ năng chung quan trọng để hiển thị lý do match | `matchReasons` |
| Học từ feedback | Rocchio relevance feedback | Cập nhật vector job dựa trên CV được đánh giá tốt/xấu | `learnedProfileVectorJson` |
| Tính lại theo lô | Batch recompute/upsert | Tính lại matching khi CV/JD/feedback thay đổi | Bản ghi `Matching` mới hoặc đã cập nhật |

Nói ngắn gọn:

- TF-IDF trả lời: "Từ khóa nào quan trọng trong CV/JD?"
- Cosine similarity trả lời: "CV và JD giống nhau bao nhiêu theo các từ khóa quan trọng?"
- Threshold labeling trả lời: "Điểm này nên xem là LOW, MEDIUM hay HIGH?"
- Potential heuristic trả lời: "Ứng viên này chưa quá khớp, nhưng có tiềm năng không?"
- Rocchio trả lời: "Sau feedback, job nên ưu tiên thêm/bớt kỹ năng nào?"

Pipeline tổng thể:

```text
CV/JD raw text
  -> chuẩn hóa văn bản
  -> tách token
  -> loại stopword
  -> tạo vector TF-IDF
  -> tính cosine similarity
  -> đổi điểm sang thang 0-100
  -> gán nhãn LOW/MEDIUM/HIGH
  -> phát hiện potential
  -> lưu matching
  -> học lại bằng Rocchio khi có feedback
```

Các class chính:

- `TextNormalizationService`: chuẩn hóa văn bản tiếng Việt/tiếng Anh.
- `TfIdfService`: tạo vector TF-IDF và tính cosine similarity.
- `ScoringService`: tính điểm, gán nhãn, phát hiện potential, tạo lý do matching.
- `MatchingService`: điều phối việc tính matching giữa CV và job.
- `FeedbackService`: nhận feedback từ người dùng.
- `RocchioService`: cập nhật learned vector của job từ feedback.

## 2. Ý tưởng tổng quát

Bài toán matching CV-JD là bài toán so sánh hai văn bản. Một JD có thể viết:

```text
Cần Java Developer có kinh nghiệm Spring Boot, PostgreSQL, Docker.
```

Trong khi CV có thể viết:

```text
Backend engineer, 2 năm làm việc với Java, Spring Boot, REST API, PostgreSQL.
```

Hai đoạn này không giống nhau hoàn toàn từng câu chữ, nhưng chia sẻ nhiều kỹ năng quan trọng. Vì vậy hệ thống không so sánh nguyên văn, mà biến mỗi văn bản thành một vector kỹ năng/từ khóa rồi so sánh hai vector đó.

CareerFit chọn TF-IDF và cosine similarity cho bước scoring chính vì:

- Dễ giải thích khi bảo vệ luận văn: điểm cao vì có các từ khóa chung quan trọng.
- Không cần mô hình AI lớn hoặc tập dữ liệu huấn luyện lớn.
- Tạo được `matchReasons` như `java`, `spring`, `postgresql` để UI hiển thị lý do.
- Dễ kiểm thử bằng unit test với các vector giả lập.

Một cách dễ hình dung là: hệ thống không đọc CV như con người, mà chuyển CV/JD thành "bảng trọng số kỹ năng". Sau đó nó so sánh hai bảng này để xem phần giao nhau có mạnh hay không.

## 3. Chuẩn hóa văn bản

Trước khi tính điểm, CV và JD phải được làm sạch. Văn bản thực tế thường có HTML, dấu câu, ký tự đặc biệt, chữ hoa/chữ thường lẫn lộn, hoặc nhiều từ phổ biến không giúp phân biệt năng lực.

`TextNormalizationService` xử lý theo các bước:

1. Xóa HTML tag.
2. Xóa ký tự đặc biệt, nhưng vẫn giữ chữ tiếng Việt có dấu.
3. Chuyển toàn bộ về chữ thường.
4. Tách token theo khoảng trắng.
5. Loại stopword theo ngôn ngữ.
6. Loại token quá ngắn.

Ví dụ:

```text
Raw:
Senior Java Developer with Spring Boot, PostgreSQL and Docker experience.

Tokens:
senior, java, developer, spring, boot, postgresql, docker, experience
```

Với tiếng Việt, service có heuristic phát hiện ngôn ngữ dựa trên số lượng ký tự tiếng Việt có dấu. Nếu văn bản có nhiều ký tự có dấu, hệ thống xem là `vi`; ngược lại mặc định là `en`.

Điểm cần nhớ: nếu bước chuẩn hóa tạo ra token rỗng, CV không thể scoring và sẽ bị đánh dấu `FAILED`.

## 4. Vector TF-IDF

Sau khi có danh sách token, hệ thống tạo vector TF-IDF. Đây là cách gán trọng số cho từng từ khóa trong văn bản.

Công thức trong project:

```text
TF(t, d)      = số lần token t xuất hiện trong document d / tổng số token của d
IDF(t)        = log(1 + N / (1 + df(t)))
TF-IDF(t, d)  = TF(t, d) * IDF(t)
```

Trong đó:

- `t`: một token, ví dụ `java`.
- `d`: một document, có thể là CV hoặc JD.
- `N`: số document trong seed corpus.
- `df(t)`: số document trong seed corpus có chứa token `t`.

### 4.1. TF dùng để làm gì?

TF đo mức độ một từ xuất hiện trong chính document đang xét.

Nếu CV có 100 token và `java` xuất hiện 5 lần:

```text
TF(java, CV) = 5 / 100 = 0.05
```

Token xuất hiện nhiều hơn trong CV/JD sẽ có trọng số nền cao hơn.

### 4.2. IDF dùng để làm gì?

IDF giúp giảm trọng số của từ quá phổ biến và tăng trọng số của từ đặc trưng.

Ví dụ:

- `developer` xuất hiện trong rất nhiều CV/JD nên không quá đặc trưng.
- `kubernetes`, `postgresql`, `springboot` đặc trưng hơn nên nên có sức nặng lớn hơn.

Implementation hiện tại dùng một seed corpus tĩnh gồm các nhóm thuật ngữ IT như backend, frontend, database, cloud, DevOps, security, AI/data, soft skills, seniority và một số thuật ngữ tiếng Việt.

IDF được tính một lần khi backend khởi động. Điều này làm điểm matching ổn định: thêm CV/JD mới không làm toàn bộ IDF thay đổi đột ngột.

### 4.3. Vector được lưu như thế nào?

Sau TF-IDF, mỗi document được biểu diễn bằng map `token -> weight`:

```json
{
  "java": 0.128,
  "spring": 0.095,
  "postgresql": 0.083,
  "docker": 0.072
}
```

Trong database:

- CV lưu vector ở `CV.extractedTermsJson`.
- Job lưu vector gốc ở `Job.tfidfVectorJson`.
- Nếu job đã học từ feedback, vector học được lưu ở `Job.learnedProfileVectorJson`.

Điểm dễ nhầm: TF-IDF không "hiểu" ý nghĩa sâu như một mô hình ngôn ngữ. Nó chủ yếu hiểu theo token. Vì vậy `java` và `spring` khớp trực tiếp sẽ mạnh, còn các cụm đồng nghĩa nhưng khác chữ có thể không được bắt tốt nếu không có token chung.

## 5. Tính điểm bằng cosine similarity

Khi cần chấm điểm một cặp CV-JD, `ScoringService` lấy vector CV và vector job rồi tính cosine similarity:

```text
cosine(A, B) = (A · B) / (|A| * |B|)
```

Trong đó:

- `A · B`: tích vô hướng của hai vector.
- `|A|`, `|B|`: độ dài của từng vector.
- Kết quả nằm trong khoảng `0.0` đến `1.0`.

Nếu CV và JD có nhiều token chung với trọng số cao, tích vô hướng lớn và điểm cosine cao. Nếu ít token chung, điểm thấp.

Ví dụ đơn giản, chỉ xét ba token `java`, `spring`, `react`:

```text
CV vector:
java   = 0.6
spring = 0.4
react  = 0.0

JD vector:
java   = 0.5
spring = 0.5
react  = 0.0
```

Tích vô hướng:

```text
0.6*0.5 + 0.4*0.5 + 0.0*0.0 = 0.5
```

Độ dài vector:

```text
|CV| = sqrt(0.6^2 + 0.4^2) = sqrt(0.52)
|JD| = sqrt(0.5^2 + 0.5^2) = sqrt(0.50)
```

Cosine:

```text
0.5 / (sqrt(0.52) * sqrt(0.50)) ≈ 0.98
```

Backend đổi sang thang 100:

```text
normalizedScore = cosine * 100 ≈ 98.00
```

Nếu CV thiên về React/frontend còn JD thiên về Java/backend, hai vector có ít token chung hơn nên điểm sẽ thấp hơn.

## 6. Gán nhãn LOW, MEDIUM, HIGH

Sau khi có điểm 0-100, `ScoringService` gán nhãn theo cấu hình trong `application.yml`:

```yaml
app:
  matching:
    score-label-medium-max: 70.0
    score-label-high-max: 90.0
```

Logic thực tế trong code:

```text
score >= 90  -> HIGH
score >= 70  -> MEDIUM
score < 70   -> LOW
```

Lưu ý: tên property có chữ `max`, nhưng code đang dùng chúng như ngưỡng tối thiểu để vào nhãn cao hơn. Khi trình bày, nên nói theo hành vi thật của code: từ 90 trở lên là HIGH, từ 70 đến dưới 90 là MEDIUM, còn lại là LOW.

`rawScore` được lưu trên thang 0-1 với 6 chữ số thập phân. `normalizedScore` được lưu trên thang 0-100 với 2 chữ số thập phân.

## 7. Heuristic phát hiện potential

Không phải ứng viên nào chưa đạt điểm HIGH cũng nên bị bỏ qua. Một số CV có thể chưa khớp toàn bộ JD, nhưng vẫn có tín hiệu chuyển đổi tốt.

Ví dụ:

- CV: Junior Java Developer, có Java/Spring/PostgreSQL.
- JD: Mid Backend Developer, cần Java/Spring/Docker.

Điểm tổng thể có thể chưa đủ cao, nhưng ứng viên vẫn có tiềm năng phát triển lên role đó. Vì vậy project có cờ `isPotential`.

Điều kiện hiện tại:

1. Chỉ xét khi score nằm trong vùng trung gian:

```text
35 <= score < 75
```

2. Nếu CV có ít nhất 3 term quan trọng chung với job, đánh dấu potential.
3. Hoặc nếu seniority tương thích và có ít nhất 2 term chung, cũng đánh dấu potential.

Seniority tương thích được hiểu như:

- Cùng level.
- Junior có thể lên Mid.
- Mid có thể phù hợp Junior hoặc Senior.
- Senior có thể phù hợp Mid.

Điểm quan trọng: seniority không cộng trực tiếp vào điểm cosine. Nó chỉ hỗ trợ heuristic `isPotential`, giúp recruiter nhìn thấy ứng viên có tín hiệu chuyển đổi nghề nghiệp dù score chưa đạt HIGH.

Một điểm dễ nhầm khác: trong entity có enum `POTENTIAL`, nhưng logic scoring hiện tại không đổi `label` thành `POTENTIAL`. Code vẫn gán label theo điểm là `LOW`, `MEDIUM` hoặc `HIGH`, còn tiềm năng được lưu bằng cờ riêng `isPotential`. Khi giải thích, nên nói "potential là trạng thái bổ sung", không phải nhãn điểm chính.

## 8. Lý do matching

Hệ thống không chỉ trả về một con số. `ScoringService` còn tạo danh sách `matchReasons`.

Cách tạo:

1. Sắp xếp các term trong job vector theo trọng số TF-IDF giảm dần.
2. Lấy tối đa 5 term mà CV cũng có.
3. Nếu job có domain, thêm domain vào đầu danh sách.

Ví dụ:

```json
["Backend", "java", "spring", "postgresql", "docker"]
```

Danh sách này dùng để UI/email hiển thị lý do: CV này khớp với job vì cùng domain backend và cùng các kỹ năng Java, Spring, PostgreSQL, Docker.

## 9. Ví dụ xuyên suốt một lần matching

Giả sử JD có nội dung chính:

```text
Java Backend Developer, Spring Boot, PostgreSQL, Docker.
```

Sau chuẩn hóa, có thể còn:

```text
java, backend, developer, spring, boot, postgresql, docker
```

Giả sử CV có nội dung chính:

```text
Backend engineer with Java, Spring Boot, REST API, PostgreSQL experience.
```

Sau chuẩn hóa, có thể còn:

```text
backend, engineer, java, spring, boot, rest, api, postgresql, experience
```

Các token chung quan trọng gồm:

```text
backend, java, spring, boot, postgresql
```

TF-IDF biến hai danh sách token thành hai vector có trọng số. Cosine similarity đo độ giống nhau giữa hai vector đó. Vì hai bên chia sẻ nhiều token kỹ thuật quan trọng, điểm có thể cao. Sau đó:

```text
rawScore = 0.86
normalizedScore = 86.00
label = MEDIUM
matchReasons = ["Backend", "java", "spring", "postgresql", "boot"]
```

Nếu score nằm trong vùng trung gian và có đủ term quan trọng chung, `isPotential` cũng có thể được bật. Nhờ vậy recruiter không chỉ thấy con số 86, mà còn thấy vì sao CV này được đề xuất.

## 10. Vector job học được từ feedback

Ban đầu, job chỉ có vector gốc từ JD:

```text
Job.tfidfVectorJson
```

Sau khi có feedback, project có thể tạo vector học được:

```text
Job.learnedProfileVectorJson
```

Khi scoring, `ScoringService` ưu tiên `learnedProfileVectorJson` nếu vector này tồn tại và không rỗng. Nếu chưa có vector học được, service dùng `tfidfVectorJson` gốc.

Điều này giúp job không bị đóng cứng theo JD ban đầu. Nếu nhiều feedback cho thấy CV tốt thường có một kỹ năng mà JD không viết rõ, job có thể học thêm kỹ năng đó.

## 11. Rocchio: học từ feedback

`RocchioService` dùng thuật toán Rocchio để cập nhật vector job dựa trên feedback.

Công thức:

```text
q_new = alpha * q
      + beta  * centroid(R+)
      - gamma * centroid(R-)
```

Trong đó:

- `q`: vector gốc của job.
- `R+`: tập vector CV có feedback tích cực.
- `R-`: tập vector CV có feedback tiêu cực.
- `centroid(R+)`: vector trung bình của các CV tích cực.
- `centroid(R-)`: vector trung bình của các CV tiêu cực.

Hệ số trong code hiện tại:

```text
alpha = 1.0
beta  = 0.75
gamma = 0.15
```

Ý nghĩa:

- `alpha = 1.0`: giữ lại nội dung JD gốc.
- `beta = 0.75`: feedback tốt có ảnh hưởng rõ ràng, giúp tăng trọng số kỹ năng của CV được đánh giá tốt.
- `gamma = 0.15`: feedback xấu chỉ đẩy nhẹ vector ra xa, tránh để một feedback xấu làm hệ thống biến động quá mạnh.

Sau khi tính vector mới, code loại bỏ các term có trọng số không dương. Vector mới được lưu vào `learnedProfileVectorJson`.

### 11.1. Ví dụ Rocchio

Giả sử JD ban đầu là:

```text
Backend Java Spring
```

Vector job gốc:

```json
{
  "java": 0.5,
  "spring": 0.5
}
```

Recruiter đánh giá một CV là `GOOD_MATCH`. CV đó có:

```json
{
  "java": 0.4,
  "spring": 0.3,
  "redis": 0.3
}
```

Không có feedback xấu. Rocchio tính:

```text
q_new = 1.0*q + 0.75*positive_centroid
```

Vector mới xấp xỉ:

```json
{
  "java": 0.8,
  "spring": 0.725,
  "redis": 0.225
}
```

`redis` ban đầu không có trong JD, nhưng vì xuất hiện trong CV được đánh giá tốt, nó bắt đầu có trọng số trong learned vector. Những CV khác có `redis` sẽ được chấm điểm cao hơn sau khi matching được tính lại.

Nếu có feedback `BAD_MATCH` cho CV chứa `wordpress`, Rocchio sẽ trừ nhẹ trọng số của `wordpress`, làm các CV quá nghiêng về skill đó bớt phù hợp với job này.

Điểm thiết kế quan trọng: Rocchio trong project tính từ vector JD gốc và toàn bộ feedback hiện có, thay vì cứ lấy vector đã học lần trước rồi cộng tiếp mãi. Cách này giúp giảm rủi ro drift cộng dồn khi chạy cập nhật nhiều lần.

## 12. Feedback nào kích hoạt học?

Trong `FeedbackService`, các feedback sau kích hoạt Rocchio:

- `GOOD_MATCH`
- `POTENTIAL`
- `BAD_MATCH`

Feedback `NOT_INTERESTED` không kích hoạt Rocchio. Lý do: không quan tâm có thể đến từ mức lương, địa điểm, thời điểm, công ty, hoặc nhu cầu cá nhân, không nhất thiết do kỹ năng không phù hợp.

Feedback được upsert theo `(matchingId, actorId)`. Nếu cùng một người gửi feedback lại, hệ thống cập nhật feedback cũ thay vì tạo bản ghi trùng.

Rocchio chỉ được gọi sau khi transaction feedback commit, tránh trường hợp worker đọc dữ liệu feedback khi database chưa lưu xong.

## 13. Khi nào matching được tính?

### 13.1. Khi upload hoặc tạo CV mới

```text
CV mới
  -> extract text nếu là file
  -> normalize
  -> vectorize
  -> scoreAllJobsForCv
  -> so với tất cả job ACTIVE tương thích ngôn ngữ
```

### 13.2. Khi tạo hoặc sửa JD

```text
Job mới / JD thay đổi
  -> vectorize job
  -> scoreJobAgainstAllCvs
  -> so với các CV đã SCORING_DONE
```

### 13.3. Khi feedback làm Rocchio update

```text
Feedback
  -> update learned job vector
  -> đánh dấu matching.needsRecompute = true
  -> scheduler/batch recompute sau
```

Tách riêng việc tính điểm và việc đọc kết quả giúp API ranking/card chạy nhanh hơn. Frontend chủ yếu đọc bảng `matching` đã được tính sẵn.

## 14. Kiểm tra tương thích ngôn ngữ

Khi matching một CV với các job, `MatchingService` kiểm tra ngôn ngữ:

```text
Nếu cvLang hoặc jobLang null -> cho phép
Nếu cvLang == jobLang -> cho phép
Nếu jobLang == "en" -> cho phép
Ngược lại -> bỏ qua
```

Ý nghĩa: job tiếng Anh có thể chấp nhận CV ở nhiều ngôn ngữ hơn, còn các cặp ngôn ngữ lệch rõ thì bỏ qua để giảm nhiễu.

## 15. Dữ liệu lưu trong bảng Matching

Mỗi cặp CV-JD tạo hoặc cập nhật một bản ghi `Matching`:

```text
cv_id
job_id
raw_score
normalized_score
label
is_potential
match_reasons
potential_reason
needs_recompute
created_at
updated_at
```

Bảng `matching` có unique constraint trên `(cv_id, job_id)`, nên cùng một CV và job chỉ có một matching. Khi tính lại, backend update bản ghi cũ thay vì tạo bản ghi mới.

## 16. Điểm mạnh

- Có thể giải thích: biết CV match vì những term nào.
- Ổn định: IDF dùng seed corpus tĩnh, không bị dao động khi thêm dữ liệu mới.
- Nhẹ và nhanh: không cần GPU hoặc model lớn.
- Có feedback loop: Rocchio giúp job học từ hành vi người dùng.
- Dễ kiểm thử: cosine, label, potential và Rocchio đều test được bằng vector nhỏ.

## 17. Hạn chế

- TF-IDF là bag-of-words, chưa hiểu tốt đồng nghĩa hoặc ngữ cảnh sâu.
- Chất lượng điểm phụ thuộc vào chất lượng text extraction và nội dung CV/JD.
- CV/JD quá ngắn làm vector nghèo thông tin, điểm dễ kém ổn định.
- Rocchio cần feedback đủ chất lượng; feedback ít hoặc thiên lệch có thể làm learned vector lệch.
- Hệ thống hiện ưu tiên explainability hơn semantic understanding. Hướng phát triển hợp lý là hybrid: TF-IDF/skill rules để giải thích, embedding để bắt ngữ nghĩa.

## 18. Cách trình bày khi bảo vệ

Nếu cần trình bày trong 30-60 giây, có thể nói:

> Thuật toán chính của CareerFit là pipeline matching CV-JD dựa trên TF-IDF và cosine similarity. Đầu tiên hệ thống chuẩn hóa văn bản, tách token và loại stopword. Sau đó CV và JD được chuyển thành vector TF-IDF, trong đó các kỹ năng đặc trưng có trọng số cao hơn từ phổ biến. Điểm phù hợp là cosine similarity giữa hai vector, nhân 100 và gán nhãn LOW/MEDIUM/HIGH. Ngoài điểm chính, hệ thống có heuristic `potential` để phát hiện ứng viên có kỹ năng chuyển đổi tốt. Khi người dùng gửi feedback, Rocchio cập nhật learned vector của job để job tiến gần các CV được đánh giá tốt và tránh xa các CV bị đánh giá xấu.

Khi bị hỏi "đây có phải AI không?", nên trả lời rõ:

- Đây là thuật toán truy hồi thông tin và học từ feedback, không phải deep learning.
- Điểm mạnh là nhẹ, minh bạch, dễ kiểm thử và có thể giải thích.
- Hạn chế là chưa hiểu ngữ nghĩa sâu như embedding/BERT.

## 19. Tóm tắt ngắn gọn

CareerFit dùng pipeline matching dựa trên TF-IDF và cosine similarity. CV và JD được chuẩn hóa, tách token, loại stopword rồi biến thành vector trọng số. Điểm phù hợp là cosine similarity giữa vector CV và vector job, nhân 100 và gán nhãn LOW/MEDIUM/HIGH theo ngưỡng cấu hình. Hệ thống thêm heuristic `potential` để bắt các ứng viên có kỹ năng chuyển đổi tốt dù điểm chưa cao. Khi có feedback, Rocchio cập nhật learned vector của job bằng cách tiến gần các CV được đánh giá tốt và tránh xa các CV bị đánh giá xấu. Vì vậy thuật toán vừa có điểm số, vừa có lý do giải thích, vừa có khả năng học từ feedback.

## 20. File code nên đọc kèm

- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/common/util/TextNormalizationService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/common/util/TfIdfService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/matching/service/ScoringService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/matching/service/MatchingService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/feedback/service/FeedbackService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/feedback/service/RocchioService.java`
- `Backend/careerfit-backend/src/main/resources/application.yml`
