# CareerFit IT AutoPilot - Backend Agent Prompt

Bạn là một senior backend engineer.
Nhiệm vụ của bạn là xây dựng toàn bộ backend cho `CareerFit IT AutoPilot` dựa trên các tài liệu nguồn sự thật sau:

- [proposal.md](../proposal.md)
- [srs.md](../srs.md)
- [architecture.md](../architecture.md)
- [backend-implementation-guide.md](./backend-implementation-guide.md)
- [thao-luan-goi-y-jd-cho-candidate-va-bag-of-visual-words.md](../thao-luan-goi-y-jd-cho-candidate-va-bag-of-visual-words.md)

Nếu có mâu thuẫn giữa tài liệu, ưu tiên:

1. `proposal.md`
2. `srs.md`
3. `architecture.md`
4. `backend-implementation-guide.md`
5. Tài liệu thảo luận bổ sung

## 1. Mục Tiêu Tuyệt Đối

- Xây dựng backend monolith cho `CareerFit IT AutoPilot`: job portal + CV-JD matching + job recommendation + AutoFit automation + HITL email action.
- Backend là automation agent chính của hệ thống: nhận dữ liệu, validate, scoring, đánh giá policy, thực thi hoặc xin xác nhận, ghi audit log, học từ feedback.
- Có 2 engine dùng chung một pipeline:
  - `Matching Engine`: chấm CV theo JD khi upload.
  - `Recommendation Engine`: gợi ý JD cho candidate theo hồ sơ mong muốn.
- Hỗ trợ:
  - upload CV PDF text-based hoặc PDF scan/image-only qua OCR fallback
  - nhập CV qua form
  - nhập / quản lý Job Description
  - scoring theo `%`
  - nhãn `Low / Medium / High / Potential`
  - feedback learning bằng Rocchio
  - AutoFit policy engine
  - actionable email + magic-link
  - passwordless login
  - audit log
  - public guest job portal cho `/`, `/jobs`, public job detail và employer profile, không trả score/potential/reason cá nhân khi chưa đăng nhập
  - job scan scheduling, daily digest, high-match notification, skip interaction tracking
  - job portal search, search suggestions, employer profile và job market analytics
  - quản lý nhiều CV cho candidate, hồ sơ cố định và portfolio/dự án
  - recruiter overview dashboard tách khỏi HR job workspace
  - async processing bằng `@Async`
  - định kỳ cập nhật bằng `@Scheduled`
  - JWT security + role-based routing
  - login-required contract và `next` redirect intent cho frontend sau khi đăng nhập
  - song ngữ tiếng Việt và tiếng Anh ở mức dữ liệu / pipeline / response

## 2. Stack Khuyến Nghị

Nếu trong repo chưa có code backend sẵn, dùng stack mặc định sau:

- Java 21
- Spring Boot 3.x
- Spring Web
- Spring Data JPA
- Spring Security
- Validation
- PostgreSQL local qua Docker Compose cho development/demo trực tiếp
- Flyway
- Apache PDFBox
- OpenAPI / Swagger
- JUnit 5
- Mockito
- Testcontainers nếu cần integration test

Database/storage/auth strategy:

- Primary DB là PostgreSQL.
- Development DB là PostgreSQL local chạy bằng Docker Compose.
- Supabase PostgreSQL chỉ là optional demo/deploy DB, không được hard-code dependency Supabase vào business logic.
- Flyway quản lý schema/migration.
- File CV trong development lưu bằng local filesystem.
- Thiết kế `StorageService` interface để sau này đổi sang Supabase Storage/S3-compatible storage.
- Auth tự triển khai bằng Spring Security JWT/passwordless, không phụ thuộc Supabase Auth.

Quy tắc:

- Giữ monolith, không tách microservices.
- Dùng DTO rõ ràng, không trả entity trực tiếp ra API.
- Dùng transaction đúng chỗ.
- Dùng `record` khi phù hợp.
- Không lạm dụng Lombok nếu làm code khó đọc.

## 3. Kiến Trúc Bắt Buộc

Chia package theo domain, tối thiểu gồm:

- `auth`
- `candidate`
- `cv`
- `job`
- `employer`
- `matching`
- `recommendation`
- `application`
- `feedback`
- `automation`
- `notification`
- `audit`
- `analytics`
- `common`
- `config`

Tầng xử lý:

- Controller
- Service
- Repository
- Domain / Entity
- DTO / Request / Response
- Mapper
- Security
- Async workers
- Scheduler

