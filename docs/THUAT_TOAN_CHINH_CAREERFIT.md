# Thuật toán chính trong CareerFit

Tài liệu này giải thích thuật toán lõi của project CareerFit theo hướng dễ hiểu, bám sát implementation hiện tại trong backend. Mục tiêu của thuật toán là trả lời ba câu hỏi:

1. CV của ứng viên phù hợp với JD/tin tuyển dụng đến mức nào?
2. Vì sao hệ thống cho rằng CV đó phù hợp?
3. Hệ thống có thể học thêm từ feedback của người dùng hay không?

Về bản chất, CareerFit không dùng một thuật toán đơn lẻ, mà dùng một chuỗi thuật toán/kỹ thuật phối hợp với nhau. Phần tính điểm dùng hybrid scoring gồm TF-IDF/cosine, structured skill coverage, seniority và các guard; JD không có required skills dùng cosine làm fallback. Phần học từ feedback là Rocchio; các phần còn lại hỗ trợ làm sạch dữ liệu và giải thích kết quả.

## 0. Cách đọc tài liệu nếu bạn bắt đầu từ con số 0

Bạn không cần biết trước machine learning, đại số tuyến tính hay xác suất. Chỉ cần giữ một hình dung đơn giản: hệ thống đang làm công việc giống một người chấm hồ sơ theo nhiều phiếu nhỏ, sau đó cộng các phiếu đó thành một điểm chung.

```text
CV và JD dạng chữ
  -> làm sạch chữ
  -> nhận diện từ khóa/kỹ năng
  -> đo độ giống nhau của hai văn bản
  -> kiểm tra kỹ năng bắt buộc và kỹ năng cộng thêm
  -> kiểm tra cấp độ kinh nghiệm
  -> kết hợp các tín hiệu thành điểm 0-100
  -> gán nhãn LOW/MEDIUM/HIGH
  -> nếu chưa HIGH, kiểm tra khả năng chuyển đổi để gắn Potential
```

Các khái niệm cần nhớ trước khi đọc:

| Khái niệm | Hiểu đơn giản | Ví dụ |
|---|---|---|
| CV | Hồ sơ năng lực của ứng viên | Có React, TypeScript, 4 năm kinh nghiệm |
| JD | Mô tả và yêu cầu của công việc | Cần React, TypeScript, ưu tiên Next.js |
| Token | Một đơn vị từ sau khi tách văn bản | `react`, `typescript`, `docker` |
| Vector | Một bảng `từ -> trọng số`, không phải hình vẽ | `{react: 0.4, typescript: 0.3}` |
| Signal | Một bằng chứng nhỏ dùng để chấm điểm | Độ giống văn bản hoặc tỷ lệ kỹ năng đạt được |
| Weight | Mức quan trọng của một signal/kỹ năng | Required skills được ưu tiên hơn optional skills |
| Coverage | Mức độ CV bao phủ yêu cầu JD | Đạt 4 trong 5 kỹ năng không trọng số là 80% |
| Threshold | Mốc đổi điểm thành nhãn | Từ 90 trở lên là HIGH |
| Guard/cap | Luật chặn điểm cao không hợp lý | Thiếu nhiều required skills thì không được HIGH |
| Fallback | Cách xử lý dự phòng khi thiếu dữ liệu | JD không khai báo required skills thì dùng cosine |

Một điều rất quan trọng: điểm matching không phải xác suất ứng viên sẽ được tuyển. `90%` không có nghĩa là ứng viên có 90% cơ hội đậu. Nó chỉ có nghĩa là CV và JD đạt 90 điểm theo các tín hiệu và trọng số mà CareerFit đã thiết kế.

## 1. Tổng quan các thuật toán/kỹ thuật được dùng

| Thành phần | Thuật toán/kỹ thuật | Vai trò trong hệ thống | Output chính |
|---|---|---|---|
| Tiền xử lý văn bản | Text normalization, tokenization, stopword removal | Làm sạch CV/JD để chỉ giữ lại các token có ý nghĩa | Danh sách token |
| Nhận diện ngôn ngữ | Heuristic đếm ký tự tiếng Việt có dấu | Chọn bộ stopword phù hợp cho tiếng Việt hoặc tiếng Anh | `vi` hoặc `en` |
| Biểu diễn văn bản | TF-IDF | Biến CV/JD thành vector trọng số từ khóa | `Map<String, Double>` |
| Tín hiệu lexical | Cosine similarity | Đo mức giống nhau giữa vector CV và vector JD/job | `L` trong `0.0 - 1.0` |
| Tín hiệu structured | Weighted skill/seniority assessment | Đo required, optional skill coverage và độ phù hợp level | `R`, `O`, `S` trong `0.0 - 1.0` |
| Tính độ phù hợp | Conditional hybrid scoring | Dùng hybrid khi JD có required skills; nếu không thì fallback cosine | Điểm `0 - 100` |
| Phân loại kết quả | Threshold-based labeling | Gán nhãn LOW/MEDIUM/HIGH theo ngưỡng cấu hình | `LOW`, `MEDIUM`, `HIGH` |
| Nhận diện tiềm năng | Rule-based potential heuristic | Bắt các CV chưa đạt HIGH nhưng có tín hiệu chuyển đổi tốt | `isPotential = true/false` |
| Giải thích kết quả | Top shared weighted terms | Chọn các kỹ năng chung quan trọng để hiển thị lý do match | `matchReasons` |
| Học từ feedback | Rocchio relevance feedback | Cập nhật vector job dựa trên CV được đánh giá tốt/xấu | `learnedProfileVectorJson` |
| Tính lại theo lô | Batch recompute/upsert | Tính lại matching khi CV/JD/feedback thay đổi | Bản ghi `Matching` mới hoặc đã cập nhật |
| Gợi ý việc làm | Weighted recommendation ranking | Sắp xếp lại JD theo điểm match, kỹ năng mong muốn và địa điểm | `finalRecommendationScore` |
| Việc tương tự | Required-skill overlap | So JD đang xem với JD khác bằng phần required skills chung | Điểm similar job `0–100` |
| Chống JD trùng | SHA-256 fingerprint + weighted Jaccard | Chặn JD trùng tuyệt đối và cảnh báo JD gần trùng | fingerprint, near-duplicate score |

