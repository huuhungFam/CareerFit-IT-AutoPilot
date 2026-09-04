# Vận hành cốt lõi của CareerFit

Tài liệu này bổ sung cho file `THUAT_TOAN_CHINH_CAREERFIT.md`. File thuật toán tập trung vào TF-IDF, cosine similarity, Potential và Rocchio. File này giải thích toàn bộ các luồng vận hành cốt lõi xung quanh thuật toán: phân tích CV từ file, phân tích JD, tính matching, recommendation feed, feedback, email, scheduler, automation policy, auto-apply và các trạng thái dữ liệu quan trọng.

Nếu chỉ cần hiểu nhanh, hãy nhớ CareerFit vận hành theo chuỗi sau:

```text
CV/JD đi vào hệ thống
  -> lấy text sạch
  -> biến text thành vector
  -> tính điểm matching
  -> lưu kết quả
  -> recommendation xếp hạng lại theo hồ sơ candidate
  -> gửi thông báo/email nếu đủ điều kiện
  -> nhận feedback
  -> học lại và tính lại khi cần
```

## 1. Thuật ngữ nhanh

| Thuật ngữ | Hiểu đơn giản |
|---|---|
| CV | Hồ sơ ứng viên, có thể upload file hoặc nhập tay |
| JD/job | Tin tuyển dụng hoặc mô tả công việc do recruiter tạo |
| Raw text | Văn bản thô lấy từ CV/JD trước khi làm sạch |
| Token | Từ/thuật ngữ sau khi tách văn bản, ví dụ `java`, `spring`, `docker` |
| Vector | Dạng số hóa của CV/JD, dùng để so sánh bằng thuật toán |
| Matching | Bản ghi kết quả so sánh một CV với một job |
| Score | Điểm phù hợp của một CV với một job |
| Potential | Cờ đánh dấu ứng viên có tiềm năng dù điểm chưa thật cao |
| Recommendation | Danh sách job gợi ý đã kết hợp matching với thông tin hồ sơ candidate |
| Feedback | Đánh giá của người dùng như phù hợp, tiềm năng, không quan tâm |
| Learned vector | Vector job đã được điều chỉnh sau feedback |
| Scheduler | Các job nền chạy định kỳ, ví dụ gửi digest hoặc tính lại matching |
| Effective policy | Giá trị policy có hiệu lực sau khi xét demo mode và loại tài khoản |
| Outbox | Bảng hàng đợi bền vững dự kiến dùng để lập lịch/gửi notification |

## 2. Tổng quan các khối cốt lõi

| Khối | Chức năng chính | Class/service tiêu biểu |
|---|---|---|
| CV ingestion | Nhận CV upload/nhập tay, validate file, trích xuất text, vector hóa, kích hoạt matching | `CvIngestionService`, `PdfExtractionService`, `StorageService` |
| JD/job processing | Recruiter tạo/sửa tin tuyển dụng, validate nội dung, vector hóa JD, kích hoạt matching lại | `JobService`, `QualityValidationService` |
| Text processing | Chuẩn hóa văn bản, detect language, tokenization, stopword removal | `TextNormalizationService` |
| Vectorization/scoring | TF-IDF, cosine similarity, score 0-100, label, potential, match reasons | `TfIdfService`, `ScoringService` |
| Matching orchestration | So CV với nhiều job hoặc job với nhiều CV, upsert bản ghi matching | `MatchingService`, `MatchingBatchService` |
| Query/ranking | Trả kết quả matching cho candidate/recruiter, sort, filter, tie-break | `MatchingQueryService` |
| Recommendation | Kết hợp matching với desired skill/location hoặc fallback từ profile | `RecommendationService` |
| Feedback learning | Ghi nhận feedback và cập nhật learned vector của job bằng Rocchio | `FeedbackService`, `RocchioService` |
| Email channel | Gửi email lifecycle, match notification, digest, token feedback qua email | `NotificationEmailService`, `EmailActionService`, `EmailActionController` |
| Scheduler | Tính lại matching, gửi digest, cleanup token, gửi high-match email, auto-apply | `AutomationScheduler` |
| Automation | Policy thông báo/auto-apply và tự động ứng tuyển theo ngưỡng | `AutomationPolicyService`, `AutoApplyService` |
| Settings/policy projection | Trả policy đã lưu và timing có hiệu lực cho UI | `SettingsService`, `EffectiveAutomationPolicyResolver` |
| Durable outbox foundation | Enqueue idempotent notification theo recipient/type/target | `OutboxService`, `NotificationOutbox` |
| Audit/log | Ghi lại hành động quan trọng để truy vết | `AuditLogRepository`, `NotificationDeliveryLogRepository` |

Luồng tổng thể:

```text
Candidate upload/nhập CV
  -> trích xuất text
  -> chuẩn hóa và vector hóa CV
  -> so với các job active
  -> lưu matching
  -> recommendation re-rank cho candidate
  -> candidate/recruiter xem ranking
  -> email/scheduler gửi thông báo nếu đủ điều kiện
  -> user feedback
  -> Rocchio cập nhật learned job vector
  -> scheduler tính lại matching
```

Ví dụ dễ hình dung:

```text
Ứng viên upload CV Java Backend dạng PDF
  -> hệ thống đọc text từ PDF
  -> nhận ra các kỹ năng java, spring, postgresql
  -> so với các job đang active
  -> job Backend Java được 86 điểm
  -> lưu matching và hiển thị cho candidate/recruiter
  -> nếu đủ ngưỡng, gửi email có nút "Rất phù hợp" / "Tiềm năng" / "Bỏ qua"
  -> candidate bấm feedback
  -> hệ thống học lại job profile bằng Rocchio
  -> các matching liên quan được tính lại ở lượt scheduler sau
```

## 3. Luồng phân tích CV

CareerFit hỗ trợ hai cách tạo CV:

1. Upload file CV.
2. Nhập CV thủ công qua form.

### 3.1. Upload CV từ file

Service chính: `CvIngestionService.acceptDocumentUpload`.

Luồng xử lý:

```text
Candidate upload file
  -> validate file
  -> tạo CV status=UPLOADED
  -> lưu file vào storage
  -> set default CV nếu là CV đầu tiên
  -> ghi audit CV_UPLOAD
  -> sau khi transaction commit, chạy processDocument(cvId)
```

Điểm quan trọng: xử lý nặng không chạy trực tiếp trong HTTP request. Backend dùng `AfterCommitExecutor` để chỉ bắt đầu worker sau khi transaction lưu metadata/file đã commit. Nhờ đó worker không đọc phải CV chưa tồn tại trong database.

Nói đơn giản: API upload chỉ nhận và lưu CV trước, còn việc đọc nội dung CV và tính matching chạy nền sau đó. Cách này giúp người dùng không phải chờ lâu ở request upload.

### 3.2. Các loại file CV được hỗ trợ

Service chính: `PdfExtractionService`.

Các extension được hỗ trợ:

```text
pdf, png, jpg, jpeg, docx
```

Quy tắc validate:

- File không được rỗng.
- Extension phải thuộc danh sách hỗ trợ.
- Content-Type phải khớp với extension.
- Magic bytes phải khớp với định dạng thật:
  - PDF bắt đầu bằng `%PDF`.
  - PNG bắt đầu bằng magic bytes PNG.
  - JPG/JPEG bắt đầu bằng `FF D8 FF`.
  - DOCX là file zip OpenXML, bắt đầu bằng `PK`.

Mục tiêu của bước này là tránh người dùng đổi đuôi file giả hoặc upload file không đọc được.

Ví dụ: một file `.pdf` nhưng nội dung thật không bắt đầu bằng `%PDF` sẽ bị từ chối. Đây là lớp kiểm tra chắc hơn so với chỉ nhìn tên file.

### 3.3. Trích xuất text từ PDF

Với PDF, hệ thống xử lý theo thứ tự:

```text
PDF file
  -> kiểm tra PDF có bị encrypt không
  -> thử đọc text nhúng bằng PDFBox
  -> nếu text quá ít, render trang PDF thành ảnh
  -> chạy OCR bằng Tesseract
  -> validate lượng text extract được
```

Ngưỡng hiện tại:

```text
MIN_TEXT_LENGTH  = 50 ký tự
WARN_TEXT_LENGTH = 200 ký tự
```

Nếu text ít hơn 50 ký tự, hệ thống xem là không đủ dữ liệu và báo lỗi xử lý. Nếu từ 50 đến dưới 200 ký tự, hệ thống vẫn chấp nhận nhưng ghi log cảnh báo vì CV có thể quá nghèo thông tin.

Với PDF scan hoặc image-only, hệ thống dùng OCR nếu `app.ocr.enabled=true`. OCR dùng Tesseract CLI, có cấu hình:

- `app.ocr.tesseract-command`
- `app.ocr.languages`
- `app.ocr.dpi`
- `app.ocr.max-pages`
- `app.ocr.timeout-seconds`

Nói ngắn gọn: PDF có text thật thì đọc trực tiếp bằng PDFBox; PDF scan chỉ là ảnh thì phải OCR. Nếu OCR tắt hoặc Tesseract không chạy được, CV scan sẽ xử lý thất bại với lý do rõ ràng.

Project có thêm `ImagePreprocessingService` với grayscale, đảo ảnh nền tối, crop whitespace, resize, tăng tương phản, lọc nhiễu, deskew và adaptive binarization. Tuy nhiên `PdfExtractionService` hiện chưa inject/call service này; ảnh gửi Tesseract vẫn là ảnh đọc/render trực tiếp. Vì vậy đây là module chuẩn bị cho cải thiện OCR, chưa phải bước đang chạy trong pipeline extract hiện tại.

### 3.4. Trích xuất text từ ảnh CV

Với PNG/JPG/JPEG:

```text
Image CV
  -> đọc bằng ImageIO
  -> kiểm tra kích thước ảnh
  -> ghi ảnh tạm
  -> chạy Tesseract OCR
  -> validate text
```

Ảnh quá lớn bị chặn bằng giới hạn pixel để tránh tốn bộ nhớ hoặc làm chậm worker.

### 3.5. Trích xuất text từ DOCX

Với DOCX:

```text
DOCX
  -> mở bằng Apache POI
  -> dùng XWPFWordExtractor lấy text
  -> validate độ dài text
```

Nếu DOCX lỗi hoặc không đọc được, CV bị đánh dấu failed.

