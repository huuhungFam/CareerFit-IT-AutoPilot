# Hướng Dẫn Đọc Hiểu Backend CareerFit

> Cập nhật theo mã nguồn ngày 18/07/2026. Khi tài liệu và code khác nhau, controller, DTO, service, entity và migration trong `src/main` là nguồn sự thật cuối cùng.

Tài liệu này giúp bạn đọc hiểu backend CareerFit theo từng cụm code, đồng thời học các khái niệm Java Spring Boot ngay trên chính project. Mục tiêu không chỉ là biết file nào làm gì, mà còn hiểu được luồng request, luồng dữ liệu, cách Spring quản lý controller/service/repository/entity, và những điểm cần chú ý khi debug hoặc nhờ Agent sửa code.

Backend nằm tại:

```text
Backend/careerfit-backend
```

Khi đọc code, nên đi theo thứ tự:

```text
pom.xml
src/main/java/com/careerfit/backend/CareerFitBackendApplication.java
src/main/resources/application.yml
src/main/resources/db/migration/V1__init_schema.sql
src/main/java/com/careerfit/backend/config
src/main/java/com/careerfit/backend/common
src/main/java/com/careerfit/backend/admin
src/main/java/com/careerfit/backend/auth
src/main/java/com/careerfit/backend/candidate
src/main/java/com/careerfit/backend/cv
src/main/java/com/careerfit/backend/job
src/main/java/com/careerfit/backend/matching
src/main/java/com/careerfit/backend/settings
```

## 1. Backend Này Là Gì?

Backend CareerFit là một ứng dụng Spring Boot phục vụ hệ thống gợi ý việc làm IT:

- Candidate đăng ký, đăng nhập, quản lý hồ sơ, upload CV.
- Recruiter đăng job, quản lý hồ sơ công ty, xem ranking ứng viên.
- Hệ thống trích text từ CV/JD, chuẩn hóa text, tạo vector TF-IDF, tính điểm matching.
- Candidate xem job phù hợp, ứng tuyển, gửi feedback.
- Feedback được dùng để học lại vector job bằng thuật toán Rocchio.
- Scheduler chạy các tác vụ nền như gửi digest email, recompute matching, cleanup token.

Tech stack chính:

| Thành phần | Vai trò |
| --- | --- |
| Java 21 | Ngôn ngữ backend |
| Spring Boot 3.2.5 | Framework chính |
| Spring Web | REST API |
| Spring Data JPA / Hibernate | Entity, repository, ORM |
| Spring Security | JWT, phân quyền |
| PostgreSQL | Database |
| Flyway | Migration database |
| PDFBox | Đọc text từ PDF và render PDF scan thành ảnh |
| Tesseract OCR | OCR fallback cho PDF scan/image-only |
| JJWT | Tạo và verify JWT |
| Spring Mail | Gửi email |
| Testcontainers | Integration test với PostgreSQL thật |

## 2. Cách Chạy Backend

Từ thư mục gốc project:

```powershell
Copy-Item .env.example .env
docker compose up -d
```

Sau đó chạy backend:

```powershell
cd Backend\careerfit-backend
mvn spring-boot:run
```

Backend chạy tại:

```text
http://localhost:8080
```

Swagger:

```text
http://localhost:8080/swagger-ui.html
```

Seeded test accounts:

```text
Candidate: ca / 1
Recruiter: re / 1
Admin: ad / 1
```

## 3. Cấu Trúc Package

Package root:

```text
src/main/java/com/careerfit/backend
```

Các package chính:

| Package | Chức năng |
| --- | --- |
| `admin` | Admin control panel: dashboard, user moderation, job moderation, audit/email monitor |
| `auth` | Đăng ký, đăng nhập, JWT, passwordless token |
| `candidate` | Hồ sơ ứng viên, CV list, portfolio |
| `cv` | Upload CV, CV nhập tay, xử lý PDF/text |
| `job` | Recruiter đăng/sửa/xóa/search job |
| `employer` | Hồ sơ công ty |
| `matching` | Tính điểm CV-JD và trả feed/ranking |
| `recommendation` | Gợi ý job |
| `application` | Ứng tuyển và quản lý applicants |
| `feedback` | Feedback và Rocchio learning |
| `automation` | Chính sách AutoPilot, token |
| `notification` | Email, email action token |
| `scheduler` | Tác vụ chạy nền |
| `settings` | Cấu hình riêng của Candidate/Recruiter, lưu dưới dạng JSONB |
| `analytics` | Thống kê thị trường/job |
| `audit` | Audit log domain và repository |
| `common` | Response, exception, utility |
| `config` | Security, async, Jackson, OpenAPI |

Mỗi domain thường có cấu trúc:

```text
controller/  -> nhận HTTP request
service/     -> xử lý nghiệp vụ
repository/  -> truy vấn database
entity/      -> map với table database
dto/         -> request/response shape
```

Luồng chuẩn:

```text
Frontend
  -> Controller
  -> Service
  -> Repository
  -> Entity / Database
  -> Service map Entity sang DTO
  -> Controller bọc ApiResponse
  -> JSON response
```

## 4. File Khởi Động Ứng Dụng

Mở:

```text
src/main/java/com/careerfit/backend/CareerFitBackendApplication.java
```

Nội dung chính:

```java
@SpringBootApplication
@EnableAsync
@EnableScheduling
public class CareerFitBackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(CareerFitBackendApplication.class, args);
    }
}
```

Ý nghĩa:

- `@SpringBootApplication`: đánh dấu class khởi động app, bật auto-configuration và component scan.
- `@EnableAsync`: cho phép dùng `@Async` để chạy tác vụ nền.
- `@EnableScheduling`: cho phép dùng `@Scheduled` để chạy tác vụ theo lịch.
- `SpringApplication.run(...)`: tạo Spring context, load bean, đọc config, start embedded server.

Đây chỉ là điểm bật ứng dụng, không phải nơi chứa business logic.

## 5. Maven Và Dependency

Mở:

```text
pom.xml
```

Các dependency quan trọng:

| Dependency | Ý nghĩa |
| --- | --- |
| `spring-boot-starter-web` | Tạo REST API |
| `spring-boot-starter-data-jpa` | Repository, entity, Hibernate |
| `spring-boot-starter-security` | Security, filter chain, role |
| `spring-boot-starter-validation` | Validate DTO bằng annotation |
| `spring-boot-starter-mail` | Gửi email |
| `spring-boot-starter-thymeleaf` | Render trang HTML xác nhận/kết quả email action |
| `spring-boot-starter-actuator` + `micrometer-registry-prometheus` | Health check và metrics |
| `postgresql` | JDBC driver cho PostgreSQL |
| `flyway-core` | Chạy migration SQL |
| `jjwt-*` | JWT |
| `pdfbox` | Đọc PDF |
| `poi-ooxml` | Đọc CV DOCX |
| `springdoc-openapi` | Swagger UI |
| `testcontainers` | Test với container PostgreSQL |