Nói ngắn gọn:

- TF-IDF trả lời: "Từ khóa nào quan trọng trong CV/JD?"
- Cosine similarity trả lời: "CV và JD giống nhau bao nhiêu theo các từ khóa quan trọng?"
- Structured assessment trả lời: "CV đáp ứng kỹ năng bắt buộc, kỹ năng cộng thêm và seniority đến đâu?"
- Hybrid scoring trả lời: "Kết hợp các tín hiệu trên thành điểm cuối như thế nào?"
- Threshold labeling trả lời: "Điểm này nên xem là LOW, MEDIUM hay HIGH?"
- Potential heuristic trả lời: "Ứng viên này chưa quá khớp, nhưng có tiềm năng không?"
- Rocchio trả lời: "Sau feedback, job nên ưu tiên thêm/bớt kỹ năng nào?"
- Recommendation trả lời: "Trong các JD đã match, JD nào nên được đưa lên đầu danh sách gợi ý?"
- Similar Jobs trả lời: "JD khác có bao nhiêu yêu cầu kỹ năng giống JD đang xem?"
- Duplicate protection trả lời: "JD này có phải bản đăng lại hoặc gần như bản đăng lại không?"

Pipeline tổng thể:

```text
CV/JD raw text
  -> chuẩn hóa văn bản
  -> tách token
  -> loại stopword
  -> tạo vector TF-IDF
  -> tính cosine similarity
  -> nếu JD có required skills: tính skill coverage + seniority và hybrid score
  -> nếu không: dùng cosine score fallback
  -> áp dụng guard và đổi điểm sang thang 0-100
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

CareerFit giữ TF-IDF và cosine similarity làm tín hiệu lexical/fallback vì:

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

Tại sao phải gán trọng số? Nếu chỉ đếm số từ giống nhau, `developer`, `experience` và `java` có thể bị xem quan trọng như nhau. Trong tuyển dụng IT, `java` thường giúp phân biệt năng lực cụ thể tốt hơn từ chung như `experience`. TF-IDF cố gắng phản ánh sự khác biệt đó.

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

Không cần học thuộc công thức ngay. Có thể hiểu theo hai câu:

```text
TF hỏi: từ này có nổi bật trong chính CV/JD đang đọc không?
IDF hỏi: từ này có đủ hiếm để giúp phân biệt hồ sơ không?
```

TF-IDF nhân hai câu trả lời này với nhau. Một từ chỉ có trọng số cao khi vừa xuất hiện đáng kể trong document hiện tại, vừa không quá phổ biến trong corpus.

### 4.1. TF dùng để làm gì?

TF đo mức độ một từ xuất hiện trong chính document đang xét.

Nếu CV có 100 token và `java` xuất hiện 5 lần:

```text
TF(java, CV) = 5 / 100 = 0.05
```

Token xuất hiện nhiều hơn trong CV/JD sẽ có trọng số nền cao hơn.

Tại sao chia cho tổng số token? Vì CV dài 1.000 từ đương nhiên có thể nhắc `java` nhiều lần hơn CV dài 100 từ. Chia cho độ dài giúp so sánh theo tỷ lệ thay vì thiên vị văn bản dài.

### 4.2. IDF dùng để làm gì?

IDF giúp giảm trọng số của từ quá phổ biến và tăng trọng số của từ đặc trưng.

Ví dụ:

- `developer` xuất hiện trong rất nhiều CV/JD nên không quá đặc trưng.
- `kubernetes`, `postgresql`, `springboot` đặc trưng hơn nên nên có sức nặng lớn hơn.

Implementation hiện tại dùng một seed corpus tĩnh gồm các nhóm thuật ngữ IT như backend, frontend, database, cloud, DevOps, security, AI/data, soft skills, seniority và một số thuật ngữ tiếng Việt.

Trong công thức IDF:

- `df(t)` càng lớn nghĩa là từ xuất hiện ở nhiều nhóm tài liệu, nên khả năng phân biệt càng thấp.
- `df(t)` càng nhỏ nghĩa là từ hiếm hơn, nên IDF cao hơn.
- `1 + df(t)` tránh phép chia cho 0.
- `log(...)` nén khoảng cách, tránh một từ cực hiếm có trọng số lớn quá mức.

Ví dụ trực giác, không dùng đúng số corpus thật:

```text
"developer" xuất hiện trong 40/49 nhóm -> IDF thấp
"kubernetes" xuất hiện trong 2/49 nhóm -> IDF cao hơn
```

Nếu cả hai cùng xuất hiện một lần trong JD, `kubernetes` thường nhận trọng số lớn hơn vì nó mô tả yêu cầu cụ thể hơn.

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

Ví dụ, TF-IDF thuần túy không tự biết `Amazon Web Services` và `AWS` là cùng một nền tảng. Phần structured skill/alias của hybrid score được dùng để bù hạn chế này.

## 5. Tính điểm cosine và hybrid matching

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
normalizedScore_old = cosine * 100 ≈ 98.00
```

Đây là **công thức cũ**, đồng thời vẫn là công thức fallback cho các JD cũ/imported không có danh sách `requiredSkills`:

```text
L = cosine(CV_vector, Job_vector)
normalizedScore = 100 * L
```

#### Đối chiếu ngay: công thức cũ và công thức mới

