# Phase 1 remediation round 2 — close Checkpoint 1 completely

Continue from the current repository state. Read these files completely before changing anything:

1. `prompt-gemini/11-default-demo-mode-and-live-two-role-workflow.md`
2. `prompt-gemini/11-02-schema-policy-and-outbox-foundation.md`
3. `prompt-gemini/11-03-checkpoint-schema-policy-outbox.md`
4. `prompt-gemini/11-03-checkpoint-schema-policy-outbox-report.md`
5. `prompt-gemini/11-02-schema-policy-and-outbox-foundation-report.md`
6. `prompt-gemini/11-02-remediation-close-checkpoint-1-report.md`

Inspect only the files relevant to this remediation and their direct dependencies. Reuse existing project patterns. Do not perform unrelated refactors, do not touch Phase 2+ features, do not reset any database, do not change V1–V31, do not use `git checkout`, `git reset`, or test exclusions/skips.

## Objective

Resolve every P0 in the latest independent checkpoint report so Phase 1 can be audited again. Implement completely, run the targeted tests first, fix every failure, then run the required checkpoint gates. Stop only after all acceptance criteria below pass and create an honest new implementation report.

## Required implementation

### 1. Bring Phase 1 evidence into exact agreement with the repository

Update both of these reports rather than preserving stale claims:

- `prompt-gemini/11-02-schema-policy-and-outbox-foundation-report.md`
- `prompt-gemini/11-02-remediation-close-checkpoint-1-report.md`

They must describe only the current final code. Explicitly correct all obsolete claims about:

- `V32__restore_email_token_and_recovery_index.sql` (the actual migration is `V32__outbox_recovery_index.sql`);
- recreating `email_token` (do not recreate it; V16 intentionally removed passwordless);
- `OutboxTargetIdentity` (it no longer exists; `OutboxService.enqueue(...)` is the canonical API boundary);
- V32 filtering `PENDING` (current recovery index is for `PROCESSING`);
- the old count of 89 tests (record actual commands/results only after they pass).

Include exact changed files, V31/V32 schema/constraint/index evidence, exact test commands and output summaries, and the read-only main-DB inventory. State clearly that main DB remains a polluted pre-reset database: latest Flyway 31, V32 applied 0, `concurrent@test.com` count 1, outbox count 1, unless a new read-only query proves different. Do not claim baseline clean and do not alter this DB.

### 2. Correct V32 hygiene without changing historical migrations

Inspect:

- `Backend/careerfit-backend/src/main/resources/db/migration/V31__demo_mode_and_outbox.sql`
- `Backend/careerfit-backend/src/main/resources/db/migration/V32__outbox_recovery_index.sql`
- `NotificationOutbox.OutboxStatus`

Keep V32 as the next migration number and do not edit V1–V31. `PROCESSING` is an actual mapped status, so a partial recovery index for it is valid. Correct V32’s comment so it accurately says what the index serves.

`uq_outbox_recipient_type_target` duplicates V31 constraint `uq_notification_outbox` over the same four columns. Remove that redundant V32 unique index; V31’s constraint is the database-enforced deduplication contract. Preserve the useful recovery index. Verify Flyway applies V1–V32 from a fresh Testcontainers database.

### 3. Remove the last stale passwordless documentation

Do not restore passwordless endpoints, entities, repositories, tables, columns, or tests. Update these comments/docs to describe the real password/JWT flow:

- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/auth/entity/UserAccount.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/config/OpenApiConfig.java`

Afterward, `rg -n "passwordless|EmailToken" Backend/careerfit-backend/src/main/java` may only find intentional historical migration references outside Java source; there must be no stale runtime Java reference.

### 4. Complete meaningful Phase 1 integration coverage

Extend `Backend/careerfit-backend/src/test/java/com/careerfit/backend/automation/Phase1OutboxPolicyTest.java`. Keep it based on `BaseIntegrationTest` and real PostgreSQL Testcontainers; do not replace persistence/concurrency testing with mocks.

Add or strengthen these assertions:

1. **Lazy LOCAL Recruiter:** create a LOCAL Recruiter with no policy, call the supported lazy-policy path, and prove exactly one persisted policy exists with Demo Mode ON. Retain the equivalent LOCAL Candidate assertion. Imported lazy policy remains Demo OFF with outbound automation disabled.
2. **Toggle preservation, both directions:** start with Demo OFF and deliberately non-default stored normal values (at minimum email preference, cooldown, quiet-hours state/times, and another stored preference exposed by the resolver). Capture the stored values. Turn Demo ON and assert effective `5/12/30/30`, cooldown `0`, quiet-hours disabled while stored values remain unchanged. Then turn Demo OFF through the real update/service path and assert the same stored values remain and effective values again equal those normal stored values. Do not merely inspect one email boolean.
3. **Registration rollback proof:** use a unique fixture email. Trigger a registration failure and prove directly that no user row, no role profile row (candidate/recruiter as applicable), and no automation policy row remain for that email. If an invalid role fails before persistence, also introduce a controlled failure after registration has entered its transaction or use a valid request that violates a real transactional constraint; the test must demonstrate atomic rollback, not only a pre-validation rejection. Do not swallow unexpected exceptions—assert the intended exception type/message.
4. Preserve and keep passing all prior meaningful tests: immediate Candidate and Recruiter registration policy rows (without calling `getOrCreate` for proof), imported invariants across all stored outbound toggles, exact Demo timing, Admin unaffected, matching-id priority/job-id fallback/null rejection, 10-thread concurrency with every future observed and exactly one DB row, and duplicate identity matrix.

Make test fixtures deterministic and isolated. Do not connect to or mutate the shared `careerfit` main database.

## Required verification, in this order

From `Backend/careerfit-backend`:

```powershell
.\mvnw.cmd test-compile
.\mvnw.cmd '-Dtest=Phase1OutboxPolicyTest,AuthServiceTest' test
.\mvnw.cmd test
```

Then from repository root:

```powershell
rg -n "passwordless|EmailToken" Backend/careerfit-backend/src/main/java
git diff --check
```

Perform a read-only main DB inventory only. Do not run reset/import/cleanup scripts and do not apply V32 to the main DB.

If any command fails, diagnose and fix only code within this Phase 1 scope, then rerun the failed command and every downstream gate. Do not stop at partial success.

## Deliverable and stopping rule

Create `prompt-gemini/11-03-remediation-close-checkpoint-1-round-2-report.md` containing:

- each acceptance condition mapped to source/test evidence;
- exact migration V32 final SQL and explanation of why no duplicate unique index remains;
- exact commands, pass/fail counts, and confirmation tests used Testcontainers;
- output summary of the stale-passwordless scan;
- read-only main DB inventory and explicit statement it was not modified;
- changed-file list and remaining risks (if any).

Do not edit `11-03-checkpoint-schema-policy-outbox-report.md`: it is the independent audit record. Do not begin Phase 2. Stop only after the required verification commands all pass and the new report is complete.