Với Spring Boot, bạn thường thêm starter thay vì tự ghép nhiều thư viện nhỏ.

## 6. Cấu Hình Ứng Dụng

Mở:

```text
src/main/resources/application.yml
src/main/resources/application-dev.yml
src/main/resources/application-prod.yml
src/main/java/com/careerfit/backend/config/AppProperties.java
```

`application.yml` chứa:

- `spring.datasource`: cấu hình PostgreSQL.
- `spring.jpa.hibernate.ddl-auto: validate`: Hibernate chỉ validate schema, không tự tạo bảng.
- `spring.flyway`: nơi chứa migration.
- `spring.mail`: SMTP.
- `spring.async.executor`: thread pool cho `@Async`.
- `server.port: 8080`: port backend.
- `app.jwt`: secret và thời hạn JWT.
- `app.storage`: nơi lưu file CV.
- `app.ocr`: bật/tắt OCR fallback, Tesseract command, language data, DPI, số trang và timeout.
- `app.matching`: ngưỡng label matching.
- `app.scheduler`: lịch recompute, email, Auto-Apply và cleanup token theo múi giờ `Asia/Ho_Chi_Minh`.
- `app.cors`: frontend origins được phép gọi API.
- `management`: chỉ expose Actuator health và Prometheus.

`AppProperties` dùng `@Value` để bind config:

```java
@Value("${app.jwt.secret}")
private String jwtSecret;
```

Khi thấy service cần config như JWT secret, storage path, threshold, nó sẽ inject `AppProperties`. `getEmailActionBaseUrl()` ưu tiên `EMAIL_ACTION_BASE_URL`; nếu biến này rỗng, URL được suy ra từ `APP_BASE_URL` cộng `/api/email-action/redeem`.

Khác biệt profile:

- `dev`: có thể bật SQL/security debug và mặc định dùng `NoOpMailService`.
- `prod`: tắt Swagger, ẩn chi tiết lỗi, chỉ log mức vận hành và bắt buộc cấu hình production hợp lệ.

## 7. Database Và Flyway

Mở:

```text
src/main/resources/db/migration
```

Flyway chạy các file theo thứ tự:

```text
V1__init_schema.sql
V2__phase4_additions.sql
V3__phase5_and_6_additions.sql
...
V11__scraped_job_source_metadata.sql
V12__allow_hidden_by_admin_job_status.sql
V13__demo_admin_account.sql
V14__user_settings.sql
V15__secure_email_action_tokens.sql
```

Các table chính:

| Table | Entity | Ý nghĩa |
| --- | --- | --- |
| `user_account` | `UserAccount` | Tài khoản candidate/recruiter/admin |
| `candidate` | `Candidate` | Hồ sơ candidate |
| `employer_profile` | `EmployerProfile` | Hồ sơ công ty |
| `cv` | `CV` | CV, raw text, vector, trạng thái xử lý |
| `job` | `Job` | Job posting/JD |
| `matching` | `Matching` | Kết quả match giữa 1 CV và 1 Job |
| `application` | `Application` | Ứng tuyển |
| `feedback` | `Feedback` | Đánh giá match |
| `automation_policy` | `AutomationPolicy` | Chính sách AutoPilot |
| `email_token` | `EmailToken` | Token passwordless |
| `email_action_token` | `EmailAction` | Token click từ email |
| `audit_log` | `AuditLog` | Lịch sử hành động |
| `job_market_snapshot` | `JobMarketSnapshot` | Snapshot thống kê |
| `analytics_event` | `AnalyticsEvent` | Event tracking cho Advanced Analytics |
| `user_settings` | `UserSettings` | Settings theo user, lưu JSONB |

`V11__scraped_job_source_metadata.sql` thêm các field metadata cho job crawl:

```text
source_platform
source_url
scraped_at
external_hash
```

`external_hash` có unique index để script import có thể upsert dữ liệu crawl nhiều lần mà không tạo trùng.

Các migration mới hơn:

- `V12`: thêm trạng thái job `HIDDEN_BY_ADMIN` để admin ẩn job mà không xóa dữ liệu.
- `V13`: seed tài khoản demo Admin `ad / 1` dùng cho môi trường học/demo.
- `V14`: tạo bảng `user_settings`, mỗi user tối đa một row.
- `V15`: đổi `email_action_token.token` thành `token_hash`; raw token chỉ xuất hiện trong link gửi cho người dùng, database chỉ giữ SHA-256 hash.

Quan hệ chính:

```text
UserAccount 1-1 Candidate
UserAccount 1-1 EmployerProfile
UserAccount 1-n Job
Candidate 1-n CV
CV n-n Job thông qua Matching
Candidate n-n Job thông qua Application
Matching 1-n Feedback
UserAccount 1-1 AutomationPolicy
UserAccount 1-1 UserSettings
```

JPA annotation cần hiểu:

- `@Entity`: class map với table.
- `@Table`: khai báo tên table, index, unique constraint.
- `@Id`: primary key.
- `@GeneratedValue(strategy = GenerationType.UUID)`: tự sinh UUID.
- `@ManyToOne`, `@OneToOne`: quan hệ giữa entity.
- `FetchType.LAZY`: chưa load quan hệ cho đến khi cần.
- `@CreationTimestamp`, `@UpdateTimestamp`: Hibernate tự set thời gian.
- `@Enumerated(EnumType.STRING)`: lưu enum dưới dạng string.
- `@JdbcTypeCode(SqlTypes.JSON)`: map JSONB PostgreSQL.

## 8. Response Và Exception Chung

Mở:

```text
src/main/java/com/careerfit/backend/common/response/ApiResponse.java
src/main/java/com/careerfit/backend/common/exception/AppException.java
src/main/java/com/careerfit/backend/common/exception/GlobalExceptionHandler.java
```

API thành công:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "..."
  }
}
```

API lỗi:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "..."
  },
  "meta": {
    "requestId": "..."
  }
}
```

`ApiResponse<T>` là Java record:

```java
public record ApiResponse<T>(
    boolean success,
    T data,
    ErrorPayload error,
    Meta meta
) {}
```

`T` là generic type. Ví dụ:

```java
ApiResponse<JobDtos.JobListResponse>
ApiResponse<Void>
```

`AppException` là exception nghiệp vụ:

- `notFound`
- `forbidden`
- `unauthorized`
- `badRequest`
- `conflict`
- `tokenExpired`
- `quotaExceeded`

`GlobalExceptionHandler` dùng `@RestControllerAdvice` để bắt exception toàn app và đổi thành response JSON thống nhất.

## 9. Security, JWT Và Role

Mở theo thứ tự:

```text
src/main/java/com/careerfit/backend/config/security/SecurityConfig.java
src/main/java/com/careerfit/backend/config/security/JwtService.java
src/main/java/com/careerfit/backend/config/security/JwtAuthenticationFilter.java
src/main/java/com/careerfit/backend/config/security/UserIdResolutionFilter.java
src/main/java/com/careerfit/backend/config/security/RateLimitFilter.java
src/main/java/com/careerfit/backend/config/security/ProductionConfigValidator.java
src/main/java/com/careerfit/backend/config/security/DemoAccountGuard.java
src/main/java/com/careerfit/backend/auth/service/AuthService.java
```

### 9.1 SecurityConfig

`SecurityConfig` cấu hình:

- Bật CORS.
- Tắt CSRF vì API dùng JWT stateless.
- Không dùng session server-side.
- Khai báo route nào public, route nào cần role.
- Gắn JWT filter vào filter chain.

Phân quyền chính:

| Route | Quyền |
| --- | --- |
| `/api/auth/register`, `/api/auth/login` | Public |
| Các route đọc job public được liệt kê trong `SecurityConfig` | Public |
| Featured/detail/jobs theo employer slug | Public; `/api/employers/me` là Recruiter |
| `GET /api/analytics/**` | Public với market/analytics read-only |
| `/api/cv/**` | Candidate |
| `/api/candidates/**` | Candidate |
| `/api/candidate/analytics/**` | Candidate |
| `/api/matches/**` | Candidate |
| `/api/recruiter/**` | Recruiter |
| `POST/PATCH/DELETE /api/jobs/**` | Recruiter |
| `/api/admin/**` | Admin |
| `/api/automation/**` | Authenticated |
| `/api/settings/me` | Authenticated; Candidate/Recruiter có whitelist key, Admin không có key cập nhật |

Spring Security note:

```java
.requestMatchers("/api/cv/**").hasRole("CANDIDATE")
```

`hasRole("CANDIDATE")` thực chất check authority `ROLE_CANDIDATE`.

### 9.2 JwtService

`JwtService` làm 4 việc:

- `generateToken(subject, role)`: tạo JWT.
- `extractSubject(token)`: lấy email.
- `extractRole(token)`: lấy role.
- `isTokenValid(token)`: verify chữ ký và expiry.

Subject trong token là email.

### 9.3 JwtAuthenticationFilter

Mỗi request đi qua filter này:

```text
Authorization: Bearer <token>
```

Nếu token hợp lệ:

```text
JWT -> email + role -> UsernamePasswordAuthenticationToken -> SecurityContext
```

Sau bước này, Spring biết request đang thuộc user nào và role nào.

### 9.4 UserIdResolutionFilter

Filter này chạy sau JWT filter.

Nó lấy email trong `SecurityContext`, query DB để tìm `UserAccount`, rồi set:

```java
request.setAttribute("userId", user.getId());
```

Nhờ vậy controller có thể nhận:

```java
@RequestAttribute("userId") UUID userId
```

Đây là cách project tránh việc controller/service phải tự parse token nhiều lần.

### 9.5 Bảo Vệ Abuse Và Cấu Hình Production

`RateLimitFilter` dùng token bucket theo IP, lưu trong cache LRU có giới hạn:

- Auth `POST` (`login`, `register`, passwordless): tối đa 10 request/phút/IP.
- Redeem email action `POST`: tối đa 20 request/phút/IP.
- Vượt giới hạn trả `429 TOO_MANY_REQUESTS` và header `Retry-After: 60`.

Đây là rate limit in-memory nên phù hợp một instance. Khi chạy nhiều instance production, cần giải pháp dùng chung như Redis hoặc API gateway.

`ProductionConfigValidator` chỉ chạy với profile `prod` và fail fast nếu JWT secret, database credential, HTTPS base URL, CORS hoặc SMTP vẫn là giá trị dev/placeholder. `DemoAccountGuard` tự vô hiệu hóa `ca`, `re`, `ad` ở production, trừ khi chủ động bật `DEMO_MODE=true`.

## 10. Auth Domain

Mở:

```text
src/main/java/com/careerfit/backend/auth/controller/AuthController.java
src/main/java/com/careerfit/backend/auth/service/AuthService.java
src/main/java/com/careerfit/backend/auth/entity/UserAccount.java
src/main/java/com/careerfit/backend/auth/dto/AuthDtos.java
src/main/java/com/careerfit/backend/auth/repository/UserAccountRepository.java
```

Routes:

| Method | Path | Service |
| --- | --- | --- |
| `POST` | `/api/auth/register` | `register` |
| `POST` | `/api/auth/login` | `login` |
| `POST` | `/api/auth/passwordless/request` | `requestPasswordlessToken` |
| `GET` | `/api/auth/passwordless/verify` | verify token |
| `POST` | `/api/auth/passwordless/verify` | verify token |
| `GET` | `/api/auth/me` | `getMe` |

Register flow:

```text
1. Check email đã tồn tại chưa.
2. Parse và chỉ cho phép role CANDIDATE / RECRUITER; client không thể tự đăng ký ADMIN.
3. Hash password bằng BCrypt.
4. Save UserAccount.
5. Nếu role là CANDIDATE, tạo Candidate profile rỗng.
6. Save AuditLog REGISTER.
7. Tạo JWT và trả AuthResponse.
```

Login flow:

```text
1. Normalize identifier.
2. Tìm user theo email.
3. Check account active.
4. Check password bằng BCrypt.
5. Save AuditLog LOGIN.
6. Tạo JWT và trả AuthResponse.
```

Passwordless flow:

```text
1. User request token.
2. Backend tạo raw token random.
3. Backend hash raw token bằng SHA-256.
4. Chỉ lưu hash vào DB.
5. Khi verify, hash token client gửi lên rồi so với DB.
6. Nếu hợp lệ, mark used và trả JWT.
```

Security note: raw token không lưu DB, chỉ lưu hash. Đây là pattern giống password reset token.

## 11. Candidate Domain

Mở:

```text
src/main/java/com/careerfit/backend/candidate/controller/CandidateController.java
src/main/java/com/careerfit/backend/candidate/service/CandidateProfileService.java
src/main/java/com/careerfit/backend/candidate/entity/Candidate.java
src/main/java/com/careerfit/backend/candidate/dto/CandidateDtos.java
```

Routes:

| Method | Path | Ý nghĩa |
| --- | --- | --- |
| `GET` | `/api/candidates/me` | Lấy profile |
| `PATCH` | `/api/candidates/me` | Cập nhật profile |
| `PATCH` | `/api/candidates/me/account` | Cập nhật account |
| `GET` | `/api/candidates/me/cvs` | Danh sách CV |
| `GET` | `/api/candidates/me/portfolio` | Portfolio |
| `POST/PATCH/DELETE` | `/portfolio/links` | CRUD link |
| `POST/PATCH/DELETE` | `/portfolio/projects` | CRUD project |

`Candidate` chứa:

- phone, location, avatar;
- desired title, seniority, skills, work model, salary;
- years of experience;
- about me;
- auto apply settings.

Pattern update trong service:

```java
if (req.phone() != null) candidate.setPhone(req.phone());
```

Đây là PATCH semantics: field nào không gửi thì giữ nguyên.

JSONB như `desiredSkills` được DTO nhận là `List<String>`, service serialize thành JSON string bằng `ObjectMapper`.

Portfolio có thêm các quy tắc dữ liệu:

- Link type chỉ nhận `GITHUB`, `LINKEDIN`, `PORTFOLIO`, `BLOG`, `OTHER` và được chuẩn hóa uppercase.
- URL link bắt buộc; URL dự án không bắt buộc. URL có giá trị chỉ nhận scheme `http` hoặc `https`, phải có host và không chứa user-info.
- Tech stack được trim và loại trùng không phân biệt hoa thường; tối đa 30 phần tử theo DTO validation.
- Mọi thao tác sửa/xóa đều kiểm tra candidate hiện tại sở hữu link/project; truy cập tài nguyên của candidate khác trả `403`.

## 12. CV Domain

Mở:

```text
src/main/java/com/careerfit/backend/cv/controller/CvController.java
src/main/java/com/careerfit/backend/cv/service/CvIngestionService.java
src/main/java/com/careerfit/backend/cv/service/CvManagementService.java
src/main/java/com/careerfit/backend/cv/service/PdfExtractionService.java
src/main/java/com/careerfit/backend/cv/entity/CV.java
src/main/java/com/careerfit/backend/common/util/StorageService.java
src/main/java/com/careerfit/backend/common/util/TextNormalizationService.java
src/main/java/com/careerfit/backend/common/util/TfIdfService.java
```

Routes:

| Method | Path | Ý nghĩa |
| --- | --- | --- |
| `POST` | `/api/cv/upload` | Upload PDF, PNG, JPG/JPEG hoặc DOCX |
| `POST` | `/api/cv/manual` | Tạo CV thủ công |
| `GET` | `/api/cv/me` | List CV |
| `GET` | `/api/cv/{cvId}` | Chi tiết CV |
| `GET` | `/api/cv/{cvId}/status` | Trạng thái xử lý |
| `POST` | `/api/cv/{cvId}/set-default` | Đặt default |
| `DELETE` | `/api/cv/{cvId}` | Xóa CV |

CV status:

```text
UPLOADED -> VALIDATING -> PROCESSING -> SCORING_DONE
                              |
                              -> FAILED
```

Upload document flow:

```text
1. Controller nhận multipart file.
2. Service tìm Candidate theo userId.
3. Kiểm tra extension và MIME thuộc PDF/PNG/JPG/JPEG/DOCX.
4. Tạo CV status UPLOADED.
5. Lưu file vào disk qua StorageService.
6. Nếu chưa có default CV, set CV này làm default.
7. Save AuditLog CV_UPLOAD.
8. Đăng ký tác vụ `processDocument(cvId)` qua `AfterCommitExecutor`.
9. Worker chọn parser theo extension: PDFBox cho PDF, Apache POI cho DOCX, ImageIO cho ảnh.
10. PDF scan/image-only và ảnh chạy Tesseract OCR `vie+eng` trong Docker.
11. Detect language.
12. Normalize text thành tokens.
13. Build TF-IDF vector.
14. Lưu top skills, extracted terms, summary.
15. Set status SCORING_DONE.
16. Gọi `MatchingService.scoreAllJobsForCv(cvId)`.
```

Sau khi import nhiều JD, chạy `node scripts\rebuild-matchings.mjs`. Batch dùng sort tổng thứ tự `createdAt DESC, id ASC`; không được phân trang chỉ theo `createdAt` vì dữ liệu scrape có nhiều timestamp bằng nhau.

Manual CV flow:

```text
1. Nhận form DTO.
2. Build raw text từ các field form.
3. Lưu CV source MANUAL.
4. Vectorize và score giống PDF, nhưng không cần đọc file.
```

Lưu ý Spring hiện tại:

- CV/job matching không còn dựa vào việc gọi nội bộ một method `@Async` trong cùng class.
- `AfterCommitExecutor` đăng ký `TransactionSynchronization.afterCommit()`, rồi đẩy `Runnable` sang `taskExecutor` sau khi transaction lưu CV/job đã commit.
- Tác vụ nền chỉ nhận `UUID`, sau đó query lại entity từ repository trong worker. Cách này tránh worker đọc entity chưa commit hoặc truyền entity JPA có thể đã detached qua thread khác.
- Nếu không có transaction đang hoạt động, executor vẫn submit tác vụ ngay.

## 13. Text Normalization Và TF-IDF

Mở:

```text
src/main/java/com/careerfit/backend/common/util/TextNormalizationService.java
src/main/java/com/careerfit/backend/common/util/TfIdfService.java
```

`TextNormalizationService.normalize(...)`:

```text
1. Xóa HTML tags.
2. Xóa ký tự đặc biệt, giữ chữ tiếng Việt.
3. Lowercase.
4. Tách token theo khoảng trắng.
5. Bỏ stopwords.
6. Bỏ token quá ngắn.
7. Trả List<String>.
```

`detectLanguage(...)` dùng heuristic: nếu text có nhiều ký tự tiếng Việt thì trả `vi`, ngược lại `en`.

`TfIdfService` tạo IDF map từ corpus IT seed khi app startup:

```java
@PostConstruct
public void buildIdf() { ... }
```

Công thức:

```text
TF(t,d) = count(t in document) / total_terms
IDF(t) = log(1 + N / (1 + df(t)))
TFIDF(t,d) = TF * IDF
```

Cosine similarity:

```text
0.0 = không giống
1.0 = giống hoàn toàn
```

Backend đổi thành điểm:

```text
normalizedScore = rawScore * 100
```

## 14. Job Domain

Mở:

```text
src/main/java/com/careerfit/backend/job/controller/JobController.java
src/main/java/com/careerfit/backend/job/service/JobService.java
src/main/java/com/careerfit/backend/job/entity/Job.java
src/main/java/com/careerfit/backend/job/dto/JobDtos.java
src/main/java/com/careerfit/backend/job/repository/JobRepository.java
```

Routes:

| Method | Path | Access | Ý nghĩa |
| --- | --- | --- | --- |
| `GET` | `/api/jobs`, `/api/jobs/search` | Public | Search job |
| `GET` | `/api/jobs/suggestions` | Public | Gợi ý search |
| `GET` | `/api/jobs/{id}` | Public | Job detail |
| `POST` | `/api/jobs` | Recruiter | Tạo job |
| `PATCH` | `/api/jobs/{id}` | Recruiter owner | Sửa job |
| `PATCH` | `/api/jobs/{id}/status` | Recruiter owner | Đổi status |
| `DELETE` | `/api/jobs/{id}` | Recruiter owner | Xóa job |