| Trường hợp | Công thức được dùng | Điểm cần hiểu |
|---|---|---|
| JD không có `requiredSkills` | `normalizedScore = 100 * L` | Giữ nguyên cách chấm cũ để dữ liệu imported/legacy vẫn hoạt động ổn định. |
| JD có required skills, không có optional skills | `baseScore = 100 * (0.20*L + 0.70*R + 0.10*S)` | Required skills chiếm 70% vì đây là bằng chứng chính. |
| JD có required và optional skills | `baseScore = 100 * (0.20*L + 0.60*R + 0.10*O + 0.10*S)` | 10% được dành cho optional skills; required vẫn là phần lớn nhất. |

Viết liền hai công thức để dễ so sánh:

```text
CÔNG THỨC CŨ / FALLBACK
L = cosine(CV_vector, Job_vector)
normalizedScore = 100 * L

CÔNG THỨC MỚI — JD CÓ REQUIRED SKILLS, KHÔNG CÓ OPTIONAL SKILLS
baseScore = 100 * (0.20*L + 0.70*R + 0.10*S)

CÔNG THỨC MỚI — JD CÓ REQUIRED VÀ OPTIONAL SKILLS
baseScore = 100 * (0.20*L + 0.60*R + 0.10*O + 0.10*S)
```

Sau hai công thức mới, hệ thống còn áp dụng guard/cap theo `R` và `S` rồi mới ra `finalScore`. Vì vậy không được đọc `baseScore` là điểm cuối trong mọi trường hợp.

Nếu CV thiên về React/frontend còn JD thiên về Java/backend, hai vector có ít token chung hơn nên điểm sẽ thấp hơn.

#### Hiểu cosine mà không cần biết đại số tuyến tính

Hãy tưởng tượng mỗi vector là một mũi tên chỉ về “hướng kỹ năng” của tài liệu:

- CV tập trung Java/Spring sẽ chỉ về hướng backend Java.
- JD tập trung Java/Spring/PostgreSQL cũng chỉ gần hướng đó.
- CV tập trung React/CSS sẽ chỉ sang hướng frontend khác.

Cosine đo hai mũi tên có cùng hướng hay không, thay vì chỉ đo văn bản nào dài hơn. Vì vậy một CV ngắn và một JD dài vẫn có thể giống nhau nếu tỷ lệ các kỹ năng quan trọng tương tự.

Trong công thức:

- Tích vô hướng `A · B` cộng đóng góp của những token xuất hiện ở cả hai phía. Token chỉ có trong một phía không tạo đóng góp dương.
- `|A| * |B|` chuẩn hóa theo độ lớn hai vector, giúp hạn chế thiên vị tài liệu dài.
- Cosine gần `1` nghĩa là hướng từ khóa rất giống nhau.
- Cosine gần `0` nghĩa là gần như không có hướng từ khóa chung.

Tại sao CareerFit vẫn giữ cosine?

1. Nó nhanh, phù hợp khi phải so một CV với hàng trăm JD.
2. Kết quả deterministic: cùng đầu vào sẽ cho cùng đầu ra.
3. Có thể giải thích bằng các token chung.
4. Không cần gọi API AI bên ngoài hoặc dùng GPU.

Tại sao cosine không còn đủ để làm toàn bộ điểm?

- Một JD dài có phần giới thiệu công ty và phúc lợi sẽ làm hướng vector thay đổi dù yêu cầu kỹ năng vẫn khớp.
- Cosine không biết trường nào là “bắt buộc” và trường nào chỉ là “ưu tiên”.
- Cosine thuần túy không hiểu alias hoặc kỹ năng chuyển đổi.
- Hai văn bản có nhiều câu chung vẫn có thể đạt cosine cao dù CV thiếu một kỹ năng cốt lõi.

Đó là lý do hybrid score giữ cosine làm một signal, nhưng bổ sung `R`, `O`, `S` và guard.

### 5.1. Công thức hybrid mới

Khi JD có danh sách `requiredSkills`, hệ thống không còn dùng duy nhất độ giống nhau của toàn bộ hai văn bản. `ScoringService` kết hợp bốn tín hiệu:

```text
L = lexical similarity, tức cosine TF-IDF, trong [0, 1]
R = weighted required-skill coverage, trong [0, 1]
O = weighted optional-skill coverage, trong [0, 1]
S = seniority compatibility, trong [0, 1]
```

Mọi tín hiệu đều được đưa về cùng khoảng `0–1` trước khi cộng:

```text
0.00 = hoàn toàn không đáp ứng tín hiệu đó
0.50 = đáp ứng một phần
1.00 = đáp ứng đầy đủ
```

#### Thành phần L — lexical similarity

`L` là cosine vừa giải thích ở trên. Nó trả lời:

> Xét toàn bộ nội dung có trọng số, CV và JD đang nói về cùng một nhóm công việc đến mức nào?

Ví dụ `L = 0.64` nghĩa là hai vector có độ tương đồng lexical 64%. Nó không trực tiếp có nghĩa ứng viên đạt 64% yêu cầu. Trong hybrid score, `L` chỉ đóng góp 20%, vì đây là bằng chứng về ngữ cảnh tổng thể chứ không phải bằng chứng chắc chắn rằng mọi yêu cầu bắt buộc đã được đáp ứng.

#### Thành phần R — required-skill coverage

`R` trả lời:

> Các kỹ năng mà recruiter đánh dấu bắt buộc được CV đáp ứng đến đâu?

Đây là tín hiệu quan trọng nhất. Nếu JD cần `React`, `TypeScript`, `REST` và CV có cả ba, `R` có thể gần `1.0`. Nếu CV chỉ có một kỹ năng, `R` thấp hơn.

Không nên hiểu `R` đơn giản luôn là “số kỹ năng đạt / tổng số kỹ năng”, vì mỗi kỹ năng có thể có trọng số khác nhau và một kỹ năng chuyển đổi có thể được ghi nhận một phần. Ví dụ Java có thể tạo một phần bằng chứng cho Kotlin, nhưng không được xem mạnh bằng CV có Kotlin trực tiếp.

