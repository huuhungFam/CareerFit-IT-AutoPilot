# Phase 6 — Reset, live E2E, calibration and runbook report

## Status

**PHASE 6 PASS — live E2E evidence captured and final baseline restore verified.**

The user explicitly approved both local destructive resets. Each reset removed only the two Compose-labelled local volumes (`careerfit_postgres_data` and `careerfit_backend_storage`), recreated them, migrated the empty database to V35, imported the baseline twice, and started a healthy backend. The live Candidate and Recruiter scenario below was captured before the final restore.

There is also no recorded Checkpoint 5 audit report at `11-11-checkpoint-duplicates-and-ownership-report.md`; the reset/E2E gate remains pending that audit evidence.

## Prepared implementation

| File | Purpose |
| --- | --- |
| `scripts/reset-local-demo-data.ps1` | Canonical destructive reset entry point. It resolves physical Compose volume names without printing resolved environment values, validates exact project/volume labels, removes only the two validated volumes, runs Flyway/import/idempotency verification, starts backend, checks the full baseline manifest, and invokes API smoke. |
| `scripts/test-api-smoke.mjs` | Restored health/login/settings/dashboard/analytics/jobs/ranking/applicants/bookmarks smoke test. It verifies `ca`/`re` roles and Demo Mode after reset, masks tokens, and proves cross-owner applicant access is `403 FORBIDDEN`. |
| `Backend/.../LiveDemoCalibrationTest.java` | Reads the real DOCX, then uses production text normalization, TF-IDF vectorization and `ScoringService`; it does not persist demo jobs or alter scoring logic. |
| `demo/PHASE_6_CALIBRATED_ARTIFACTS.md` | Reusable CV/JD creation instructions plus the live evidence checklist. The three jobs remain UI-created, not seeded. |
| `docs/defense/07_LIVE_TWO_ROLE_DEMO_RUNBOOK.md` | Normal two-role presentation path, quick-login fallback, SMTP/outbox distinction and troubleshooting, and canonical restore procedure. |

## Calibration evidence

`LiveDemoCalibrationTest` used the actual DOCX text and production scoring pipeline:

```text
CF-DEMO-01 Frontend Engineer               100.00  HIGH
CF-DEMO-02 Full-stack Delivery Engineer     84.23  expected 80-89 band
CF-DEMO-03 Cloud Platform Engineer          68.40  transferable/potential
```

The original artifact instruction used `en` for the job language, while the real
uploaded bilingual CV is detected as `vi`.  The instruction and calibration test
now use the same `vi` production tokenization path.  The live results were
100.00 HIGH, 84.63 MEDIUM, and 70.50 potential, respectively.

## Live two-role E2E evidence (UTC)

| Check | Evidence | Result |
| --- | --- | --- |
| Registration and defaults | Candidate `65096a9b-…` at `15:55:51.016Z`; Recruiter `df8995d7-…` at `15:55:51.117Z`; both effective Demo Mode `true` | PASS |
| CV ingestion | CV `40da989f-…`; created `15:55:51.233Z`; `SCORING_DONE` at `15:55:52.008Z`; language `vi`; extracted text length 1,016; 15 skills | PASS |
| Three live recruiter jobs | `00656f38-…`, `946b250b-…`, `919e7c3a-…`; all owned only by `phamhuuhung216@gmail.com`; total job count became 996 | PASS |
| Candidate visibility | All three cards appeared on the first 5-second poll at `15:57:51.522Z` | PASS |
| Matching | Frontend 100.00/HIGH; Full-stack 84.63/MEDIUM; Cloud 70.50/MEDIUM + potential | PASS |
| Duplicate UX | Recruiter duplicate-preflight returned `exactDuplicate=true` for Job 1 | PASS |
| Durable outbox | One HIGH_MATCH row for matching `f87930c8-…`; scheduled `15:59:10.732Z`, sent `15:59:19.884Z`, one attempt, no duplicate key | PASS |
| Internal application | Application `977911c7-…` at `16:00:28.182Z`; Candidate and owning Recruiter each see exactly one application; cross-role access returned 403 | PASS |
| Recruiter immediate alert | Exactly one `RECRUITER_NEW_APPLICATION` delivery-log row for that application | PASS |
| Candidate email action | GOOD_MATCH token was redeemed at `16:44:51.141Z`; feedback is source `EMAIL`; its owning Recruiter received exactly one `RECRUITER_CANDIDATE_FEEDBACK` outbox row, sent at `16:44:58.249Z` after one attempt. | PASS |

The actual first demo outbox delivery was verified.  The later 30-second spacing
rule is covered by `OutboxServiceTest` and `OutboxDispatcherTest` (8 tests, all
pass); this exact three-job calibration deliberately produces only one HIGH match,
so it cannot yield a second live HIGH_MATCH email without changing the scenario.

## Completed reset verification

```text
PASS  pwsh -NoProfile -File scripts/reset-local-demo-data.ps1 -Force
      Recreated only thesis_careerfit_postgres_data and
      thesis_careerfit_backend_storage; both retained matching Compose labels.
      Flyway V35, importer idempotency checksum, and API smoke passed.

PASS  baseline manifest
      jobs_total=993; jobs_imported=974; active_imported_recruiters=433;
      canonical_imported_companies=433; duplicate_source_identity=0;
      duplicate_external_hash=0; ownership_violations=0;
      import_policy_violations=0; quick_login_demo_enabled=2.

PASS  node --check scripts/test-api-smoke.mjs
PASS  mvnw.cmd -Dtest=LiveDemoCalibrationTest test
PASS  mvnw.cmd -Dtest=OutboxServiceTest,OutboxDispatcherTest test
      8 tests, 0 failures, 0 errors.
PASS  mvnw.cmd test
      121 tests across 34 Surefire reports, 0 failures, 0 errors.

PASS  Frontend/node_modules/.bin/tsc --noEmit
PASS  Frontend/node_modules/.bin/eslint . --max-warnings=0
PASS  Frontend/node_modules/.bin/vite build
```

The API smoke passed against the new baseline: health, `ca` and `re` authentication,
settings, dashboards, analytics, job/applicant/ranking/bookmark endpoints, and the
cross-owner `403` guard all succeeded without exposing tokens.

## Required next action

During the live verification, the confirmation page exposed a real CSP defect:
`sandbox` initially blocked form submission, and adding only `allow-forms` made the
form origin opaque, which Spring CORS rejected. `SecurityConfig` now uses
`sandbox allow-forms allow-same-origin`; `SecurityHardeningTest` asserts it and
passes. The user completed the real email confirmation after the deployed fix.

## Final restore evidence

The user approved the final destructive reset. It removed the live accounts, CV, three
internal jobs, application, outbox rows and runtime storage artifacts. The restored
database and API smoke test passed with:

```text
total_jobs=993
imported_jobs=974
active_imported_recruiters=433
canonical_companies=433
live_accounts=0
live_outbox=0
flyway=35
```

SMTP inbox delivery remains distinct from the verified application outbox dispatch.