## 4. Domain Mô Hình

### 4.1. Entity chính

- `UserAccount`
- `Candidate`
- `CandidatePreference`
- `CandidatePortfolioLink`
- `CandidatePortfolioProject`
- `CV`
- `EmployerProfile`
- `Job`
- `Matching`
- `Application`
- `Feedback`
- `AutomationPolicy`
- `EmailAction`
- `EmailToken`
- `AuditLog`
- `RecommendationInteraction`
- `NotificationJob`
- `JobTrendSnapshot`
- `JobMarketSnapshot`

### 4.2. Quan hệ

- Một `Candidate` có thể có nhiều `CV`
- Một `Candidate` có một `CandidatePreference` chính
- Một `Candidate` có thể có nhiều portfolio links và portfolio projects
- Một `Candidate` chỉ nên có một CV mặc định
- Một `Job` có nhiều `Matching`
- Một `Matching` gắn với một `CV` và một `Job`
- Một `Matching` có thể có `Feedback`
- Một `Application` gắn với `Candidate`, `Job` và có thể liên kết tới `Matching`
- Một `AutomationPolicy` gắn với `UserAccount`
- Một `EmailAction` gắn với recipient, target và token
- Một `AuditLog` ghi lại action của user hoặc system

### 4.3. Trường quan trọng

- `CV.rawText`
- `CV.displayName`
- `CV.source`
- `CV.isDefault`
- `CV.extractedTerms` JSONB
- `CV.language`
- `Job.originalText`
- `EmployerProfile.companyName`
- `EmployerProfile.slug`
- `EmployerProfile.logoUrl`
- `EmployerProfile.coverUrl`
- `EmployerProfile.isFeatured`
- `Job.learnedProfileVector` JSONB
- `Job.language`
- `Job.salaryMode`
- `Job.salaryMin`
- `Job.salaryMax`
- `Job.salaryCurrency`
- `Job.salaryType`
- `Job.salaryIsVisible`
- `Job.salaryDisplayText`
- `Matching.rawScore`
- `Matching.normalizedScore`
- `Matching.label`
- `Matching.isPotential`
- `CandidatePreference.autoApplyThreshold`
- `CandidatePreference.autoApplyEnabled`
- `CandidatePreference.preferredLanguage`
- `Application.status`
- `Application.isAutoApplied`
- `AutomationPolicy.autoApplyEnabled`
- `AutomationPolicy.autoApplyThreshold`
- `AutomationPolicy.emailActionEnabled`
- `AutomationPolicy.userTimezone`
- `AutomationPolicy.quietHoursEnabled`
- `AutomationPolicy.notificationCooldownHours`
- `AutomationPolicy.maxEmailPerDay`
- `EmailAction.actionType`
- `EmailAction.status`
- `EmailToken.tokenHash`
- `EmailToken.purpose`
- `EmailToken.expiresAt`
- `EmailToken.usedAt`
- `AuditLog.actorType`
- `AuditLog.actionType`
- `AuditLog.sourceChannel`
- `RecommendationInteraction.action`
- `RecommendationInteraction.source`
- `RecommendationInteraction.createdAt`

## 5. API Contract Phải Có

### 5.1. Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/passwordless/request`
- `GET /api/auth/passwordless/verify?token=...`
- `POST /api/auth/passwordless/verify`
- `GET /api/auth/me`

### 5.2. Candidate

- `GET /api/candidates/me`
- `PATCH /api/candidates/me`
- `PATCH /api/candidates/me/account`
- `GET /api/candidates/me/cvs`

### 5.3. CV

- `POST /api/cv/upload`
- `POST /api/cv/manual`
- `GET /api/cv/me`
- `GET /api/cv/{cvId}`
- `GET /api/cv/{cvId}/status`
- `POST /api/cv/{cvId}/set-default`

### 5.4. Candidate Profile & Portfolio

- `GET /api/candidates/me/portfolio`
- `POST /api/candidates/me/portfolio/links`
- `PATCH /api/candidates/me/portfolio/links/{linkId}`
- `DELETE /api/candidates/me/portfolio/links/{linkId}`
- `POST /api/candidates/me/portfolio/projects`
- `PATCH /api/candidates/me/portfolio/projects/{projectId}`
- `DELETE /api/candidates/me/portfolio/projects/{projectId}`

### 5.5. Job