#### Thành phần O — optional-skill coverage

`O` trả lời:

> CV đáp ứng các kỹ năng cộng thêm/nice-to-have đến đâu?

Optional skills giúp phân biệt hai ứng viên đều đạt yêu cầu cơ bản. Tuy nhiên chúng chỉ chiếm 10%; ứng viên không nên bị đánh giá thấp nghiêm trọng chỉ vì thiếu một kỹ năng mà JD đã xác định là không bắt buộc.

Nếu JD không khai báo optional skills, 10% này được chuyển sang required skills. Vì vậy trọng số `R` tăng từ 60% lên 70%, và tổng trọng số vẫn luôn bằng 100%.

#### Thành phần S — seniority compatibility

`S` trả lời:

> Cấp độ kinh nghiệm của CV có phù hợp với cấp độ JD không?

Một CV có đúng công nghệ nhưng mới thực tập không nên được xem giống hệt một CV Senior cho vị trí Lead. Tuy vậy seniority chỉ chiếm 10%, vì cách ghi level giữa các công ty không hoàn toàn đồng nhất và CV có thể không ghi rõ chức danh.

Nếu JD có required skills nhưng không có optional skills:

```text
baseScore = 100 * (0.20*L + 0.70*R + 0.10*S)
```

Nếu JD có cả required skills và optional skills:

```text
baseScore = 100 * (0.20*L + 0.60*R + 0.10*O + 0.10*S)
```

Như vậy required skills chiếm trọng số lớn nhất. Cosine vẫn giữ vai trò kiểm tra độ liên quan tổng thể của CV với ngữ cảnh JD, nhưng nội dung mô tả công ty, phúc lợi hoặc boilerplate không còn có thể lấn át bằng chứng kỹ năng.

#### Vì sao chọn các trọng số này?

Các trọng số hiện tại là lựa chọn thiết kế có chủ đích, không phải tham số do một mô hình machine learning tự học:

- `20% lexical`: đủ để ngữ cảnh toàn JD còn ảnh hưởng, nhưng không đủ để boilerplate quyết định kết quả.
- `60–70% required`: phần lớn điểm phải đến từ yêu cầu bắt buộc.
- `10% optional`: tạo khác biệt có ích nhưng không biến nice-to-have thành điều kiện loại.
- `10% seniority`: phản ánh độ phù hợp level nhưng thừa nhận dữ liệu level có thể không chính xác tuyệt đối.

Thiết kế này ưu tiên precision cho nhãn HIGH: hệ thống thận trọng hơn trước khi tuyên bố ứng viên khớp cao. Muốn khẳng định đây là bộ trọng số tối ưu về mặt thống kê, project cần thêm tập CV–JD được chuyên gia gán nhãn và hiệu chỉnh trọng số trên tập validation. Hiện tại công thức được chọn để cân bằng tính thực tế, khả năng giải thích và độ an toàn khi demo.

Coverage của một nhóm kỹ năng được tính theo trung bình có trọng số:

```text
coverage = sum(compatibility(skill_i) * weight(skill_i))
           / sum(weight(skill_i))
```

Trong implementation hiện tại:

```text
core skill       weight = 2.0
unknown skill    weight = 1.5
platform skill   weight = 1.3
foundation skill weight = 0.8
```

`compatibility(skill)` bằng `1.0` khi CV có đúng kỹ năng hoặc đúng alias. Nếu là kỹ năng có khả năng chuyển đổi, giá trị nằm trong khoảng `0.0–1.0` theo `skill-transfer-model.json`. Kỹ năng mới chưa có trong catalog, ví dụ `TanStack Query`, vẫn được tính `1.0` nếu cụm từ xuất hiện chính xác trong CV; hệ thống không tự suy diễn transfer cho kỹ năng chưa biết.

Ví dụ cách tính `R`, giả sử JD bắt buộc ba kỹ năng:

```text
React:      compatibility = 1.00, weight = 2.0
TypeScript: compatibility = 1.00, weight = 2.0
AWS:        compatibility = 0.00, weight = 1.3
```

Khi đó:

```text
R = (1.00*2.0 + 1.00*2.0 + 0.00*1.3) / (2.0 + 2.0 + 1.3)
  = 4.0 / 5.3
  ≈ 0.755
```

Ứng viên không được 2/3 = 66,7% một cách máy móc. Vì React và TypeScript là core skills có trọng số cao, coverage có thể khoảng 75,5%. Tuy nhiên `R < 0.85`, nên guard vẫn ngăn kết quả cuối đạt HIGH.

Seniority compatibility được tính như sau:

```text
CV cùng hoặc cao hơn level JD = 1.00
CV thấp hơn JD một level      = 0.78
CV thấp hơn từ hai level      = 0.20 và severeGap = true
Không xác định được level     = 0.65
```

Nếu CV không ghi trực tiếp `Junior`, `Mid` hoặc `Senior`, backend có thể suy ra gần đúng từ cụm tiếng Anh/Việt như `4 years` hoặc `4 năm`: dưới 2 năm là Junior, từ 2 đến dưới 5 năm là Mid, từ 5 năm là Senior.

Ví dụ:

```text
CV ghi "4 năm kinh nghiệm" -> hệ thống suy ra MID
JD yêu cầu SENIOR          -> thấp hơn một level -> S = 0.78
```

Nếu CV là Senior còn JD là Mid, hệ thống dùng `S = 1.0`: ứng viên cao hơn level yêu cầu không bị phạt bởi thành phần seniority.

### 5.2. Guard và giới hạn điểm

Sau khi có `baseScore`, hệ thống áp dụng trần điểm để một CV giống phần mô tả chung nhưng thiếu kỹ năng bắt buộc không thể bị gán nhãn quá cao:

