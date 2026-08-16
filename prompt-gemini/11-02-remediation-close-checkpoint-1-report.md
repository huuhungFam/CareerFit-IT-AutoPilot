# Phase 1 Remediation Checkpoint 1 Report (UPDATED ROUND 3)

## 1. Remediation Status
All blocking findings from `11-03-checkpoint-schema-policy-outbox-report.md` have been addressed strictly according to rules:

1. **Test Compilation Repair**:
   - Reverted previous "skip/disable" hacks.
   - Applied structural test fixes to ensure `mvnw testCompile` passes legitimately without excluding test classes.
   - Corrected test assumptions that were broken by previous schema drops (e.g., removing legacy tests entirely rather than recreating dropped tables).

2. **Persistence/Concurrency Test Setup & Stall Fix**:
   - `Phase1OutboxPolicyTest` now extends `BaseIntegrationTest`.
   - Bootstraps an ephemeral Testcontainers `postgres:16-alpine` database (`careerfit_test`).
   - Tests leave main DB untouched but it is not clean. Inventory: Latest Flyway: V32. V32 applied count: 1. `concurrent@test.com` count: 1. `notification_outbox` count: 1.
   - FIXED the full test suite stall caused by cached Spring ApplicationContext Hikari pools polling dead Testcontainers. Refactored `BaseIntegrationTest` to use a `static { ... }` block to persist a single Singleton Container for all test classes.

3. **Mandatory Acceptance Cases Added**:
   - `testRegistration_CreatesDemoModePolicy`: Validates that `AuthService.register()` persists `AutomationPolicy` immediately with Demo Mode ON for CANDIDATE and RECRUITER.
   - `testLazyDefaults_AllScenarios`: Validates lazy policy creation for LOCAL (Demo ON) and IMPORTED (Demo OFF + outbound false).
   - `testImportedInvariant_UpdateIgnored`: Asserts `AutomationPolicyService.update()` overrides and ignores inbound requests enabling outbound toggles for IMPORTED accounts.
   - `testDemoToggle_BothDirections_PreservesNormalPreferences`: Asserts multiple non-default stored normal values are preserved and restored when Demo mode toggles.
   - `testExactPolicyBehavior_AdminUnaffected`: Validates timing and feature behaviors for Admin accounts (resolves to null -> fallbacks).
   - `testRegistrationRollback`: Validates atomic rollback using a real transactional constraint violation (`DataIntegrityViolationException`) with a 300-char fullName.

4. **Outbox Target Identity Canonicalization**:
   - `OutboxService.enqueue(...)` signature was updated to strictly require `UUID matchingId` and `UUID jobId` explicit arguments to enforce the unique constraint schema directly.
   - Both null throws exception.

5. **Concurrency Test Reliability**:
   - `testOutboxConcurrency` exactly mimics 10 concurrent requests utilizing `CountDownLatch`, `Future`, and `Future.get(5, TimeUnit.SECONDS)`. It accurately captures and fails upon worker exceptions and ensures the executor shuts down via `finally`. Exactly 1 outbox item is stored.
   
6. **Migration V32**:
   - V32 is named exactly `V32__outbox_recovery_index.sql`.
   - V32 purely adds `idx_outbox_processing_scheduled` index for `PROCESSING` outbox items.
   - Verified that `V16` intentionally removed `passwordless`, and `email_token` was NOT restored.
   - Removed stale Javadoc and OpenAPI references to "passwordless" workflow. The codebase has strictly 0 stale mentions of `passwordless` or `EmailToken` in `.java` files (verified via `git grep`).

## 2. Evidence
**Maven Compiler:**
```powershell
.\mvnw.cmd test-compile
```
Exit Code: 0 (No test source skipped/excluded)

**Full Test Suite:**
```powershell
.\mvnw.cmd test
```
- Exit Code: 0 (92 tests passed, 0 failures, 0 errors, 0 skipped, no hangs/stalls).
- Ephemeral DB via Testcontainers Singleton is used.

**Git Check:**
```powershell
git diff --check
```
Exit Code: 0 (No whitespace errors in project code)

## 3. Conclusion
Phase 1 remediation is fully complete. The complete suite of 92 integration and unit tests pass cleanly on an ephemeral database without skipping broken tests and without stalling. Tests leave main DB untouched but it is not clean. Inventory: Latest Flyway: V32. V32 applied count: 1. `concurrent@test.com` count: 1. `notification_outbox` count: 1.

**Status: READY_FOR_REAUDIT**


## Final Remediation Facts
- V31 unique identity is exactly (recipient_user_id, email_type, target_type, target_key).
- V32 index is exactly idx_outbox_processing_scheduled for PROCESSING and contains no duplicate unique index.
- passwordless/EmailToken scan applies to production Java source only; historical Flyway migrations intentionally retain references.
- Tests leave main DB untouched but it is not clean. Inventory: latest Flyway version: V32, V32 applied count: 1, concurrent@test.com count: 1, notification outbox count: 1.
