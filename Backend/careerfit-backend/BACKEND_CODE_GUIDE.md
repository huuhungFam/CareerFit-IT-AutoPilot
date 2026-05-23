# Huong Dan Doc Hieu Backend CareerFit

Tai lieu nay giai thich backend theo tung cum code de ban vua hieu project, vua hoc Java Spring Boot tu chinh project nay.

Backend nam tai:

```text
Backend/careerfit-backend
```

Khi doc code, hay mo file theo thu tu trong tai lieu nay. Moi phan se tra loi 4 cau hoi:

- File nay nam o dau?
- No thuoc lop nao trong Spring?
- No lam gi trong nghiep vu CareerFit?
- Neu moi hoc Java/Spring, can hieu khai niem nao?

## 1. Boi Canh He Thong

CareerFit la backend cho nen tang matching viec lam IT:

- Candidate dang ky, quan ly profile, upload CV.
- Recruiter dang job, quan ly employer profile, xem ung vien duoc xep hang.
- He thong doc CV/JD, chuan hoa text, tao vector TF-IDF, tinh diem matching.
- Candidate co feed job phu hop, ung tuyen, gui feedback.
- Feedback duoc dung de hoc lai vector job bang Rocchio.
- Scheduler gui digest/email notification va recompute matching nen.

Tech stack chinh:

- Java 21
- Spring Boot 3.2.5
- Spring Web: tao REST API
- Spring Data JPA/Hibernate: lam viec voi PostgreSQL bang entity/repository
- Spring Security: JWT va role-based access
- Flyway: migration database
- PDFBox: trich text tu PDF CV
- JJWT: tao/verify JWT
- Spring Mail: gui email
- Testcontainers: integration test voi PostgreSQL that

File quan trong dau tien:

```text
pom.xml
src/main/java/com/careerfit/backend/CareerFitBackendApplication.java
src/main/resources/application.yml
src/main/resources/db/migration/V1__init_schema.sql
```

## 2. Chay Backend De Co Ngu Canh

Doc code se de hon neu ban chay duoc app.

Tu root project `C:\CODING\Thesis`:

```powershell
Copy-Item .env.example .env
docker compose up -d
```

Tu backend:

```powershell
cd Backend\careerfit-backend
mvn spring-boot:run
```

Backend mac dinh chay tai:

```text
http://localhost:8080
```

Swagger:

```text
http://localhost:8080/swagger-ui.html
```

Demo accounts tu migration:

```text
Candidate: ca / 1
Recruiter: re / 1
```

## 3. Cach Spring Boot Khoi Dong App

Mo file:

```text
src/main/java/com/careerfit/backend/CareerFitBackendApplication.java
```

Code chinh:

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

Can hieu:

- `@SpringBootApplication`: diem bat dau cua Spring Boot. Spring quet cac class ben duoi package `com.careerfit.backend`.
- `@EnableAsync`: cho phep dung `@Async` de chay tac vu nen.
- `@EnableScheduling`: cho phep dung `@Scheduled` de chay tac vu lap lich.
- `SpringApplication.run(...)`: tao Spring ApplicationContext, doc config, tao bean, start embedded web server.

Khong nen xem `main` nhu noi xu ly business. No chi la cong tac bat app. Business nam o cac package domain.

## 4. Cau Truc Thu Muc Backend

Package root:

```text
src/main/java/com/careerfit/backend
```

Y nghia cac package:

| Package | Vai tro |
| --- | --- |
| `auth` | Dang ky, dang nhap, JWT, passwordless token |
| `candidate` | Ho so candidate, CV list, portfolio |
| `cv` | Upload PDF, tao CV manual, xu ly text, quan ly multi-CV |
| `job` | Recruiter tao/sua/xoa/search job |
| `employer` | Profile cong ty cua recruiter |
| `matching` | Tinh diem CV-JD, truy van ranking/feed match |
| `recommendation` | Goi y job cho candidate |
| `application` | Candidate ung tuyen, recruiter xem applicants |
| `feedback` | Candidate/recruiter danh gia match, Rocchio learning |
| `automation` | Policy AutoPilot va passwordless/email token |
| `notification` | Gui email, tao one-click action token |
| `scheduler` | Job nen: digest, recompute, token cleanup |
| `analytics` | Thong ke market/job trend |
| `audit` | Audit log va admin endpoints |
| `common` | Response format, exception, utility |
| `config` | Security, async executor, Jackson, OpenAPI |

Moi domain thuong co 4 loai file:

```text
controller/  -> nhan HTTP request
service/     -> xu ly nghiep vu
repository/  -> truy van database
entity/      -> map voi table database
dto/         -> shape request/response
```

Day la pattern quan trong nhat cua project.

## 5. Mo Hinh Lop Trong Spring

Luong request chung:

```text
Frontend
  -> Controller
  -> Service
  -> Repository
  -> Entity/Database
  -> Service map Entity sang DTO
  -> Controller boc ApiResponse
  -> JSON response
```

Vi du job search:

```text
GET /api/jobs/search
  -> JobController.search(...)
  -> JobService.search(...)
  -> JobRepository.searchJobs(...)
  -> PostgreSQL table job
  -> JobDtos.JobListResponse
  -> ApiResponse.ok(...)
```

Can hieu cac annotation:

- `@RestController`: class nhan HTTP request va tra JSON.
- `@Controller`: class tra HTML hoac response tu viet, nhu email action redeem page.
- `@Service`: class xu ly business logic.
- `@Entity`: class Java map voi table DB.
- `@Repository`: voi Spring Data JPA, interface extend `JpaRepository` thuong khong can ghi annotation.
- `@Transactional`: boc method trong database transaction.
- `@RequestMapping`, `@GetMapping`, `@PostMapping`, `@PatchMapping`, `@DeleteMapping`: khai bao route API.
- `@RequestBody`: lay JSON body.
- `@PathVariable`: lay bien trong URL.
- `@RequestParam`: lay query string.
- `@RequestAttribute("userId")`: lay user UUID da duoc filter gan vao request.

## 6. Maven Va Dependency

Mo:

```text
pom.xml
```

`pom.xml` la file khai bao project Maven.

Can doc:

- Parent la `spring-boot-starter-parent` version `3.2.5`.
- Java version la `21`.
- `spring-boot-starter-web`: REST API.
- `spring-boot-starter-data-jpa`: JPA repository/entity.
- `spring-boot-starter-security`: login/JWT/role.
- `spring-boot-starter-validation`: validate DTO bang annotation nhu `@NotBlank`.
- `postgresql`: JDBC driver.
- `flyway-core`: chay migration SQL.
- `jjwt-*`: JWT.
- `pdfbox`: doc text tu PDF.
- `springdoc-openapi`: Swagger UI.
- `spring-boot-starter-test`, `testcontainers`: test.

Neu moi hoc Spring, hay nho: Spring Boot starter gom san nhieu dependency can thiet. Ban it khi import tung thu vien nho bang tay.

