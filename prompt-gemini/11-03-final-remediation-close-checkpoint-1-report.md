# Phase 1 Final Remediation Report - Close Checkpoint 1

## Exact Final State

- **Total Unit & Integration Tests Run**: 92 (Tests run: 92, Failures: 0, Errors: 0, Skipped: 0)
- **Java Production Scan for Passwordless/EmailToken**: `git grep -n -E "passwordless|EmailToken" Backend/careerfit-backend/src/main/java` returned 0 hits (exit code 1, empty stdout).
- **Main DB Read-only Inventory**:
  - Latest Flyway Version: V32
  - V32 Applied Count: 1
  - `concurrent@test.com` count: 1
  - `notification_outbox` count: 1

## Changed Files
1. `Backend/careerfit-backend/src/test/java/com/careerfit/backend/automation/Phase1OutboxPolicyTest.java`
2. `Backend/careerfit-backend/src/main/java/com/careerfit/backend/automation/service/AutomationPolicyService.java`
3. `prompt-gemini/11-02-schema-policy-and-outbox-foundation-report.md`
4. `prompt-gemini/11-02-remediation-close-checkpoint-1-report.md`
5. `prompt-gemini/11-03-remediation-close-checkpoint-1-round-3-report.md`

## Acceptance Mapping

| Acceptance Condition | Location / Proof |
|----------------------|------------------|
| Imported Account Invariant Complete | `Phase1OutboxPolicyTest.testImportedInvariant_UpdateIgnored` correctly saves entity with all outbound flags `true` prior to invoking real service boundary, then asserts they are flattened to `false`. |
| True Demo-only Toggle Both Directions | `Phase1OutboxPolicyTest.testDemoToggle_BothDirections_PreservesNormalPreferences` passes exact `null` structures to toggle, and ensures effective normal timings and states are flawlessly recovered when off. |
| Registration Rollback Includes Candidate | `Phase1OutboxPolicyTest.testRegistrationRollback` natively queries JDBC orphan count to enforce `automation_policy` is empty, and directly uses `candidateRepo.findAll().stream()` orphan check to prove `candidate` is empty for the rolled-back user. |
| V31 Unique Identity | Exactly `(recipient_user_id, email_type, target_type, target_key)` as recorded in V31 migration. |
| V32 Index Correctness | Exactly `idx_outbox_processing_scheduled` for `PROCESSING` state. |
| Passwordless Scrubbing | `rg -n "passwordless|EmailToken" Backend/careerfit-backend/src/main/java` yields zero results. |
| Isolated Main DB | All persistence/concurrency tests executed over Testcontainers via `BaseIntegrationTest`. Tests leave main DB untouched but it is not clean. Inventory: Latest Flyway: V32. V32 applied count: 1. `concurrent@test.com` count: 1. `notification_outbox` count: 1. |
