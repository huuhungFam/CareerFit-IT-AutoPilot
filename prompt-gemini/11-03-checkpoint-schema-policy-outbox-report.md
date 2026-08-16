# Phase 1 — Checkpoint 1 independent final audit

## VERDICT: PASS

Phase 1 meets its schema, account-source-aware Demo policy, and durable outbox-foundation acceptance conditions. Phase 2 may begin; it must remain a separate implementation task.

## Directly verified acceptance evidence

- V31 adds persisted `demo_mode_enabled`, durable outbox state/timestamps, the DB constraint `uq_notification_outbox (recipient_user_id, email_type, target_type, target_key)`, polling and recipient indexes.
- V32 is additive and contains only `idx_outbox_processing_scheduled` for `PROCESSING`; no duplicate unique index and no passwordless restoration.
- Registration immediately persists Demo Mode ON policy for human Candidate and Recruiter; lazy LOCAL Candidate/Recruiter policies are ON, while IMPORTED policies are Demo OFF and outbound-disabled.
- Imported-invariant integration test deliberately sets all stored outbound switches true, invokes the real update service, and re-reads every stored/effective relevant flag as disabled.
- Demo-only ON/OFF update requests set every non-demo request field to null. The test re-reads normal stored preferences through both transitions and proves the exact 5/12/30/30 overlay, cooldown 0, quiet-hours disabled, followed by normal 300/0/3600/3600 behavior.
- Candidate registration rollback uses a real database constraint violation and verifies no user, policy orphan, Candidate orphan, or count residue.
- Outbox tests verify matching-id priority, job fallback, null rejection, duplicate identity matrix, and 10 competing producers with `Future.get` timeouts and exactly one stored row.
- Java production-source scan has no stale `passwordless` or `EmailToken` reference. Historical Flyway migrations intentionally retain historical references.

## Commands rerun by the independent audit

```powershell
cd Backend/careerfit-backend
.\mvnw.cmd test-compile
# PASS

.\mvnw.cmd '-Dtest=Phase1OutboxPolicyTest,AuthServiceTest' test
# PASS: 10 tests (Phase1 9 + AuthService 1), PostgreSQL Testcontainers, Flyway V1..V32

.\mvnw.cmd test
# PASS: 92 tests, 0 failures, 0 errors, 0 skipped

rg -n "passwordless|EmailToken" Backend/careerfit-backend/src/main/java
# no matches

git diff --check
# PASS: no whitespace errors
```

## Main database status

The shared main DB was inspected read-only during this audit and is not a clean reset baseline: V31 installed at `2026-08-16 00:17:32.87832`; V32 installed at `2026-08-16 10:58:23.482226`; `concurrent@test.com` count is 1 and notification-outbox row count is 1. This does not block Phase 1, but the planned Phase 6 reset must establish the final clean demo baseline. No reset was run in this checkpoint.

## Non-blocking observations

- The worktree includes many unrelated user/earlier-phase changes. They were not reverted or cleaned by this audit.
- Test compilation reports an existing unchecked-operation warning in `AlgorithmEvaluatorTest`; it is not a test failure.
