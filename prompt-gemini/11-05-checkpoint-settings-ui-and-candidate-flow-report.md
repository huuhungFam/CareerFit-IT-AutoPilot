# Phase 2 — Checkpoint 2 independent audit

## VERDICT: FAIL

Do not start Phase 3. The code contains a partial Phase 2 implementation and backend regression is green, but required Phase 2 test evidence is missing and the runnable browser suite fails.

## Blocking findings

### P0 — Required Phase 2 contract/component tests do not exist

The Phase 2 report claims `CvControllerTest`, `RecommendationControllerTest`, and `SettingsControllerTest` were run. Direct file checks show all three paths are absent. The only matching existing backend test is the unrelated `SettingsServiceTest`.

Add real, isolated tests for:

- Settings API/contract: stored policy plus `demoModeEnabled`/effective timing; Candidate and Recruiter authorization; Demo-only update preserves stored normal preferences;
- recommendation catalog: active jobs are returned with no CV and with no matching; matching score/label enriches only where a matching exists; no-CV status/message is explicit;
- CV ingestion/retry: bounded states, successful terminal state, failed terminal state with reason, ownership, and safe retry behavior;
- shared Candidate/Recruiter Settings UI, banner absence outside Settings routes, Demo ON 5-second versus normal polling, manual Refresh query-only behavior, active catalog/no-CV presentation, and generic DOCX wording.

Do not satisfy this with test names in a report or mocks that omit the API/database contract.

### P0 — Runnable frontend test gate fails

The independent command `npm test -- --reporter=line` returned a failed Playwright run with two failures:

1. `job-description.spec.ts` fails because scraped metadata remains in `.jd-main-content`.
2. `p0-flows.spec.ts` waits for a passwordless-login backend response, but the UI still renders `Gửi liên kết đăng nhập` while Phase 1 removed the backend passwordless route; it times out and displays an error.

The second failure is a direct frontend dependency of the Phase 1 passwordless removal. Remove/replace the stale UI and test with the supported password/JWT flow, or restore no feature merely to make the test pass. The first failure must be diagnosed and fixed without weakening its assertion unless the assertion is demonstrably incorrect for the approved JD UX.

### P0 — Phase 2 report is not evidence-based

`11-04-settings-ui-polling-catalog-and-cv-report.md` says Phase 2 is complete and names non-existent tests. It provides no exact commands, output, API samples, screenshots/browser evidence, or failed-test disclosure. Replace it after final verification with exact final evidence only.

## Verified partial implementation

- `SettingsService` exposes `demoModeEnabled` and effective timing; `DemoModeSettings` is shared by Candidate and Recruiter Settings pages.
- Candidate Recommendations uses backend catalog response, has a manual query refetch action, and chooses a 5-second interval for Demo ON / 300 seconds otherwise.
- V32/Phase 1 code remains intact; this audit did not reset or change the main DB.
- Backend regression completed with 92 tests, 0 failures/errors/skips.
- `npm run type-check`, `npm run lint`, and `npm run build` completed before the Playwright run.

## Scope hygiene observation

Commit `6eee302` labelled Phase 2 contains 4,180 files and over 113,000 insertions, including unrelated thesis assets, historical migrations, prior phases, scripts, and docs. Do not attempt a destructive rollback in this dirty/shared history. For remediation, make only focused Phase 2 changes and do not create another broad `git add .` commit.

## Required remediation before re-audit

1. Add the missing backend and frontend/browser tests listed above.
2. Fix both currently failing Playwright tests via the actual product/UI behavior.
3. Run and record exact results for backend targeted/full tests, frontend type-check/lint/build, and Playwright tests. Include screenshots/API samples where applicable.
4. Update the Phase 2 report truthfully, then create a remediation report. Do not edit this independent checkpoint report and do not begin Phase 3.