### 3.6. CV nhập tay

Service chính: `CvIngestionService.acceptManualCv`.

Với CV nhập tay, backend không cần extract file. Nó ghép các trường form thành `rawText`:

- Tên.
- Desired title.
- Seniority.
- Years of experience.
- Location.
- Summary.
- Skills.
- Nice-to-have skills.
- Education.
- Work experience.
- Projects.
- Certifications.
- Languages.

Sau đó luồng vẫn giống CV upload:

```text
rawText từ form
  -> detect language nếu cần
  -> normalize
  -> TF-IDF vector
  -> top skills
  -> parsed summary
  -> status=SCORING_DONE
  -> scoreAllJobsForCv
```

Điểm khác nhau duy nhất là CV nhập tay bỏ qua bước xử lý file/OCR. Từ đoạn `rawText` trở đi, pipeline giống CV upload.

### 3.7. Trạng thái CV

Các trạng thái quan trọng:

```text
UPLOADED
VALIDATING
PROCESSING
SCORING_DONE
FAILED
BANNED
```

Ý nghĩa:

- `UPLOADED`: metadata/file đã được nhận.
- `VALIDATING`: file đang được kiểm tra hoặc chuẩn bị extract.
- `PROCESSING`: đang extract text, normalize, vectorize.
- `SCORING_DONE`: CV đã có vector và matching có thể được tính.
- `FAILED`: CV không xử lý được, ví dụ file lỗi, OCR thất bại, text quá ít.
- `BANNED`: CV bị admin khóa sau quy trình report/moderation; không còn được dùng trong các luồng tuyển dụng có kiểm tra trạng thái cấm.

### 3.8. Retry CV thất bại và chọn CV mặc định

Candidate có thể gọi:

```text
POST /api/cvs/{cvId}/retry
```

Chỉ CV thuộc chính candidate và đang ở trạng thái `FAILED` mới được retry. Backend đặt lại `status=UPLOADED`, xóa `failureReason`, rồi chạy lại pipeline tương ứng sau transaction commit: CV upload gọi `processDocument`, còn CV nhập tay gọi `processManual`.

Endpoint `POST /api/cvs/{cvId}/set-default` chỉ chấp nhận CV đã `SCORING_DONE`. CV mặc định là đầu vào chính cho matching feed, recommendation, digest và auto-apply.

## 4. Luồng phân tích JD/job

Service chính: `JobService`.

JD là nguồn dữ liệu phía recruiter. Khi recruiter tạo job:

```text
CreateJobRequest
  -> kiểm tra role recruiter
  -> validate dữ liệu JD
  -> tạo Job entity
  -> lưu required skills, nice-to-have skills, domain, salary, seniority
  -> detect language nếu request không truyền language
  -> vectorize JD
  -> save job
  -> sau commit, scoreJobAgainstAllCvs(jobId)
```

Khi recruiter sửa JD:

```text
UpdateJobRequest
  -> kiểm tra ownership
  -> cập nhật field
  -> nếu originalText thay đổi thì vectorize lại JD
  -> save job
  -> sau commit, scoreJobAgainstAllCvs(jobId)
```

Điểm quan trọng: chỉ khi nội dung JD thay đổi thì job cần vector hóa lại và tính lại matching. Các field như salary/location/status có thể ảnh hưởng hiển thị hoặc filter, nhưng không trực tiếp tạo vector TF-IDF nếu `originalText` không đổi.

Nói đơn giản: thuật toán matching chủ yếu đọc nội dung mô tả công việc. Nếu recruiter chỉ sửa lương hoặc địa điểm, kết quả hiển thị có thể thay đổi, nhưng vector kỹ năng của JD không nhất thiết thay đổi.

## 5. Chuẩn hóa, vector hóa và tính top skills

Sau khi có raw text từ CV hoặc JD, hệ thống dùng cùng một nền xử lý:

```text
raw text
  -> detect language
  -> normalize
  -> tokens
  -> tfidf.buildVector(tokens)
```

Với CV, backend còn lấy top 15 term có trọng số TF-IDF cao nhất để lưu vào `topSkillsJson`. Summary ngắn được tạo từ tối đa 8 top skills đầu tiên.

Ví dụ:

```text
Top skills:
java, spring, postgresql, docker, rest, backend, api, microservice
```

Các top skills này giúp candidate/recruiter xem nhanh năng lực chính mà hệ thống nhận diện từ CV.

Với JD, vector cũng được tạo theo cách tương tự, nhưng hệ thống không cần lưu `topSkillsJson` như CV. JD vẫn có các field có cấu trúc như required skills, nice-to-have skills, seniority, domain để phục vụ hiển thị, filter và giải thích.

## 6. Luồng tính matching

Matching là quá trình so sánh một CV với một job.

Có hai chiều kích hoạt matching:

- CV mới xong thì đem CV đó đi so với nhiều job.
- Job mới hoặc JD thay đổi thì đem job đó đi so với nhiều CV.

### 6.1. Khi CV mới xử lý xong

Service chính: `MatchingService.scoreAllJobsForCv`.

```text
CV status=SCORING_DONE
  -> lấy tất cả job ACTIVE
  -> kiểm tra tương thích ngôn ngữ
  -> với mỗi job: scoringService.score(cv, job)
  -> upsert Matching
  -> gửi email nếu cần
  -> ghi audit CV_BATCH_MATCH_DONE
```