- `POST /api/jobs`
- `GET /api/jobs`
- `GET /api/jobs/search`
- `GET /api/jobs/search/suggestions`
- `GET /api/jobs/suggestions`
- `GET /api/jobs/{jobId}`
- `PATCH /api/jobs/{jobId}`
- `PATCH /api/jobs/{jobId}/status`
- `DELETE /api/jobs/{jobId}`

Public job endpoints may allow unauthenticated read-only access for guest UI. Guest responses must omit `normalizedScore`, `label`, `isPotential`, `matchReasons`, `potentialReason`, CV/application state and auto-apply state. Candidate job-card responses with personalized fields must be available through `GET /api/matches/me/cards`.

### 5.6. Employer

- `GET /api/employers/featured`
- `GET /api/employers/{employerId}`
- `GET /api/employers/{employerId}/jobs`

### 5.7. Recruiter Workspace

- `GET /api/recruiter/dashboard`
- `GET /api/recruiter/jobs`
- `GET /api/recruiter/jobs/{jobId}/ranking`
- `GET /api/recruiter/jobs/{jobId}/stats`
- `GET /api/recruiter/jobs/{jobId}/top-candidates`

### 5.8. Matching / Recommendation

- `GET /api/matches/me`
- `GET /api/matches/me/cards`
- `GET /api/recommendations/jobs`
- `GET /api/recommendations/jobs/{jobId}/similar`

### 5.9. Application / Invite

- `POST /api/applications`
- `GET /api/applications`
- `GET /api/applications/{applicationId}`
- `POST /api/applications/{applicationId}/invite`

### 5.10. Feedback

- `POST /api/matchings/{matchingId}/feedback`

### 5.11. Automation / Email Action

- `GET /api/automation/policies/me`
- `PUT /api/automation/policies/me`
- `POST /api/automation/email-actions`
- `GET /api/automation/actions/confirm?token=...`
- `POST /api/automation/actions/confirm`
- `POST /api/automation/actions/reject`
- `POST /api/automation/actions/feedback`

### 5.12. Recommendation Interaction

- `POST /api/recommendations/{jobId}/interactions`
- `GET /api/recommendations/interactions`

### 5.13. Analytics / Trend

Basic/public:

- `GET /api/analytics/stats`
- `GET /api/analytics/trend`
- `GET /api/analytics/roles`

Advanced market:

- `GET /api/analytics/market/overview`
- `GET /api/analytics/market/skills`
- `GET /api/analytics/market/salary`
- `GET /api/analytics/market/trends`

Advanced role-scoped:

- `GET /api/candidate/analytics/overview`
- `GET /api/candidate/analytics/skill-demand`
- `GET /api/candidate/analytics/profile-gaps`
- `GET /api/candidate/analytics/match-trends`
- `GET /api/recruiter/analytics/overview`
- `GET /api/recruiter/analytics/jobs/{jobId}/funnel`
- `GET /api/recruiter/analytics/jobs/{jobId}/skill-gap`
- `GET /api/recruiter/analytics/trends`

Event tracking:

- `POST /api/analytics/events`

Các endpoint `/api/analytics/market/*` phải trả thống kê public về thị trường việc làm. Matching/application analytics riêng tư phải nằm dưới candidate/recruiter scoped endpoints.

### 5.14. Audit / Admin / Recompute

- `GET /api/audit-logs`
- `POST /api/jobs/{jobId}/recompute`
- `POST /api/ranking/rebuild`

Yêu cầu:

- Tất cả response phải có format nhất quán.
- Hỗ trợ pagination / sort / filter.
- Có `lang=vi|en` hoặc `Accept-Language`.

## 6. Pipeline Xử Lý Bắt Buộc

### 6.1. Upload CV

1. Nhận file PDF hoặc form CV.
2. Lưu metadata và trạng thái `PENDING`.
3. Chạy parse PDF text-based bằng PDFBox trong background; nếu text quá ít thì render trang PDF và chạy Tesseract OCR fallback.
4. Làm sạch text theo ngôn ngữ.
5. Trích xuất term / feature.
6. Vector hóa bằng TF-IDF.
7. Tính cosine similarity với các Job liên quan.
8. Gán `rawScore`, `normalizedScore`, `label`, `isPotential`.
9. Lưu `Matching`.
10. Cập nhật trạng thái `SCORING_DONE` hoặc `FAILED`.

Quy tắc multi-CV:

- Một candidate có thể có nhiều CV.
- CV nhập từ `Manual Creation` vẫn là một CV record.
- CV upload từ `Document Parser` có `source = UPLOAD`.
- Chỉ một CV được đặt `isDefault = true` cho mỗi candidate.

### 6.1.1. Candidate Hồ sơ & CV

1. Trả danh sách CV đã tạo.
2. Cho candidate chọn CV mặc định.
3. Lưu hồ sơ cố định: contact, desired title, skills, location, seniority, salary, work model, threshold.
4. Lưu portfolio links.
5. Lưu portfolio projects gồm role, summary, tech stack, URL và impact.
6. Không trộn portfolio vào raw CV; portfolio là dữ liệu bổ trợ riêng.

### 6.2. Recommendation

1. Lấy `CandidatePreference` hoặc candidate profile vector.
2. Vector hóa hồ sơ mong muốn.
3. So sánh với toàn bộ Job phù hợp ngành IT.
4. Trả top `N` JD với score và nhãn.
5. Có thể tái dùng chung pipeline với Matching Engine, chỉ khác query vector đầu vào.

### 6.2.1. Job Search / Search Suggestions

1. Nhận keyword, filter, sort và pagination từ frontend.
2. Normalize keyword theo tiếng Việt/Anh.
3. Match keyword với title, skill, company và JD text.
4. Trả danh sách job một cột cho trang kết quả.
5. Trả tổng số kết quả và metadata filter.
6. Endpoint suggestion chỉ phục vụ lúc input đang focus, gồm nhóm `SKILL`, `JOB_TITLE`, `COMPANY`.

### 6.2.2. Employer Profile

1. Trả danh sách nhà tuyển dụng nổi bật cho candidate home/job list.
2. Trả employer detail theo id/slug.
3. Trả danh sách job đang mở của employer.
4. Chỉ expose dữ liệu public; dữ liệu nội bộ recruiter vẫn phải qua role guard.

### 6.2.3. Recruiter Workspace

1. `/api/recruiter/dashboard` trả dữ liệu tổng quan.
2. `/api/recruiter/jobs` trả danh sách requisitions cho HR Dashboard.
3. `/api/recruiter/jobs/{jobId}/ranking`, `/stats` và `/top-candidates` trả dữ liệu job detail, Applied CVs và AI Potential Matches.
4. Không ép frontend dùng cùng response cho `/recruiter` và `/recruiter/jobs`.

### 6.3. AutoFit Automation

1. Nhận event từ matching/recommendation/application.
2. Đọc automation policy của candidate/recruiter.
3. Kiểm tra threshold, consent, role và trạng thái hiện tại.
4. Kiểm tra tần suất scan, quota email/ngày và recommendation interaction cũ.
5. Kiểm tra cooldown chống gửi lặp.
6. Kiểm tra timezone và quiet hours.
7. Chọn action: do nothing, notify, add to digest, send email action, pending approval, auto execute.
8. Nếu auto execute, thực thi idempotent và ghi audit log.
9. Nếu cần HITL, tạo `EmailAction`, `EmailToken` và gửi email async.

### 6.4. Notification Timing

1. Ranking khi upload CV chạy ngay bằng async worker.
2. Ranking khi tạo/cập nhật JD chạy ngay hoặc vào background queue.
3. Scan job mới cho candidate mặc định mỗi 1 giờ nếu user bật.
4. Email high-match gửi ngay chỉ khi score vượt ngưỡng và chưa vượt quota.
5. Candidate high-match threshold mặc định là `90%`.
6. Recruiter high-match threshold mặc định là `85%`.
7. Daily digest mặc định gửi lúc `08:00` theo timezone của user.
8. High-match email phải tôn trọng quiet hours và notification cooldown.
9. Weekly summary là phase sau nếu còn thời gian.

### 6.5. Skip / Recommendation Interaction

1. Web skip: ghi `RecommendationInteraction(SKIPPED, WEB)`, frontend ẩn job ngay và hiển thị job kế tiếp.
2. Email skip: ghi `RecommendationInteraction(SKIPPED, EMAIL)`, không gửi job kế tiếp ngay.
3. Email skip chỉ gửi job thay thế sau `30-60 phút` nếu user bật replacement autopilot.
4. `SKIPPED` không phải `BAD_MATCH`.
5. `NOT_INTERESTED` mạnh hơn skip và nên giảm ưu tiên job/company/skill tương tự.
6. `SHOW_SIMILAR` là tín hiệu tích cực cho nhóm job tương tự.

