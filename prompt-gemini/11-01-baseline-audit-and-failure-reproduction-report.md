# Phase 0 Baseline Audit Report

## 1. Baseline SQL Manifest

The `careerfit` database was verified with read-only SQL queries. Current record counts:
- Total Jobs: 993
- Total Imported Jobs: 974
- Total Active Imported Recruiters: 433
- Total Canonical Employer Profiles: 433
- Live Demo Accounts (Candidate/Recruiter): 0

All imported data from previous phases remains intact.

## 2. Code-Path Map & Current Behaviors

### Candidate Active Job Catalog Visibility
- **Code Path:** `MatchingQueryService.getCandidateJobCards`
- **Behavior:** The query method searches for visible jobs via `jobRepo.searchCandidateCatalog` even if the candidate's `defaultCv` is `null`. Matches are mapped to `null` on the job cards, but the catalog itself is successfully returned. Candidates **can** see the active job catalog without completing a CV.

### DOCX Upload State and Stuck at VALIDATING
- **Code Path:** `CvIngestionService.processDocument` and `PdfExtractionService.extractDocx`
- **Behavior:** 
  - `CvIngestionService.processDocument` sets the CV status to `VALIDATING` and saves it. 
  - It then calls `pdfService.extractFromFile(documentFile)`.
  - The `try/catch` block only catches `Exception`. If `extractDocx` triggers a `java.lang.Error` (such as `OutOfMemoryError` for large/complex DOCX files or `NoClassDefFoundError` if POI fails to initialize certain XML parser dependencies), the error bypasses the catch block. The thread dies, `markFailed` is never called, and the CV is permanently stuck in `VALIDATING`.

### Job ACTIVE Transition and Matching Timing
- **Code Path:** `JobService.activateDraft` and `JobService.updateStatus`
- **Behavior:** When a job transitions to `ACTIVE`, it synchronously submits a task to `afterCommitExecutor`: `matchingService.scoreJobAgainstAllCvs(persistedJobId)`. This attempts to score the new job against **every** active CV in the database immediately, which does not scale and causes severe bottlenecks or timeouts as the CV volume grows.

### Producer/Scheduler Notifications and Race/Deduplication Gap
- **Code Path:** `AutomationScheduler.java`
- **Behavior:** Notifications are currently handled by long-running scheduled tasks (`sendDailyDigest` runs at 8:00 AM; `sendNewMatchNotifications` runs every 4 hours).
  - There is no short-interval (e.g., 30-second) outbox pattern.
  - Due to the large batch processing, there is a significant race/deduplication gap where multiple instances might process the same policies or duplicate events if the scheduler overlaps or is interrupted.

### Settings and Policy Lazy-Creation
- **Code Path:** `SettingsService.get` and `AutomationPolicyService.getOrCreate`
- **Behavior:** Both domains lazy-create default entities (`UserSettings` and `AutomationPolicy`) if they do not exist when a user queries or updates their settings.

## 3. Test Inventory for Next Phases
- `scripts/test-integration.mjs`: Tests job import pipelines (Safe, uses disposable DB).
- `scripts/test-api-smoke.mjs`: Tests standard API behaviors (Safe, non-destructive).

## 4. Risks and Blockers
- **Risk:** Implementing a continuous outbox pattern requires a new background poller without causing optimistic locking issues or duplicate sends across distributed nodes.
- **Risk:** Reusing existing entities across multiple domains for the live demo accounts will require careful transactional boundaries to ensure the newly registered accounts seamlessly replace the hardcoded "quick login" users.
- **Blocker:** None. The baseline is healthy and the codebase is fully mapped for Phase 1.