Tương thích ngôn ngữ:

```text
cvLang null hoặc jobLang null -> cho phép
cvLang == jobLang              -> cho phép
jobLang == "en"                -> cho phép
ngược lại                      -> bỏ qua
```

### 6.2. Khi job mới hoặc JD thay đổi

Service chính: `MatchingService.scoreJobAgainstAllCvs`.

```text
Job mới/JD đổi
  -> lấy các CV status=SCORING_DONE
  -> kiểm tra ngôn ngữ
  -> tính matching từng CV với job
```

### 6.3. Upsert matching

Với mỗi cặp CV-job, backend không tạo trùng. Nó tìm bản ghi cũ bằng `(cvId, jobId)`:

```text
Nếu đã có Matching -> cập nhật score/label/reasons
Nếu chưa có        -> tạo Matching mới
```

Bảng `matching` có unique constraint trên `(cv_id, job_id)`. Nếu có race condition, code bắt `DataIntegrityViolationException`, đọc lại bản ghi concurrent rồi cập nhật.

Nói đơn giản: một CV và một job chỉ có một kết quả matching mới nhất. Tính lại bao nhiêu lần cũng cập nhật vào bản ghi đó, không tạo nhiều dòng trùng nhau.

### 6.4. Dữ liệu trong Matching

Một matching lưu:

```text
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

Trong đó:

- `raw_score`: cosine similarity thang 0-1.
- `normalized_score`: điểm thang 0-100.
- `label`: LOW/MEDIUM/HIGH theo threshold.
- `is_potential`: cờ tiềm năng bổ sung.
- `match_reasons`: các kỹ năng/domain giải thích vì sao match.
- `potential_reason`: câu giải thích bổ sung khi heuristic Potential bật.
- `needs_recompute`: đánh dấu cần tính lại sau Rocchio hoặc thay đổi vector.

### 6.5. Potential đang chạy trong `ScoringService`

Theo implementation hiện tại, `ScoringService` dùng heuristic trực tiếp:

```text
35 <= score < 75 và có ít nhất 3 term job quan trọng trùng CV

hoặc

35 <= score < 75, seniority tương thích
và có ít nhất 2 term job quan trọng trùng CV
```

Term job chỉ được đếm khi trọng số lớn hơn `0.01`. Seniority tương thích gồm cùng level và một số level liền kề như Junior-Mid hoặc Mid-Senior.

Project có `SkillTransferService` và file `matching/skill-transfer-model.json`, nhưng `ScoringService` hiện không inject/call service này. Vì vậy skill-transfer graph chưa phải đường Potential đang vận hành trong runtime hiện tại. Khi bảo vệ, phải phân biệt rõ code đã tồn tại với code đang được nối vào pipeline.

Một giới hạn dữ liệu cần biết: trong upsert thông thường, nếu lần trước có `potentialReason` nhưng lần sau Potential trở thành false, code hiện không có nhánh xóa reason cũ. Scheduler recompute cũng chỉ cập nhật score, label và `isPotential`, không cập nhật `matchReasons` hoặc `potentialReason`. Vì vậy hai trường giải thích có thể cũ hơn kết quả score sau recompute; đây là điểm cần hoàn thiện.

## 7. Query ranking và feed kết quả

Scoring không chạy lại mỗi lần người dùng mở UI. Kết quả đã được lưu trong bảng `matching`, sau đó query service đọc ra.

Service chính: `MatchingQueryService`.

Các view chính:

- Candidate xem job phù hợp với CV mặc định.
- Recruiter xem ranking candidate theo từng job.
- Recruiter discovery candidate với filter label, potential, application status, min score.

Sắp xếp mặc định:

```text
score giảm dần
-> potential trước nếu điểm bằng
-> updated mới hơn
-> id tăng dần để ổn định thứ tự
```

Nếu nhiều candidate cùng điểm, response có `TieBreakMeta` để UI biết:

- Rank hiện tại.
- Rank đầu của nhóm hòa điểm.
- Kích thước nhóm hòa.
- Có bị tie hay không.
- Rule tie-break đang dùng.

Phần này không phải thuật toán scoring mới. Nó chỉ giúp danh sách hiển thị ổn định và giải thích được khi nhiều ứng viên có cùng điểm.

### 7.1. Recommendation feed cho candidate

`RecommendationService` tạo feed riêng tại:

```text
GET /api/recommendations/jobs
GET /api/recommendations/jobs/{jobId}/similar
```

Recommendation không thay thế bảng matching. Khi default CV đã `SCORING_DONE` và có matching đủ dùng, service lấy tối đa gấp đôi số lượng cần trả rồi re-rank:

```text
skillBoost    = tỷ lệ desired skill có trong required skill * 30
locationBoost = 15 nếu location hai phía chứa nhau, ngược lại 0

finalScore = min(100,
    0.7 * matchingScore
  + 0.2 * skillBoost
  + 0.1 * locationBoost)