Public list/search/detail chỉ trả job `ACTIVE`. Job `DRAFT`, `PAUSED`, `CLOSED` hoặc `HIDDEN_BY_ADMIN` không được lộ qua `GET /api/jobs/{id}`; recruiter/admin quản lý chúng qua endpoint role-scoped tương ứng.

Create job flow:

```text
1. Tìm recruiter theo userId.
2. Check role RECRUITER.
3. Parse salary mode.
4. Tạo Job entity.
5. Apply required fields.
6. Detect language từ JD text.
7. Normalize JD text.
8. Build TF-IDF vector.
9. Save job.
10. Trigger matching/recompute.
11. Map sang JobDetailResponse.
```

`JobRepository.searchJobs(...)` dùng JPQL:

```java
@Query("""
    SELECT j FROM Job j
    WHERE j.status = 'ACTIVE'
      AND (:keyword = '' OR LOWER(j.title) LIKE ...)
""")
Page<Job> searchJobs(...);
```

Spring Data JPA có hai kiểu query:

- Query tự sinh từ tên method: `findByStatus`, `findByRecruiterIdAndStatus`.
- Query viết tay bằng `@Query`.

Project cũng có script import dữ liệu job crawl:

```powershell
node scripts\import-scraped-jobs.mjs --dry-run
node scripts\import-scraped-jobs.mjs
```

Script đọc `scraped-data/jobs_for_careerfit_import.json`, normalize dữ liệu scrape, tạo recruiter/employer sinh từ company và upsert vào bảng `job` bằng `external_hash`.

## 15. Employer Domain

Mở:

```text
src/main/java/com/careerfit/backend/employer/controller/EmployerController.java
src/main/java/com/careerfit/backend/employer/service/EmployerService.java
src/main/java/com/careerfit/backend/employer/entity/EmployerProfile.java
```

Routes:

| Method | Path | Access | Ý nghĩa |
| --- | --- | --- | --- |
| `GET` | `/api/employers/featured` | Public | Công ty nổi bật |
| `GET` | `/api/employers/{slug}` | Public | Profile công ty |
| `GET` | `/api/employers/{slug}/jobs` | Public | Job của công ty |
| `GET` | `/api/employers/me` | Recruiter | Profile của mình |
| `PUT` | `/api/employers/me` | Recruiter | Tạo/cập nhật profile |

`EmployerService.createOrUpdate(...)`:

```text
1. Tìm recruiter.
2. Check role RECRUITER.
3. Tìm profile hiện có hoặc tạo mới.
4. Tạo slug từ companyName.
5. Check slug trùng.
6. Serialize benefits.
7. Save profile.
```

## 16. Matching Domain

Mở:

```text
src/main/java/com/careerfit/backend/matching/entity/Matching.java
src/main/java/com/careerfit/backend/matching/service/ScoringService.java
src/main/java/com/careerfit/backend/matching/service/MatchingService.java
src/main/java/com/careerfit/backend/matching/service/MatchingQueryService.java
src/main/java/com/careerfit/backend/matching/repository/MatchingRepository.java
```

Mỗi row `matching` là một cặp:

```text
CV + Job
```

Field quan trọng:

- `rawScore`: cosine similarity `0.0 -> 1.0`.
- `normalizedScore`: điểm `0 -> 100`.
- `label`: `LOW`, `MEDIUM`, `HIGH`, `POTENTIAL`.
- `isPotential`: flag tiềm năng.
- `matchReasonsJson`: lý do phù hợp.
- `potentialReasonJson`: lý do tiềm năng.
- `needsRecompute`: cần tính lại.

`ScoringService.score(cv, job)`:

```text
1. Parse vector CV từ extractedTermsJson.
2. Parse vector Job từ tfidfVectorJson.
3. Tính cosine similarity.
4. Nhân 100 để ra normalized score.
5. Gán label.
6. Detect potential.
7. Build match reasons.
8. Trả ScoringResult.
```

`MatchingService.scoreAllJobsForCv(cvId)`:

```text
1. Lấy tất cả job ACTIVE.
2. Check language compatibility.
3. Với mỗi job, tính score.
4. Upsert row matching.
5. Save audit log.
```

Chiều ngược lại, `scoreJobAgainstAllCvs(jobId)` query tất cả CV có trạng thái `SCORING_DONE`, tính điểm từng cặp và upsert matching. Khi tạo job hoặc sửa nội dung ảnh hưởng vector, `JobService` chỉ kích hoạt bước này sau khi transaction job commit thành công.

`ScoringService` ưu tiên `job.learnedProfileVectorJson` nếu Rocchio đã tạo vector học được; nếu chưa có thì fallback về `job.tfidfVectorJson`. Vì vậy feedback hợp lệ hiện có ảnh hưởng đến lần recompute score tiếp theo.

`MatchingQueryService` phục vụ hai hướng:

- Recruiter xem ranking candidate theo job.
- Candidate xem job feed theo default CV.

## 17. Recommendation Domain

Mở:

```text
src/main/java/com/careerfit/backend/recommendation/controller/RecommendationController.java
src/main/java/com/careerfit/backend/recommendation/service/RecommendationService.java
```

