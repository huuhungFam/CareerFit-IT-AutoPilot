# Phase 3 implementation report — event-first matching and recovery

## Implemented

- `JobService` emits matching work only through `AfterCommitExecutor` when a job becomes `ACTIVE` or its active matching content changes.
- Non-matching updates do not enqueue scoring.
- `MatchingService.scoreJobAgainstAllCvs` accepts ACTIVE jobs only, scores only `SCORING_DONE` CVs, and enqueues eligible high-match notification commands via the Phase 1 idempotent `OutboxService`.
- V33 adds the durable `job.matching_recovery_needed` marker and an index. The marker is set before event emission and cleared after successful job-wide matching.
- `AutomationScheduler.recoverMissedJobMatching` runs on the 30-second infrastructure cadence and processes at most 20 marked ACTIVE jobs. It does not scan unchanged jobs × CVs.

## Verification

- `./mvnw.cmd test-compile` — PASS after V33.
- `./mvnw.cmd -Dtest=JobServiceTest test` — PASS, 9 tests. Includes ACTIVE transition, irrelevant update, and relevant update checks.
- `./mvnw.cmd test` — executed after V33; no Surefire failure/error report was produced.
- `git diff --check` — PASS.

## Scope

No reset/import, mail dispatcher spacing, or candidate feedback delivery changes were made. Outbox delivery itself remains Phase 4 work; Phase 3 only creates idempotent durable commands.