```

Do `skillBoost` đã có trần 30 và `locationBoost` có trần 15, đóng góp tối đa thực tế sau khi nhân hệ số lần lượt là 6 và 1.5 điểm. Ngay cả khi matching score bằng 100, `finalScore` tối đa theo công thức hiện tại chỉ là `77.5`; phép `min(100, ...)` gần như không chạm trần. Vì vậy cosine matching vẫn chi phối phần lớn thứ tự recommendation, nhưng thang final score không còn tương đương thang matching 0-100.

Service fallback sang profile-based recommendation khi:

- Candidate chưa có default CV.
- CV chưa `SCORING_DONE` hoặc đang `FAILED`.
- Chưa có matching, hoặc best matching thấp hơn `scoreLabelLowMax` hiện là 40.

Fallback profile cộng tối đa 40 điểm khi title phù hợp, tối đa 30 điểm skill overlap và 15 điểm location. Kết quả dùng label `UNKNOWN`, không phải nhãn matching.

Luồng similar jobs so sánh tỷ lệ required skill trùng với job tham chiếu, chỉ giữ score lớn hơn 20 và trả tối đa 10 job. Nếu job tham chiếu không có structured skill, service fallback sang các job cùng seniority với score cố định 30.

Điểm cần nói đúng: recommendation score là điểm xếp hạng sản phẩm, không phải cosine score và cũng không phải xác suất ứng viên được tuyển.

## 8. Feedback và học lại bằng Rocchio

Feedback có thể đến từ web hoặc email.

Service chính:

- `FeedbackService`: nhận và lưu feedback.
- `RocchioService`: học lại job vector.

Luồng:

```text
User gửi feedback
  -> kiểm tra matching tồn tại
  -> kiểm tra user có quyền feedback matching đó
  -> upsert feedback theo (matchingId, actorId)
  -> ghi audit FEEDBACK_SUBMITTED
  -> sau commit, nếu là learning signal thì gọi Rocchio
```

Feedback kích hoạt học:

```text
GOOD_MATCH
POTENTIAL
BAD_MATCH
```

Feedback không kích hoạt học:

```text
NOT_INTERESTED
```

Lý do: `NOT_INTERESTED` có thể do lương, công ty, địa điểm, thời điểm, không nhất thiết do kỹ năng không phù hợp.

Rocchio cập nhật learned vector:

```text
q_new = alpha * q
      + beta  * centroid(positive CVs)
      - gamma * centroid(negative CVs)
```

Với hệ số hiện tại:

```text
alpha = 1.0
beta  = 0.75
gamma = 0.15
```

Sau khi cập nhật `learnedProfileVectorJson`, tất cả matching của job được đánh dấu `needsRecompute=true`. Scheduler sẽ tính lại sau.

Điểm cần hiểu rõ: feedback không lập tức sửa trực tiếp điểm trên từng matching. Feedback làm thay đổi learned vector của job trước, sau đó hệ thống đánh dấu các matching liên quan là cần tính lại. Việc tính lại được scheduler xử lý để tránh làm request feedback bị chậm.

## 9. Kênh email

Email trong CareerFit có hai nhóm chính:

1. Lifecycle email: thông báo trạng thái, nhắc cập nhật CV, application submitted, approved, rejected, interview, auto-applied.
2. Action email: email có token để candidate phản hồi matching trực tiếp từ email.

Nói dễ hiểu:

- Lifecycle email giống email thông báo trạng thái.
- Action email giống email có nút bấm để người dùng phản hồi mà không cần mở app trước.

### 9.1. Lifecycle email

Service chính: `NotificationEmailService`.

Các tình huống gửi:

- Không có job phù hợp sau khi scan CV.
- Chỉ có low match.
- Candidate submit application.
- AutoPilot tự động apply.
- Candidate withdraw application.
- Application approved/rejected.
- Interview invited/rescheduled/cancelled.
- Recruiter có application mới.
- Recruiter có candidate điểm cao.

Trước khi gửi, email đi qua `NotificationPolicyGuard`.

### 9.2. Notification policy guard

`NotificationPolicyGuard` quyết định email có được gửi không.

Các điều kiện chặn:

```text
recipient missing
emailNotificationsEnabled=false
đang trong quiet hours
vượt maxEmailPerDay
đang trong cooldown với cùng emailType/contextKey
```

Mỗi lần email được gửi, skip hoặc fail đều ghi vào `NotificationDeliveryLog`. Điều này giúp debug vì sao user không nhận email.

### 9.3. Match notification email có token

Service chính: `EmailActionService.sendMatchNotification`.

Khi có high match đủ điều kiện, email có các action:

```text
GOOD_MATCH
POTENTIAL
NOT_INTERESTED
VIEW_JOB
```

Mỗi action tạo một token riêng:

```text
token random 32 ký tự
-> hash SHA-256
-> lưu token_hash vào bảng email_action_token
-> token plaintext chỉ nằm trong link email
-> hết hạn sau 72 giờ
```

Lưu token hash thay vì token gốc giúp giảm rủi ro nếu database bị lộ.

Token plaintext chỉ xuất hiện trong link email gửi cho user. Khi user bấm link, backend hash token đó rồi so với `token_hash` trong database.

### 9.4. Daily digest email

Scheduler gửi digest hằng ngày cho candidate có policy phù hợp. Digest gồm tối đa 5 top matches vượt ngưỡng.

Mỗi item trong digest có token:

```text
GOOD_MATCH
NOT_INTERESTED
```

Digest cũng có token `UNSUBSCRIBE_DIGEST`. Lưu ý theo code hiện tại, action này có log nhưng phần cập nhật policy hủy digest chưa được gọi đầy đủ trong controller, vì comment ghi "call not shown — avoids circular dep".

Khi trình bày, nên nói rõ đây là phần còn cần hoàn thiện nếu muốn unsubscribe digest hoạt động đầy đủ ở production.

### 9.5. Redeem email token

Controller chính: `EmailActionController`.

Endpoint public:

```text
GET  /api/email-action/redeem?token=<token>
POST /api/email-action/redeem?token=<token>
```

Thiết kế hiện tại tách GET và POST:

```text
GET
  -> tìm token hash
  -> kiểm tra tồn tại/pending/chưa hết hạn
  -> hiển thị trang xác nhận
  -> không đổi dữ liệu

