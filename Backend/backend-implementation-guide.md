# CareerFit IT AutoPilot - Backend Implementation Guide

Tài liệu này mô tả mức triển khai chi tiết cho backend của `CareerFit IT AutoPilot`.
Mục tiêu là để một coding agent hoặc một engineer có thể đọc và bắt tay vào implement mà không phải đoán lại kiến trúc.
Tài liệu này bám theo [proposal.md](../proposal.md), [srs.md](../srs.md) và [architecture.md](../architecture.md).

---

## 1. Vai Trò Của Backend

Backend là nguồn sự thật chính và automation agent của hệ thống. Nó chịu trách nhiệm:

- phục vụ public guest job portal data, không expose score/potential/reason cá nhân khi chưa đăng nhập
- nhận dữ liệu CV, JD, profile mong muốn
- validate dữ liệu đầu vào
- trích xuất text từ PDF
- vector hóa nội dung
- tính matching score và recommendation score
- gắn nhãn Low / Medium / High / Potential
- học từ feedback bằng Rocchio
- chạy async background workers
- gửi email actionable và passwordless login
- quản lý policy auto-fit
- quản lý lịch scan job, daily digest, high-match notification và quota email
- lưu recommendation interaction như skip, apply, show similar, not interested
- phục vụ job portal search, search suggestions, employer profile và job market analytics
- phục vụ candidate multi-CV management, fixed profile và portfolio
- phục vụ recruiter overview dashboard tách khỏi HR-style job workspace
- ghi audit log

Frontend là job portal/control panel để người dùng thao tác. Mọi quyết định nghiệp vụ, scoring, policy và automation phải nằm ở backend.

---

## 1.1. Database, Storage and Auth Strategy

Backend phải ưu tiên triển khai theo hướng local-first:

- **Primary DB:** PostgreSQL.
- **Development DB:** PostgreSQL local qua Docker Compose.
- **Optional demo/deploy DB:** Supabase PostgreSQL hoặc PostgreSQL cloud khác.
- **Migration:** Flyway quản lý schema, index, constraint và enum.
- **File CV:** local filesystem trong development.
- **Storage abstraction:** tạo `StorageService` interface để có thể đổi local storage sang Supabase Storage/S3-compatible storage sau này.
- **Auth:** Spring Security JWT/passwordless tự làm trong backend, không phụ thuộc Supabase Auth.

Không hard-code logic nghiệp vụ vào Supabase-specific API. Backend chỉ nên xem Supabase là một PostgreSQL connection target nếu dùng ở phase deploy.

---

## 2. Non-Goals

Backend này không làm:

- OCR cho PDF scan trong core path
- microservices
- ATS full-flow
- tự submit ứng tuyển ra ngoài website bên thứ ba
- LLM agent tự lập kế hoạch phức tạp

---

## 3. Module Breakdown

### 3.1. `auth`

Chịu trách nhiệm:

- đăng ký / đăng nhập
- JWT
- passwordless login
- role-based access
- hỗ trợ login redirect intent (`next`) ở frontend/session flow; backend vẫn phải validate role và quyền truy cập sau login
- token lifecycle

### 3.2. `candidate`

Chịu trách nhiệm:

- candidate profile
- candidate preference
- language preference
- auto-apply threshold
- fixed profile data for `Hồ sơ & CV`
- portfolio links and portfolio projects

### 3.3. `cv`

Chịu trách nhiệm:

- upload CV PDF
- nhập CV bằng form
- quản lý nhiều CV cho một candidate
- chọn CV mặc định
- parse text
- validate content
- lưu raw text và extracted terms

### 3.4. `job`

Chịu trách nhiệm:

- CRUD JD
- job feed cho candidate
- search suggestions
- search results with filters
- search/filter/sort job
- job detail
- public job DTO cho guest phải ẩn `normalizedScore`, `label`, `isPotential` và match reasons cá nhân
- store learned profile vector
- store job metadata
- store structured salary fields with conditional validation
- track trend snapshot

