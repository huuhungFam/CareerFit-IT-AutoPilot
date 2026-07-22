# Đọc Hiểu Sâu Backend CareerFit

## 1. Bản đồ tổng quát

Backend nằm tại `Backend/careerfit-backend`, sử dụng Java, Spring Boot, Maven, Spring Security, Spring Data JPA và Flyway. Cách đọc một request điển hình:

```text
HTTP request
  -> Security filters
  -> Controller
  -> DTO validation
  -> Service nghiệp vụ
  -> Repository
  -> PostgreSQL
  -> ApiResponse / Exception handler
```

Nguyên tắc quan trọng: Controller nhận/gửi HTTP; Service giữ business rule; Repository truy cập dữ liệu; Entity ánh xạ bảng; DTO là hợp đồng API.

## 2. Điểm khởi động và cấu hình

- `CareerFitBackendApplication.java`: entry point, bật ứng dụng Spring.
- `pom.xml`: dependency và Maven lifecycle.
- `application.yml`: cấu hình chung.
- `application-dev.yml`, `application-prod.yml`: khác biệt theo môi trường.
- `AppProperties.java`: gom các thuộc tính ứng dụng như JWT, matching và CORS.

Khi bảo vệ, cần phân biệt source code với runtime configuration. Cùng một file JAR có thể chạy khác nhau theo profile và biến môi trường.

## 3. Cấu trúc domain

| Package | Trách nhiệm |
|---|---|
| `auth` | Đăng ký, đăng nhập, JWT, thông tin tài khoản |
| `candidate`, `cv` | Hồ sơ ứng viên, CV, portfolio và chính sách hiển thị portfolio |
| `job`, `employer` | Tin tuyển dụng và doanh nghiệp |
| `matching`, `recommendation` | Tính điểm và phân phối kết quả |
| `application` | Vòng đời ứng tuyển |
| `feedback` | Thu nhận feedback và Rocchio |
| `automation` | Policy, auto-apply và pause/resume |
| `notification` | Email, token và delivery log |
| `analytics` | Chỉ số thị trường và dashboard |
| `admin`, `audit` | Quản trị và truy vết |
| `config`, `common` | Bảo mật, response, exception và tiện ích chung |

## 4. Một request chạy như thế nào?

Ví dụ Candidate gọi `GET /api/matches/me/cards`:

1. `JwtAuthenticationFilter` đọc Bearer token, xác minh chữ ký và thời hạn.
2. Spring Security kiểm tra endpoint có yêu cầu đăng nhập/role hay không.
3. `UserIdResolutionFilter` hỗ trợ xác định user hiện tại theo cơ chế của ứng dụng.
4. `MatchingController` nhận query phân trang.
5. `MatchingQueryService` lấy candidate/CV phù hợp và truy vấn matching.
6. Entity được chuyển thành DTO/card dành cho UI.
7. Kết quả được bọc theo response contract hoặc trả về qua `ResponseEntity`.
8. Nếu có lỗi nghiệp vụ, `GlobalExceptionHandler` chuyển lỗi thành HTTP status và payload nhất quán.

## 5. Security

### 5.1. `SecurityConfig`

`SecurityConfig` khai báo filter chain, endpoint công khai, endpoint bảo vệ, CORS, password encoder và cách trả lỗi 401/403. Các endpoint đăng ký/đăng nhập/passwordless và `GET/POST /api/email-action/redeem` là public theo contract riêng; dữ liệu Candidate, Recruiter và Admin vẫn bị giới hạn theo role.

- **401 Unauthorized**: chưa có hoặc token không hợp lệ.
- **403 Forbidden**: đã xác thực nhưng không có quyền.

Role guard phải nằm ở backend. Ẩn menu trên frontend chỉ là UX, không phải bảo mật.

### 5.2. JWT