## 7. Cau Hinh App

Mo:

```text
src/main/resources/application.yml
src/main/resources/application-dev.yml
src/main/resources/application-prod.yml
src/main/java/com/careerfit/backend/config/AppProperties.java
```

`application.yml` khai bao:

- `spring.datasource`: ket noi PostgreSQL.
- `spring.jpa.hibernate.ddl-auto: validate`: Hibernate chi validate schema, khong tu tao table.
- `spring.flyway`: noi chay migration.
- `spring.mail`: SMTP config.
- `spring.async.executor`: thread pool cho `@Async`.
- `server.port: 8080`.
- `app.jwt`: JWT secret va expiration.
- `app.storage`: noi luu file CV.
- `app.matching`: nguong label matching.
- `app.scheduler`: cron config.
- `app.cors`: frontend origins duoc phep goi API.

`AppProperties` doc cac gia tri `app.*` bang `@Value`.

Vi du:

```java
@Value("${app.jwt.secret}")
private String jwtSecret;
```

Nghia la Spring lay gia tri `app.jwt.secret` tu YAML/env va gan vao field.

## 8. Database Va Flyway

Mo:

```text
src/main/resources/db/migration/V1__init_schema.sql
src/main/resources/db/migration/V2__phase4_additions.sql
src/main/resources/db/migration/V3__phase5_and_6_additions.sql
src/main/resources/db/migration/V4__seed_data.sql
src/main/resources/db/migration/V5__rich_sample_data.sql
src/main/resources/db/migration/V6__demo_accounts_and_frontend_contract_seed.sql
src/main/resources/db/migration/V7__demo_candidate_default_cv.sql
```

Flyway chay cac file migration theo thu tu version `V1`, `V2`, ...

Cac table cot loi:

| Table | Entity | Y nghia |
| --- | --- | --- |
| `user_account` | `UserAccount` | Tai khoan chung cho candidate/recruiter/admin |
| `candidate` | `Candidate` | Profile rieng cua candidate |
| `employer_profile` | `EmployerProfile` | Profile cong ty cua recruiter |
| `cv` | `CV` | CV upload/manual, raw text, vector, status |
| `job` | `Job` | Job posting/JD cua recruiter |
| `matching` | `Matching` | Ket qua scoring giua 1 CV va 1 Job |
| `application` | `Application` | Candidate ung tuyen vao job |
| `feedback` | `Feedback` | Danh gia match |
| `automation_policy` | `AutomationPolicy` | Cau hinh AutoPilot/email |
| `email_token` | `EmailToken` | Token hash cho passwordless |
| `email_action_token` | `EmailAction` | Token click tu email notification |
| `audit_log` | `AuditLog` | Lich su hanh dong |
| `job_market_snapshot` | `JobMarketSnapshot` | Snapshot thong ke theo ngay |

Quan he chinh:

```text
UserAccount 1-1 Candidate
UserAccount 1-1 EmployerProfile
UserAccount 1-n Job
Candidate 1-n CV
CV n-n Job thong qua Matching
Candidate n-n Job thong qua Application
Matching 1-n Feedback
UserAccount 1-1 AutomationPolicy
```

Spring/JPA note:

- `@Entity` map class voi table.
- `@Id` la primary key.
- `@GeneratedValue(strategy = GenerationType.UUID)` tao UUID.
- `@ManyToOne`, `@OneToOne` map quan he giua table.
- `FetchType.LAZY` nghia la quan he chua load ngay cho den khi can.
- `@CreationTimestamp`, `@UpdateTimestamp` de Hibernate tu set thoi gian.
- JSONB trong DB dang duoc map thanh `String` trong Java, sau do parse bang `ObjectMapper`.

## 9. Response Va Exception Chung

Mo:

```text
src/main/java/com/careerfit/backend/common/response/ApiResponse.java
src/main/java/com/careerfit/backend/common/exception/AppException.java
src/main/java/com/careerfit/backend/common/exception/GlobalExceptionHandler.java
```