Routes:

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/api/recommendations/jobs` | Candidate |
| `GET` | `/api/recommendations/jobs/{jobId}/similar` | Public |

Logic recommendation:

```text
1. Nếu candidate có default CV, lấy top matching.
2. Boost theo desired skills.
3. Boost theo location.
4. Sort theo finalScore.
5. Nếu chưa có CV, fallback theo profile candidate.
```

## 18. Application Domain

Mở:

```text
src/main/java/com/careerfit/backend/application/controller/ApplicationController.java
src/main/java/com/careerfit/backend/application/service/ApplicationService.java
src/main/java/com/careerfit/backend/application/entity/Application.java
```

Routes:

| Method | Path | Access |
| --- | --- | --- |
| `POST` | `/api/applications` | Candidate |
| `GET` | `/api/applications/me` | Candidate |
| `DELETE` | `/api/applications/{id}` | Candidate owner |
| `GET` | `/api/recruiter/jobs/{jobId}/applicants` | Recruiter owner |
| `PATCH` | `/api/recruiter/applications/{id}/status` | Recruiter owner |
| `POST` | `/api/recruiter/jobs/{jobId}/candidates/{candidateId}/invite` | Recruiter owner |

Submit application flow:

```text
1. Tìm Candidate.
2. Tìm Job.
3. Check job ACTIVE.
4. Check chưa apply job này.
5. Resolve CV: request cvId hoặc default CV.
6. Tìm Matching nếu có.
7. Tạo Application.
8. Save cover letter nếu có.
9. Save AuditLog APPLICATION_SUBMITTED.
10. Trả response.
```

Withdraw không xóa row, mà set status `NOT_INTERESTED`.

`GET /api/applications/me` và `GET /api/recruiter/jobs/{jobId}/applicants` trả thêm `meta`:

```text
generatedAt
lastUpdatedAt
resultState
message
suggestions
```

Invite candidate chưa apply:

```text
1. Recruiter phải sở hữu job.
2. Job phải ACTIVE.
3. Candidate phải tồn tại và có default CV.
4. Nếu đã có application cho candidate/job, trả application hiện tại, không tạo trùng.
5. Nếu chưa có, tạo Application status INVITED.
6. Gắn matching nếu có.
7. Save AuditLog CANDIDATE_INVITED.
8. Gửi lifecycle email qua NotificationEmailService và NotificationPolicyGuard.
```

Auto-Apply tạo application bằng constructor `new Application(candidate, job, cv, matching, true)`, status tự thành `AUTO_APPLIED`.

## 19. Feedback Và Rocchio

Mở:

```text
src/main/java/com/careerfit/backend/feedback/controller/FeedbackController.java
src/main/java/com/careerfit/backend/feedback/service/FeedbackService.java
src/main/java/com/careerfit/backend/feedback/service/RocchioService.java
src/main/java/com/careerfit/backend/feedback/entity/Feedback.java
```

Route:

```text
POST /api/matches/{matchingId}/feedback?type=GOOD_MATCH&channel=WEB
POST /api/matches/{matchingId}/feedback?type=POTENTIAL&channel=WEB
```

Feedback types:

- `GOOD_MATCH`: tín hiệu tốt.
- `POTENTIAL`: tín hiệu tiềm năng.
- `BAD_MATCH`: tín hiệu xấu.
- `NOT_INTERESTED`: bỏ qua, không học.

`FeedbackService.submitFeedback(...)`:

```text
1. Tìm Matching.
2. Tìm actor user.
3. Tạo feedback nếu chưa có.
4. Save feedback.
5. Save audit log.
6. Nếu không phải NOT_INTERESTED, trigger RocchioService.
```

Rocchio formula:

```text
new_q = alpha * q + beta * positive_centroid - gamma * negative_centroid
```

Trong code:

```text
alpha = 1.0
beta  = 0.75
gamma = 0.15
```

Sau khi cập nhật vector job, các matching của job được đánh dấu `needsRecompute = true`.

`FeedbackService` thực hiện upsert theo cặp `(matchingId, actorId)`: feedback gửi lại sẽ cập nhật role/type/channel thay vì tạo row trùng. Endpoint web hiện chỉ cho Candidate, kiểm tra matching thuộc CV của Candidate trước khi lưu. Sau khi transaction commit, `RocchioService` cập nhật learned vector và đánh dấu các matching liên quan cần recompute.

## 20. Automation, Notification Và Scheduler

Mở:

```text
src/main/java/com/careerfit/backend/automation
src/main/java/com/careerfit/backend/notification
src/main/java/com/careerfit/backend/scheduler/AutomationScheduler.java
```

Automation policy routes:

| Method | Path |
| --- | --- |
| `GET` | `/api/automation/policy` |
| `PATCH` | `/api/automation/policy` |
| `PATCH` | `/api/automation/policy/email-notifications` |
| `POST` | `/api/automation/auto-apply/run-now` |
| `POST` | `/api/automation/pause` |
| `POST` | `/api/automation/resume` |

`AutomationPolicyService` expose/update các field chính cho frontend:

```text
autoApplyEnabled
autoApplyThreshold
emailNotificationsEnabled
digestEnabled
minScoreToNotify
notifyOnHighOnly
notifyPotential
maxNotificationsPerDay
notificationCooldownHours
quietHoursEnabled
quietHoursStart
quietHoursEnd
replacementAfterSkipEnabled
replacementDelayMinutes
pausedUntil
```

`autoApplyThreshold` được validate trong khoảng `50-100`.
Nếu sai range, backend trả `ValidationException` với field `autoApplyThreshold`, code `AUTO_APPLY_THRESHOLD_RANGE`.

`AutoApplyService.runForPolicy(policy)`:

```text
1. Tìm candidate theo policy user.
2. Lấy default CV.
3. Chỉ chạy nếu CV status SCORING_DONE.
4. Lấy top matching theo CV.
5. Bỏ qua job inactive, score dưới threshold, hoặc application đã tồn tại.
6. Tạo tối đa 3 application AUTO_APPLIED mỗi lần chạy.
7. Ghi audit AUTO_APPLY_EXECUTED.
8. Gửi/log email candidate auto-applied và recruiter new application qua notification/no-spam policy.
```

`MailService` chỉ bật khi:

```text
app.mail.enabled=true
```

Dev profile dùng `NoOpMailService`, chỉ log email, không gửi thật.

`EmailActionController` có route public:

```text
GET /api/email-action/redeem?token=<token>
POST /api/email-action/redeem
```

Flow:

```text
1. User click link trong email.
2. `GET` hash raw token để inspect trạng thái và render trang HTML xác nhận, chưa thực thi action.
3. Form xác nhận gửi `POST`; backend hash token lần nữa, khóa row và kiểm tra pending/expired.
4. Thực hiện action tương ứng, ví dụ apply/skip/invite/feedback.
5. Mark token `REDEEMED` và trả HTML kết quả.
```

Raw email-action token không được lưu database. `V15` đổi cột thành `token_hash`; service dùng SHA-256 để tra cứu. Đây là cùng nguyên tắc với passwordless token: database bị lộ cũng không làm lộ link dùng một lần còn nguyên dạng.

Scheduler:

| Method | Lịch | Việc làm |
| --- | --- | --- |
| `recomputeStaleMatchings` | mỗi 30 phút | Re-score matching cần recompute |
| `sendDailyDigest` | 08:00 ICT | Gửi digest |
| `cleanupExpiredTokens` | 03:00 ICT | Expire/purge token |
| `notifyHighMatches` | mỗi 4 giờ | Gửi high-match email |
| `executeAutoApply` | mỗi 2 giờ | Tạo application AUTO_APPLIED cho policy đủ điều kiện |

## 20.1 List Metadata Convention

Các response list quan trọng có metadata để frontend không phải suy luận empty state:

```text
generatedAt
lastUpdatedAt
resultState
message
suggestions
```

Áp dụng:

- `MatchingDtos.MatchedJobPageResponse.meta`
- `MatchingDtos.CandidateJobCardPageResponse.meta`
- `MatchingDtos.RankingPageResponse.meta`
- `MatchingDtos.RecruiterCandidateDiscoveryPageResponse.generatedAt/lastUpdatedAt/suggestions`
- `ApplicationDtos.MyApplicationPageResponse.meta`
- `ApplicationDtos.ApplicantPageResponse.meta`

State được dùng:

```text
READY
NO_MATCH
LOW_MATCH_ONLY
HIGH_TIE
PROCESSING
FAILED
NO_FILTERED_RESULTS
NO_CANDIDATE_MATCHES
```

## 20.2 Settings Domain

Mở:

```text
src/main/java/com/careerfit/backend/settings/controller/SettingsController.java
src/main/java/com/careerfit/backend/settings/service/SettingsService.java
src/main/java/com/careerfit/backend/settings/entity/UserSettings.java
src/main/java/com/careerfit/backend/settings/dto/SettingsDtos.java
src/main/java/com/careerfit/backend/settings/repository/UserSettingsRepository.java
```

Routes:

| Method | Path | Ý nghĩa |
| --- | --- | --- |
| `GET` | `/api/settings/me` | Trộn default theo role với settings đã lưu |
| `PATCH` | `/api/settings/me` | Cập nhật một phần settings của user hiện tại |

Request PATCH có dạng:

```json
{
  "values": {
    "highMatchEmail": true,
    "alertThreshold": 90
  }
}
```

Điểm cần hiểu:

- Candidate và Recruiter có whitelist key riêng; Admin không có settings UI/domain này.
- Service không tin key/value tùy ý từ frontend. Key sai role trả `400`; number, boolean, `HH:mm` và giới hạn range đều được validate.
- Entity lưu toàn bộ map trong cột PostgreSQL `JSONB`, nhưng response vẫn là DTO có `role`, `values`, `updatedAt`.
- PATCH merge payload vào default + dữ liệu đang lưu, nên field không gửi vẫn được giữ nguyên.
- Settings này khác `AutomationPolicy`: settings là tùy chọn UI/quyền riêng tư/nghiệp vụ theo role; automation policy điều khiển AutoPilot, email và scheduler.

## 21. Analytics, Recruiter Dashboard, Admin

`AnalyticsService`:

- `GET /api/analytics/stats`
- `GET /api/analytics/trend`
- `GET /api/analytics/roles`
- build daily snapshot lúc 07:00 ICT.

`AdvancedAnalyticsController` và `AdvancedAnalyticsService`:

- `GET /api/analytics/market/overview`
- `GET /api/analytics/market/skills`
- `GET /api/analytics/market/salary`
- `GET /api/analytics/market/trends`
- `POST /api/analytics/events`
- `GET /api/candidate/analytics/overview`
- `GET /api/candidate/analytics/skill-demand`
- `GET /api/candidate/analytics/profile-gaps`
- `GET /api/candidate/analytics/match-trends`
- `GET /api/recruiter/analytics/overview`
- `GET /api/recruiter/analytics/jobs/{jobId}/funnel`
- `GET /api/recruiter/analytics/jobs/{jobId}/skill-gap`
- `GET /api/recruiter/analytics/trends`

`analytics_event` lưu tương tác UI như `JOB_VIEWED`, `JOB_SEARCHED`, `MATCH_CARD_VIEWED`, `RECRUITER_VIEWED_CANDIDATE`. Những metric view/search có thể bằng 0 cho đến khi frontend bắt đầu bắn event.

`RecruiterDashboardController`:

- `/api/recruiter/dashboard`
- `/api/recruiter/jobs/{jobId}/stats`
- `/api/recruiter/jobs/{jobId}/top-candidates`
- `/api/recruiter/jobs`

Admin MVP controllers:

- `AdminDashboardController`: `GET /api/admin/dashboard`
- `AdminUserController`: `GET /api/admin/users`, `GET /api/admin/users/{userId}`, `POST /api/admin/users/{userId}/suspend`, `POST /api/admin/users/{userId}/activate`
- `AdminJobController`: `GET /api/admin/jobs`, `POST /api/admin/jobs/{jobId}/hide`, `POST /api/admin/jobs/{jobId}/restore`
- `AdminAuditLogController`: `GET /api/admin/audit-logs`
- `AdminEmailMonitorController`: `GET /api/admin/email-actions`, `POST /api/admin/email-actions/{actionId}/retry`, `GET /api/admin/email-tokens`, `POST /api/admin/email-tokens/{tokenId}/revoke`
- `AdminSystemController`: `POST /api/admin/matching/rebuild?cvId=...`, `POST /api/admin/matching/rebuild-batch?page=...&size=...`

Admin control panel chỉ phục vụ vận hành hệ thống ở mức MVP: giám sát, khóa/mở user, ẩn/khôi phục job, xem audit log và monitor email/magic-link. Không đặt business logic candidate/recruiter vào package admin.

## 22. Các Flow End-to-End Quan Trọng

### 22.1 Login

```text
POST /api/auth/login
  -> AuthController.login
  -> AuthService.login
  -> UserAccountRepository.findByEmail
  -> PasswordEncoder.matches
  -> AuditLogRepository.save
  -> JwtService.generateToken
  -> ApiResponse<AuthResponse>