```text
R < 0.50          -> finalScore <= 59
0.50 <= R < 0.70  -> finalScore <= 69
0.70 <= R < 0.85  -> finalScore <= 89
severeGap = true  -> finalScore <= 79
```

Đọc guard theo cách đơn giản:

- Coverage dưới 50%: thiếu phần lớn yêu cầu, tối đa chỉ ở vùng LOW.
- Coverage từ 50% đến dưới 70%: có một phần năng lực nhưng vẫn chưa đủ, tối đa 69.
- Coverage từ 70% đến dưới 85%: khá gần nhưng chưa đủ chắc chắn để HIGH, tối đa 89.
- Khoảng cách seniority từ hai level trở lên: dù skill tốt, tối đa 79.

Guard được áp dụng sau phép cộng trọng số. Hàm `min(baseScore, cap)` chỉ hạ điểm khi điểm tính toán vượt trần; nó không tự nâng một điểm thấp lên đúng mức trần.

Ví dụ `baseScore = 92` nhưng `R = 0.80`:

```text
finalScore = min(92, 89) = 89
```

Ví dụ `baseScore = 55` và cap là 59:

```text
finalScore = min(55, 59) = 55
```

Cuối cùng:

```text
normalizedScore = clamp(finalScore, 0, 100)
rawScore        = normalizedScore / 100
```

Tóm lại, lựa chọn công thức tại runtime là:

```text
requiredSkills rỗng     -> dùng công thức cosine cũ
requiredSkills có dữ liệu -> dùng công thức hybrid mới và các guard
```

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

Cách đọc ba nhãn:

- `LOW`: bằng chứng matching trực tiếp còn yếu theo công thức hiện tại. Không đồng nghĩa ứng viên kém; có thể CV viết thiếu thông tin hoặc JD thuộc hướng khác.
- `MEDIUM`: có nhiều tín hiệu phù hợp nhưng chưa đủ chắc chắn để hệ thống gọi là match cao.
- `HIGH`: score đạt ít nhất 90 và, với JD structured, đã vượt qua các guard về required skills/seniority.

Threshold chỉ biến số liên tục thành nhóm dễ hiển thị. Đổi threshold không làm thuật toán “hiểu” tốt hơn; nó chỉ đổi ranh giới tên nhãn. Vì vậy không nên sửa `HIGH` từ 90 xuống 60 chỉ để làm nhiều kết quả trông đẹp hơn.

Lưu ý: tên property có chữ `max`, nhưng code đang dùng chúng như ngưỡng tối thiểu để vào nhãn cao hơn. Khi trình bày, nên nói theo hành vi thật của code: từ 90 trở lên là HIGH, từ 70 đến dưới 90 là MEDIUM, còn lại là LOW.

`rawScore` được lưu trên thang 0-1 với 6 chữ số thập phân. `normalizedScore` được lưu trên thang 0-100 với 2 chữ số thập phân.

## 7. Heuristic phát hiện potential

Không phải ứng viên nào chưa đạt điểm HIGH cũng nên bị bỏ qua. Một số CV có thể chưa khớp toàn bộ JD, nhưng vẫn có tín hiệu chuyển đổi tốt.

Ví dụ:

- CV: Junior Java Developer, có Java/Spring/PostgreSQL.
- JD: Mid Backend Developer, cần Java/Spring/Docker.

Điểm tổng thể có thể chưa đủ cao, nhưng ứng viên vẫn có tiềm năng phát triển lên role đó. Vì vậy project có cờ `isPotential`.

Phân biệt hai khái niệm:

```text
Match score hỏi: CV đáp ứng JD trực tiếp đến đâu?
Potential hỏi: dù chưa đáp ứng trực tiếp, kỹ năng hiện có có thể chuyển đổi hợp lý không?
```

Ví dụ Java và Kotlin không giống chữ, nhưng mô hình transfer có thể biết chúng cùng họ JVM và cho compatibility cao. Potential không cộng tuỳ ý để biến hồ sơ thành HIGH; nó là cờ bổ sung giúp recruiter không bỏ sót ứng viên có nền tảng gần.

Đánh giá chính dùng versioned `skill-transfer-model.json`. Potential score được tính bằng:

```text
potentialScore = 100 * (
    0.50*skillCompatibility
  + 0.20*familyCompatibility
  + 0.15*foundationCompatibility
  + 0.15*seniorityCompatibility
)
```

Ứng viên chỉ được đánh dấu Potential khi chưa đạt HIGH, `potentialScore >= 62`, skill compatibility ít nhất `0.50`, family compatibility ít nhất `0.55`, có core target/career evidence và không có seniority gap nghiêm trọng. Với điểm matching dưới 20, hệ thống còn yêu cầu bằng chứng skill mạnh hơn để tránh gợi ý quá xa.

Để tương thích với các vector/JD cũ mà model chưa nhận diện đủ, backend giữ heuristic fallback:

```text
35 <= score < 75
```

- Có ít nhất 3 term quan trọng chung; hoặc
- seniority tương thích và có ít nhất 2 term chung.

Điểm quan trọng: với JD text-only dùng công thức fallback, seniority không thay đổi điểm cosine. Với JD có `requiredSkills`, seniority là thành phần `S`, chiếm 10% điểm hybrid và còn có guard giới hạn 79 điểm nếu khoảng cách level nghiêm trọng. Seniority vẫn đồng thời hỗ trợ đánh giá `isPotential`.

Một điểm dễ nhầm khác: trong entity có enum `POTENTIAL`, nhưng logic scoring hiện tại không đổi `label` thành `POTENTIAL`. Code vẫn gán label theo điểm là `LOW`, `MEDIUM` hoặc `HIGH`, còn tiềm năng được lưu bằng cờ riêng `isPotential`. Khi giải thích, nên nói "potential là trạng thái bổ sung", không phải nhãn điểm chính.

