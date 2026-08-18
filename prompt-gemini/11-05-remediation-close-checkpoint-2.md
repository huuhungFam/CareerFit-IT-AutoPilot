# Phase 2 remediation — close Checkpoint 2 completely

Continue from the current repository state. This is a focused remediation for the independent FAIL audit; it is **not** Phase 3.

## Read first, completely

1. `prompt-gemini/11-default-demo-mode-and-live-two-role-workflow.md`
2. `prompt-gemini/11-04-settings-ui-polling-catalog-and-cv.md`
3. `prompt-gemini/11-05-checkpoint-settings-ui-and-candidate-flow.md`
4. `prompt-gemini/11-05-checkpoint-settings-ui-and-candidate-flow-report.md` — independent audit source of truth
5. `prompt-gemini/11-04-settings-ui-polling-catalog-and-cv-report.md`
6. `prompt-gemini/11-03-checkpoint-schema-policy-outbox-report.md` — Phase 1 PASS constraints.

## Non-negotiable constraints

- Work only on the direct Phase 2 files/tests needed to close findings. Do not implement Phase 3+ event-first matching, recovery scheduler, email dispatcher, duplicate protection, reset, imports, or live-account registration.
- Do not edit the independent checkpoint report `11-05-checkpoint-settings-ui-and-candidate-flow-report.md`.
- Do not change V1–V32, do not restore passwordless backend endpoints/tables/entities, and do not mutate/reset the main `careerfit` database.
- Use real Testcontainers/API/browser assertions where behavior crosses boundaries. Do not replace missing coverage with mocks or a prose report.
- Preserve user work and existing useful tests. Do not use `git checkout`, `git reset`, test skips/exclusions, swallowed exceptions, or weakened assertions to create a green run.
- Do **not** run `git add .`, do not commit, and do not modify unrelated docs/thesis/assets/scripts. The prior Phase 2 commit already captured unrelated history; leave it untouched.

## Acceptance work

### A. Add backend Phase 2 contract tests that actually run

Create a focused integration-test class (for example `Phase2SettingsCatalogCvIntegrationTest`) under `Backend/careerfit-backend/src/test/java/...`. It must extend `BaseIntegrationTest`, use the isolated PostgreSQL Testcontainers DB, and exercise real service/controller contracts—not mocked persistence.

Cover all cases below using deterministic fixtures and unique values:

1. **Settings contract and Demo toggle**
   - Candidate and Recruiter Settings responses expose stored values, `demoModeEnabled`, and effective timing summary.
   - Candidate/Recruiter can toggle Demo Mode through the supported Settings API/service path.
   - The update request changes only the Demo field; stored normal preferences are re-read unchanged after ON and after OFF.
   - Effective values are `5/12/30/30`, cooldown `0`, quiet-hours disabled when ON; normal values return when OFF.
   - Assert authorization/role behavior: Candidate and Recruiter are permitted; Admin does not receive/use Demo Mode as a human-settings policy.

2. **Active catalog without CV or matching**
   - Create at least one ACTIVE job and a Candidate with no completed CV. The catalog must return the active job(s), a clear no-CV/explanatory status/message, and no fabricated matching score/label.
   - Create an eligible completed CV but no matching row. Catalog must still return active job(s), not disappear or become an empty fake response.
   - Add a real matching row/fixture and assert its score/label enriches only that matching job. Jobs without a matching remain in the catalog without score enrichment.
   - Verify only ACTIVE jobs qualify; do not alter matching/scoring in this Phase.

3. **CV pipeline and retry**
   - Test a successful upload/processing path ends in `SCORING_DONE` and exposes extracted text, summary, and skills only to the owning Candidate.
   - Test an invalid/processing failure ends in `FAILED` with a non-empty failure reason; no infinite polling state.
   - Test retry is allowed only for the owner and only from a safe failed/retryable state; it must reject another user's CV and an invalid non-failed state.
   - If the existing pipeline requires files, use small project fixtures/mocks only at the external extraction boundary, not for the CV state machine or authorization/persistence logic.