### 3.4.1. `employer`

Chịu trách nhiệm:

- featured employer list
- employer detail profile
- employer open jobs
- mapping recruiter/company ownership to public employer profile

### 3.4.2. `recruiter_workspace`

Chịu trách nhiệm:

- recruiter overview dashboard summary
- HR Dashboard requisition list
- selected job workspace data
- applied CVs and AI potential matches for a selected job

### 3.5. `matching`

Chịu trách nhiệm:

- scoring CV so với JD
- label assignment
- potential heuristic
- ranking list

### 3.6. `recommendation`

Chịu trách nhiệm:

- score candidate profile so với job
- top job recommendation
- reuse same vector pipeline as matching

### 3.7. `feedback`

Chịu trách nhiệm:

- accept good / bad / potential feedback
- update Rocchio vector
- trigger recompute for impacted rows

### 3.8. `automation`

Chịu trách nhiệm:

- email actionable
- magic-link
- auto-apply
- invite candidate
- daily digest
- automation policy
- job scan scheduler
- high-match notification
- recommendation interaction tracking

### 3.9. `analytics`

Chịu trách nhiệm:

- trend chart data
- summary stats
- application counts
- matching counts
- job market summary based on posted jobs
- job market trend based on total posted jobs over time
- job demand distribution by IT role or salary band

Lưu ý: job market analytics không được dùng `matching count` làm dữ liệu chính cho line chart thị trường việc làm.

### 3.10. `common`

Chịu trách nhiệm:

- response envelopes
- error handling
- constants
- enums
- utility functions

---

## 4. Core Data Model

### 4.1. Main Entities

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

### 4.2. Required States

#### CV status

- `UPLOADED`
- `VALIDATING`
- `PROCESSING`
- `SCORING_DONE`
- `FAILED`

#### Matching label

- `LOW`
- `MEDIUM`
- `HIGH`
- `POTENTIAL`

#### Application status

- `PENDING`
- `AUTO_APPLIED`
- `APPROVED`
- `REJECTED`
- `INVITED`
- `NOT_INTERESTED`

#### Email action status

- `CREATED`
- `SENT`
- `OPENED`
- `CONFIRMED`
- `REJECTED`
- `EXPIRED`
- `FAILED`

#### Token purpose

- `PASSWORDLESS_LOGIN`
- `APPROVE_MATCH`
- `REJECT_MATCH`
- `APPLY_JOB`
- `ALLOW_AUTO_APPLY`
- `CHANGE_THRESHOLD`
- `INVITE_CANDIDATE`
- `FEEDBACK_ACTION`

#### Recommendation interaction action

- `VIEWED`
- `SKIPPED`
- `APPLIED`
- `SAVED`
- `NOT_INTERESTED`
- `SHOW_SIMILAR`

#### Recommendation interaction source

- `WEB`
- `EMAIL`
- `DIGEST`
- `AUTOPILOT`

---

## 5. End-to-End Pipelines

## 5.1. CV Upload Pipeline

### Steps

1. Frontend uploads PDF or form payload.
2. Backend creates `CV` record with status `UPLOADED`.
3. Validation service checks file type and structural sanity.
4. If valid, backend sets `VALIDATING` then `PROCESSING`.
5. PDFBox extracts text from text-based PDFs.
6. Text is normalized by language.
7. Tokens and extracted terms are stored.
8. TF-IDF vector is built.
9. Matching engine scores CV against jobs.
10. Normalize score to 0-100.
11. Assign label.
12. Detect potential.
13. Persist `Matching`.
14. Update status to `SCORING_DONE`.
15. If auto-fit policy allows, create notification or application action.

### Multi-CV rules

- One candidate can have many CVs.
- CV source must distinguish uploaded document and manual creation.
- One candidate should have at most one default CV.
- Default CV is the primary input for candidate matching/recommendation unless a specific CV is selected.
- Manual Creation creates a CV record with `source = MANUAL`.