POST
  -> kiểm tra lại token
  -> thực thi action
  -> nếu là feedback thì gọi FeedbackService
  -> mark token REDEEMED
  -> trả trang success/error
```

Tách GET/POST là điểm bảo vệ tốt. Một số email client hoặc security scanner có thể tự mở link GET. Nếu GET đổi trạng thái ngay, scanner có thể vô tình submit feedback. Ở code hiện tại, chỉ POST xác nhận mới thực thi.

Đây là điểm đáng nhấn mạnh: mở email link chưa làm thay đổi dữ liệu. Người dùng phải bấm xác nhận để POST.

### 9.6. Vòng đời token email

Entity chính: `EmailAction`.

Trạng thái:

```text
PENDING
REDEEMED
EXPIRED
```

Token hết hạn sau 72 giờ. Scheduler cleanup token chạy hằng ngày:

```text
expire token quá hạn
delete token đã expired quá 30 ngày
```

### 9.7. Durable notification outbox: nền móng đã có, chưa là đường gửi chính

Migration V31 tạo bảng `notification_outbox` với các trạng thái:

```text
PENDING
PROCESSING
SENT
FAILED
```

`OutboxService.enqueue()` yêu cầu target là `MATCHING` hoặc `JOB`, sau đó insert idempotent theo khóa:

```text
(recipient_user_id, email_type, target_type, target_key)
```

Nhờ `ON CONFLICT DO NOTHING`, cùng một recipient/type/target không tạo nhiều outbox item. Bảng còn có `scheduled_at`, `attempt_count`, `last_error` và `sent_at`; migration V32 thêm index để tìm item `PROCESSING` bị kẹt.

Unique constraint áp dụng bất kể status. Vì vậy nếu một item đã `FAILED` hoặc `SENT`, enqueue lại cùng identity vẫn bị bỏ qua; muốn hỗ trợ retry/resend cần cập nhật row cũ hoặc thiết kế thêm khóa occurrence/version.

Tuy nhiên, theo code runtime hiện tại:

- Không có service/scheduler đọc item `PENDING` để claim và gửi.
- Không có luồng recovery chuyển item `PROCESSING` bị kẹt về trạng thái có thể retry.
- Các service email hiện vẫn gọi `IMailService`/`EmailActionService` trực tiếp.
- `OutboxService` hiện chỉ được dùng trong test, chưa được gọi bởi luồng nghiệp vụ chính.

Vì vậy đây là **durable outbox foundation**, chưa phải hệ thống gửi email qua outbox hoàn chỉnh. Không nên trình bày rằng email production đã có retry bền vững qua outbox.

Một chi tiết logging: lifecycle email gọi mail service bất đồng bộ. `NotificationEmailService` ghi delivery `SENT` sau khi giao việc cho mail service; vì vậy log này gần với "đã chấp nhận gửi" hơn là biên nhận SMTP cuối cùng. `MailService` tự log lỗi phát sinh trong worker bất đồng bộ.

## 10. Scheduler

Service chính: `AutomationScheduler`.

Scheduler chỉ hoạt động nếu:

```text
app.scheduling.enabled=true
```

hoặc property này không được cấu hình, vì `matchIfMissing=true`.

Scheduler là phần "tự chạy" của hệ thống. Người dùng không gọi trực tiếp các hàm này; Spring Boot gọi chúng theo lịch cấu hình.

### 10.1. Recompute stale matchings

Chạy theo:

```text
app.scheduler.recompute-delay-ms
mặc định 30 phút
```

Luồng:

```text
find matching needsRecompute=true
  -> scoringService.score(cv, job)
  -> update rawScore/normalizedScore/label/isPotential
  -> needsRecompute=false
