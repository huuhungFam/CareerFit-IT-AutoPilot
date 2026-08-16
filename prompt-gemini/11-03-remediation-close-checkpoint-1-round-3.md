# Phase 1 remediation round 3 — restore lost contracts and close Checkpoint 1

Continue from the current repository state. This is a **code remediation**, not an audit and not a Phase 2 task.

Read completely before any change:

1. `prompt-gemini/11-default-demo-mode-and-live-two-role-workflow.md`
2. `prompt-gemini/11-02-schema-policy-and-outbox-foundation.md`
3. `prompt-gemini/11-03-checkpoint-schema-policy-outbox.md`
4. `prompt-gemini/11-03-checkpoint-schema-policy-outbox-report.md` (latest independent FAIL audit; source of truth)
5. `prompt-gemini/11-03-remediation-close-checkpoint-1-round-2.md`
6. the three existing Phase 1 implementation/remediation reports.

## Non-negotiable rules

- Work only on Phase 1 files and their direct dependencies. Do not start Phase 2+, UI, scheduler/dispatcher, reset, imports, or main DB cleanup.
- Do not edit `11-03-checkpoint-schema-policy-outbox-report.md`; it is an independent audit record.
- Do not modify V1–V31. Keep the already-correct V32 recovery index as the next migration; do not recreate `email_token` or passwordless runtime code.
- Do not use `git checkout`, `git reset`, test exclusions, disabled tests, broad refactors, or swallowed worker exceptions.
- Do not replace a comprehensive test with a smaller/factory-only test. Preserve every meaningful existing assertion and add coverage where needed.
- Use `BaseIntegrationTest` plus real PostgreSQL Testcontainers for persistence/concurrency tests. Never mutate the shared main `careerfit` database.

## Goal

Close every P0 in the latest checkpoint report. The previous remediation reduced `Phase1OutboxPolicyTest` from 15 to 10 tests and falsely reported success. Restore complete, meaningful Phase 1 evidence, make the entire backend regression finish cleanly, and write only truthful reports based on final commands.

## Required code and test work

### A. Rebuild complete Phase 1 integration coverage

In `Backend/careerfit-backend/src/test/java/com/careerfit/backend/automation/Phase1OutboxPolicyTest.java`, retain current valid coverage and add/restore the following. Tests must use unique fixture emails/UUIDs, observe actual persisted rows, and not rely solely on Java factory objects.

1. Registration: Candidate and Recruiter registration each immediately creates exactly one persisted policy with Demo Mode ON. Prove via repository/SQL without calling `getOrCreate` as the proof step.
2. Lazy defaults: prove persisted lazy `getOrCreate` policy defaults for LOCAL Candidate **and** LOCAL Recruiter (Demo ON, exactly one policy row), plus IMPORTED account (Demo OFF and outbound-disabled).
3. Imported invariant: create an IMPORTED account, attempt to enable every relevant automation/email toggle through the real update path, re-read persistence, and prove Demo OFF plus all outbound flags remain false. Also prove resolver-effective outbound values are disabled where exposed.
4. Demo toggle both directions: begin Demo OFF with deliberately non-default normal stored values. Include email preference, cooldown, quiet-hour enabled/start/end, and at least one additional resolver-exposed normal preference. Toggle only the Demo field ON, prove effective `5/12/30/30`, cooldown 0 and quiet hours disabled while stored normal fields did not change. Toggle only Demo OFF, re-read stored row, and prove every captured normal value is unchanged and effective values return to normal stored behavior. Do not resend all preferences to mask overwrites.
5. Exact policy behavior: cover all Demo timing values, including recovery cadence `30`, and equivalent normal off values. Admin remains without a Demo policy/behavior as designed.
6. Registration rollback: use a valid registration request that reaches the transactional persistence path and produces a real database failure. Assert intended exception explicitly, then prove no `user_account`, role profile, or `automation_policy` row remains for the fixture. Do not silently catch errors.
7. Outbox identity: `matchingId` wins when present; `jobId` is used only when matchingId is null; both null throws. Assert `target_type` and `target_key` in the actual outbox table.
8. Outbox duplicate matrix: same recipient/type/target produces false/no second row; changing recipient, email type, or canonical target produces independent rows. Assert row counts in DB.
9. Concurrency: exactly 10 competing producers, synchronized start, every submitted task represented by a `Future`, every `Future.get` has a timeout and surfaces errors, executor shuts down in `finally`, exactly one boolean winner, and exact DB count is one for the full canonical identity. Never `catch` and ignore worker exceptions.

Do not remove any pre-existing meaningful Phase 1 tests. A larger test count is not itself enough; every above contract must be explicit and useful.

### B. Diagnose and fix the full-suite stall

The independent audit’s `mvnw test` stopped progressing after `AutoApplyServiceTest`. Reproduce it from the current state; identify the exact test/process/resource that stalls. Fix only the cause inside task scope or an indispensable direct dependency. Do not solve it by skipping/excluding tests, weakening timeouts, or killing the test from inside the suite.

The full backend command must return a normal Maven exit code 0. If it takes longer than expected, preserve diagnostic evidence (Surefire report/dump/thread stack and test name) and fix the actual leak/hang before rerunning.

### C. Keep verified migration/passwordless state correct

- V32 must contain only the useful `PROCESSING` recovery index, with accurate comments; do not add a duplicate unique index because V31 `uq_notification_outbox` is the dedup contract.
- Java production source must have no stale `passwordless` or `EmailToken` references. Do not count historical migrations as runtime source.

### D. Evidence/reporting after, never before, all gates pass

Update only after final successful commands:

- `prompt-gemini/11-02-schema-policy-and-outbox-foundation-report.md`
- `prompt-gemini/11-02-remediation-close-checkpoint-1-report.md`

Create `prompt-gemini/11-03-remediation-close-checkpoint-1-round-3-report.md`.

All reports must have exact current facts: V31 uniqueness is `(recipient_user_id, email_type, target_type, target_key)`; V32 index is `idx_outbox_processing_scheduled`; actual test names/counts; commands truly run; and honest main DB read-only inventory. Do not claim 89/98/other totals without the output from this exact final state.

## Verification order and stopping rule

From `Backend/careerfit-backend`, run:

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

Also perform only a read-only main DB inventory; no reset/import/migration there.

If any verification fails or hangs, fix the real cause, rerun that command and every downstream command. Stop only after all commands return success and the new report contains exact evidence. Do not start Phase 2. Then report `READY_FOR_REAUDIT`.