Give every test descriptive names. The Phase 2 report must name the actual test class/methods; do not claim `CvControllerTest`, `RecommendationControllerTest`, or `SettingsControllerTest` unless those files are actually created and run.

### B. Add browser/component evidence for Phase 2 UI

Add focused Playwright tests under `Frontend/tests/` (or the project’s existing test structure) that run against the normal local test setup. They must prove:

1. Candidate **and** Recruiter Settings show the same Demo Mode component/banner/toggle and timing rendered from mocked/backend settings response.
2. No Demo Mode banner exists on login, dashboards, job list/detail, applications, or other non-Settings routes.
3. Toggling Demo Mode displays a loading/disabled state, success/error state, calls only the settings update endpoint with `demoModeEnabled`, then renders the returned/effective timing. It must not force itself back ON after an explicit OFF response.
4. Candidate Recommendations use 5,000 ms polling only when `demoModeEnabled=true`, and 300,000 ms normal interval when false. Test this deterministically by inspecting query behavior/timers or by mocking the interval boundary—not by waiting five minutes.
5. Manual Refresh invokes only the recommendations query refetch/invalidation. Assert it does not call a scoring, matching, email, or enqueue endpoint.
6. A no-CV catalog response with non-empty `jobs` displays jobs plus explanatory state. A matching score is rendered only when the API response includes it.
7. Both PDF and DOCX upload source labels use generic CV-file wording; assert no visible PDF-only wording for DOCX.

Avoid brittle copy-only tests where a network/assertion contract is available. Use stable `data-testid` attributes only if the existing semantic roles/labels cannot be selected reliably.

### C. Repair the two existing failing Playwright tests correctly

Run the current frontend suite first and reproduce both failures from the independent audit.

1. **`job-description.spec.ts`**: Scraped metadata leaks into `.jd-main-content`. Fix the real description-normalization/render boundary so only approved JD sections appear. Keep the assertion meaningful—do not delete metadata checks or alter fixture/test solely to hide the defect.
2. **`p0-flows.spec.ts` passwordless case**: Phase 1 deliberately removed backend passwordless. Remove the stale passwordless button/flow from the login UI and replace/remove the obsolete test using the supported password/JWT flow. Do not restore passwordless to make the old test green. Ensure no UI route advertises a dead magic-link capability.

If frontend copy/settings still contains stale passwordless preference UI, remove or migrate that dead UI as a direct dependency of this fix. Do not touch historical migrations.

### D. Correct evidence/reporting only after all gates pass

Update `prompt-gemini/11-04-settings-ui-polling-catalog-and-cv-report.md` only after final verification. It must contain:

- exact changed-file list limited to Phase 2 scope;
- real test class/file/method names and exact command output/counts;
- backend API sample evidence for Settings and catalog/no-CV behavior;
- browser evidence/screenshots if the Playwright configuration makes them available;
- exact explanation of CV success/failure/retry coverage;
- explicit statement that Phase 3+ and main DB reset/import were not performed;
- remaining risks, if any.

Create `prompt-gemini/11-05-remediation-close-checkpoint-2-report.md` with an acceptance-condition-to-test mapping and final command results. Never claim a test exists unless it exists and ran.

## Required verification order

Run from `Backend/careerfit-backend`:

```powershell
.\mvnw.cmd test-compile
.\mvnw.cmd '-Dtest=Phase1OutboxPolicyTest,Phase2SettingsCatalogCvIntegrationTest' test
.\mvnw.cmd test
```

Run from `Frontend`:

```powershell
npm run type-check
npm run lint
npm run build
npm test -- --reporter=line
```

Then run:

```powershell
git diff --check
git status --short
```

If a command fails, fix the underlying scoped defect, rerun it, and rerun all downstream gates. Do not stop at a partial pass. Do not reset, import, migrate, or clean main DB.

## Stop condition

Stop only when every required command has an actual exit code 0, all new tests are present and meaningful, both old Playwright failures are gone, reports are evidence-based, and no Phase 3 behavior was introduced. Then reply exactly:

`READY_FOR_REAUDIT — prompt-gemini/11-05-remediation-close-checkpoint-2-report.md`