```

### 22.2 Recruiter Tạo Job

```text
POST /api/jobs
  -> JobController.createJob
  -> JobService.createJob
  -> check role RECRUITER
  -> create Job
  -> normalize JD text
  -> TF-IDF vector
  -> JobRepository.save
  -> trigger matching/recompute
```

### 22.3 Candidate Upload CV

```text
POST /api/cv/upload
  -> CvController.uploadPdf
  -> CvIngestionService.acceptPdfUpload
  -> CVRepository.save
  -> StorageService.store
  -> processPdfAsync
  -> PdfExtractionService.extractFromFile
  -> TextNormalizationService.normalize
  -> TfIdfService.buildVector
  -> CV status SCORING_DONE
  -> MatchingService.scoreAllJobsForCv
```

### 22.4 Candidate Xem Job Feed

```text
GET /api/matches/me/cards
  -> MatchingController
  -> MatchingQueryService.getCandidateJobCards
  -> find default CV
  -> MatchingRepository.findTopMatchesByCvId
  -> map Matching sang CandidateJobCardResponse
```

### 22.5 Candidate Ứng Tuyển

```text
POST /api/applications
  -> ApplicationController.apply
  -> ApplicationService.submit
  -> resolve Candidate
  -> resolve Job
  -> resolve CV
  -> find Matching
  -> save Application
  -> save AuditLog
```

### 22.6 Feedback

```text
POST /api/matches/{matchingId}/feedback?type=...&channel=WEB
  -> FeedbackService.submitFeedback
  -> FeedbackRepository.save
  -> RocchioService.updateJobVector
  -> mark matchings needsRecompute
  -> AutomationScheduler.recomputeStaleMatchings