`JwtService` tạo và xác minh token. Token mang identity/role đủ để backend tái lập authentication. Ngoài mật khẩu, `AuthService` hỗ trợ passwordless request, bước `GET` để kiểm tra token và bước `POST` để tiêu thụ token rồi phát JWT. Secret và expiration phải đến từ cấu hình an toàn; không hard-code secret Production.

### 5.3. Password và account

Password phải được hash bằng `PasswordEncoder`; backend không lưu plaintext. `AuthService` chịu trách nhiệm đăng ký, đăng nhập và kiểm tra trạng thái tài khoản.

### 5.4. Rate limit và Production guard

`RateLimitFilter` hạn chế lạm dụng request. `ProductionConfigValidator` chặn cấu hình nguy hiểm khi chạy profile Production. Đây là lớp giảm rủi ro, không thay thế API gateway/WAF ở hệ thống lớn.

## 6. Database, JPA và Flyway

Entity biểu diễn trạng thái nghiệp vụ; Repository kế thừa Spring Data để truy vấn; Flyway tạo và nâng cấp schema có phiên bản.

### Vì sao dùng Flyway?

- Mọi môi trường dùng cùng lịch sử schema.
- Có thể review thay đổi database như code.
- Tránh sửa tay khiến dev/test/prod lệch nhau.

### Transaction

`@Transactional` cần đặt quanh một use case phải thành công hoặc thất bại cùng nhau. Ví dụ tạo application và audit liên quan không nên để một phần thành công, một phần thất bại.

Không nên mở transaction quá dài để bao gồm gửi email hoặc gọi mạng. Tốt hơn là commit dữ liệu nghiệp vụ, sau đó phát event/job có cơ chế retry.

## 7. Candidate và CV

Các class quan trọng:

- `CandidateController`, `CandidateProfileService`.
- `CvController`, `CvManagementService`, `CvIngestionService`.
- `PdfExtractionService`, `TextNormalizationService`, `TfIdfService`.
- `Candidate`, `CV`, portfolio link/project và các repository tương ứng.

Luồng upload CV:

1. Controller nhận multipart file.
2. Service kiểm tra ownership, định dạng và giới hạn.
3. Storage lưu file và transaction lưu metadata CV commit.
4. `AfterCommitExecutor` mới đưa xử lý nền vào `taskExecutor`, tránh worker đọc CV trước khi transaction tạo CV hoàn tất.
5. Extractor đọc PDF, PNG, JPG hoặc DOCX; ảnh/file scan có thể qua OCR.
6. Text normalization chuẩn hóa chữ, khoảng trắng và thuật ngữ.
7. TF-IDF tạo vector JSON, top terms và summary.
8. CV chuyển qua `UPLOADED → VALIDATING/PROCESSING → SCORING_DONE | FAILED`.
9. `MatchingService.scoreAllJobsForCv(cvId)` nạp lại CV theo ID rồi upsert matching với job active; frontend polling endpoint status để phản ánh tiến trình.

CV mặc định có ý nghĩa vì một candidate có thể có nhiều CV cho nhiều định hướng. Matching cá nhân cần biết CV nào là đại diện hiện tại.

## 8. Job và Employer

`JobController` hỗ trợ danh sách/search, suggestion, chi tiết, tạo, sửa, đổi trạng thái, xóa và export. `JobService` giữ rule về ownership, trạng thái và validation. Sau khi job được tạo/cập nhật và transaction commit, `AfterCommitExecutor` gọi `scoreJobAgainstAllCvs(jobId)`.

JD cần đủ nội dung để tính matching. Trường kỹ năng có cấu trúc giúp giải thích tốt hơn so với chỉ dựa vào toàn bộ văn bản tự do.

Employer profile tách khỏi job vì một doanh nghiệp có nhiều job và có thông tin dùng chung như tên, mô tả, địa điểm hoặc nhận diện.

## 9. Matching engine

### 9.1. Thành phần chính

