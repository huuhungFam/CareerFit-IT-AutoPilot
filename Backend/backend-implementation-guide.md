# CareerFit IT AutoPilot - Backend Implementation Guide

Tài liệu này mô tả mức triển khai chi tiết cho backend của `CareerFit IT AutoPilot`.
Mục tiêu là để một coding agent hoặc một engineer có thể đọc và bắt tay vào implement mà không phải đoán lại kiến trúc.

---

## 1. Vai Trò Của Backend

Backend là nguồn sự thật chính của hệ thống. Nó chịu trách nhiệm:

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
- ghi audit log

Frontend chỉ là lớp hiển thị và điều khiển. Mọi quyết định nghiệp vụ phải nằm ở backend.

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
- token lifecycle

### 3.2. `candidate`

Chịu trách nhiệm:

- candidate profile
- candidate preference
- language preference
- auto-apply threshold

### 3.3. `cv`

Chịu trách nhiệm:

- upload CV PDF
- nhập CV bằng form
- parse text
- validate content
- lưu raw text và extracted terms

### 3.4. `job`

Chịu trách nhiệm:

- CRUD JD
- store learned profile vector
- store job metadata
- track trend snapshot

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

### 3.9. `analytics`

Chịu trách nhiệm:

- trend chart data
- summary stats
- application counts
- matching counts

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
- `CV`
- `Job`
- `Matching`
- `Application`
- `Feedback`
- `AutomationPolicy`
- `EmailAction`
- `EmailToken`
- `AuditLog`
- `JobTrendSnapshot`

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
5. Choose action:
   - auto execute
   - send actionable email
   - queue for human approval
   - do nothing

### Suggested function split

- `AutoFitPolicyService.evaluate(...)`
- `AutomationOrchestratorService.routeAction(...)`
- `NotificationService.sendActionableEmail(...)`
- `EmailTemplateService.renderTemplate(...)`
- `EmailTokenService.issueToken(...)`
- `EmailActionService.confirmAction(...)`
- `AuditLogService.record(...)`

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
- compensation or salary if provided

Soft checks:

- JD too short
- requirement list too vague
- mixed language without clear normalization

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
- `GET /api/me`

### 8.2. Candidate

- `GET /api/candidates/{id}`
- `PUT /api/candidates/{id}`
- `GET /api/candidates/{id}/preferences`
- `POST /api/candidates/{id}/preferences`

### 8.3. CV

- `POST /api/cv/upload`
- `POST /api/cv/manual`
- `GET /api/cv/{id}`
- `GET /api/cv/{id}/status`
- `GET /api/candidates/{candidateId}/cv`

### 8.4. Job

- `POST /api/jobs`
- `GET /api/jobs`
- `GET /api/jobs/{id}`
- `PUT /api/jobs/{id}`
- `DELETE /api/jobs/{id}`

### 8.5. Matching / Recommendation

- `GET /api/jobs/{jobId}/ranking`
- `GET /api/candidates/{candidateId}/recommendations`
- `GET /api/jobs/{jobId}/applicants`
- `GET /api/jobs/{jobId}/potential`

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

### 8.9. Analytics

- `GET /api/analytics/summary`
- `GET /api/analytics/jobs/trends`
- `GET /api/jobs/{jobId}/trends`

### 8.10. Common response envelope

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

### Core tables

- `candidate`
- `candidate_preference`
- `cv`
- `job`
- `matching`
- `application`
- `feedback`
- `automation_policy`
- `email_action`
- `email_token`
- `audit_log`
- `job_trend_snapshot`

### Suggested indexes

- `cv(candidate_id)`
- `job(language)`
- `matching(job_id, normalized_score DESC)`
- `application(candidate_id, job_id)`
- `email_token(token_hash)`
- `audit_log(created_at DESC)`

### Storage notes

- Store extracted terms and vectors in `JSONB`
- Store token hashes, never raw token if possible
- Keep audit log append-only

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

### 10.3. Idempotency

All background tasks must be idempotent.

If a job runs twice:

- it must not create duplicate applications
- it must not create duplicate audit logs for the same action
- it must not send duplicate emails unless explicitly retrying

---

## 11. Security

### JWT

- use JWT for web session access
- use role claims
- separate candidate and recruiter permissions

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

### Integration tests

- CV upload to scoring
- JD create/update to recompute
- recommendation endpoint
- feedback update
- passwordless login
- email action confirm
- invite flow
- audit log write

---

## 14. Definition of Done

Backend is done when:

- CV upload works end to end
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