```

Scheduler hiện không ghi lại `matchReasons` và `potentialReason` từ `ScoringResult`. Do đó recompute làm mới điểm/cờ nhưng chưa bảo đảm phần giải thích được làm mới cùng lúc.

Nguồn phổ biến làm `needsRecompute=true` là Rocchio update learned vector của job.

Ví dụ: recruiter đánh giá một CV là rất phù hợp. Rocchio cập nhật learned vector của job. Các matching cũ của job đó chưa dùng vector mới, nên bị đánh dấu cần tính lại.

### 10.2. Daily digest

Chạy theo cron:

```text
app.scheduler.daily-digest-cron
mặc định 08:00 hằng ngày theo Asia/Ho_Chi_Minh
```

Điều kiện:

- Policy bật digest và autopilot.
- Không bị pause.
- Candidate có default CV.
- CV đã `SCORING_DONE`.
- Có top matches vượt `minScoreToNotify`.
- Tôn trọng notify-on-high-only và notify-potential.

Sau đó gọi `EmailActionService.sendDigest`.

Lưu ý theo code hiện tại: daily digest đang lấy policy có cả `digestEnabled=true` và `autopilotEnabled=true`. Vì vậy bật digest đơn lẻ chưa chắc đủ nếu autopilot không bật.

### 10.3. Token cleanup

Chạy theo cron:

```text
app.scheduler.token-cleanup-cron
mặc định 03:00 hằng ngày theo Asia/Ho_Chi_Minh
```

Nhiệm vụ:

- Chuyển token pending quá hạn sang `EXPIRED`.
- Xóa token expired quá 30 ngày.

### 10.4. High match notification

Chạy theo:

```text
app.scheduler.notification-delay-ms
mặc định 4 giờ
```

Điều kiện:

- Chỉ chạy trong giờ 07:00-22:00 ICT.
- Policy bật autopilot.
- Không pause.
- Candidate có default CV `SCORING_DONE`.
- Best match vượt ngưỡng `minScoreToNotify`.
- Match có label `HIGH`.

Sau đó gọi `EmailActionService.sendMatchNotification`.

### 10.5. Auto-apply

Chạy theo:

```text
app.scheduler.auto-apply-delay-ms
mặc định 2 giờ
```

Service chính: `AutoApplyService`.

Luồng:

```text
policy autoApplyEnabled=true
  -> tìm candidate theo user
  -> lấy default CV status=SCORING_DONE
  -> lấy top 20 matches
  -> lọc job ACTIVE
  -> score >= autoApplyThreshold
  -> chưa từng apply job này
  -> tạo Application(autoApplied=true)
  -> audit AUTO_APPLY_EXECUTED
  -> gửi email candidate và recruiter
```

Giới hạn hiện tại:

```text
MAX_AUTO_APPLY_PER_RUN = 3
```

Giới hạn này giúp tránh tự động apply quá nhiều trong một lượt chạy.

Vì auto-apply là hành động có tác động thật đến ứng tuyển, hệ thống cần ngưỡng điểm, chống trùng và giới hạn số lượng mỗi lượt chạy.

### 10.6. Stored policy và effective policy

`AutomationPolicyService` quản lý policy lưu trong database. `EffectiveAutomationPolicyResolver` tạo một projection dùng cho Settings UI:

- Tài khoản imported bị ép tắt demo mode, autopilot, auto-apply, email notification, digest và email action trong effective response.
- Demo mode bỏ cooldown/quiet hours và trả timing nhanh: poll 5 giây, gợi ý đầu sau 12 giây, cách nhau 30 giây, recovery cadence 30 giây.
- Normal mode trả timing chậm hơn: poll 5 phút, spacing/recovery 1 giờ.

Điểm cần phân biệt: resolver hiện chỉ được `SettingsService` sử dụng để trả cấu hình/timing cho frontend. `AutomationScheduler`, `NotificationPolicyGuard` và `AutoApplyService` vẫn đọc `AutomationPolicy` đã lưu trực tiếp. Vì vậy các giá trị effective chưa phải một lớp enforcement thống nhất cho toàn bộ backend.

Ví dụ, việc effective response tắt email cho imported user không tự động chứng minh mọi scheduler đã bỏ qua user đó nếu stored policy vẫn bật. Muốn policy có hiệu lực nhất quán, các consumer nghiệp vụ cần cùng gọi resolver hoặc policy phải được normalize trước khi lưu.

## 11. Auto-apply và application workflow

Auto-apply tạo `Application` giống một ứng tuyển thật, nhưng có cờ cho biết được tạo bởi hệ thống.

Các kiểm tra quan trọng:

- Candidate phải có CV mặc định.
- CV phải scoring xong.
- Job phải active.
- Matching phải vượt ngưỡng policy.
- Không được tạo application trùng candidate-job.
- Có audit để truy vết.
- Có email thông báo cho candidate và recruiter.

Nếu insert bị trùng do race condition, code bắt `DataIntegrityViolationException` và bỏ qua duplicate.

## 12. Audit và logging

Các hành động quan trọng được ghi audit:

- Upload CV.
- Tạo CV thủ công.
- CV processing failed.
- Batch matching done.
- Feedback submitted.
- Auto-apply executed.

Ngoài audit nghiệp vụ, email còn có delivery log:

```text
SENT
SKIPPED
FAILED
```

Khi debug production, hai nguồn log này rất quan trọng:

- Audit log trả lời: ai làm gì, với đối tượng nào.
- Delivery log trả lời: email có được gửi không, nếu không thì vì sao.

Nói cách khác: audit log theo dõi hành động nghiệp vụ; delivery log theo dõi riêng kênh email.

Outbox bổ sung một nguồn trạng thái vận hành khác gồm `PENDING/PROCESSING/SENT/FAILED`, `attemptCount` và `lastError`. Tuy nhiên vì worker outbox chưa được nối, các trạng thái này hiện chủ yếu mô tả schema/foundation chứ chưa phản ánh toàn bộ email đang gửi.

## 13. Các trạng thái dữ liệu cần nắm

### 13.1. CV

```text
UPLOADED -> VALIDATING/PROCESSING -> SCORING_DONE
                                  -> FAILED