- `TfIdfService`: tạo vector và cosine similarity.
- `ScoringService`: tính cosine score, gán nhãn, nhận diện tiềm năng và tạo lý do matching.
- `MatchingService`: tạo/cập nhật matching.
- `MatchingBatchService`: xử lý lại theo lô.
- `MatchingQueryService`: phục vụ truy vấn card/ranking.

### 9.2. TF-IDF dễ hiểu

TF đo mức xuất hiện của từ trong tài liệu. IDF giảm trọng số của từ xuất hiện ở quá nhiều tài liệu. Một kỹ năng đặc trưng như `kubernetes` thường hữu ích hơn từ chung như `work`.

Cosine similarity đo góc giữa hai vector. Hai tài liệu có hướng vector giống nhau sẽ có điểm cao, bất kể độ dài tuyệt đối.

```text
cosine(A, B) = (A · B) / (|A| × |B|)
```

### 9.3. `ScoringService`

Method trung tâm là `score(CV cv, Job job)`. Score hiện được tính đúng theo `cosineSimilarity(cvVec, jobVec) × 100`, làm tròn hai chữ số, rồi gán `LOW/MEDIUM/HIGH` theo ngưỡng cấu hình. Nếu job có `learnedProfileVectorJson`, vector học được được ưu tiên thay cho vector TF-IDF gốc.

Seniority không được cộng thêm vào score. Nó chỉ tham gia heuristic `isPotential` cùng số term chung. `matchReasons` là tối đa năm term chung có trọng số cao, có thể chèn thêm domain của job; backend chưa sinh danh sách missing skills riêng.

Điểm cần nhớ: score là heuristic được thiết kế, không phải xác suất ứng viên sẽ thành công.

### 9.4. Edge cases

- Vector thiếu hoặc JSON lỗi: phải xử lý an toàn và log đủ thông tin.
- CV chưa xử lý xong: không nên trả matching giả.
- Seniority chỉ ảnh hưởng heuristic potential, không làm tăng/giảm score cosine.
- Điểm bằng nhau: response ranking/discovery có `TieBreakMeta` để UI giải thích thứ hạng, kích thước nhóm hòa và độ mới.
- Không có kết quả: trả empty state đúng, không bí mật dùng mock data.

## 10. Recommendation

`RecommendationService` lấy matching đã tính và áp dụng điều kiện truy vấn/sắp xếp để trả job phù hợp hoặc job tương tự. Tách recommendation khỏi scoring giúp không phải tính lại toàn bộ thuật toán ở mọi request đọc.

## 11. Application workflow

`ApplicationService` quản lý trạng thái ứng tuyển. Các API chính:

- `POST /api/applications`: Candidate apply.
- `GET /api/applications/me`: Candidate xem lịch sử.
- `DELETE /api/applications/{id}`: withdraw theo rule.
- `GET /api/recruiter/jobs/{jobId}/applicants`: Recruiter xem applicant.
- `PATCH /api/recruiter/applications/{id}/status`: cập nhật trạng thái.
- `POST /api/recruiter/jobs/{jobId}/candidates/{candidateId}/invite`: mời candidate.

Rule đã có gồm chống application trùng ở service lẫn unique constraint, kiểm tra job còn hoạt động, ownership, CV thuộc Candidate và optimistic locking bằng `@Version`. Riêng `updateStatus` hiện mới xác minh enum/ownership rồi gán trạng thái; chưa có ma trận transition đầy đủ.

## 12. Recruiter ranking

`RecruiterController` và `RecruiterDashboardController` cung cấp dashboard, stats, top candidates, ranking và candidate discovery.

Recruiter ranking không chỉ đọc bảng application. Nó có thể dùng matching để tìm cả candidate chưa apply. Response discovery/applicant còn kèm trạng thái hiển thị portfolio: chỉ trả portfolio sau khi Candidate đã apply và setting `showPortfolioAfterApply` cho phép.

## 13. Feedback và Rocchio

Web feedback hiện là Candidate-only: `POST /api/matches/{matchingId}/feedback?type=...&channel=WEB`. Controller không nhận role tùy ý từ JSON; service xác minh matching thuộc CV của Candidate. Frontend đã dùng đúng query contract. Email action cũng gọi cùng service với identity của recipient.

