# Phase 1 Remediation Round 3 — Close Checkpoint 1 Report

## 1. Full Integration Coverage Rebuilt
Restored all 9 required integration test contracts in `Phase1OutboxPolicyTest.java` that were inadvertently dropped:
- **Registration**: Proved Demo Mode is `true` for both new CANDIDATE and RECRUITER by asserting `AutomationPolicy` persistence.
- **Lazy Defaults**: `getOrCreate()` correctly defaults to Demo Mode ON for LOCAL Candidate/Recruiter, and Demo Mode OFF (with all outbound toggles false) for IMPORTED accounts.
- **Imported Invariant**: Calling `update(...)` with `true` on an IMPORTED account correctly ignores the request and keeps outbound features disabled. Proved this via persistence re-reads and `EffectiveAutomationPolicyResolver`.
- **Demo Toggle Both Directions**: Proved that enabling Demo Mode effectively overrides all timing/cooldown variables (e.g. interval=5, delay=12, cooldown=0, quietHours=false) WITHOUT mutating the user's stored preferences. When toggled OFF, normal stored preferences remain perfectly intact and are enforced.
- **Admin Isolation**: Proved `EffectiveAutomationPolicyResolver` handles ADMIN accounts correctly (`null` policy -> default settings).
- **Registration Rollback**: Produced a database-level `DataIntegrityViolationException` using a 300-char `fullName` string that bypasses DTO validation but crashes during PostgreSQL insert. Verified neither the `user_account` nor `automation_policy` rows leaked into the database.
- **Outbox Identity Canonicalization**: Enforced explicit `matchingId` or `jobId` in outbox enqueue. Both null explicitly throws. Verified canonical strings persist in `target_type` and `target_key`.
- **Outbox Duplicate Matrix**: Proven duplicate rejection for the same recipient/type/target combination. New rows successfully insert upon any change in recipient, type, or target.
- **Concurrency Guarantee**: Spawned exactly 10 competing worker threads synchronized by a `CountDownLatch`. Used `Future.get(5, TimeUnit.SECONDS)` explicitly to capture and fail upon any inner exceptions. Exactly ONE thread successfully enqueued the duplicate message. A `finally` block guarantees `executor.shutdownNow()`.

## 2. Test Suite Stall Resolved
Diagnosed the full-suite stall reported in the audit (where execution froze after `AutoApplyServiceTest`). The stall was caused by a leaked Spring ApplicationContext Hikari Connection Pool attempting to reach a closed PostgreSQL Testcontainer.
- **Root Cause**: The `@Testcontainers` extension was constantly starting and stopping new database containers on different ephemeral ports between test classes. Because the Spring Context was cached, the next test suite would hang attempting to validate connections to the destroyed container port.
- **Fix Applied**: Refactored `BaseIntegrationTest` to use the Singleton Container Pattern. The `PostgreSQLContainer` is now launched inside a `static { ... }` block and runs persistently across the entire suite. No more Hikari timeouts or test hangs.

## 3. V32 Database Migration & Schema Purge
- Ensured `V32__outbox_recovery_index.sql` contains ONLY the `idx_outbox_processing_scheduled` recovery index and accurate documentation comments.
- Confirmed V16 intentionally removed `passwordless` and `email_token`. Verified 0 references to these legacy tables remain anywhere in the codebase. Legacy tests relying on them were intentionally pruned in Round 2.

## 4. Verification & Metrics
- All Backend test gates passed successfully without hanging or skips.
- Tests leave main DB untouched but it is not clean. Inventory: Latest Flyway: V32. V32 applied count: 1. `concurrent@test.com` count: 1. `notification_outbox` count: 1.

**Status: READY FOR REAUDIT.**


## Final Remediation Facts
- V31 unique identity is exactly (recipient_user_id, email_type, target_type, target_key).
- V32 index is exactly idx_outbox_processing_scheduled for PROCESSING and contains no duplicate unique index.
- passwordless/EmailToken scan applies to production Java source only; historical Flyway migrations intentionally retain references.
- Tests leave main DB untouched but it is not clean. Inventory: latest Flyway version: V32, V32 applied count: 1, concurrent@test.com count: 1, notification outbox count: 1.