### Suggested function split

- `CvIngestionService.acceptUpload(...)`
- `CvValidationService.validateUpload(...)`
- `PdfExtractionService.extractText(...)`
- `TextNormalizationService.normalize(...)`
- `TermExtractionService.extractTerms(...)`
- `VectorizationService.buildTfidfVector(...)`
- `MatchingService.scoreJobMatches(...)`
- `LabelingService.assignLabel(...)`
- `PotentialService.detectPotential(...)`
- `CvStatusService.updateStatus(...)`
- `CvManagementService.listCandidateCvs(...)`
- `CvManagementService.setDefaultCv(...)`

## 5.1.1. Candidate Profile & Portfolio Pipeline

### Steps

1. Frontend loads `/candidate/profile`.
2. Backend returns CV list, fixed profile and portfolio data.
3. Candidate updates fixed profile/preference.
4. Candidate updates portfolio links or portfolio projects.
5. Backend stores portfolio separately from CV raw text.

### Suggested function split

- `CandidateProfileService.getProfile(...)`
- `CandidateProfileService.updateProfile(...)`
- `CandidatePortfolioService.getPortfolio(...)`
- `CandidatePortfolioService.updateLinks(...)`
- `CandidatePortfolioService.createProject(...)`
- `CandidatePortfolioService.updateProject(...)`
- `CandidatePortfolioService.deleteProject(...)`

## 5.2. Candidate Recommendation Pipeline

### Steps

1. Frontend submits candidate preference or opens recommendation page.
2. Backend reads candidate profile vector.
3. Build candidate query vector from:
   - CV
   - desired title
   - desired skills
   - location
   - seniority
   - language
4. Score against all eligible jobs.
5. Rank top `N`.
6. Return score, label, reasons, and potential flags.

### Suggested function split

- `RecommendationService.getTopJobsForCandidate(...)`
- `CandidateProfileVectorService.buildProfileVector(...)`
- `EligibilityFilterService.filterJobsByProfile(...)`
- `RecommendationRankingService.rankJobs(...)`

## 5.3. JD Intake Pipeline

### Steps

1. Recruiter creates or updates a JD.
2. Validate title, description, required skills, seniority, location, and language.
3. Normalize and tokenize text.
4. Build or update job vector.
5. Recompute impacted rankings.
6. Refresh trend snapshot if needed.

### Suggested function split

- `JobValidationService.validateJob(...)`
- `JobVectorService.buildJobVector(...)`
- `JobRecomputeService.recomputeJobMatches(...)`

## 5.3.1. Job Search Pipeline

### Steps

1. Frontend sends keyword, pagination, sort, optional filter query and authentication context if available.
2. Backend normalizes keyword and detects whether it matches skill, title, company or JD text.
3. Backend applies filters such as level, working model, salary band, job domain and location.
4. Backend returns one-column result data for frontend, total count and filter metadata.
5. If request is unauthenticated, backend returns only public fields and omits score labels, potential flags and personal match reasons.
6. When keyword input is focused, frontend may call suggestions endpoint separately.

### Suggested function split

- `JobSearchService.searchJobs(...)`
- `JobSearchService.getSuggestions(...)`
- `JobFilterService.applyFilters(...)`
- `JobSearchMapper.toSearchResultDto(...)`

## 5.3.2. Employer Profile Pipeline

### Steps

1. Frontend requests featured employers for candidate home or job list.
2. Backend returns public employer cards.
3. Frontend requests employer detail by id or slug.
4. Backend returns employer profile and open jobs for that employer.

### Suggested function split

- `EmployerProfileService.getFeaturedEmployers(...)`
- `EmployerProfileService.getEmployerDetail(...)`
- `EmployerProfileService.getOpenJobs(...)`
- `EmployerProfileMapper.toCardDto(...)`
- `EmployerProfileMapper.toDetailDto(...)`

## 5.4. Feedback Learning Pipeline

### Rocchio update