```

Web feedback endpoint hiện Candidate-only: security yêu cầu JWT Candidate và service xác minh matching thuộc CV của Candidate đó. Query `role` mặc định `CANDIDATE`; giá trị khác trả `400`, token Recruiter trả `403`. Recruiter lifecycle actions dùng `/api/recruiter/**` và `/api/recruiter/applications/**`.

## 23. DTO Pattern

DTO nằm ở:

```text
auth/dto/AuthDtos.java
candidate/dto/CandidateDtos.java
cv/dto/CvDtos.java
job/dto/JobDtos.java
matching/dto/MatchingDtos.java
application/dto/ApplicationDtos.java
employer/dto/EmployerDtos.java
```

Project dùng record:

```java
public record CreateJobRequest(...) {}
public record JobCardResponse(...) {}
```

DTO giúp:

- không expose entity trực tiếp;
- tránh lộ field nhạy cảm;
- định hình contract rõ cho frontend;
- gom validation input.

## 24. Repository Pattern

Ví dụ:

```java
public interface JobRepository extends JpaRepository<Job, UUID> {
    List<Job> findByStatus(Job.JobStatus status);
}
```

Spring tự sinh query từ tên method:

- `findByStatus`
- `findByEmail`
- `existsByCandidateIdAndJobId`
- `findByCandidateIdOrderByCreatedAtDesc`

Query phức tạp dùng `@Query`.

`Pageable` dùng cho pagination.

`@Modifying` dùng cho update/delete query.

## 25. Transaction Pattern

Service dùng:

```java
@Transactional
```

Ý nghĩa:

- Nhiều thao tác DB trong method được commit cùng nhau.
- Nếu lỗi runtime xảy ra, transaction rollback.
- `readOnly = true` dùng cho method chỉ đọc.

Quy tắc đọc:

- Controller không nên tự mở transaction.
- Business write logic nên ở service.
- Repository chỉ truy vấn/lưu DB.

Với công việc nền phụ thuộc dữ liệu vừa ghi, project dùng:

```java
afterCommitExecutor.execute(() -> matchingService.scoreJobAgainstAllCvs(jobId));
```

Không chạy matching trước commit, vì worker có thể query không thấy CV/job vừa tạo. Cũng không truyền nguyên entity sang thread khác; truyền ID rồi load lại từ repository giúp vòng đời JPA rõ ràng hơn.

## 26. Kiến Thức Java/Spring Cần Học Song Song

### Enum

```java
public enum Role { CANDIDATE, RECRUITER, ADMIN }
```

Dùng để tránh string tùy tiện.

### Optional

```java
userRepo.findByEmail(email)
    .orElseThrow(() -> AppException.notFound("User", email));
```

Nếu không có data thì ném exception.

### Stream API

```java
jobs.stream()
    .filter(j -> j.getStatus() == Job.JobStatus.ACTIVE)
    .map(this::toCard)
    .toList();
```

Đọc từ trái sang phải: list -> filter -> map -> collect.

### Constructor Injection

```java
public JobService(JobRepository jobRepo) {
    this.jobRepo = jobRepo;
}
```

Spring inject dependency qua constructor.

### ObjectMapper

```java
objectMapper.writeValueAsString(list)
objectMapper.readValue(json, LIST_TYPE)
```

Dùng để convert Java object qua JSON string và ngược lại.

### ResponseEntity

```java
ResponseEntity.ok(ApiResponse.ok(data))
```

Dùng để kiểm soát HTTP status/body.

### BigDecimal

Dùng cho tiền và score cần precision tốt hơn `double`.

## 27. Thứ Tự Đọc Code Khuyến Nghị

1. `CareerFitBackendApplication.java`
2. `pom.xml`
3. `application.yml`
4. `ApiResponse.java`, `AppException.java`, `GlobalExceptionHandler.java`
5. `SecurityConfig.java`, `JwtService.java`, `JwtAuthenticationFilter.java`
6. `AuthController.java`, `AuthService.java`, `UserAccount.java`
7. `CandidateController.java`, `CandidateProfileService.java`, `Candidate.java`
8. `CvController.java`, `CvIngestionService.java`, `CV.java`
9. `TextNormalizationService.java`, `TfIdfService.java`
10. `JobController.java`, `JobService.java`, `Job.java`
11. `ScoringService.java`, `MatchingService.java`, `MatchingQueryService.java`
12. `ApplicationService.java`
13. `FeedbackService.java`, `RocchioService.java`
14. `AutomationScheduler.java`, `EmailActionService.java`
15. `AnalyticsService.java`
16. `admin/controller/*`, `admin/service/*`

## 28. Cách Tự Kiểm Tra Khi Đọc Một File

Khi đọc controller:

```text
Endpoint nào?
Role nào gọi được?
Input DTO nào?
Gọi service method nào?
Output DTO nào?
```

Khi đọc service:

```text
Load entity nào?
Check rule nghiệp vụ nào?
Gọi repository nào?
Có @Transactional không?
Có audit log không?
Map sang DTO nào?
```

Khi đọc entity:

```text
Map với table nào?
Primary key là gì?
Có quan hệ với entity nào?
Field nào là enum?
Field nào là JSONB?
Field nào auto timestamp?
```

## 29. Điểm Cần Cẩn Thận Trong Code Hiện Tại

- CV/job matching đã chuyển sang `AfterCommitExecutor`; khi thêm flow nền mới, giữ nguyên pattern truyền ID và chạy sau commit.
- `RocchioService` vẫn dùng `@Async`; cần nhớ exception trong async worker không tự rollback transaction đã nhận feedback và phải theo dõi qua log/test.
- `RateLimitFilter` lưu bucket trong memory; nhiều backend instance sẽ không dùng chung hạn mức.
- `SettingsService` lưu map động trong JSONB, vì vậy đổi tên key cần migration/compatibility plan dù Java compiler không bắt được.
- JSONB đang map thành `String`, nên parse/serialize lặp lại nhiều nơi.
- Một số dashboard controller dùng repository trực tiếp, chưa qua service.

Đây là các điểm nên biết khi học/debug, không nhất thiết phải sửa ngay.

## 30. Bài Tập Tự Học

1. Chạy backend và mở Swagger.
2. Login `ca / 1`, lấy JWT.
3. Gọi `GET /api/auth/me`.
4. Gọi `GET /api/jobs/search`.
5. Gọi `GET /api/matches/me/cards`.
6. Login `re / 1`, tạo job mới.
7. Upload hoặc tạo manual CV.
8. Gửi feedback cho một matching.
9. Đọc migration và so sánh với entity.
10. Viết test nhỏ cho `TextNormalizationService.normalize`.

Các lệnh kiểm tra chính:

```powershell
mvn test
mvn -DskipTests package
```

Test hiện có ba nhóm nên đọc:

- Unit/service test: scoring, TF-IDF, Rocchio, validation, settings, auth và after-commit behavior.
- Integration/contract test: Spring context, security hardening và `ApiContractIntegrationTest`.
- Testcontainers: dùng PostgreSQL thật để bắt lỗi khác biệt giữa H2/in-memory DB và PostgreSQL/Flyway.

Nếu làm được các bài này, bạn đã nắm được phần lõi backend Spring Boot của project.
