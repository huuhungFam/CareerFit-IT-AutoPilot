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
  - upload CV PDF text-based
  - nhập CV qua form
  - nhập / quản lý Job Description
  - scoring theo `%`
  - nhãn `Low / Medium / High / Potential`
  - feedback learning bằng Rocchio
  - AutoFit policy engine
  - actionable email + magic-link
  - passwordless login
  - audit log
  - job scan scheduling, daily digest, high-match notification, skip interaction tracking
  - async processing bằng `@Async`
  - định kỳ cập nhật bằng `@Scheduled`
  - JWT security + role-based routing
  - song ngữ tiếng Việt và tiếng Anh ở mức dữ liệu / pipeline / response

## 2. Stack Khuyến Nghị

Nếu trong repo chưa có code backend sẵn, dùng stack mặc định sau:

- Java 21
- Spring Boot 3.x
- Spring Web
- Spring Data JPA
- Spring Security
- Validation
- PostgreSQL / Supabase
- Flyway
- Apache PDFBox
- OpenAPI / Swagger
- JUnit 5
- Mockito
- Testcontainers nếu cần integration test

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
- `CV`
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

### 4.2. Quan hệ

- Một `Candidate` có thể có nhiều `CV`
- Một `Candidate` có một `CandidatePreference` chính
- Một `Job` có nhiều `Matching`
- Một `Matching` gắn với một `CV` và một `Job`
- Một `Matching` có thể có `Feedback`
- Một `Application` gắn với `Candidate`, `Job` và có thể liên kết tới `Matching`
- Một `AutomationPolicy` gắn với `UserAccount`
- Một `EmailAction` gắn với recipient, target và token
- Một `AuditLog` ghi lại action của user hoặc system

### 4.3. Trường quan trọng

- `CV.rawText`
- `CV.extractedTerms` JSONB
- `CV.language`
- `Job.originalText`
- `Job.learnedProfileVector` JSONB
- `Job.language`
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
- `GET /api/me`

### 5.2. Candidate

- `GET /api/candidates/{candidateId}`
- `PUT /api/candidates/{candidateId}`
- `GET /api/candidates/{candidateId}/preferences`
- `POST /api/candidates/{candidateId}/preferences`

### 5.3. CV

- `POST /api/cv/upload`
- `POST /api/cv/manual`
- `GET /api/cv/{cvId}`
- `GET /api/cv/{cvId}/status`
- `GET /api/candidates/{candidateId}/cv`

### 5.4. Job

- `POST /api/jobs`
- `GET /api/jobs`
- `GET /api/jobs/{jobId}`
- `PUT /api/jobs/{jobId}`
- `DELETE /api/jobs/{jobId}`

### 5.5. Matching / Recommendation

- `GET /api/jobs/{jobId}/ranking`
- `GET /api/candidates/{candidateId}/recommendations`
- `GET /api/jobs/{jobId}/applicants`
- `GET /api/jobs/{jobId}/potential`

### 5.6. Application / Invite

- `POST /api/applications`
- `GET /api/applications`
- `GET /api/applications/{applicationId}`
- `POST /api/applications/{applicationId}/invite`

### 5.7. Feedback

- `POST /api/matchings/{matchingId}/feedback`

### 5.8. Automation / Email Action

- `GET /api/automation/policies/me`
- `PUT /api/automation/policies/me`
- `POST /api/automation/email-actions`
- `GET /api/automation/actions/confirm?token=...`
- `POST /api/automation/actions/confirm`
- `POST /api/automation/actions/reject`
- `POST /api/automation/actions/feedback`

### 5.9. Recommendation Interaction

- `POST /api/recommendations/{jobId}/interactions`
- `GET /api/recommendations/interactions`

### 5.10. Analytics / Trend

- `GET /api/analytics/summary`
- `GET /api/analytics/jobs/trends`
- `GET /api/jobs/{jobId}/trends`

### 5.11. Audit / Admin / Recompute

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
3. Chạy parse PDF text-based bằng PDFBox trong background.
4. Làm sạch text theo ngôn ngữ.
5. Trích xuất term / feature.
6. Vector hóa bằng TF-IDF.
7. Tính cosine similarity với các Job liên quan.
8. Gán `rawScore`, `normalizedScore`, `label`, `isPotential`.
9. Lưu `Matching`.
10. Cập nhật trạng thái `SCORING_DONE` hoặc `FAILED`.

### 6.2. Recommendation

1. Lấy `CandidatePreference` hoặc candidate profile vector.
2. Vector hóa hồ sơ mong muốn.
3. So sánh với toàn bộ Job phù hợp ngành IT.
4. Trả top `N` JD với score và nhãn.
5. Có thể tái dùng chung pipeline với Matching Engine, chỉ khác query vector đầu vào.

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
- Role tối thiểu:
  - `CANDIDATE`
  - `RECRUITER`
- Candidate chỉ được thao tác trên dữ liệu của mình.
- Recruiter được xem job ranking, applicant, potential, analytics.
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
- Dùng PostgreSQL / Supabase.
- Trường vector / term phức tạp nên lưu JSONB.
- Email token phải lưu hash, không lưu raw token.
- Audit log nên append-only trong nghiệp vụ bình thường.
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
  - text-based only
  - size limit
- Validate request body:
  - email
  - title
  - skills
  - threshold
  - language
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
- `userTimezone`
- `quietHours`
- `notificationCooldown`

## 16. Ưu Tiên Triển Khai

Làm theo thứ tự:

1. Dựng project, package, config, security, migration
2. Làm entity, repository, DTO, mapper
3. Làm CV upload/manual + parsing + status flow
4. Làm Job CRUD + ranking API
5. Làm candidate recommendation API
6. Làm automation policy + audit log nền
7. Làm actionable email + magic-link confirm
8. Làm job scan, high-match notification, daily digest, recommendation interaction
9. Làm feedback learning bằng Rocchio
10. Làm auto-apply và application tracking
11. Làm analytics / trend endpoints
12. Làm OpenAPI, logging, validation, tests

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
  - ranking endpoint
  - recommendation endpoint
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
- OCR fallback
- message broker cho queue lớn
- full admin console

Không được để các phần này làm chậm core path.

## 19. Definition of Done

Backend chỉ coi là xong khi:

- Upload CV xong có trạng thái rõ ràng
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
- Có chart / analytics data
- JWT và role-based access chạy đúng
- Swagger / OpenAPI có tài liệu
- Test quan trọng pass

## 20. Nguyên Tắc Cuối Cùng

- Đừng viết backend chỉ để CRUD.
- Đừng làm hardcode score.
- Đừng tạo pipeline mơ hồ không giải thích được.
- Đừng vượt scope sang OCR / full ATS / microservices.
- Giữ mọi thứ giải thích được, test được, và demo được.
- Nếu phải chọn giữa “làm nhiều tính năng” và “làm core chạy chắc”, hãy ưu tiên core chạy chắc trước.