SCORING_DONE/FAILED/... -> BANNED sau moderation
```

`FAILED` có thể quay lại `UPLOADED` qua endpoint retry. `BANNED` là trạng thái quản trị, không phải lỗi kỹ thuật của OCR/scoring.

### 13.2. Matching

```text
created/updated
  -> label LOW/MEDIUM/HIGH
  -> optional isPotential=true
  -> optional needsRecompute=true sau Rocchio
  -> scheduler recompute
  -> needsRecompute=false
```

### 13.3. Feedback

```text
GOOD_MATCH
POTENTIAL
BAD_MATCH
NOT_INTERESTED
```

Learning signal:

```text
GOOD_MATCH, POTENTIAL, BAD_MATCH
```

Non-learning signal:

```text
NOT_INTERESTED
```

### 13.4. Email action token

```text
PENDING -> REDEEMED
PENDING -> EXPIRED
EXPIRED -> deleted after cleanup window
```

### 13.5. Application

Các trạng thái application được email lifecycle xử lý gồm:

```text
PENDING
AUTO_APPLIED
APPROVED
REJECTED
INVITED
NOT_INTERESTED
INTERVIEW_RESCHEDULED
INTERVIEW_CANCELLED
```

### 13.6. Notification outbox

```text
PENDING -> PROCESSING -> SENT
                     -> FAILED
```

Đây là state machine theo thiết kế schema. Runtime hiện chưa có processor thực hiện đầy đủ các transition này.

## 14. Những điểm nên nhấn mạnh khi bảo vệ

1. Hệ thống không chỉ chấm điểm bằng một công thức đơn lẻ. Nó là pipeline gồm extract text, normalize, vectorize, scoring, recommendation, feedback learning và notification.
2. CV upload có validate định dạng thật bằng content type và magic bytes, không chỉ tin vào tên file.
3. PDF có hai đường extract: text nhúng bằng PDFBox và OCR fallback cho file scan.
4. Matching được tính nền và lưu vào database, nên UI đọc nhanh thay vì tính lại mỗi request.
5. Feedback không cập nhật điểm ngay trực tiếp; nó cập nhật learned vector rồi đánh dấu matching cần recompute.
6. Email action token được hash trong database và hết hạn sau 72 giờ.
7. GET email link chỉ hiển thị xác nhận, POST mới thay đổi dữ liệu, giúp tránh email scanner kích hoạt nhầm.
8. Scheduler chịu trách nhiệm cho recompute, digest, token cleanup, high-match notification và auto-apply.
9. Auto-apply có ngưỡng policy, chống duplicate và giới hạn 3 application mỗi lượt chạy.
10. Audit log và delivery log giúp truy vết các quyết định quan trọng.
11. Recommendation score là điểm re-rank sản phẩm, khác cosine matching score.
12. Outbox và image preprocessing đã có nền móng nhưng chưa được nối vào luồng runtime chính; cần trình bày đúng mức độ hoàn thiện.
13. Effective policy hiện được dùng cho Settings projection, chưa được mọi scheduler/guard dùng thống nhất.
14. Potential runtime hiện vẫn là heuristic trong `ScoringService`; skill-transfer graph tồn tại nhưng chưa được gọi.

## 15. Câu trả lời mẫu ngắn

Nếu được hỏi "hệ thống xử lý CV và matching như thế nào?", có thể trả lời:

> Khi candidate upload CV, backend validate file PDF/ảnh/DOCX, trích xuất text bằng PDFBox/Apache POI hoặc OCR Tesseract nếu là scan/ảnh. Text được chuẩn hóa, detect language, loại stopword rồi chuyển thành vector TF-IDF. JD cũng được vector hóa tương tự khi recruiter tạo hoặc sửa job. Matching được tính bằng cosine similarity, gán nhãn và lưu vào database; recommendation có thể re-rank kết quả theo desired skill và location. Nếu người dùng feedback qua web hoặc email, Rocchio cập nhật learned vector của job và scheduler tính lại các matching liên quan. Kênh email có lifecycle, digest và token feedback; token được hash, có hạn 72 giờ, GET chỉ xác nhận còn POST mới thực thi hành động.

## 16. File code nên đọc kèm

- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/cv/service/CvIngestionService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/cv/service/PdfExtractionService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/cv/service/ImagePreprocessingService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/job/service/JobService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/common/util/TextNormalizationService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/common/util/TfIdfService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/matching/service/ScoringService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/matching/service/MatchingService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/matching/service/MatchingQueryService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/matching/service/SkillTransferService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/recommendation/service/RecommendationService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/feedback/service/FeedbackService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/feedback/service/RocchioService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/notification/service/NotificationEmailService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/notification/service/EmailActionService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/notification/controller/EmailActionController.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/notification/service/OutboxService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/notification/entity/NotificationOutbox.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/scheduler/AutomationScheduler.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/automation/service/AutoApplyService.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/automation/service/EffectiveAutomationPolicyResolver.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/settings/service/SettingsService.java`