Use the standard relevance feedback form:

```text
Qm = αQ0 + β/|Dr| * Σ(d in Dr) d - γ/|Dnr| * Σ(d in Dnr) d
```

Where:

- `Q0` is the original query vector
- `Dr` is the set of relevant documents
- `Dnr` is the set of non-relevant documents
- `α, β, γ` are coefficients

### Implementation rule

- `Good match` increases the positive side of the vector.
- `Potential` should update with smaller weight than `Good`.
- `Bad match` pushes the vector away.
- `Skip` is not automatically equivalent to `Bad match`.

### Suggested function split

- `FeedbackService.recordFeedback(...)`
- `RocchioService.updateJobVector(...)`
- `RocchioService.updateCandidateProfileVector(...)`
- `RankingRecomputeService.rebuildAffectedRanks(...)`

## 5.5. HITL / AutoFit Pipeline

### Policy engine decision order

1. Check whether the user enabled automation.
2. Check whether the action is allowed for the role.
3. Check score threshold.
4. Check consent requirements.
5. Check scan frequency and email quota.
6. Check previous recommendation interactions.
7. Check notification cooldown.
8. Check user timezone and quiet hours.
9. Choose action:
   - auto execute
   - send actionable email
   - add to digest
   - queue for human approval
   - do nothing

### Suggested function split

- `AutoFitPolicyService.evaluate(...)`
- `AutomationOrchestratorService.routeAction(...)`
- `JobScanScheduler.scanNewJobs(...)`
- `HighMatchNotificationService.createIfEligible(...)`
- `DailyDigestService.generateDigest(...)`
- `RecommendationInteractionService.record(...)`
- `RecommendationInteractionService.filterExcludedJobs(...)`
- `NotificationQuotaService.checkAndConsume(...)`
- `QuietHoursService.isMuted(...)`
- `NotificationCooldownService.isCoolingDown(...)`
- `NotificationService.sendActionableEmail(...)`
- `EmailTemplateService.renderTemplate(...)`
- `EmailTokenService.issueToken(...)`
- `EmailActionService.confirmAction(...)`
- `AuditLogService.record(...)`

## 5.6. Notification Timing Pipeline

### Defaults

- CV upload ranking: run immediately using async worker.
- JD create/update ranking: run immediately or enqueue background recompute.
- Candidate job scan: every 1 hour when enabled.
- High-match email: send immediately only when score is greater than or equal to threshold.
- Candidate default high-match threshold: `90`.
- Recruiter default high-match threshold: `85`.
- Daily digest: send at `08:00` in the user's timezone.
- High-match email must respect daily quota, quiet hours and cooldown.
- Replacement after email skip: disabled by default; when enabled, delay `30-60 minutes`.

### Steps

1. Scheduler finds new or recently updated jobs.
2. Recommendation engine scores jobs against eligible candidates.
3. AutoFit policy checks consent, threshold, quota, quiet hours, cooldown and existing interactions.
4. If candidate already skipped, applied or marked not interested, exclude it from immediate notification.
5. If score is high enough and all notification guards pass, create `EmailAction` and `NotificationJob`.
6. If score is not high enough or notification guards fail, store it for daily digest or web-only display.

### Skip rules

- Web `SKIPPED`: hide immediately in frontend and return the next job from current result set.
- Email `SKIPPED`: record interaction, do not send replacement immediately.
- Email `SKIPPED` with replacement enabled: schedule next recommendation after configured delay.
- `SKIPPED` is not a negative Rocchio feedback.
- `NOT_INTERESTED` is stronger than skip and should reduce similar recommendations.
- `SHOW_SIMILAR` should increase priority for related jobs.

## 5.7. Job Market Analytics Pipeline

### Semantics

Job market analytics is about posted jobs on the platform.
It is not the same as matching analytics.

The dashboard line chart should use:

- `totalPostedJobs`
- `activeJobs`
- `newJobs`

It should not use:

- `matchCount`
- `highMatchCount`
- `cvJdMatchingCount`

### Steps

1. Scheduler or analytics service aggregates job records by date.
2. Service computes total posted jobs, active jobs, new jobs and employer count.
3. Service computes distribution by IT role and by salary band.
4. Results are stored as `JobMarketSnapshot` or computed from a read model.
5. API returns summary, trend and demand distribution DTOs.

### Suggested function split

- `JobMarketAnalyticsService.getSummary(...)`
- `JobMarketAnalyticsService.getTrends(...)`
- `JobMarketAnalyticsService.getDemandDistribution(...)`
- `JobMarketSnapshotScheduler.generateSnapshot(...)`
- `JobMarketAnalyticsMapper.toSummaryDto(...)`

## 5.8. Recruiter Workspace Pipeline

### Steps

1. `/api/recruiter/dashboard` returns overview metrics, chart data and ranking summary.
2. `/api/recruiter/jobs` returns requisition list for the HR Dashboard.
3. `/api/recruiter/jobs/{jobId}/ranking`, `/stats` and `/top-candidates` return selected job detail data, Applied CVs and AI potential matches.

### Suggested function split

- `RecruiterDashboardService.getOverview(...)`
- `RecruiterWorkspaceService.listRequisitions(...)`
- `RecruiterWorkspaceService.getRanking(...)`
- `RecruiterWorkspaceService.getStats(...)`
- `RecruiterWorkspaceService.getTopCandidates(...)`
- `RecruiterCandidateReviewService.getAppliedCvs(...)`
- `RecruiterCandidateReviewService.getPotentialMatches(...)`

---

## 6. Validation Rules

## 6.1. CV PDF

Hard checks:

- file exists
- MIME type is PDF
- text-based PDF, not image-only
- size within limit
- extracted text not empty

Soft checks:

- very low text density
- suspiciously short content
- malformed dates
- missing contact info

## 6.2. CV Form

Validate:

- name
- email
- phone
- experience years
- skills
- education
- desired title
- desired language
- location

### Validation style

- hard error if required fields missing
- soft warning if data looks incomplete but still usable

## 6.3. JD

Validate:

- title
- description
- required skills
- seniority
- location
- language
- salary mode and salary fields if provided

Soft checks:

- JD too short
- requirement list too vague
- mixed language without clear normalization
- missing public salary can be a warning, not a hard error

Salary rules:

- Use `salaryMode` as the source of truth: `NEGOTIABLE`, `RANGE`, `UP_TO`, `FROM`, `HIDDEN`.
- `NEGOTIABLE`: allow `salaryMin = null`, `salaryMax = null`; display text should be `Thỏa thuận` or localized equivalent.
- `RANGE`: require `salaryMin`, `salaryMax`, `salaryCurrency`, `salaryType`; enforce `salaryMin <= salaryMax`.
- `UP_TO`: require `salaryMax`, `salaryCurrency`, `salaryType`; allow `salaryMin = null`.
- `FROM`: require `salaryMin`, `salaryCurrency`, `salaryType`; allow `salaryMax = null`.
- `HIDDEN`: allow min/max/currency/type to be null and hide salary from candidate-facing UI.
- Reject negative salary values and unknown currency/type values.

---

## 7. Scoring Rules

### 7.1. Raw score

Raw score is cosine similarity:

```text
rawScore = cosineSimilarity(cvVector, jobVector)
```

### 7.2. Normalized score

```text
normalizedScore = round(rawScore * 100, 2)
```

### 7.3. Label assignment

Suggested thresholds:

- `0 - 39.99` -> `LOW`
- `40 - 69.99` -> `MEDIUM`
- `70 - 89.99` -> `HIGH`
- `>= 90` -> `HIGH` by score, but can still be flagged as `POTENTIAL` if the heuristic says so

### 7.4. Potential heuristic

Potential should be true when score is not necessarily high, but the profile has strong transfer signals:

- same domain
- transferable skills
- same language stack family
- similar seniority
- good adjacent tech background