## 8. Lý do matching

Hệ thống không chỉ trả về một con số. `ScoringService` còn tạo danh sách `matchReasons`.

Cách tạo:

1. Với JD structured, ưu tiên các required skills khớp mạnh từ assessment hybrid.
2. Sắp xếp các term trong job vector theo trọng số TF-IDF giảm dần.
3. Bổ sung các term mà CV cũng có cho đến tối đa 5 lý do.
4. Nếu job có domain, thêm domain vào đầu danh sách.

Ví dụ:

```json
["Backend", "java", "spring", "postgresql", "docker"]
```

Danh sách này dùng để UI/email hiển thị lý do: CV này khớp với job vì cùng domain backend và cùng các kỹ năng Java, Spring, PostgreSQL, Docker.

## 9. Ví dụ xuyên suốt một lần matching

Phần này dùng các con số giả định đơn giản để bạn học cách đọc công thức. Các số `L`, `R`, `O`, `S` trong hệ thống thật được tính từ vector, catalog và nội dung CV/JD; ta giả sử chúng đã được tính xong để tập trung vào bước cộng điểm.

### 9.1. Ví dụ A — CV đủ required skills dù cosine chỉ 64%

Giả sử JD cần React và TypeScript, không có optional skill. CV có đầy đủ hai kỹ năng. JD khá dài vì có giới thiệu công ty và phúc lợi, nên cosine chỉ là:

```text
L = 0.64
R = 1.00
S = 0.78  (CV thấp hơn JD một level)
```

Vì không có optional skills, dùng công thức:

```text
baseScore = 100 * (0.20*L + 0.70*R + 0.10*S)
          = 100 * (0.20*0.64 + 0.70*1.00 + 0.10*0.78)
          = 100 * (0.128 + 0.700 + 0.078)
          = 90.60
```

`R = 1.00` nên không có cap skill coverage. Seniority chỉ lệch một level nên không phải severe gap.

```text
finalScore = 90.60
rawScore = 0.906
label = HIGH
```

Đây chính là trường hợp công thức mới muốn sửa: cosine 64% không còn tự động kéo một CV đáp ứng đủ yêu cầu xuống LOW, vì phần nhiễu trong JD chỉ ảnh hưởng thành phần `L` có trọng số 20%.

### 9.2. Ví dụ B — văn bản rất giống nhưng thiếu required skills

Giả sử CV và JD dùng nhiều câu/từ giống nhau nên:

```text
L = 0.92
R = 0.40
S = 1.00
```

Không có optional skills:

```text
baseScore = 100 * (0.20*0.92 + 0.70*0.40 + 0.10*1.00)
          = 100 * (0.184 + 0.280 + 0.100)
          = 56.40
```

Vì `R < 0.50`, cap tối đa là 59. Tuy nhiên base score vốn chỉ 56,40 nên guard không nâng điểm:

```text
finalScore = min(56.40, 59) = 56.40
label = LOW
```

Ví dụ này cho thấy nhiều câu chữ chung không thể che việc CV thiếu phần lớn kỹ năng bắt buộc.

### 9.3. Ví dụ C — có cả required và optional skills

Giả sử:

```text
L = 0.70  (ngữ cảnh khá giống)
R = 0.90  (đạt phần lớn required skills)
O = 0.50  (đạt một nửa optional skills)
S = 1.00  (đúng level)
```

Dùng công thức có optional skills:

```text
baseScore = 100 * (0.20*0.70 + 0.60*0.90 + 0.10*0.50 + 0.10*1.00)
          = 100 * (0.140 + 0.540 + 0.050 + 0.100)
          = 83.00
```

`R = 0.90` không bị cap theo skill coverage, nhưng tổng bằng 83 nên:

```text
finalScore = 83.00
label = MEDIUM
```

Ứng viên khá phù hợp nhưng chưa đủ HIGH. Thiếu optional skills chỉ làm mất tối đa 5 điểm trong ví dụ này, không gây loại hồ sơ.

### 9.4. Ví dụ D — JD không có requiredSkills

Giả sử một JD imported cũ chỉ có nội dung văn bản và cosine là `0.705`:

```text
requiredSkills = []
L = 0.705
normalizedScore = 100 * L = 70.50
label = MEDIUM
```

Không tự tạo `R`, `O` từ phỏng đoán vì hệ thống không biết chắc recruiter xem kỹ năng nào là bắt buộc. Đây là fallback giúp dữ liệu cũ vẫn chấm được và tránh tạo cảm giác chính xác giả.

### 9.5. Ví dụ từ văn bản đến matchReasons

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

TF-IDF biến hai danh sách token thành hai vector có trọng số. Cosine đo độ giống lexical. Nếu JD khai báo required skills, structured assessment còn kiểm tra alias, coverage, transfer và seniority. `matchReasons` ưu tiên required skills khớp mạnh rồi bổ sung các term TF-IDF chung:

```text
matchReasons = ["Backend", "java", "spring", "postgresql", "boot"]
```

Nhờ vậy người dùng không chỉ thấy một con số mà còn thấy bằng chứng chính dẫn tới kết quả.

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

`Centroid` chỉ là trung bình cộng. Nếu có ba CV được đánh giá tốt, hệ thống lấy trọng số `java` trung bình của ba CV, trọng số `spring` trung bình, và tương tự với từng token. Nhờ dùng trung bình, một CV đơn lẻ ít có khả năng chi phối toàn bộ learned profile hơn việc cộng thẳng tất cả vector.

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

Tại sao `beta` lớn hơn `gamma`? Feedback tích cực thường nói khá trực tiếp rằng “đây là dạng CV phù hợp”. Feedback tiêu cực có thể mơ hồ hơn: người dùng không thích công ty, mức lương hoặc địa điểm chứ chưa chắc ghét bộ kỹ năng. Vì vậy hệ thống học mạnh hơn từ tín hiệu tích cực và thận trọng khi trừ tín hiệu tiêu cực.

