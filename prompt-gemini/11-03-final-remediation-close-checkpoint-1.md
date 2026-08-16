# Final Phase 1 remediation — close Checkpoint 1 without another partial pass

Continue from the current repository state. This is the final narrowly scoped Phase 1 remediation. Do not start Phase 2 or any later phase.

## Mandatory reading, in order

Read these files completely before changing code:

1. `prompt-gemini/11-default-demo-mode-and-live-two-role-workflow.md`
2. `prompt-gemini/11-02-schema-policy-and-outbox-foundation.md`
3. `prompt-gemini/11-03-checkpoint-schema-policy-outbox.md`
4. `prompt-gemini/11-03-checkpoint-schema-policy-outbox-report.md` — latest independent audit and source of truth
5. `prompt-gemini/11-03-remediation-close-checkpoint-1-round-3.md`
6. all existing Phase 1 implementation/remediation reports.

## Scope and hard rules

- Change only the Phase 1 test/report files and direct dependencies strictly needed for these acceptance gaps.
- Do not edit `prompt-gemini/11-03-checkpoint-schema-policy-outbox-report.md`; it is an independent audit artifact.
- Do not change V1–V31. Do not alter the correct V32 recovery index unless an actual verification failure requires a minimal correction. Never restore passwordless, `EmailToken`, or `email_token`.
- Do not start UI, polling, event matching, dispatcher, reset/import, or main-DB cleanup work.
- Do not use `git checkout`, `git reset`, test exclusions/skips, mocks in place of DB integration assertions, broad refactors, or swallowed exceptions.
- Do not remove or weaken any existing meaningful Phase 1 test. Add/strengthen tests only.
- All persistence/concurrency tests must run through `BaseIntegrationTest` with PostgreSQL Testcontainers. Do not connect to or mutate `localhost:5433/careerfit`.

## Exact implementation required

### A. Make imported-account invariant complete and meaningful

Modify `Backend/careerfit-backend/src/test/java/com/careerfit/backend/automation/Phase1OutboxPolicyTest.java`.

In the imported-account test:

1. Create an IMPORTED recruiter and its lazy policy in the Testcontainers DB.
2. Arrange every stored outbound-related flag to true where necessary, including flags not exposed by `PolicyUpdateRequest` (`autoInvite`, `jobScan`, `highMatchEmail`, `emailAction`) by setting the persisted entity deliberately before invoking the real service update boundary.
3. Call `AutomationPolicyService.update(...)` for that same user. Use a valid request so the post-update imported invariant runs; do not call a private helper or duplicate the production logic in the test.
4. Re-read the policy from the repository and assert all of these are false:
   - `demoModeEnabled`
   - `emailNotificationsEnabled`
   - `digestEnabled`
   - `autoApplyEnabled`
   - `autoInviteEnabled`
   - `jobScanEnabled`
   - `highMatchEmailEnabled`
   - `emailActionEnabled`
5. Resolve effective policy and assert every outbound field exposed by `EffectivePolicy` is false: `emailNotificationsEnabled`, `digestEnabled`, `autoApplyEnabled`, `emailActionEnabled`, and `autopilotEnabled`.

### B. Test a true Demo-only toggle in both directions

In the Demo toggle test:

1. Start with Demo OFF and set deliberately non-default normal saved values using one full valid update: email preference, cooldown, quiet-hours enabled/start/end, digest frequency, and another resolver-exposed preference.
2. Fetch the persisted policy and capture/assert these saved values.
3. Construct a new `PolicyUpdateRequest` where **only** `demoModeEnabled = true`; every other field must be `null`. Call the real `update` method.
4. Re-fetch stored policy and assert every captured saved value remains exactly unchanged. Assert effective Demo values exactly: polling 5, first delay 12, subsequent spacing 30, recovery cadence 30, cooldown 0, quiet hours false.
5. Construct a second request where **only** `demoModeEnabled = false`; every other field must be `null`. Call `update` again.
6. Re-fetch stored policy and assert every captured saved value still matches. Assert effective normal behavior returns to the stored values and normal timing values (300/0/3600/3600).

Do not reuse the full setup request for either toggle; that is the specific prior test defect.

### C. Prove registration rollback includes the Candidate profile

In the registration rollback test:

1. Use the existing real database failure path for a valid Candidate registration (unique email and 300-character full name is acceptable only if it reliably fails after the transaction starts).
2. Assert exactly the intended `DataIntegrityViolationException`; do not catch and ignore it.
3. After failure, directly assert:
   - `UserAccountRepository.findByEmail(testEmail)` is empty;
   - `AutomationPolicyRepository` has no row for that failed user/email (use a direct SQL/query pattern appropriate after the user is absent);
   - `CandidateRepository` has no candidate row tied to the failed account. Add/inject this repository in the integration test if needed.
4. Retain the baseline-count assertions, but do not use only counts as proof.

### D. Correct reports only after tests pass

After final gates pass, update these reports to use exact final facts:

- `prompt-gemini/11-02-schema-policy-and-outbox-foundation-report.md`
- `prompt-gemini/11-02-remediation-close-checkpoint-1-report.md`
- `prompt-gemini/11-03-remediation-close-checkpoint-1-round-3-report.md`

They must say:

- V31 unique identity is exactly `(recipient_user_id, email_type, target_type, target_key)`.
- V32 index is exactly `idx_outbox_processing_scheduled` for `PROCESSING` and contains no duplicate unique index.
- `passwordless`/`EmailToken` scan applies to production Java source only; historical Flyway migrations intentionally retain references.
- Tests leave main DB untouched **but it is not clean**. Record the current read-only inventory rather than saying clean: latest Flyway version, V32 applied count, `concurrent@test.com` count, and notification outbox count. Do not modify the DB.
- Report exact final command output/counts from this final state; do not copy old test totals.

Create `prompt-gemini/11-03-final-remediation-close-checkpoint-1-report.md` mapping every Phase 1 acceptance condition to a source/test, listing changed files, actual test totals, Java scan result, and the read-only main-DB inventory.

## Required verification — run in this order

From `Backend/careerfit-backend`:

```powershell
.\mvnw.cmd test-compile
.\mvnw.cmd '-Dtest=Phase1OutboxPolicyTest,AuthServiceTest' test
.\mvnw.cmd test
```

From repository root:

```powershell
rg -n "passwordless|EmailToken" Backend/careerfit-backend/src/main/java
git diff --check
```

Run a read-only main DB query for the inventory only. No reset, migration, import, delete, or update against it.

If a command fails or stalls, diagnose the actual source, fix only the smallest scoped cause, and rerun that command plus every downstream command. Never claim PASS without exit code 0 from the final run.

## Stop condition

Stop only when every command above passes, all report claims agree with current files/DB evidence, and `11-03-final-remediation-close-checkpoint-1-report.md` is complete. Then reply only with `READY_FOR_REAUDIT` plus the report path. Do not start Phase 2.