Potential should be stored as a separate flag:

- `label = POTENTIAL`
- or `isPotential = true`

Do not hide it inside the raw score.

---

## 8. API Contract

### 8.1. Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/passwordless/request`
- `GET /api/auth/passwordless/verify?token=...`
- `POST /api/auth/passwordless/verify`
- `GET /api/auth/me`

### 8.2. Candidate

- `GET /api/candidates/me`
- `PATCH /api/candidates/me`
- `PATCH /api/candidates/me/account`
- `GET /api/candidates/me/cvs`

### 8.3. CV

- `POST /api/cv/upload`
- `POST /api/cv/manual`
- `GET /api/cv/me`
- `GET /api/cv/{id}`
- `GET /api/cv/{id}/status`
- `POST /api/cv/{id}/set-default`

### 8.3.1. Candidate Profile & Portfolio

- `GET /api/candidates/me/portfolio`
- `POST /api/candidates/me/portfolio/links`
- `PATCH /api/candidates/me/portfolio/links/{linkId}`
- `DELETE /api/candidates/me/portfolio/links/{linkId}`
- `POST /api/candidates/me/portfolio/projects`
- `PATCH /api/candidates/me/portfolio/projects/{projectId}`
- `DELETE /api/candidates/me/portfolio/projects/{projectId}`

### 8.4. Job

- `POST /api/jobs`
- `GET /api/jobs`
- `GET /api/jobs/search`
- `GET /api/jobs/search/suggestions`
- `GET /api/jobs/suggestions`
- `GET /api/jobs/{id}`
- `PATCH /api/jobs/{id}`
- `PATCH /api/jobs/{id}/status`
- `DELETE /api/jobs/{id}`

Recommended `GET /api/jobs/search` query params:

- `keyword`
- `location`
- `level`
- `workingModel`
- `salary`
- `domain`
- `page`
- `size`
- `sort`

Recommended `GET /api/jobs/search/suggestions` query params:

- `keyword`
- `limit`

Suggestion response groups:

- `SKILL`
- `JOB_TITLE`
- `COMPANY`

Guest/public access:

- `GET /api/jobs`, `GET /api/jobs/search`, `GET /api/jobs/search/suggestions` and `GET /api/jobs/{id}` may support unauthenticated read-only access.
- `/api/jobs/suggestions` is kept as an alias for `/api/jobs/search/suggestions`.
- Public job responses must not include `normalizedScore`, `label`, `isPotential`, candidate-specific match reasons or auto-apply state.
- Authenticated candidate job cards are exposed through `GET /api/matches/me/cards`, and the frontend can merge those fields into public job detail for a logged-in candidate.
- Authenticated recruiter responses may include recruiter-side applicant/ranking data only through recruiter-scoped endpoints.

### 8.4.1. Employer

- `GET /api/employers/featured`
- `GET /api/employers/{id}`
- `GET /api/employers/{id}/jobs`

### 8.4.2. Recruiter Workspace

- `GET /api/recruiter/dashboard`
- `GET /api/recruiter/jobs`
- `GET /api/recruiter/jobs/{jobId}/ranking`
- `GET /api/recruiter/jobs/{jobId}/stats`
- `GET /api/recruiter/jobs/{jobId}/top-candidates`

### 8.5. Matching / Recommendation

- `GET /api/matches/me`
- `GET /api/matches/me/cards`
- `GET /api/recommendations/jobs`
- `GET /api/recommendations/jobs/{jobId}/similar`

### 8.6. Application

- `POST /api/applications`
- `GET /api/applications`
- `GET /api/applications/{id}`
- `POST /api/applications/{id}/invite`

### 8.7. Feedback

- `POST /api/matchings/{matchingId}/feedback`

### 8.8. Automation

- `GET /api/automation/policies/me`
- `POST /api/automation/policies/me`
- `PUT /api/automation/policies/me`
- `POST /api/automation/email-actions`
- `GET /api/automation/actions/confirm?token=...`
- `POST /api/automation/actions/confirm`
- `POST /api/automation/actions/reject`

