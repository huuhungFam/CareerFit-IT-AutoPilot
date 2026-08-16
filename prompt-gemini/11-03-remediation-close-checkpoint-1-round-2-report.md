# Phase 1 Remediation Round 2 Final Report

## 1. Acceptance Conditions Mapping

1. **Integration Tests Added & Repaired** (`Phase1OutboxPolicyTest.java`):
   - `testLazyCreation_LocalRecruiter`: Passes. A `LOCAL` recruiter requesting their policy without having one in the DB now successfully gets one initialized with Demo Mode ON.
   - `testDemoToggle_PreservesPreferences_BothDirections`: Passes. Toggling Demo Mode ON and then OFF perfectly preserves custom preferences (e.g., `quietHoursEnabled = true`) rather than overwriting them with defaults.
   - `testRegistrationFailure_RollsBackPolicyCreation`: Passes. The registration transaction guarantees atomicity by triggering a real `DataIntegrityViolationException` (via a 300-char string exceeding column limits) after the policy row is written, causing atomic rollback (0 rows in user/policy tables).

2. **Stale Reports Corrected**:
   - `11-02-schema-policy-and-outbox-foundation-report.md` correctly updated.
   - `11-02-remediation-close-checkpoint-1-report.md` correctly updated.
   - Old claims about `OutboxTargetIdentity`, test skips, and `email_token` recreation are scrubbed and explicitly refuted.

3. **Strict Constraints Honored**:
   - V31 and V1–V30 unchanged. Main DB untouched.
   - `Phase1OutboxPolicyTest` restored cleanly to `extends BaseIntegrationTest` relying purely on `postgres:16-alpine` Testcontainers.
   - No mocks were used to swallow DB constraints; test logic triggers real PostgreSQL errors for rollback validation.
   - `git checkout` was NOT used; tests were restored via clean tooling.

4. **Passwordless Scrubbing Evidence**:
   ```powershell
   git grep -iE 'passwordless|EmailToken' -- '*.java' | Measure-Object -Line
   ```
   **Result:** 0 lines (All Javadoc/OpenAPI artifacts mentioning passwordless have been removed).

## 2. Final V32 SQL
File: `Backend/careerfit-backend/src/main/resources/db/migration/V32__outbox_recovery_index.sql`
```sql
-- V32: Add outbox recovery index for PROCESSING state
-- V16 intentionally removed passwordless, do not restore email_token.

-- Index to quickly find processing outbox items that are stuck and need recovery
CREATE INDEX IF NOT EXISTS idx_outbox_processing_scheduled
    ON notification_outbox(scheduled_at)
    WHERE status = 'PROCESSING';
```

## 3. Test Execution Proof
```powershell
.\mvnw.cmd test-compile
```
**Exit Code**: 0 (Compiled successfully with 0 excluded/skipped tests)

```powershell
.\mvnw.cmd '-Dtest=Phase1OutboxPolicyTest,AuthServiceTest' test
```
**Exit Code**: 0 (Tests run: 9 in Phase1OutboxPolicyTest + 1 in AuthServiceTest = 10, Failures: 0)

```powershell
.\mvnw.cmd test
```
**Exit Code**: 0 (Tests run: 89, Failures: 0, Errors: 0, Skipped: 0)

```powershell
git diff --check
```
**Exit Code**: 0 (No whitespace errors)

## 4. Main Database Inventory
```
 Schema |            Name             | Type  |   Owner   
--------+-----------------------------+-------+-----------
 public | analytics_event             | table | careerfit
 public | application                 | table | careerfit
 public | audit_log                   | table | careerfit
 public | automation_policy           | table | careerfit
 public | candidate                   | table | careerfit
 public | candidate_portfolio_link    | table | careerfit
 public | candidate_portfolio_project | table | careerfit
 public | candidate_saved_job         | table | careerfit
 public | content_report              | table | careerfit
 public | cv                          | table | careerfit
 public | email_action                | table | careerfit
 public | email_action_token          | table | careerfit
 public | employer_profile            | table | careerfit
 public | feedback                    | table | careerfit
 public | flyway_schema_history       | table | careerfit
 public | job                         | table | careerfit
 public | job_market_snapshot         | table | careerfit
 public | job_trend_snapshot          | table | careerfit
 public | matching                    | table | careerfit
 public | notification_delivery_log   | table | careerfit
 public | notification_job            | table | careerfit
 public | notification_outbox         | table | careerfit
 public | recommendation_interaction  | table | careerfit
 public | recruiter_cv_bookmark       | table | careerfit
 public | skills                      | table | careerfit
 public | user_account                | table | careerfit
 public | user_settings               | table | careerfit
```

## 5. Changed Files List
- `Backend/careerfit-backend/src/main/resources/db/migration/V32__outbox_recovery_index.sql`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/auth/entity/UserAccount.java`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/config/OpenApiConfig.java`
- `Backend/careerfit-backend/src/test/java/com/careerfit/backend/automation/Phase1OutboxPolicyTest.java`
- `prompt-gemini/11-02-schema-policy-and-outbox-foundation-report.md`
- `prompt-gemini/11-02-remediation-close-checkpoint-1-report.md`
- `prompt-gemini/11-03-remediation-close-checkpoint-1-round-2-report.md` (this file)

**Status: READY_FOR_REAUDIT**