Tat ca API REST co dang chung:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "..."
  }
}
```

Khi loi:

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

`ApiResponse<T>` la Java `record`.

Can hieu Java record:

```java
public record ApiResponse<T>(boolean success, T data, ErrorPayload error, Meta meta) {}
```

Record la class bat bien ngan gon, Java tu tao constructor/getter-like methods. `T` la generic type, nghia la `ApiResponse<JobListResponse>`, `ApiResponse<Void>`, ...

`AppException` la custom exception cho loi nghiep vu:

- `AppException.notFound(...)`
- `AppException.forbidden(...)`
- `AppException.unauthorized(...)`
- `AppException.badRequest(...)`
- `AppException.conflict(...)`

`GlobalExceptionHandler` dung `@RestControllerAdvice` de bat exception toan app va doi thanh `ApiResponse.fail(...)`.

Day la pattern tot de controller/service khong phai try-catch lap lai.

## 10. Security, JWT Va Role

Mo theo thu tu:

```text
src/main/java/com/careerfit/backend/config/security/SecurityConfig.java
src/main/java/com/careerfit/backend/config/security/JwtService.java
src/main/java/com/careerfit/backend/config/security/JwtAuthenticationFilter.java
src/main/java/com/careerfit/backend/config/security/UserIdResolutionFilter.java
src/main/java/com/careerfit/backend/auth/service/AuthService.java
src/main/java/com/careerfit/backend/auth/controller/AuthController.java
```

### 10.1 SecurityConfig

`SecurityConfig` cau hinh:

- Tat CSRF vi API stateless JWT.
- Session policy la `STATELESS`.
- Route nao public, route nao can role.
- Them `JwtAuthenticationFilter` truoc `UsernamePasswordAuthenticationFilter`.
- Them `UserIdResolutionFilter` sau JWT filter.

Vi du role:

```text
/api/cv/**              -> CANDIDATE
/api/candidates/**      -> CANDIDATE
/api/recruiter/**       -> RECRUITER
POST/PATCH/DELETE jobs  -> RECRUITER
/api/admin/**           -> ADMIN
```

Spring Security note:

- `hasRole("CANDIDATE")` se check authority `ROLE_CANDIDATE`.
- Trong JWT filter, code tao authority:

```java
new SimpleGrantedAuthority("ROLE_" + role)
```

### 10.2 JwtService

`JwtService` lam 3 viec:

- `generateToken(subject, role)`: tao JWT.
- `extractSubject(token)`: lay email.
- `extractRole(token)`: lay role.
- `isTokenValid(token)`: verify chu ky va expiry.

Subject trong token la email user.

### 10.3 JwtAuthenticationFilter

Filter nay chay moi request:

```text
Authorization: Bearer <token>
```

Neu token hop le:

- Lay email va role tu token.
- Tao `UsernamePasswordAuthenticationToken`.
- Dat vao `SecurityContextHolder`.

Sau do Spring Security biet request nay la ai.

### 10.4 UserIdResolutionFilter

Filter nay lay email tu `SecurityContext`, query DB de tim `UserAccount`, roi set:

```java
request.setAttribute("userId", user.getId());
```

Nho vay controller co the dung:

```java
@RequestAttribute("userId") UUID userId
```

Day la cach project tranh viec moi controller phai tu query user.

## 11. Auth Domain

Mo:

```text
src/main/java/com/careerfit/backend/auth/controller/AuthController.java
src/main/java/com/careerfit/backend/auth/service/AuthService.java
src/main/java/com/careerfit/backend/auth/entity/UserAccount.java
src/main/java/com/careerfit/backend/auth/dto/AuthDtos.java
src/main/java/com/careerfit/backend/auth/repository/UserAccountRepository.java
```

### 11.1 AuthController

Routes:

| Method | Path | Service |
| --- | --- | --- |
| `POST` | `/api/auth/register` | `AuthService.register` |
| `POST` | `/api/auth/login` | `AuthService.login` |
| `POST` | `/api/auth/passwordless/request` | `requestPasswordlessToken` |
| `GET` | `/api/auth/passwordless/verify` | verify token GET |
| `POST` | `/api/auth/passwordless/verify` | verify token POST |
| `GET` | `/api/auth/me` | `getMe` |

Controller khong tu xu ly password/JWT. No goi service.

### 11.2 Register Flow

`AuthService.register(...)`:

```text
1. Check email da ton tai chua.
2. Parse role CANDIDATE/RECRUITER.
3. Hash password bang BCryptPasswordEncoder.
4. Save UserAccount.
5. Neu role la CANDIDATE, tao Candidate profile rong.
6. Save AuditLog REGISTER.
7. Tra AuthResponse gom JWT va user info.
```

Java/Spring note:

- `@Transactional`: neu buoc save user thanh cong nhung save candidate/audit loi, transaction rollback.
- `passwordEncoder.encode(...)`: khong luu password plain text.
- `UserAccount.Role.valueOf(...)`: convert string sang enum.

### 11.3 Login Flow

`AuthService.login(...)`:

```text
1. Normalize email/identifier.
2. Tim UserAccount theo email.
3. Check isActive.
4. Check password bang BCrypt.
5. Save AuditLog LOGIN.
6. Tra JWT.
```

Trong demo co logic:

```java
case "ca" -> "ca";
case "re" -> "re";
```

Nghia la demo login short account `ca` va `re` duoc chap nhan nhu email identifier.

### 11.4 Passwordless Flow

`requestPasswordlessToken(email)`:

```text
1. Tim user.
2. Revoke token PASSWORDLESS_LOGIN cu con active.
3. Tao raw token random 32 bytes.
4. Hash raw token bang SHA-256.
5. Luu hash vao email_token.
6. Tra raw token cho frontend trong MVP.
```

`verifyPasswordlessToken(rawToken)`:

```text
1. Hash raw token.
2. Tim email_token bang hash.
3. Check expired/used/revoked.
4. Mark token used.
5. Set emailVerified.
6. Save AuditLog PASSWORDLESS_LOGIN.
7. Tra JWT.
```

Security note: raw token khong luu DB, chi luu hash. Day la tu duy giong password reset token.

## 12. Candidate Domain

Mo:

```text
src/main/java/com/careerfit/backend/candidate/controller/CandidateController.java
src/main/java/com/careerfit/backend/candidate/service/CandidateProfileService.java
src/main/java/com/careerfit/backend/candidate/entity/Candidate.java
src/main/java/com/careerfit/backend/candidate/dto/CandidateDtos.java
```

Routes chinh:

| Method | Path | Y nghia |
| --- | --- | --- |
| `GET` | `/api/candidates/me` | Lay profile candidate |
| `PATCH` | `/api/candidates/me` | Cap nhat profile |
| `PATCH` | `/api/candidates/me/account` | Cap nhat account name |
| `GET` | `/api/candidates/me/cvs` | Lay CV summary |
| `GET` | `/api/candidates/me/portfolio` | Lay portfolio |
| `POST/PATCH/DELETE` | `/portfolio/links` | CRUD link |
| `POST/PATCH/DELETE` | `/portfolio/projects` | CRUD project |

`Candidate` entity chua:

- Thong tin lien he: phone, location, avatar.
- Mong muon viec lam: desired title, seniority, skills, work model, salary.
- Profile text: about me.
- Auto apply config co ban.

`CandidateProfileService` co pattern patch:

```java
if (req.phone() != null) candidate.setPhone(req.phone());
```

Nghia la field nao null thi khong update. Day la PATCH semantics.

JSONB fields nhu `desiredSkills` duoc DTO gui vao dang `List<String>`, service serialize thanh JSON string:

```java
objectMapper.writeValueAsString(req.desiredSkills())
```

Khi tra response, service parse nguoc JSON string thanh `List<String>`.

## 13. CV Domain

Mo theo thu tu:

```text
src/main/java/com/careerfit/backend/cv/controller/CvController.java
src/main/java/com/careerfit/backend/cv/service/CvIngestionService.java
src/main/java/com/careerfit/backend/cv/service/CvManagementService.java
src/main/java/com/careerfit/backend/cv/service/PdfExtractionService.java
src/main/java/com/careerfit/backend/cv/entity/CV.java
src/main/java/com/careerfit/backend/cv/dto/CvDtos.java
src/main/java/com/careerfit/backend/common/util/StorageService.java
src/main/java/com/careerfit/backend/common/util/TextNormalizationService.java
src/main/java/com/careerfit/backend/common/util/TfIdfService.java
```

Routes:

| Method | Path | Y nghia |
| --- | --- | --- |
| `POST` | `/api/cv/upload` | Upload PDF CV |
| `POST` | `/api/cv/manual` | Tao CV tu form |
| `GET` | `/api/cv/me` | List CV cua candidate |
| `GET` | `/api/cv/{cvId}` | Chi tiet CV |
| `GET` | `/api/cv/{cvId}/status` | Trang thai xu ly CV |
| `POST` | `/api/cv/{cvId}/set-default` | Dat CV mac dinh |
| `DELETE` | `/api/cv/{cvId}` | Xoa CV |

### 13.1 CV Entity

`CV` co cac status:

```text
UPLOADED -> VALIDATING -> PROCESSING -> SCORING_DONE
                              |
                              -> FAILED
```

Field quan trong:

- `rawText`: text lay tu PDF hoac form manual.
- `parsedSummary`: summary ngan tu top tokens.
- `topSkillsJson`: JSONB list top skill/term.
- `extractedTermsJson`: JSONB map term -> TF-IDF weight.
- `language`: `vi` hoac `en`.
- `isDefault`: CV mac dinh de matching feed.
- `filePath`: file PDF tren disk.

### 13.2 Upload PDF Flow

`CvIngestionService.acceptPdfUpload(...)`:

```text
1. Tim Candidate theo userId.
2. Check file la PDF.
3. Tao CV status UPLOADED.
4. Luu metadata CV vao DB.
5. Luu file vao disk bang StorageService.
6. Neu candidate chua co default CV, set CV nay lam default.
7. Save AuditLog CV_UPLOAD.
8. Goi processPdfAsync(cvId).
9. Tra response ngay cho frontend.
```

`processPdfAsync(cvId)`:

```text
1. Load CV tu DB.
2. Set status VALIDATING.
3. Resolve file path.
4. PdfExtractionService doc text tu PDF.
5. Set status PROCESSING, save rawText.
6. Goi vectorizeAndScore(cv).
```

`vectorizeAndScore(cv)`:

```text
1. Check rawText khong rong.
2. Detect language neu chua co.
3. Normalize text thanh tokens.
4. Build TF-IDF vector.
5. Lay top 15 terms lam topSkills.
6. Tao parsedSummary tu top terms.
7. Luu extractedTermsJson, topSkillsJson, lastScoredAt.
8. Set status SCORING_DONE.
9. Goi MatchingService.scoreAllJobsForCv(cv).
```

Spring note ve `@Async`:

- `@Async` can Spring proxy de chay khac thread.
- Khi mot method trong cung class goi truc tiep method `@Async` cua chinh class do, Spring proxy co the khong duoc kich hoat. Neu can dam bao async thuc su, thuong tach worker sang bean rieng hoac goi qua proxy.
- Trong code hien tai, pipeline van doc duoc theo logic nghiep vu tren; diem nay dang de ban can biet khi hoc Spring.

### 13.3 Manual CV Flow

`acceptManualCv(...)`:

```text
1. Tim Candidate.
2. Tao CV source MANUAL.
3. Build rawText tu cac field form.
4. Save CV.
5. Set default neu chua co default.
6. Goi processManualAsync(cvId).
```

Khac PDF la khong can `StorageService` va `PdfExtractionService`.

### 13.4 PdfExtractionService

Dung Apache PDFBox:

```text
Loader.loadPDF(...)
PDFTextStripper.getText(...)
```

Rule:

- File phai la PDF.
- PDF encrypted thi loi.
- Text qua ngan thi coi la image-only/scanned PDF va fail.
- Khong co OCR.

### 13.5 StorageService

Luu file vao local path:

```text
app.storage.local-path
```

Mac dinh:

```text
./storage/cv
```

`store(file, cvId)`:

- Check size.
- Sanitize original filename.
- Tao filename bang `cvId_originalName`.
- Copy stream ra disk.
- Tra relative path de luu DB.

## 14. Text Normalization Va TF-IDF

Mo:

```text
src/main/java/com/careerfit/backend/common/util/TextNormalizationService.java
src/main/java/com/careerfit/backend/common/util/TfIdfService.java
```

### 14.1 TextNormalizationService

`normalize(text, language)`:

```text
1. Xoa HTML tags.
2. Xoa ky tu dac biet, giu chu Viet.
3. Lowercase.
4. Split theo whitespace.
5. Bo stopwords va token qua ngan.
6. Tra List<String>.
```

`detectLanguage(text)`:

- Dem so ky tu co dau tieng Viet.
- Neu lon hon 5 thi `vi`, nguoc lai `en`.

Day la heuristic don gian, khong phai NLP model.

### 14.2 TfIdfService

`@PostConstruct buildIdf()` chay sau khi bean duoc tao.

No tao IDF map tu `SEED_CORPUS`, mot corpus IT co san.

Formula:

```text
TF(t,d) = count(t in document) / total_terms
IDF(t) = log(1 + N / (1 + df(t)))
TFIDF(t,d) = TF * IDF
```

`buildVector(tokens)` tra:

```java
Map<String, Double>
```

`cosineSimilarity(vecA, vecB)` tinh diem gan nhau giua 2 vector trong khoang `0.0` den `1.0`.

Sau do `ScoringService` nhan `rawScore * 100`.

## 15. Job Domain

Mo:

```text
src/main/java/com/careerfit/backend/job/controller/JobController.java
src/main/java/com/careerfit/backend/job/service/JobService.java
src/main/java/com/careerfit/backend/job/entity/Job.java
src/main/java/com/careerfit/backend/job/dto/JobDtos.java
src/main/java/com/careerfit/backend/job/repository/JobRepository.java
```

Routes:

| Method | Path | Access | Y nghia |
| --- | --- | --- | --- |
| `GET` | `/api/jobs`, `/api/jobs/search` | Public | Search job |
| `GET` | `/api/jobs/suggestions` | Public | Goi y title/company/skill |
| `GET` | `/api/jobs/{id}` | Public | Job detail |
| `POST` | `/api/jobs` | Recruiter | Tao job |
| `PATCH` | `/api/jobs/{id}` | Recruiter owner | Sua job |
| `PATCH` | `/api/jobs/{id}/status` | Recruiter owner | Doi status |
| `DELETE` | `/api/jobs/{id}` | Recruiter owner | Xoa job |

### 15.1 Job Entity

Field quan trong:

- `recruiter`: UserAccount dang job.
- `title`, `company`, `originalText`.
- `requiredSkillsJson`, `niceToHaveSkillsJson`.
- `salaryMode`, `salaryMin`, `salaryMax`, `salaryCurrency`, `salaryDisplayText`.
- `tfidfVectorJson`: vector JD ban dau.
- `learnedProfileVectorJson`: vector sau khi hoc tu feedback.
- `status`: `ACTIVE`, `CLOSED`, `DRAFT`, `PAUSED`.

### 15.2 Create Job Flow

`JobService.createJob(userId, req)`:

```text
1. Tim UserAccount recruiter.
2. Check role la RECRUITER.
3. Parse SalaryMode.
4. Tao Job entity.
5. Apply field tu request.
6. Detect language tu originalText neu request khong gui.
7. Vectorize JD bang normalizer + TF-IDF.
8. Save job.
9. Goi MatchingService.scoreJobAgainstAllCvs(job).
10. Tra JobDetailResponse.
```

Can chu y: `scoreJobAgainstAllCvs` hien tai khong score tat ca CV moi, ma mark existing matchings cua job la `needsRecompute`. Neu muon khi tao job moi tu dong co matching voi tat ca CV da xu ly, can doc/sua tiep `MatchingService.scoreJobAgainstAllCvs`.

### 15.3 Search Job

`JobRepository.searchJobs(...)` dung JPQL:

```java
SELECT j FROM Job j
WHERE j.status = 'ACTIVE'
  AND (:keyword = '' OR LOWER(j.title) LIKE ...)
```

Spring Data JPA note:

- Method repository co the tu sinh query theo ten, vi du `findByStatus`.
- Neu can query phuc tap, dung `@Query`.
- `Pageable` dung cho pagination va sort.

## 16. Employer Domain

Mo:

```text
src/main/java/com/careerfit/backend/employer/controller/EmployerController.java
src/main/java/com/careerfit/backend/employer/service/EmployerService.java
src/main/java/com/careerfit/backend/employer/entity/EmployerProfile.java
src/main/java/com/careerfit/backend/employer/dto/EmployerDtos.java
```

Routes:

| Method | Path | Access | Y nghia |
| --- | --- | --- | --- |
| `GET` | `/api/employers/featured` | Public | Cong ty noi bat |
| `GET` | `/api/employers/{slug}` | Public | Profile cong ty |
| `GET` | `/api/employers/{slug}/jobs` | Public | Job cua cong ty |
| `GET` | `/api/employers/me` | Recruiter | Profile cong ty cua minh |
| `PUT` | `/api/employers/me` | Recruiter | Tao/cap nhat profile |

`EmployerService.createOrUpdate(...)`:

```text
1. Tim recruiter.
2. Check role RECRUITER.
3. Tim profile hien co hoac tao moi.
4. Tao slug tu companyName neu khong co slug.
5. Check slug trung, neu trung them prefix userId.
6. Serialize benefits list thanh JSON.
7. Save va tra DTO.
```

Java note:

- `Normalizer.normalize(...)` trong `toSlug` de bo dau Unicode.
- Regex `[^a-z0-9-]` de xoa ky tu khong hop le trong slug.

## 17. Matching Domain

Mo theo thu tu:

```text
src/main/java/com/careerfit/backend/matching/entity/Matching.java
src/main/java/com/careerfit/backend/matching/service/ScoringService.java
src/main/java/com/careerfit/backend/matching/service/MatchingService.java
src/main/java/com/careerfit/backend/matching/service/MatchingQueryService.java
src/main/java/com/careerfit/backend/matching/repository/MatchingRepository.java
src/main/java/com/careerfit/backend/matching/controller/MatchingController.java
src/main/java/com/careerfit/backend/recruiter/controller/RecruiterController.java
```

### 17.1 Matching Entity

Moi row `matching` dai dien cho 1 cap:

```text
CV + Job
```

Field:

- `rawScore`: cosine similarity `0.0 -> 1.0`.
- `normalizedScore`: `rawScore * 100`.
- `label`: `LOW`, `MEDIUM`, `HIGH`, `POTENTIAL`.
- `isPotential`: flag heuristic.
- `matchReasonsJson`: reason chips hien thi UI/email.
- `potentialReasonJson`: ly do vi sao potential.
- `needsRecompute`: can tinh lai sau feedback/job update.

### 17.2 ScoringService

`score(cv, job)`:

```text
1. Parse vector tu CV.extractedTermsJson.
2. Parse vector tu Job.tfidfVectorJson.
3. Tinh cosine similarity.
4. Doi sang diem 0-100.
5. Gan label.
6. Detect potential.
7. Build match reasons.
8. Tra ScoringResult.
```

Label threshold doc tu `app.matching`:

```yaml
score-label-low-max: 40.0
score-label-medium-max: 70.0
score-label-high-max: 90.0
```

Trong code hien tai:

```java
if (score >= highMax) return HIGH;
if (score >= mediumMax) return HIGH;
if (score >= lowMax) return MEDIUM;
return LOW;
```

Nghia la diem `>= 70` dang thanh `HIGH`, diem `40..69.99` thanh `MEDIUM`. Khi hoc/sua logic matching, day la doan nen doc ky.

### 17.3 Potential Heuristic

`detectPotential(...)` danh dau potential khi:

- Score nam khoang trung binh, khong qua thap/qua cao.
- Co nhieu term quan trong cua job xuat hien trong CV.
- Hoac seniority cua CV/JD tuong thich.

Day khong phai ML model. No la rule-based heuristic.

### 17.4 MatchingService

`scoreAllJobsForCv(cv)`:

```text
1. Lay tat ca job ACTIVE.
2. Bo qua job khong compatible language.
3. Voi moi job, goi upsertMatching(cv, job).
4. Save AuditLog CV_BATCH_MATCH_DONE.
```

`upsertMatching(cv, job)`:

```text
1. Goi ScoringService.score.
2. Tim matching cu bang cvId + jobId.
3. Neu co thi update, neu khong thi tao moi.
4. Save score, label, potential, reasons.
```

Upsert la pattern: update neu ton tai, insert neu chua co.

### 17.5 MatchingQueryService

Dung cho hai man hinh:

- Recruiter xem ranking ung vien theo job.
- Candidate xem job feed theo default CV.

Methods:

- `getRankedCandidates(jobId, recruiterId, page, size, potentialOnly)`
- `getMatchedJobs(userId, page, size, label, potentialOnly)`
- `getCandidateJobCards(userId, page, size, label, potentialOnly)`

Security nghiep vu:

- Recruiter chi xem ranking cua job minh so huu.
- Candidate chi xem matches cua default CV cua minh.

## 18. Recommendation Domain

Mo:

```text
src/main/java/com/careerfit/backend/recommendation/controller/RecommendationController.java
src/main/java/com/careerfit/backend/recommendation/service/RecommendationService.java
```

Routes:

| Method | Path | Access | Y nghia |
| --- | --- | --- | --- |
| `GET` | `/api/recommendations/jobs` | Candidate | Goi y job ca nhan |
| `GET` | `/api/recommendations/jobs/{jobId}/similar` | Public | Job tuong tu |

`getRecommendations(userId, limit)`:

```text
1. Tim Candidate.
2. Neu khong co default CV, fallback sang profile-based recommendation.
3. Lay top matchings cua default CV.
4. Bo job khong ACTIVE.
5. Tinh finalScore:
   base matching score * 0.7
   + skill overlap boost * 0.2
   + location boost * 0.1
6. Sort finalScore giam dan.
```

Neu khong co CV, `getProfileBasedRecommendations` dung:

- desired title
- desired skills
- location

`getSimilarJobs(jobId, limit)` dua tren overlap required skills.

## 19. Application Domain

Mo:

```text
src/main/java/com/careerfit/backend/application/controller/ApplicationController.java
src/main/java/com/careerfit/backend/application/service/ApplicationService.java
src/main/java/com/careerfit/backend/application/entity/Application.java
src/main/java/com/careerfit/backend/application/dto/ApplicationDtos.java
src/main/java/com/careerfit/backend/application/repository/ApplicationRepository.java
```

Routes:

| Method | Path | Access | Y nghia |
| --- | --- | --- | --- |
| `POST` | `/api/applications` | Candidate | Ung tuyen |
| `GET` | `/api/applications/me` | Candidate | Don cua toi |
| `DELETE` | `/api/applications/{id}` | Candidate owner | Withdraw |
| `GET` | `/api/recruiter/jobs/{jobId}/applicants` | Recruiter owner | Xem applicants |
| `PATCH` | `/api/recruiter/applications/{id}/status` | Recruiter owner | Doi trang thai |

### 19.1 Submit Application Flow

`ApplicationService.submit(userId, req)`:

```text
1. Tim Candidate.
2. Tim Job.
3. Check job ACTIVE.
4. Check candidate chua apply job nay.
5. Resolve CV: cvId request gui len hoac default CV.
6. Tim Matching neu co.
7. Tao Application.
8. Luu cover letter neu co.
9. Save AuditLog APPLICATION_SUBMITTED.
10. Tra MyApplicationResponse.
```

Status:

```text
PENDING
AUTO_APPLIED
APPROVED
REJECTED
INVITED
NOT_INTERESTED
```

`withdraw(...)` khong xoa row, ma set status `NOT_INTERESTED`.

## 20. Feedback Va Rocchio Learning

Mo:

```text
src/main/java/com/careerfit/backend/feedback/controller/FeedbackController.java
src/main/java/com/careerfit/backend/feedback/service/FeedbackService.java
src/main/java/com/careerfit/backend/feedback/service/RocchioService.java
src/main/java/com/careerfit/backend/feedback/entity/Feedback.java
```

Route:

```text
POST /api/matches/{matchingId}/feedback
```

`FeedbackService.submitFeedback(...)`:

```text
1. Tim Matching.
2. Tim UserAccount actor.
3. Tao feedback neu chua co.
4. Save feedback.
5. Save AuditLog FEEDBACK_SUBMITTED.
6. Neu feedback khong phai NOT_INTERESTED, goi RocchioService.updateJobVector(jobId).
```

Feedback types:

- `GOOD_MATCH`: positive signal.
- `POTENTIAL`: positive yeu hon.
- `BAD_MATCH`: negative signal.
- `NOT_INTERESTED`: skip, khong hoc Rocchio.

### 20.1 RocchioService

Rocchio formula trong code:

```text
new_q = alpha * q + beta * positive_centroid - gamma * negative_centroid
```

Trong code:

```text
alpha = 1.0
beta  = 0.75
gamma = 0.15
```

Y nghia:

- `q`: vector job hien tai.
- Positive CVs: CV cua feedback `GOOD_MATCH`/`POTENTIAL`.
- Negative CVs: CV cua feedback `BAD_MATCH`.
- Ket qua luu vao `Job.learnedProfileVectorJson`.
- Sau do mark tat ca matching cua job la `needsRecompute = true`.

Scheduler se recompute cac row nay sau.

Can chu y khi doc: `ScoringService` hien parse `Job.tfidfVectorJson`, chua dung `learnedProfileVectorJson` trong score. Neu muon Rocchio anh huong diem ngay, day la diem can noi tiep khi sua code.

## 21. Automation, Email Va Scheduler

Mo:

```text
src/main/java/com/careerfit/backend/automation/controller/AutomationController.java
src/main/java/com/careerfit/backend/automation/service/AutomationPolicyService.java
src/main/java/com/careerfit/backend/automation/entity/AutomationPolicy.java
src/main/java/com/careerfit/backend/automation/entity/EmailToken.java
src/main/java/com/careerfit/backend/notification/service/EmailActionService.java
src/main/java/com/careerfit/backend/notification/controller/EmailActionController.java
src/main/java/com/careerfit/backend/notification/entity/EmailAction.java
src/main/java/com/careerfit/backend/scheduler/AutomationScheduler.java
```

### 21.1 Automation Policy

Routes:

| Method | Path | Y nghia |
| --- | --- | --- |
| `GET` | `/api/automation/policy` | Lay policy |
| `PATCH` | `/api/automation/policy` | Cap nhat policy |
| `POST` | `/api/automation/pause` | Pause |
| `POST` | `/api/automation/resume` | Resume |

`AutomationPolicy` chua:

- auto apply threshold
- daily digest
- timezone/quiet hours
- high match notification
- quota/cooldown
- email action/passwordless flags

Service co mot so alias field de match frontend contract:

```java
isAutopilotEnabled() -> highMatchEmailEnabled
isDigestEnabled() -> dailyDigestEnabled
getMinScoreToNotify() -> highMatchThreshold
```

### 21.2 MailService Va NoOpMailService

Mo:

```text
src/main/java/com/careerfit/backend/notification/service/IMailService.java
src/main/java/com/careerfit/backend/notification/service/MailService.java
src/main/java/com/careerfit/backend/notification/service/NoOpMailService.java
```

`MailService` chi active khi:

```text
app.mail.enabled=true
```

Dev profile set:

```yaml
app:
  mail:
    enabled: false
```

Nen local dev dung `NoOpMailService`: khong gui email that, chi log.

Spring note:

- `@ConditionalOnProperty`: tao bean neu property dung.
- `@ConditionalOnMissingBean`: tao bean fallback neu bean that khong ton tai.

### 21.3 EmailActionService

Dung de gui:

- High match notification.
- Daily digest.

Moi email co one-click token:

```text
GOOD_MATCH
POTENTIAL
NOT_INTERESTED
VIEW_JOB
UNSUBSCRIBE_DIGEST
```

Token luu o table `email_action_token`.

### 21.4 EmailActionController

Route public:

```text
GET /api/email-action/redeem?token=<token>
```

Flow:

```text
1. Tim EmailAction theo token.
2. Neu token invalid/expired/redeemed thi tra HTML thong bao.
3. Map action sang FeedbackType neu la feedback action.
4. Goi FeedbackService.submitFeedback(...).
5. Mark token REDEEMED.
6. Tra HTML success page.
```

Endpoint nay public vi token chinh la authentication factor. Token co expiry 72h.

### 21.5 AutomationScheduler

Scheduler jobs:

| Method | Schedule | Viec lam |
| --- | --- | --- |
| `recomputeStaleMatchings` | fixed delay 30 min | Re-score matching co `needsRecompute=true` |
| `sendDailyDigest` | 08:00 ICT daily | Gui digest cho policy active |
| `cleanupExpiredTokens` | 03:00 ICT daily | Expire/purge email action token |
| `notifyHighMatches` | fixed delay 4h | Gui high-match notification |

Spring note:

- `@Scheduled(cron = "...", zone = "...")` chay theo lich.
- `@Scheduled(fixedDelay = ...)` chay lai sau khi lan truoc ket thuc mot khoang delay.
- Scheduler can `@EnableScheduling` o main app.

## 22. Analytics, Recruiter Dashboard Va Admin

### 22.1 Analytics

Mo:

```text
src/main/java/com/careerfit/backend/analytics/controller/AnalyticsController.java
src/main/java/com/careerfit/backend/analytics/service/AnalyticsService.java
src/main/java/com/careerfit/backend/analytics/entity/JobMarketSnapshot.java
```

Routes:

| Method | Path | Y nghia |
| --- | --- | --- |
| `GET` | `/api/analytics/stats` | Homepage stats |
| `GET` | `/api/analytics/trend` | Trend N ngay |
| `GET` | `/api/analytics/roles` | Phan bo role |

`AnalyticsService.buildDailySnapshot()` chay moi ngay 07:00 ICT, tinh:

- total jobs
- active jobs
- new jobs
- employer count
- distribution by role

### 22.2 Recruiter Dashboard

Mo:

```text
src/main/java/com/careerfit/backend/recruiter/controller/RecruiterDashboardController.java
src/main/java/com/careerfit/backend/recruiter/controller/RecruiterController.java
```

Routes:

| Method | Path | Y nghia |
| --- | --- | --- |
| `GET` | `/api/recruiter/dashboard` | Overview dashboard |
| `GET` | `/api/recruiter/jobs/{jobId}/stats` | Job stats |
| `GET` | `/api/recruiter/jobs/{jobId}/top-candidates` | Top candidates |
| `GET` | `/api/recruiter/jobs` | My jobs |
| `GET` | `/api/recruiter/jobs/{jobId}/ranking` | Ranking page |

Controller nay truc tiep dung repository nhieu hon service. Khi hoc clean architecture, ban co the thay style nay khac voi domain khac. Neu muon dong nhat hon, co the tach dashboard service sau.

### 22.3 Admin

Mo:

```text
src/main/java/com/careerfit/backend/audit/controller/AdminController.java
src/main/java/com/careerfit/backend/audit/entity/AuditLog.java
src/main/java/com/careerfit/backend/audit/repository/AuditLogRepository.java
```

Routes:

| Method | Path | Y nghia |
| --- | --- | --- |
| `GET` | `/api/admin/audit-logs` | Xem audit logs |
| `GET` | `/api/admin/users` | List users |
| `PATCH` | `/api/admin/users/{userId}/deactivate` | Deactivate user |
| `PATCH` | `/api/admin/users/{userId}/activate` | Activate user |
| `POST` | `/api/admin/matching/rebuild` | Force rebuild matching cho CV |
| `GET` | `/api/admin/system/stats` | Stats nhanh |

## 23. End-To-End Flows Can Nam

### 23.1 Candidate Dang Ky Va Dang Nhap

```text
POST /api/auth/register
  -> AuthController.register
  -> AuthService.register
  -> UserAccountRepository.existsByEmail
  -> PasswordEncoder.encode
  -> UserAccountRepository.save
  -> CandidateRepository.save neu role CANDIDATE
  -> AuditLogRepository.save
  -> JwtService.generateToken
  -> ApiResponse<AuthResponse>
```

Sau login/register, frontend luu JWT va gui:

```text
Authorization: Bearer <token>
```

Moi protected request:

```text
JwtAuthenticationFilter
  -> SecurityContext
  -> UserIdResolutionFilter
  -> @RequestAttribute("userId")
```

### 23.2 Recruiter Tao Job

```text
POST /api/jobs
  -> JobController.createJob
  -> JobService.createJob
  -> check recruiter role
  -> create Job entity
  -> TextNormalizationService.detectLanguage
  -> TextNormalizationService.normalize
  -> TfIdfService.buildVector
  -> objectMapper.writeValueAsString(vector)
  -> JobRepository.save
  -> MatchingService.scoreJobAgainstAllCvs
```

Ket qua la job co `tfidfVectorJson`, san sang de CV matching.

### 23.3 Candidate Upload CV Va Co Match

```text
POST /api/cv/upload
  -> CvController.uploadPdf
  -> CvIngestionService.acceptPdfUpload
  -> CVRepository.save status UPLOADED
  -> StorageService.store
  -> processPdfAsync
  -> PdfExtractionService.extractFromFile
  -> TextNormalizationService.normalize
  -> TfIdfService.buildVector
  -> CVRepository.save status SCORING_DONE
  -> MatchingService.scoreAllJobsForCv
  -> MatchingRepository.save per CV-job pair
```

Sau do candidate goi:

```text
GET /api/matches/me/cards
```

Service se lay default CV va return top matches.

### 23.4 Candidate Apply Job

```text
POST /api/applications
  -> ApplicationController.apply
  -> ApplicationService.submit
  -> resolve Candidate
  -> resolve Job ACTIVE
  -> check duplicate application
  -> resolve CV request/default
  -> find Matching if exists
  -> save Application
  -> save AuditLog
```

Recruiter xem applicants:

```text
GET /api/recruiter/jobs/{jobId}/applicants
```

### 23.5 Feedback Tu Web Hoac Email

Web:

```text
POST /api/matches/{matchingId}/feedback
  -> FeedbackService.submitFeedback
  -> FeedbackRepository.save
  -> RocchioService.updateJobVector
  -> Matching rows mark needsRecompute=true
  -> AutomationScheduler.recomputeStaleMatchings
```

Email:

```text
User click email link
  -> GET /api/email-action/redeem?token=...
  -> EmailActionController.redeem
  -> FeedbackService.submitFeedback
  -> EmailAction.redeem
```

## 24. DTO Pattern

DTO files:

```text
auth/dto/AuthDtos.java
candidate/dto/CandidateDtos.java
cv/dto/CvDtos.java
job/dto/JobDtos.java
matching/dto/MatchingDtos.java
application/dto/ApplicationDtos.java
employer/dto/EmployerDtos.java
```

Project gom nhieu record trong mot class container:

```java
public class JobDtos {
    public record CreateJobRequest(...) {}
    public record JobCardResponse(...) {}
}
```

Y nghia:

- Request DTO: shape JSON frontend gui len.
- Response DTO: shape JSON backend tra ve.
- Entity khong nen tra truc tiep ra API vi co lazy relations, password hash, field noi bo.

Validation note:

- Neu DTO co `@NotBlank`, `@NotNull`, `@Size`, Spring Validation se check khi controller dung `@Valid`.
- Loi validation bi `GlobalExceptionHandler.handleValidation` bat va tra `VALIDATION_ERROR`.

## 25. Repository Pattern

Repository la interface extend `JpaRepository<Entity, ID>`.

Vi du:

```java
public interface JobRepository extends JpaRepository<Job, UUID> {
    List<Job> findByStatus(Job.JobStatus status);
}
```

Spring Data JPA tu sinh query tu ten method:

- `findByStatus`
- `findByCandidateIdOrderByCreatedAtDesc`
- `existsByEmail`
- `findByCvIdAndJobId`

Neu query phuc tap, dung `@Query`:

```java
@Query("""
    SELECT j FROM Job j
    WHERE j.status = 'ACTIVE'
      AND (:keyword = '' OR LOWER(j.title) LIKE ...)
""")
Page<Job> searchJobs(...);
```

Can hieu:

- JPQL query theo entity/field Java, khong phai ten table/cot SQL truc tiep.
- `@Param` bind bien query.
- `Pageable` quyet dinh page, size, sort.
- `@Modifying` dung cho update/delete query.

## 26. Transaction Pattern

Project dung `@Transactional` o service layer.

Quy tac de hieu:

- Method ghi DB: `@Transactional`
- Method chi doc: `@Transactional(readOnly = true)`
- Neu co RuntimeException trong transaction, Spring rollback.
- Repository call trong cung transaction se duoc commit cuoi method.

Vi du trong `ApplicationService.submit`:

```text
save Application
save AuditLog
```

Neu save audit bi loi, application cung rollback. Day giu data consistency.

## 27. Async Va Scheduled Pattern

Async:

```java
@Async
public void sendHtml(...) {}
```

Can:

- `@EnableAsync` o main app.
- Executor bean trong `AsyncConfig`.
- Goi qua Spring bean proxy.

Scheduled:

```java
@Scheduled(cron = "0 0 8 * * *", zone = "Asia/Ho_Chi_Minh")
```

Can:

- `@EnableScheduling` o main app.
- Method public, khong can controller call.

## 28. Thu Tu Doc Code De Hoc Nhanh

Neu ban moi hoc Java/Spring, nen doc theo thu tu nay:

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
15. `AnalyticsService.java`, `AdminController.java`

Moi lan doc 1 controller, hay tra loi:

```text
Endpoint nao?
Access role nao?
Input DTO nao?
Service method nao?
Output DTO nao?
Loi nghiep vu nem AppException nao?
```

Moi lan doc 1 service, hay tra loi:

```text
Entity nao duoc load?
Rule nghiep vu nao duoc check?
Repository nao duoc goi?
Co transaction khong?
Co audit log khong?
Tra DTO nao?
```

Moi lan doc 1 entity, hay tra loi:

```text
Map voi table nao?
Primary key la gi?
Co quan he voi entity nao?
Field nao la enum?
Field nao la JSONB?
Field nao la createdAt/updatedAt?
```

## 29. Java/Spring Kien Thuc Nen Hoc Song Song

### 29.1 Java Enum

Project dung enum cho role/status:

```java
public enum Role { CANDIDATE, RECRUITER, ADMIN }
```

Enum giup tranh string tuy tien trong business logic.

### 29.2 Optional

Repository thuong tra:

```java
Optional<UserAccount> findByEmail(String email)
```

Hay dung:

```java
orElseThrow(() -> AppException.notFound("User", email))
```

Nghia la neu khong co user thi nem exception.

### 29.3 Stream API

Project dung stream de map/filter/sort:

```java
jobs.stream()
    .filter(j -> j.getStatus() == Job.JobStatus.ACTIVE)
    .map(this::toCard)
    .toList();
```

Doc tu trai sang phai:

```text
danh sach jobs -> loc active -> doi sang DTO card -> thanh list
```

### 29.4 Constructor Injection

Service khong dung `new Repository()`. Spring inject bean qua constructor:

```java
public JobService(JobRepository jobRepo, UserAccountRepository userRepo, ...) {
    this.jobRepo = jobRepo;
}
```

Day la Dependency Injection.

### 29.5 ObjectMapper

Dung de convert Java object <-> JSON string:

```java
objectMapper.writeValueAsString(list)
objectMapper.readValue(json, LIST_TYPE)
```

Project dung cach nay vi DB luu JSONB nhung entity field dang la `String`.

### 29.6 ResponseEntity

Controller tra:

```java
ResponseEntity.ok(ApiResponse.ok(data))
```

`ResponseEntity` cho phep set HTTP status/header/body.

### 29.7 BigDecimal

Tien luong va score dung `BigDecimal` de tranh sai so floating-point.

Vi du:

```java
BigDecimal.valueOf(rawScore * 100.0).setScale(2, RoundingMode.HALF_UP)
```

## 30. API Map Nhanh

| Domain | Base path | Controller |
| --- | --- | --- |
| Auth | `/api/auth` | `AuthController` |
| Candidate | `/api/candidates/me` | `CandidateController` |
| CV | `/api/cv` | `CvController` |
| Job | `/api/jobs` | `JobController` |
| Employer | `/api/employers` | `EmployerController` |
| Matching candidate | `/api/matches` | `MatchingController` |
| Matching recruiter | `/api/recruiter/jobs/{jobId}/ranking` | `RecruiterController` |
| Recommendation | `/api/recommendations` | `RecommendationController` |
| Application | `/api/applications`, `/api/recruiter/...` | `ApplicationController` |
| Feedback | `/api/matches/{matchingId}/feedback` | `FeedbackController` |
| Automation | `/api/automation` | `AutomationController` |
| Email action | `/api/email-action` | `EmailActionController` |
| Analytics | `/api/analytics` | `AnalyticsController` |
| Admin | `/api/admin` | `AdminController` |
| Recruiter dashboard | `/api/recruiter` | `RecruiterDashboardController` |

## 31. Khi Muon Them Mot Feature Moi

Vi du them "save job" cho candidate.

Thu tu nghi:

1. Database: can table/column moi khong? Neu co, tao Flyway migration `V8__...sql`.
2. Entity: tao/update entity map table.
3. Repository: them query can dung.
4. DTO: tao request/response record.
5. Service: viet business logic va authorization.
6. Controller: them endpoint.
7. SecurityConfig: route nay role nao duoc goi?
8. Test: unit/integration test neu logic quan trong.
9. Swagger/manual curl: test endpoint.

Khong nen viet logic DB truc tiep trong controller.

## 32. Cac Diem Nen Can Than Khi Doc/Sua

- `@Async` tu goi trong cung class co the khong async thuc su do Spring proxy.
- `RocchioService` luu `learnedProfileVectorJson`, nhung `ScoringService` hien van score bang `job.getTfidfVectorJson()`.
- `MatchingService.scoreJobAgainstAllCvs(job)` hien chu yeu mark existing matchings, khong load tat ca CV da `SCORING_DONE` de tao matching moi cho job moi.
- `FeedbackService.submitFeedback` co comment "upsert", nhung khi feedback da ton tai, code hien khong set lai `feedbackType`. Neu can overwrite feedback, can them setter/entity support.
- JSONB field dang luu trong entity duoi dang `String`, nen parse/serialize lap lai nhieu noi. Sau nay co the refactor thanh converter rieng.
- Mot so dashboard/admin controller dung repository truc tiep thay vi service. Doc de hieu truoc, refactor sau neu can dong nhat style.

Day khong nhat thiet la viec phai sua ngay. Day la cac diem dang de y khi hoc va khi debug.

## 33. Bai Tap Tu Hoc Theo Project

Lam cac bai nay theo thu tu:

1. Chay backend va mo Swagger.
2. Login bang `ca / 1`, copy JWT.
3. Goi `GET /api/auth/me`, xem JWT filter va `AuthService.getMe`.
4. Goi `GET /api/jobs/search`, doc `JobController.search` -> `JobService.search` -> `JobRepository.searchJobs`.
5. Goi `GET /api/matches/me/cards`, doc `MatchingController` -> `MatchingQueryService`.
6. Login bang `re / 1`, tao job moi, xem `JobService.createJob`.
7. Upload/manual CV, xem status chuyen qua `SCORING_DONE`.
8. Gui feedback cho match, xem `FeedbackService` va `RocchioService`.
9. Doc DB migration de map row trong database voi entity.
10. Viet mot test nho cho `TextNormalizationService.normalize`.

Neu ban lam duoc 10 bai nay, ban da nam duoc phan lon backend Spring Boot cua project.