### 8.9. Recommendation Interaction

- `POST /api/recommendations/{jobId}/interactions`
- `GET /api/recommendations/interactions`

### 8.10. Analytics

- `GET /api/analytics/summary`
- `GET /api/analytics/jobs/trends`
- `GET /api/jobs/{jobId}/trends`
- `GET /api/analytics/job-market/summary`
- `GET /api/analytics/job-market/trends`
- `GET /api/analytics/job-market/demand?groupBy=role|salary`

`/api/analytics/job-market/*` must return posted-job statistics.
Matching/application analytics can stay under `/api/analytics/summary`, `/api/analytics/jobs/trends` or recruiter-specific endpoints, but DTO field names must make the metric explicit.

### 8.11. Common response envelope

Use one consistent shape:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "requestId": "..."
  }
}
```

Errors should include:

- code
- message
- details
- fieldErrors when validation fails

---

## 9. Database and Indexing

Database source of truth là PostgreSQL.

Development/demo trực tiếp nên chạy PostgreSQL bằng Docker Compose.
Flyway phải chạy migration để tạo schema thay vì tạo bảng thủ công bằng dashboard.
Supabase PostgreSQL chỉ là optional target khi cần demo online hoặc deploy.

### Core tables

- `candidate`
- `candidate_preference`
- `candidate_portfolio_link`
- `candidate_portfolio_project`
- `cv`
- `employer_profile`
- `job`
- `matching`
- `application`
- `feedback`
- `automation_policy`
- `email_action`
- `email_token`
- `audit_log`
- `recommendation_interaction`
- `notification_job`
- `job_trend_snapshot`
- `job_market_snapshot`

### `cv` multi-CV columns

- `display_name`
- `source`: `UPLOAD` or `MANUAL`
- `is_default`
- `parsed_summary`
- `top_skills` JSONB
- `last_scored_at`
- `created_at`
- `updated_at`

Only one CV should be default per candidate.

### `candidate_portfolio_link` columns

- `id`
- `candidate_id`
- `type`
- `url`
- `created_at`
- `updated_at`

### `candidate_portfolio_project` columns

- `id`
- `candidate_id`
- `name`
- `role`
- `summary`
- `tech_stack` JSONB
- `project_url`
- `impact`
- `created_at`
- `updated_at`

### `employer_profile` columns

- `id`
- `recruiter_id`
- `company_name`
- `slug`
- `logo_url`
- `cover_url`
- `summary`
- `description`
- `industry`
- `company_size`
- `location`
- `website_url`
- `benefits` JSONB
- `is_featured`
- `created_at`
- `updated_at`

### `job_market_snapshot` columns

- `id`
- `snapshot_date`
- `total_posted_jobs`
- `active_jobs`
- `new_jobs`
- `employer_count`
- `distribution_by_role` JSONB
- `distribution_by_salary` JSONB
- `created_at`

Do not overload `match_count` for the job market chart. If both metrics are needed, keep matching metrics in a separate DTO or clearly named field.

### `job` salary columns

The `job` table must support real recruiter salary input patterns without forcing every salary field to be filled.

- `salary_mode` enum/string: `NEGOTIABLE`, `RANGE`, `UP_TO`, `FROM`, `HIDDEN`; required.
- `salary_min` numeric nullable.
- `salary_max` numeric nullable.
- `salary_currency` string nullable, for example `VND`, `USD`.
- `salary_type` enum/string nullable: `MONTHLY`, `HOURLY`, `YEARLY`.
- `salary_is_visible` boolean required, default `true`.
- `salary_display_text` string nullable for UI/email display.

Validation must be conditional on `salary_mode`, not based on all salary fields being non-null.

### Suggested indexes

- `cv(candidate_id)`
- `cv(candidate_id, is_default)`
- `candidate_portfolio_project(candidate_id)`
- `job(language)`
- `job(salary_mode)`
- `job(salary_min, salary_max)`
- `job(title)`
- `job(company)`
- `employer_profile(slug)`
- `employer_profile(is_featured)`
- `job_market_snapshot(snapshot_date DESC)`
- `matching(job_id, normalized_score DESC)`
- `application(candidate_id, job_id)`
- `recommendation_interaction(candidate_id, job_id)`
- `notification_job(status, next_retry_at)`
- `email_token(token_hash)`
- `audit_log(created_at DESC)`

### Storage notes

- Store extracted terms and vectors in `JSONB`
- Store token hashes, never raw token if possible
- Keep audit log append-only
- Store uploaded CV files in local filesystem during development, for example under `storage/cv`
- Persist only file metadata/path in database, not large binary CV content
- Hide storage implementation behind `StorageService` so cloud storage can replace local storage later

---

## 10. Async and Scheduler

### 10.1. `@Async`

Use async for:

- PDF parsing
- vectorization
- match recomputation
- email sending
- digest generation

### 10.2. `@Scheduled`

Use scheduled jobs for:

- daily digest
- ranking rebuild
- expired token cleanup
- stale queue cleanup
- trend snapshot generation
- job market snapshot generation
- hourly job scan
- high-match notification generation
- replacement recommendation after email skip when enabled

### 10.3. Idempotency

All background tasks must be idempotent.

If a job runs twice:

- it must not create duplicate applications
- it must not create duplicate audit logs for the same action
- it must not send duplicate emails unless explicitly retrying
- it must not re-notify a skipped or not-interested job

---

## 11. Security

### JWT

- use JWT for web session access
- use role claims
- separate candidate and recruiter permissions
- unauthenticated guest access is read-only and limited to public job/employer/dashboard data
- never return personal score, potential flag, match reasons, CV data or application state to guest requests

### Magic-link

- token must be signed
- token must expire
- token must be one-time use
- token must carry purpose

### Side-effect safety

- GET only renders confirm page
- POST performs actual action
- verify token server-side before state change

### Audit logging

Record:

- actor
- action
- target
- channel
- token purpose
- timestamp
- result

---

## 12. Logging and Observability

Log at least:

- `requestId`
- `candidateId`
- `jobId`
- `cvId`
- `matchingId`
- `tokenId`
- `actionType`
- `status`

Important error classes:

- validation failed
- parse failed
- scoring failed
- token expired
- token already used
- email provider failed
- policy denied
- quota exceeded
- quiet hours active
- cooldown active

Frontend-facing DTOs should expose enough data for the current UI:

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
- `trendPoints`

---

## 13. Testing Plan

### Unit tests

- text normalization
- tokenization
- tf-idf
- cosine similarity
- Rocchio update
- label assignment
- potential heuristic
- policy evaluation
- token verification
- quota evaluation
- quiet hours calculation
- cooldown calculation

### Integration tests

- CV upload to scoring
- JD create/update to recompute
- multi-CV list and set default CV
- candidate fixed profile update
- candidate portfolio endpoints
- recommendation endpoint
- job search endpoint
- search suggestion endpoint
- employer featured/detail endpoints
- job market analytics endpoints
- feedback update
- passwordless login
- email action confirm
- invite flow
- job scan to notification
- skip interaction
- daily digest generation
- quiet hours and timezone behavior
- notification cooldown
- audit log write

---

## 14. Definition of Done

Backend is done when:

- CV upload works end to end
- multi-CV management works and one default CV can be selected
- fixed profile and portfolio APIs work
- JD CRUD works
- scoring is deterministic
- recommendation works
- feedback updates vectors
- automation policy works
- actionable email flow works
- magic-link login works
- audit log is complete
- validation surfaces warnings and hard errors correctly
- endpoints are documented and tested
- search, employer and job-market endpoints are aligned with frontend routes
- recruiter overview and recruiter HR workspace endpoints are aligned with frontend routes