Giống trọng số hybrid, `alpha`, `beta`, `gamma` là tham số thiết kế cố định trong implementation hiện tại. Chúng không tự thay đổi sau mỗi feedback.

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

## 15. Thuật toán gợi ý việc làm (Recommendation)

Đây là phần dễ bị nhầm với matching. **Matching** trả lời: “CV này phù hợp với JD này bao nhiêu phần trăm?”. **Recommendation** trả lời: “Trong rất nhiều JD, nên đưa JD nào lên đầu danh sách gợi ý cho người dùng?”.

Recommendation lấy các matching đã có của **CV mặc định**, sau đó sắp xếp lại bằng ba tín hiệu:

```text
baseScore      = điểm matching của CV và JD
skillBoost     = mức trùng giữa kỹ năng người dùng mong muốn và required skills của JD
locationBoost  = mức phù hợp địa điểm

finalRecommendationScore = min(100,
    0.70 * baseScore
  + 0.20 * skillBoost
  + 0.10 * locationBoost)
```

### 15.1. “Overlap required skills” nghĩa là gì?

**Overlap** nghĩa rất đơn giản là “phần giao” hay “những phần giống nhau giữa hai danh sách”. Ở đây hệ thống so:

```text
Kỹ năng người dùng đang mong muốn: React, TypeScript, Docker
Required skills của JD:              React, TypeScript, AWS

Phần giao (overlap):                 React, TypeScript
```

Có 2 kỹ năng trùng trên 3 kỹ năng người dùng mong muốn, nên:

```text
skillBoost = (2 / 3) * 30 = 20
```

`skillBoost` nằm trong khoảng `0–30`; càng nhiều kỹ năng mong muốn xuất hiện trong yêu cầu của JD thì tín hiệu này càng lớn. Lưu ý: đây là **kỹ năng người dùng chọn trong hồ sơ**, không phải toàn bộ kỹ năng trích xuất từ CV.

`locationBoost` là `15` khi địa điểm CV/profile và JD chứa nhau (ví dụ đều là “Ho Chi Minh”), ngược lại là `0`.

Ví dụ một JD có:

```text
baseScore     = 80
skillBoost    = 20
locationBoost = 15

finalRecommendationScore
= 0.70 * 80 + 0.20 * 20 + 0.10 * 15
= 56 + 4 + 1.5
= 61.5
```

Tên biến có chữ “boost” dễ làm ta nghĩ điểm cuối sẽ là `80 + ...`; thực tế code hiện tại dùng nó như **tín hiệu để xếp hạng lại**, nên điểm `finalRecommendationScore` có thể nhỏ hơn `baseScore`. Điểm matching gốc vẫn được giữ riêng để hiển thị/giải thích.

Nếu chưa có CV mặc định hoặc CV chưa xử lý xong, hệ thống không bịa điểm matching. Nó fallback (cách xử lý dự phòng) sang danh sách JD đang ACTIVE, sắp theo ngày đăng mới nhất.

## 16. Thuật toán tìm việc tương tự (Similar Jobs)

Khi người dùng đang xem một JD, hệ thống có thể tìm các JD tương tự. Khác với matching CV–JD, phần này so sánh **JD với JD**.

Nếu JD gốc có required skills, hệ thống lấy hai tập kỹ năng:

```text
JD đang xem (R): React, TypeScript, Next.js, REST API
JD khác (J):     React, TypeScript, Vue

Phần giao:       React, TypeScript
```

Công thức đang dùng là:

```text
similarity = |R ∩ J| / |R| * 100
```

Trong ví dụ trên, có `2` kỹ năng chung trên `4` kỹ năng của JD gốc:

```text
similarity = 2 / 4 * 100 = 50%
```

Chỉ những JD có điểm lớn hơn `20%` mới được giữ lại, sau đó sắp giảm dần và trả tối đa 10 JD.

Lưu ý: đây không phải cosine và cũng không đối xứng. JD gốc là “thước đo”; vì vậy `R ∩ J / R` có thể khác `R ∩ J / J`. Cách này phù hợp với câu hỏi “JD khác có đáp ứng bao nhiêu yêu cầu của JD tôi đang xem?”.

### 16.1. “Fallback theo seniority” nghĩa là gì?

Fallback là **phương án dự phòng khi thiếu dữ liệu**. Nếu JD gốc không khai báo bất kỳ required skill nào, hệ thống không thể tính phần giao kỹ năng. Khi đó code chọn các JD cùng cấp độ seniority, ví dụ:

```text
JD gốc: Senior Backend Engineer, requiredSkills rỗng
-> gợi ý các JD khác cũng có seniority = SENIOR
```

Các JD fallback này được gán điểm minh họa `30`, không có nghĩa là hai JD thật sự giống nhau 30%. Đây chỉ là điểm đủ để hiển thị một gợi ý hợp lý khi không có dữ liệu kỹ năng. Ở phiên bản code hiện tại, fallback kiểm tra **seniority**; địa điểm chưa phải điều kiện fallback.

## 17. Chống JD trùng lặp (Duplicate Job Protection)

Mục tiêu của phần này không phải tính “CV hợp JD bao nhiêu %”, mà là ngăn nhà tuyển dụng đăng cùng một JD nhiều lần.

Hệ thống xử lý hai mức:

1. **Trùng tuyệt đối (exact duplicate):** dữ liệu quan trọng giống hệt nhau sau khi làm sạch.
2. **Gần trùng (near duplicate):** không giống từng chữ, nhưng rất giống về title/nội dung/địa điểm/hình thức làm việc.

### 17.1. Trùng tuyệt đối: fingerprint