### 6.5.1. Job Market Analytics

1. Tổng hợp job records theo ngày hoặc theo cấu hình demo.
2. Tính `totalPostedJobs`, `activeJobs`, `newJobs`, `employerCount`.
3. Tính phân bố theo nhóm vị trí IT và salary band.
4. Trả dữ liệu cho dashboard candidate/recruiter.
5. Không dùng `matchCount` hoặc `highMatchCount` cho line chart thị trường việc làm.

### 6.6. Feedback Learning

1. Nhận feedback từ web hoặc email.
2. Phân loại `GOOD_MATCH`, `POTENTIAL`, `BAD_MATCH`, `NOT_INTERESTED`.
3. Cập nhật vector hồ sơ học được bằng Rocchio.
4. Ghi audit log và log thay đổi trọng số.
5. Đánh dấu các Job liên quan cần recompute.
6. Scheduler cập nhật lại ranking định kỳ.

## 7. Quy Tắc Scoring

- `rawScore` là cosine similarity hoặc composite score đã chuẩn hóa nội bộ.
- `normalizedScore = rawScore * 100`.
- Làm tròn đến 1 hoặc 2 chữ số thập phân.
- Label khuyến nghị:
  - `< 40` -> `LOW`
  - `40 - 69.99` -> `MEDIUM`
  - `70 - 89.99` -> `HIGH`
  - `Potential` là nhãn đặc biệt khi điểm chưa cao nhưng có tín hiệu chuyển đổi tốt

### 7.1. Heuristic cho `Potential`

`Potential` không được đặt tùy tiện. Hãy dựa trên:

- skill family overlap
- same domain
- transferable technologies
- số năm kinh nghiệm liên quan
- title similarity

Có thể trả thêm:

- `potentialReason`
- `matchReasons`

## 8. Bilingual Processing

- Backend phải hỗ trợ tiếng Việt và tiếng Anh trong pipeline tiền xử lý.
- Có thể dùng:
  - language detection đơn giản
  - hoặc language lấy từ candidate preference / job / input
- Mỗi ngôn ngữ nên có:
  - stopword list
  - normalization rule
  - tokenization rule phù hợp
- Response code ổn định, text hiển thị có thể dịch ở frontend.

## 9. Static Corpus / IDF

Hệ thống phải có chiến lược IDF ổn định:

- Không tính IDF ad hoc mỗi request.
- Dùng corpus cố định hoặc corpus cập nhật có kiểm soát.
- Có thể seed từ:
  - bộ job chuẩn
  - CV demo
  - danh sách kỹ năng IT

Mục tiêu:

- giữ kết quả nhất quán
- tránh score nhảy loạn
- dễ giải thích khi bảo vệ

## 10. Security

- JWT authentication bắt buộc.
- Passwordless magic-link là core auth flow phụ trợ.
- Unauthenticated guest là public read-only access, không phải persisted user role.
- Role tối thiểu:
  - `CANDIDATE`
  - `RECRUITER`
- Candidate chỉ được thao tác trên dữ liệu của mình.
- Recruiter được xem job ranking, applicant, potential, analytics.
- Guest chỉ được xem public dashboard/job search/job detail/employer data và không được nhận score, potential, match reasons, CV data hoặc application state.
- Chặn đúng `401` và `403`.
- Magic-link token phải one-time, có TTL, có purpose, lưu hash thay vì raw token.
- GET confirm chỉ hiển thị dữ liệu, POST mới thay đổi state.
- Mọi action từ email phải ghi audit log.

## 11. Async / Scheduler

### 11.1. `@Async`

- Parse CV
- Vectorize text
- Tính matching hàng loạt
- Auto-apply nội bộ
- Gửi email actionable
- Tạo daily digest

Các tác vụ này phải chạy nền, không block request.

### 11.2. `@Scheduled`

- Rebuild ranking định kỳ
- Recompute khi job vector thay đổi
- Đồng bộ lại matching sau feedback
- Dọn token hết hạn
- Retry notification job lỗi tạm thời
- Tạo daily digest
- Scan job mới mỗi giờ khi policy bật
- Tạo high-match notification
- Tạo replacement recommendation sau email skip nếu policy bật

### 11.3. Trạng thái xử lý

Quản lý trạng thái rõ ràng:

- `PENDING`
- `PROCESSING`
- `SCORING_DONE`
- `FAILED`