Feedback được upsert theo `(matchingId, actorId)` và audit. Với `GOOD_MATCH`, `POTENTIAL` hoặc `BAD_MATCH`, Rocchio chỉ được gọi sau khi transaction feedback commit; `NOT_INTERESTED` không kích hoạt Rocchio.

Công thức khái quát:

```text
q_mới = alpha × q_cũ
      + beta  × tâm các vector tích cực
      - gamma × tâm các vector tiêu cực
```

Trong code hiện tại, các hệ số được khai báo rõ trong `RocchioService`. Thuật toán loại trọng số không dương nhưng không chuẩn hóa độ dài vector trước khi lưu. Sau đó matching của job được đặt `needsRecompute=true`; scheduler recompute định kỳ mới tính lại score.

Rủi ro cần nêu:

- Quá ít feedback làm vector dao động.
- Feedback thiên lệch có thể khuếch đại bias.
- Cần versioning, metrics trước/sau và khả năng rollback khi triển khai thật.

## 14. Automation và AutoFit

`AutomationPolicyService` quản lý policy của người dùng. `AutoApplyService.runForPolicy(...)` thực hiện auto-apply trong giới hạn. Code hiện có giới hạn số auto-apply trong một lượt để tránh hành động hàng loạt ngoài ý muốn.

Một candidate chỉ nên được auto-apply khi:

1. Policy auto-apply đang bật.
2. Có CV mặc định hợp lệ.
3. Matching vượt ngưỡng cấu hình.
4. Job còn hoạt động.
5. Chưa có application.
6. Chưa vượt giới hạn.
7. Hành động được audit.

API policy hiện hành gồm `GET/PATCH /api/automation/policy`, toggle email, run-now, pause và resume. Tuy nhiên `getPausedUntil()` vẫn trả `null`, setter chưa lưu dữ liệu và auto-apply scheduler không kiểm tra pause. Vì vậy pause/resume hiện chưa phải cơ chế dừng Auto-Apply đáng tin cậy và không được frontend trình diễn.

## 15. Scheduler

`AutomationScheduler` có các nhiệm vụ chính:

- `recomputeStaleMatchings()`.
- `sendDailyDigest()`.
- `cleanupExpiredTokens()`.
- `notifyHighMatches()`.
- `executeAutoApply()`.

Scheduler phải idempotent: chạy lại không được tạo application hoặc email trùng. Khi scale nhiều instance, Production cần distributed lock hoặc một worker chuyên trách.

## 16. Email action và token

`NotificationEmailService` tạo nội dung/thông báo; `EmailActionService` quản lý hành động; `EmailActionController` dùng `/api/email-action/redeem` theo hai bước: `GET` hiển thị xác nhận không đổi trạng thái, `POST` mới thực thi action.

Token hành động cần:

- Ngẫu nhiên đủ mạnh và chỉ lưu dạng an toàn khi phù hợp.
- Có thời hạn.
- Dùng một lần hoặc có rule chống replay.
- Gắn đúng action, subject và resource.
- Ghi delivery/action log.

Email scanner có thể mở link trước người dùng, vì vậy flow Production cần confirmation step hoặc cơ chế chống bot kích hoạt nhầm.

## 17. Analytics, audit và admin

Analytics đọc dữ liệu tổng hợp cho market, candidate và recruiter. Analytics hỗ trợ quyết định nhưng không nên làm chậm transaction chính.

Audit log trả lời: ai, làm gì, với đối tượng nào, khi nào và kết quả ra sao. Không nên ghi password, token nguyên bản hoặc CV text nhạy cảm vào log.

Admin API quản lý user, job, audit, email action/token và rebuild matching. Mỗi API admin phải được bảo vệ bằng role ở backend.

## 18. Exception và response