Trước hết text được chuẩn hóa: viết thường, bỏ dấu tiếng Việt, bỏ ký tự thừa và gộp khoảng trắng. Sau đó hệ thống tạo một “dấu vân tay” (`fingerprint`) bằng SHA-256 từ:

```text
tên công ty đã chuẩn hóa
+ tiêu đề JD đã chuẩn hóa
+ địa điểm đã chuẩn hóa
+ hình thức làm việc đã chuẩn hóa
+ SHA-256 của mô tả JD đã chuẩn hóa
```

SHA-256 ở đây chỉ dùng để tạo mã nhận diện ổn định, **không** dùng để đo mức độ giống nhau. Nếu fingerprint giống nhau, JD bị từ chối ngay vì đó là bản đăng trùng tuyệt đối.

### 17.2. Gần trùng: Jaccard có trọng số

Với JD nội bộ, cùng recruiter và cùng công ty đã chuẩn hóa, hệ thống tính mức giống nhau bằng Jaccard. Jaccard hiểu đơn giản là:

```text
Jaccard(A, B) = số từ cùng có / tổng số từ khác nhau của A và B
```

Sau đó ghép bốn tín hiệu:

```text
nearDuplicateScore =
    0.40 * titleSimilarity
  + 0.40 * descriptionSimilarity
  + 0.10 * locationSame
  + 0.10 * employmentTypeSame
```

Trong đó `locationSame` và `employmentTypeSame` là `1` khi giống, `0` khi khác. Ví dụ:

```text
titleSimilarity       = 0.90
descriptionSimilarity = 0.80
locationSame          = 1
employmentTypeSame    = 1

score = 0.40*0.90 + 0.40*0.80 + 0.10*1 + 0.10*1
      = 0.88 = 88%
```

Ngưỡng gần trùng là `85%`. Từ `85%` trở lên, hệ thống cảnh báo và yêu cầu recruiter xác nhận rõ ràng trước khi publish; không tự âm thầm tạo bản trùng.

## 18. Dữ liệu lưu trong bảng Matching

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

## 19. Điểm mạnh

- Có thể giải thích: biết CV match vì những term nào.
- Ổn định: IDF dùng seed corpus tĩnh, không bị dao động khi thêm dữ liệu mới.
- Nhẹ và nhanh: không cần GPU hoặc model lớn.
- Có feedback loop: Rocchio giúp job học từ hành vi người dùng.
- Dễ kiểm thử: cosine, label, potential và Rocchio đều test được bằng vector nhỏ.

## 20. Hạn chế

- TF-IDF là bag-of-words, chưa hiểu tốt đồng nghĩa hoặc ngữ cảnh sâu.
- Chất lượng điểm phụ thuộc vào chất lượng text extraction và nội dung CV/JD.
- CV/JD quá ngắn làm vector nghèo thông tin, điểm dễ kém ổn định.
- Rocchio cần feedback đủ chất lượng; feedback ít hoặc thiên lệch có thể làm learned vector lệch.
- Hệ thống hiện ưu tiên explainability hơn semantic understanding. Hướng phát triển hợp lý là hybrid: TF-IDF/skill rules để giải thích, embedding để bắt ngữ nghĩa.

## 21. Cách trình bày khi bảo vệ

Nếu cần trình bày trong 30-60 giây, có thể nói:

> Thuật toán chính của CareerFit là hybrid matching có giải thích. Hệ thống chuẩn hóa CV/JD, tạo vector TF-IDF và tính cosine làm tín hiệu lexical. Nếu JD có required skills, điểm cuối kết hợp 20% lexical, 60–70% required-skill coverage, tối đa 10% optional skills và 10% seniority; các guard ngăn CV thiếu kỹ năng bắt buộc đạt điểm cao. JD text-only vẫn dùng cosine làm fallback. Điểm được gán nhãn LOW/MEDIUM/HIGH, còn skill-transfer hỗ trợ cờ Potential. Khi có feedback, Rocchio cập nhật learned vector của job.

Khi bị hỏi "đây có phải AI không?", nên trả lời rõ:

- Đây là thuật toán truy hồi thông tin và học từ feedback, không phải deep learning.
- Điểm mạnh là nhẹ, minh bạch, dễ kiểm thử và có thể giải thích.
- Hạn chế là chưa hiểu ngữ nghĩa sâu như embedding/BERT.

## 22. Tóm tắt ngắn gọn

CareerFit dùng pipeline hybrid matching. CV và JD được chuẩn hóa rồi biểu diễn bằng TF-IDF để tạo tín hiệu lexical. Với JD có required skills, hệ thống kết hợp cosine với weighted required/optional skill coverage và seniority, sau đó áp dụng guard cho skill gap và seniority gap. Với JD text-only, hệ thống fallback về cosine để giữ tính tương thích. Điểm cuối được gán nhãn LOW/MEDIUM/HIGH; Potential vẫn là trạng thái bổ sung dựa trên skill transfer. Feedback tiếp tục được học bằng Rocchio.

Ngoài matching, project còn có thuật toán recommendation để xếp lại các JD gợi ý, similar jobs để tìm JD có phần required skills chung, và duplicate protection để ngăn đăng lặp. Vì vậy hệ thống không chỉ có một điểm matching, mà có nhiều quyết định nhỏ: chấm mức phù hợp, xếp thứ tự hiển thị, tìm nội dung gần nhau và bảo vệ chất lượng dữ liệu.

## 23. File code nên đọc kèm

- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/common/util/TextNormalizationService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/common/util/TfIdfService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/matching/service/ScoringService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/matching/service/MatchingService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/feedback/service/FeedbackService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/feedback/service/RocchioService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/recommendation/service/RecommendationService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/job/service/JobDuplicateProtectionService.java`
- `Backend/careerfit-backend/src/main/resources/application.yml`