## 12. Database / Migration

- Dùng Flyway để quản lý schema.
- Dùng PostgreSQL làm primary DB.
- Development/demo trực tiếp dùng PostgreSQL local qua Docker Compose.
- Supabase PostgreSQL chỉ là optional target khi deploy/demo online.
- Trường vector / term phức tạp nên lưu JSONB.
- Thêm bảng `employer_profile` cho hồ sơ công ty public:
  - `id`, `recruiterId`, `companyName`, `slug`, `logoUrl`, `coverUrl`, `summary`, `description`, `industry`, `companySize`, `location`, `websiteUrl`, `benefits`, `isFeatured`
- Bảng `cv` phải hỗ trợ nhiều CV:
  - `displayName`, `source`, `isDefault`, `parsedSummary`, `topSkills`, `lastScoredAt`
- Thêm bảng `candidate_portfolio_link`:
  - `id`, `candidateId`, `type`, `url`
- Thêm bảng `candidate_portfolio_project`:
  - `id`, `candidateId`, `name`, `role`, `summary`, `techStack`, `projectUrl`, `impact`
- Thêm bảng hoặc read model `job_market_snapshot` cho dashboard thị trường việc làm:
  - `id`, `snapshotDate`, `totalPostedJobs`, `activeJobs`, `newJobs`, `employerCount`, `distributionByRole`, `distributionBySalary`
- Không dùng `job_trend_snapshot.match_count` để vẽ biểu đồ tổng job đăng tuyển.
- Email token phải lưu hash, không lưu raw token.
- Audit log nên append-only trong nghiệp vụ bình thường.
- Bảng `job` phải có salary fields có điều kiện:
  - `salaryMode`: `NEGOTIABLE`, `RANGE`, `UP_TO`, `FROM`, `HIDDEN`
  - `salaryMin`: nullable numeric
  - `salaryMax`: nullable numeric
  - `salaryCurrency`: nullable string, ví dụ `VND`, `USD`
  - `salaryType`: nullable enum/string, ví dụ `MONTHLY`, `HOURLY`, `YEARLY`
  - `salaryIsVisible`: boolean, default `true`
  - `salaryDisplayText`: nullable string
- Index các cột hay query:
  - candidateId
  - jobId
  - status
  - normalizedScore
  - createdAt
  - tokenHash

## 13. Logging / Observability

- Log có `candidateId`, `cvId`, `jobId`, `matchingId`, `actionId`, `tokenId`, `requestId`.
- Mọi lỗi parse PDF, lỗi vector hóa, lỗi scoring phải có log rõ.
- Mọi lỗi email/action/token/policy phải có log rõ.
- Dùng global exception handler với response thống nhất.
- Có Swagger / OpenAPI để frontend agent bám theo.

## 14. Validation

- Validate upload file:
  - chỉ PDF
  - text-based PDF first, OCR fallback for scanned/image-only PDFs
  - size limit
- Validate request body:
  - email
  - title
  - skills
  - threshold
  - language
- Validate salary theo `salaryMode`, không bắt mọi salary field đều non-null:
  - `NEGOTIABLE`: cho phép min/max null
  - `RANGE`: cần min/max/currency/type và min <= max
  - `UP_TO`: cần max/currency/type
  - `FROM`: cần min/currency/type
  - `HIDDEN`: cho phép min/max/currency/type null và không hiển thị cho candidate
- Không cho dữ liệu rác đi sâu vào pipeline.

## 15. Data Semantics Cho Frontend

Backend phải trả dữ liệu đủ để frontend làm UI:

- `normalizedScore`
- `label`
- `isPotential`
- `matchReasons`
- `potentialReason`
- `status`
- `isAutoApplied`
- `trendPoints`
- `actionStatus`
- `auditSummary`
- `automationPolicy`
- `nextScanAt`
- `dailyDigestTime`
- `emailQuotaRemaining`
- `recommendationInteractions`
- `searchSuggestions`
- `candidateCvs`
- `fixedCandidateProfile`
- `portfolioLinks`
- `portfolioProjects`
- `featuredEmployers`
- `employerProfile`
- `jobMarketSummary`
- `jobMarketTrendPoints`
- `jobDemandByRole`
- `jobDemandBySalary`
- `userTimezone`
- `quietHours`
- `notificationCooldown`

DTO theo auth context:

- Guest/public DTO: chỉ gồm job/employer/search/market summary; không có score, label, potential, match reasons, CV hoặc application state.
- Candidate DTO: có thể gồm personalized score, label, potential, match reasons, recommendation interactions và application state.
- Recruiter DTO: có thể gồm requisition, applicant, ranking và potential pool data trong phạm vi job thuộc recruiter.

## 16. Ưu Tiên Triển Khai

Làm theo thứ tự:

1. Dựng project, package, config, security, migration
2. Làm entity, repository, DTO, mapper
3. Làm CV upload/manual + parsing + status flow
4. Làm multi-CV management, set default CV, fixed profile và portfolio APIs
5. Làm Job CRUD + ranking API
6. Làm job search, search suggestions và job detail API
7. Làm employer profile APIs
8. Làm recruiter overview và HR workspace APIs
9. Làm candidate recommendation API
10. Làm automation policy + audit log nền
11. Làm actionable email + magic-link confirm
12. Làm job scan, high-match notification, daily digest, recommendation interaction
13. Làm feedback learning bằng Rocchio
14. Làm auto-apply và application tracking
15. Làm analytics / trend / job-market endpoints
16. Làm OpenAPI, logging, validation, tests

## 17. Testing Bắt Buộc

Phải có:

- Unit test cho:
  - text preprocessing
  - TF-IDF
  - cosine similarity
  - Rocchio update
  - label assignment
  - potential heuristic
- Integration test cho:
  - upload CV
  - multi-CV list and set default CV
  - candidate fixed profile update
  - candidate portfolio endpoints
  - ranking endpoint
  - recommendation endpoint
  - job search endpoint
  - search suggestion endpoint
  - employer featured/detail endpoints
  - job market analytics endpoints
  - feedback endpoint
  - automation policy endpoint
  - email action confirm
  - passwordless login
  - audit log write
  - job scan scheduler
  - high-match notification quota
  - skip interaction filtering
  - daily digest generation
  - quiet hours/timezone behavior
  - notification cooldown
  - security rules
- Nếu có thời gian, thêm test cho scheduler và async flow.

## 18. Phase Sau Chỉ Làm Sau Khi Core Ổn

Sau khi core chạy ổn, mới cân nhắc:

- Redis cache
- Apache POI export
- OCR fallback đã nằm trong backend; khi chạy host cần Tesseract, khi chạy Docker image đã có `vie+eng`.
- message broker cho queue lớn
- full admin console

Không được để các phần này làm chậm core path.

## 19. Definition of Done

Backend chỉ coi là xong khi:

- Upload CV xong có trạng thái rõ ràng
- Candidate quản lý nhiều CV, chọn CV mặc định, hồ sơ cố định và portfolio được
- Ranking job-to-candidate chạy được
- Recommendation candidate-to-job chạy được
- Điểm hiển thị theo %
- Label và `Potential` đúng
- Feedback làm thay đổi ranking
- Auto-apply hoạt động
- AutoFit policy hoạt động
- Actionable email + magic-link confirm hoạt động
- Passwordless login hoạt động
- Audit log ghi được action quan trọng
- Job scan/digest/high-match notification hoạt động đúng policy
- Skip trên web ẩn ngay, skip qua email không spam job kế tiếp
- Recruiter xem được applicant, matching cao, potential
- Recruiter overview và HR job workspace có endpoint riêng
- Candidate search có suggestion, search result page và filter data đúng
- Guest public dashboard/job search/job detail hoạt động, không thấy score/potential/reasons và Apply trả login-required flow
- Login-required flow hỗ trợ `next` intent để frontend điều hướng sau đăng nhập nếu role phù hợp
- Employer featured/detail trả đúng dữ liệu public
- Có chart / analytics data, trong đó job market chart dùng số job đăng tuyển thay vì matching count
- JWT và role-based access chạy đúng
- Swagger / OpenAPI có tài liệu
- Test quan trọng pass

## 20. Nguyên Tắc Cuối Cùng

- Đừng viết backend chỉ để CRUD.
- Đừng làm hardcode score.
- Đừng tạo pipeline mơ hồ không giải thích được.
- Đừng vượt scope sang full ATS / microservices / LLM agent tự lập kế hoạch phức tạp.
- Giữ mọi thứ giải thích được, test được, và demo được.
- Nếu phải chọn giữa “làm nhiều tính năng” và “làm core chạy chắc”, hãy ưu tiên core chạy chắc trước.