`ApiResponse` tạo shape chung. `AppException`, `ValidationException` và `GlobalExceptionHandler` tách lỗi dự kiến khỏi lỗi hệ thống.

Một lỗi tốt cần có:

- HTTP status đúng.
- Mã lỗi ổn định cho frontend.
- Message dễ hiểu nhưng không lộ nội bộ.
- Field errors cho validation.
- Correlation ID ở Production.

## 19. Testing

Repo có unit test cho scoring, Rocchio, matching batch, job, settings, auto-apply, PDF extraction và các phần mới như `AfterCommitExecutor`, auth, CV ingestion, feedback authorization và properties; integration/contract test cho context, API và security.

Khi bảo vệ, phân biệt:

- Unit test chứng minh một class/function theo input kiểm soát.
- Integration test chứng minh nhiều lớp phối hợp.
- E2E chứng minh hành trình qua UI/API/runtime.
- Benchmark chứng minh chất lượng thuật toán trên dataset xác định.

Một nhóm test xanh không tự động chứng minh toàn hệ thống Production-ready.

## 20. Ba luồng cần thuộc code

### Upload CV

`CvController` → `CvIngestionService` lưu metadata/file → commit → `AfterCommitExecutor` → extraction/OCR → normalization → TF-IDF → cập nhật trạng thái → `MatchingService.scoreAllJobsForCv(cvId)`.

### Apply

Frontend `api.applyToJob` → `ApplicationController` → `ApplicationService` → kiểm tra candidate/job/duplicate → `ApplicationRepository` → audit/notification.

### Feedback

`FeedbackController` nhận query params → `FeedbackService` kiểm tra ownership/upsert/audit → commit → `RocchioService` chạy async → cập nhật learned vector → đặt `needsRecompute` → scheduler recompute matching.

## 21. Điểm kỹ thuật đáng bảo vệ

- Tách domain rõ hơn kiến trúc controller-service-repository khổng lồ dùng chung.
- Flyway quản lý schema có phiên bản.
- Matching có thể giải thích thay vì chỉ trả một score.
- Policy và audit bao quanh automation.
- DTO tách API contract khỏi entity.
- Test thuật toán và business rule tách khỏi UI.

## 22. Technical debt và hướng cải tiến

- Đưa email/batch sang queue và outbox pattern.
- Dùng object storage, antivirus và content validation cho CV.
- Version vector/algorithm để tái lập kết quả.
- Bổ sung distributed lock cho scheduler nhiều instance.
- Thêm observability, trace và SLO.
- Đo ranking bằng precision@K, recall@K, NDCG và phân tích fairness.
- Cân nhắc hybrid retrieval: keyword/skill + embedding, nhưng phải giữ explainability.

## 23. Thứ tự đọc code trước bảo vệ

1. `SecurityConfig.java` và `AuthService.java`.
2. `CvController.java` và `CvIngestionService.java`.
3. `TfIdfService.java` và `ScoringService.java`.
4. `MatchingService.java`, `MatchingQueryService.java`.
5. `AfterCommitExecutor.java` và `CvIngestionService.java`.
6. `ApplicationService.java`, `CandidatePortfolioVisibilityService.java`.
7. `FeedbackService.java`, `RocchioService.java`.
8. `AutomationPolicyService.java`, `AutoApplyService.java`.
9. `AutomationScheduler.java`.
10. Một migration, một entity và một integration test.

## 24. Câu trả lời mẫu 30 giây

> Backend được chia theo domain và mỗi request đi qua security, controller, DTO validation, service, repository rồi PostgreSQL. Pipeline CV/JD tạo vector TF-IDF; score hiện là cosine × 100, còn seniority chỉ hỗ trợ phát hiện potential. Công việc nền được kích hoạt sau commit. Candidate feedback hợp lệ có thể làm Rocchio cập nhật learned vector và đánh dấu matching chờ tính lại. Automation có policy, ngưỡng, giới hạn và audit, nhưng pause/resume vẫn chưa hoàn thiện.
