# Implementation Plan: Default Demo Mode and Live Candidate–Recruiter Workflow

## 1. Objective

Implement a reliable, repeatable thesis-defense demo workflow for CareerFit in which:

- the existing local database and full seeded/imported job corpus are preserved;
- the application uses one shared `careerfit` database, not a separate demo database or schema;
- Demo Mode is enabled by default for newly registered Candidate and Recruiter accounts;
- a Candidate and a Recruiter can be registered from scratch during the live demo;
- a newly activated job is matched against eligible CVs immediately;
- Candidate job results refresh within approximately five seconds;
- the first eligible job email is delivered after approximately 10–15 seconds;
- subsequent job suggestion emails are spaced by approximately 30 seconds;
- email actions taken by the Candidate notify the owning Recruiter immediately; and
- event-driven processing and fallback schedulers cannot send the same logical email twice.

This is a demo-first requirement for the thesis presentation. Do not introduce a production deployment architecture, a second database, or an unnecessary Company/Recruiter ownership refactor.

## 2. Confirmed Decisions

The following decisions are final unless the user explicitly changes them later.

### 2.1 Database and reset behavior

- Use the existing shared local PostgreSQL database named `careerfit`.
- Do not create a separate demo database, schema, or demo-only Flyway location.
- The canonical reset entry point is exactly:

  ```powershell
  pwsh -NoProfile -File scripts/reset-local-demo-data.ps1 -Force
  ```

- Do not instruct users to run `flyway clean` or `flyway migrate` manually. The reset script owns the complete destructive reset, migration, import, idempotency verification, backend startup, smoke test, and manifest verification sequence.
- Preserve the complete current job corpus. Do not reduce it to 47 or 50 jobs.
- At the time this plan was written, the reset manifest requires:
  - 993 total jobs;
  - 974 imported jobs;
  - 433 active imported recruiters;
  - 433 canonical imported companies;
  - no duplicate imported source identity or external hash; and
  - no imported job/company owner mismatch.
- These manifest values remain authoritative unless the existing seed/import baseline is intentionally changed for an unrelated, approved reason.
- Preserve the existing seeded CV, Candidate, matching, and application fixtures. Do not change the reset semantics to require those tables to be globally empty.
- After a live demo, running the canonical reset command may remove the two newly registered accounts, their CVs, their three new jobs, their matches, applications, email actions, and notification records. This is expected.

### 2.2 Existing quick-login accounts

The three quick-login accounts must remain available after every reset:

| Role | Login | Password |
|---|---|---|
| Candidate | `ca` | `1` |
| Recruiter | `re` | `1` |
| Admin | `ad` | `1` |

They are fallback/test accounts, not the main live-registration scenario. Do not delete, rename, deactivate, or change the credentials of these accounts.

### 2.3 Live demo accounts

The main demo begins by registering these two accounts through the real registration UI/API:

| Role | Email | Password |
|---|---|---|
| Candidate | `hungb2203557@student.ctu.edu.vn` | `12345678` |
| Recruiter | `phamhuuhung216@gmail.com` | `12345678` |

- Do not seed these two accounts in Flyway.
- The reset script must verify that these two emails do not exist after reset.
- Do not bypass normal role creation, profile creation, ownership, or authentication rules merely for the demo.
- If email verification is part of the normal registration flow, keep the real flow intact and verify it in the rehearsal environment.
- Both accounts must automatically receive Demo Mode when their account/policy is created.

### 2.4 Job data and ownership

- Keep all existing imported and seeded jobs and their current owners.
- Imported jobs must not be reassigned to the newly registered demo Recruiter.
- The demo Recruiter creates three new jobs directly and owns only those jobs.
- The final job count after creating the three demo jobs is the reset baseline count plus three. With the current manifest, this is 996.
- Preserve the current account-centric ownership model:

  ```text
  UserAccount(RECRUITER) -> EmployerProfile -> Job.recruiter_id
  ```

- `job.company` remains display/search data. Do not introduce `company`, `company_membership`, or `job.company_id` as part of this task.
- Company-name normalization may improve display and duplicate detection, but it must not delete existing jobs or reduce the baseline count.

### 2.5 Demo Mode UX

- Demo Mode is enabled by default system-wide for newly registered human Candidate and Recruiter accounts.
- Candidate and Recruiter each have their own Demo Mode toggle in Settings.
- Only Settings pages show the Demo Mode banner. Do not add demo banners, badges, or warnings to other pages.
- The rest of the UI must retain its normal appearance.
- When enabled, the Settings UI displays effective timing labels such as:
  - `DEMO - 5 seconds`;
  - `DEMO - 12 seconds`; and
  - `DEMO - 30 seconds`.
- Turning Demo Mode off restores normal effective timing behavior without destroying the user's saved normal preferences.
- Do not repeatedly force the toggle back on after a user has explicitly disabled it. “Default on” means the initial policy value, not an immutable setting.

## 3. Target Timing Policy

Use a hybrid design: infrastructure workers wake on a global cadence, while eligibility, delay, cooldown, quota, and quiet-hour decisions use the recipient's effective policy.

| Action | Normal effective behavior | Demo effective behavior |
|---|---|---|
| Match CVs when a job becomes `ACTIVE` | Immediately after commit | Immediately after commit |
| Candidate job-list polling | Existing normal interval, approximately 1–5 minutes | 5 seconds |
| Recovery scan for missed matching/notifications | 1 hour | 30 seconds |
| First eligible high-match email | Existing batch/cooldown policy | Fixed 12-second delay; acceptable observed range 10–15 seconds |
| Subsequent eligible job suggestions to the same Candidate | Existing schedule | At least 30 seconds after the previous suggestion |
| Candidate email action | Immediate enqueue | Immediate enqueue |
| Recruiter feedback alert | Immediate | Immediate |
| Suggestion cooldown | Existing normal value | 0 hours |
| Quiet hours | User-configurable | Disabled in the effective Demo policy |

Do not implement timing with `Thread.sleep`, blocking scheduled methods, or in-memory-only timers. Delayed mail must survive normal transaction boundaries and application retries.

## 4. Required Architecture

### 4.1 Effective policy instead of destructive preset writes

Extend `automation_policy` with a persisted `demo_mode_enabled` boolean. The default for newly registered human Candidate and Recruiter accounts is `true`.

Do not overwrite the user's normal values when Demo Mode is enabled. Instead, introduce a resolver such as `EffectiveAutomationPolicyResolver` that returns effective values:

- if Demo Mode is off, return the stored normal policy;
- if Demo Mode is on, overlay the approved demo timing, cooldown, and quiet-hour values;
- imported/synthetic accounts continue to have outbound notifications disabled regardless of the default for human registrations; and
- Admin accounts do not need a Demo Mode policy.

This avoids maintaining a fragile “normal policy snapshot” and guarantees that disabling Demo Mode reveals the user's previous normal settings.

### 4.2 Event-first matching

The primary path is:

```text
Recruiter changes a job to ACTIVE
  -> transaction commits
  -> scoreJobAgainstAllCvs(jobId)
  -> Matching rows are inserted or updated
  -> eligible notification commands are enqueued
```

Requirements:

- Emit work only when the job transitions to `ACTIVE`, or when active job content changes in a way that invalidates its vector/matches.
- Do not enqueue duplicate work for an update that does not affect matching.
- Execute matching after the job transaction commits.
- Reuse the existing `AfterCommitExecutor`/matching services instead of creating a second scoring implementation.
- Ensure only CVs in a completed/eligible state, normally `SCORING_DONE`, participate.
- The 30-second scheduler is recovery, not the main delivery path.

### 4.3 Durable notification outbox and database-enforced deduplication

The current delivery-log pre-check is not sufficient because an event handler and scheduler can both pass the check before either records `SENT`.

Add a durable outbox table or extend an existing queue only if it already provides equivalent scheduling and uniqueness. The logical model must contain at least:

```text
id
recipient_user_id
email_type
target_type
target_id or target_key
scheduled_at
status
attempt_count
last_error
sent_at
created_at
updated_at
```

Enforce a database uniqueness rule equivalent to:

```text
recipient_user_id + email_type + target_type + target_id
```

The user's required deduplication identity is:

```text
recipient + jobId/matchingId + emailType
```

Use `matchingId` when the email represents a specific CV/job match. Use `jobId` only when no matching entity exists. Different Candidate feedback actions may include the action type in the target key where the business semantics require one notification per action.

Both the immediate event path and the 30-second recovery scheduler must call the same idempotent `enqueue` operation. A unique constraint or atomic insert-on-conflict must decide the winner. The delivery log remains audit history; it must not be the sole concurrency guard.

### 4.4 Per-recipient email spacing

For Demo Mode job suggestions:

- schedule the first eligible email at approximately `now + 12 seconds`;
- schedule each later suggestion no earlier than 30 seconds after the latest queued/sent suggestion for that recipient;
- use a database transaction and appropriate locking/atomic scheduling so concurrent matching completions cannot assign the same slot; and
- immediate recruiter alerts and security/verification emails must not be delayed behind Candidate job-suggestion spacing.

An example three-email timeline is approximately `T+12s`, `T+42s`, and `T+72s`.

### 4.5 Recovery scheduler

The recovery task runs every 30 seconds at the infrastructure level during this thesis demo configuration. It must:

- find eligible active-job/CV pairs that were missed or left incomplete;
- find eligible matches with no corresponding outbox record;
- call the same idempotent matching/enqueue services used by the event path;
- avoid rescoring every CV against every job on every tick when no work changed; and
- respect normal effective policies for accounts that disabled Demo Mode.

Do not retain the current business-hours hard stop for Demo Mode recipients. Normal-mode quiet hours and business-hour behavior remain available through the effective policy.

## 5. Frontend Changes

### 5.1 Shared Settings component

Create a reusable Demo Mode settings card/banner and render it in both:

- Candidate Settings; and
- Recruiter Settings.

The component must show:

- whether Demo Mode is on;
- a short explanation that background processing and email delivery are accelerated for a live demonstration;
- the effective timing values returned by the backend; and
- a toggle with loading, success, and error states.

Do not duplicate business timing constants in several React components. The backend API should return the effective timing summary. A frontend constant may be used only as a safe display fallback.

### 5.2 Candidate job refresh

- When the authenticated Candidate has Demo Mode enabled, poll the relevant job/matching query every five seconds.
- When Demo Mode is disabled, use the normal interval.
- Add a visible `Refresh`/`Làm mới` button to the Candidate Jobs page.
- The button must call React Query `refetch` or invalidate the relevant query; it must not trigger duplicate scoring directly.
- Show a loading state and the last successful refresh time.
- When matching finishes, invalidate both the job catalog and matching/ranked-job queries as necessary.

### 5.3 Job catalog must not disappear when CV processing fails

The Candidate Jobs page represents the active job catalog. It must not show zero active jobs merely because the Candidate has no completed CV or no matching rows.

- Fetch active jobs independently from Candidate matching.
- Enrich job cards with a score/label when a matching result exists.
- If there is no completed CV, continue showing active jobs and explain that uploading/completing a CV enables personalized scores.
- Keep recommendation-specific pages free to show only matched/ranked results.

This separates job discovery from personalization and prevents the previously observed “0 jobs” state while another seeded Candidate can see jobs.

### 5.4 CV upload state and wording

- Verify DOCX upload reaches `SCORING_DONE` and exposes extracted text, summary, and skills.
- Preserve the existing optimistic-locking fix that reuses the managed entity returned by `saveAndFlush`.
- Add or retain a bounded status poll for `UPLOADED`, `VALIDATING`, and `PROCESSING`.
- A failure must end in `FAILED` with a visible reason; it must not remain in `VALIDATING` forever.
- Provide a safe retry action if the current API supports retry or add a narrowly scoped retry endpoint.
- Replace the hard-coded `PDF uploaded`/`PDF da tai len` wording with `CV file uploaded`/`Tep CV da tai len`, because DOCX is supported.

## 6. Registration and Policy Creation

Update the real registration/account-creation flow so that policy creation is deterministic:

- a newly registered Candidate receives an `AutomationPolicy` with Demo Mode on;
- a newly registered Recruiter receives an `AutomationPolicy` with Demo Mode on;
- the quick-login `ca` and `re` accounts have Demo Mode on after reset, so they remain reliable fallbacks;
- `ad` remains unaffected;
- imported/synthetic recruiters retain all outbound email and automation toggles disabled; and
- lazily created policies use the same account-source-aware defaults as registration-created policies.

Do not rely only on a Java field initializer if database defaults or existing rows could produce a different value. Align migration defaults, entity defaults, service defaults, seed behavior, and tests.

## 7. Three Deterministic Demo Jobs and CV

Prepare reusable English/Vietnamese demo content in documentation or fixtures, but do not insert the three live jobs during reset. The Recruiter must create them through the UI during the presentation.

Target score bands:

| Job | Intended relationship to the demo CV | Target result |
|---|---|---|
| Job 1 | Same role, stack, seniority, and domain | HIGH, preferably 95–100% |
| Job 2 | Closely related full-stack role with partial overlap | POTENTIAL/HIGH, approximately 80–89% |
| Job 3 | Transferable backend/cloud skills with less overlap | POTENTIAL, approximately 65–74% |

Do not hard-code matching IDs, scores, labels, or special-case the two demo emails in the scoring algorithm. Calibrate the CV and JD text against the real scoring implementation. Exact 100% is desirable for presentation but is not more important than preserving algorithm integrity; the mandatory highest-band acceptance is `HIGH >= 90%`.

The unrelated jobs already present in the full corpus should demonstrate that non-relevant jobs receive lower scores and do not generate inappropriate high-match mail.

## 8. Candidate-to-Recruiter Email Interaction

For each eligible match email, preserve or implement the intended one-click Candidate actions, such as high match, potential, or not interested.

When a Candidate clicks an action:

- validate the signed/hashed token and expiry;
- make the action idempotent;
- update the matching feedback exactly once;
- identify the Recruiter through `matching.job.recruiter_id`;
- enqueue a Recruiter notification immediately;
- apply the same database-backed deduplication principle; and
- show a clear browser result page for success, already used, expired, and invalid tokens.

The demo Recruiter must receive feedback only for jobs they own. Do not grant that Recruiter access to applications or feedback for imported jobs.

Outbound non-security mail in the demo environment should be protected by a configurable allowlist that includes the two live demo addresses. Do not hard-code the allowlist inside `MailService`, and never send to synthetic `@careerfit.local` recruiter addresses.

## 9. Internal Versus Imported Jobs

Preserve the following demo semantics:

- the three jobs created by the live Recruiter are internal CareerFit jobs and support the complete Candidate application and Recruiter application-management flow;
- imported jobs remain discovery/matching data owned by their existing imported Recruiters; and
- an examiner request to apply for “any job” should be demonstrated using a CareerFit/internal job owned by the live Recruiter.

If the UI already distinguishes external jobs, retain that behavior. If it currently allows an internal application to an imported job without a responsible interactive Recruiter, add a minimal explicit source/application-mode distinction and route imported jobs to their source URL. Do not solve this by enabling hundreds of imported Recruiter accounts for interactive login.

## 10. Duplicate Job Protection

Add duplicate protection for newly submitted jobs without changing or deleting the baseline job corpus.

### Exact duplicate

Build a stable fingerprint from normalized values such as:

```text
canonical company name
normalized title
normalized location
normalized employment type
normalized full description or its hash
```

- Block exact duplicates for the same Recruiter or canonical company as supported by the current data model.
- Perform the check at final publish/activation, not only while editing a draft.
- Add database support where safe, but do not introduce a uniqueness constraint that fails because of existing imported data.

### Near duplicate

- Warn when title/company/content similarity exceeds a documented threshold.
- Allow the Recruiter to continue after an explicit confirmation.
- Do not hard-block near duplicates because the three demo jobs intentionally share some skills.

Cross-account Company membership is out of scope. Canonical company strings are the best available cross-Recruiter signal under the current schema.

## 11. Reset Script Integration

Do not replace `scripts/reset-local-demo-data.ps1`. Extend its final manifest only where required by the new schema and behavior.

The reset script must continue to prove all existing invariants, including job counts, imported ownership, import idempotency, storage cleanup, backend health, and API smoke tests.

Add checks for:

- the latest Flyway migration version after new migrations are added;
- `ca`, `re`, and `ad` still exist, are active, and retain their roles;
- `ca` and `re` have effective Demo Mode enabled;
- the two live-demo emails do not exist after reset;
- imported accounts still have email and automation disabled;
- the outbox contains no records belonging to deleted live-demo accounts;
- existing baseline fixture counts remain exactly as intentionally seeded; and
- total/imported job counts remain unchanged from the approved baseline.

Do not weaken or remove the script's physical Docker-volume identity and label checks. They protect against deleting the wrong volumes.

## 12. Suggested Implementation Sequence

### Phase 0 — Protect and verify the current baseline

1. Read repository guidance and inspect `git status`.
2. Preserve all unrelated uncommitted changes; do not reset or rewrite the working tree.
3. Run the existing targeted backend/frontend tests that can pass without destructive reset.
4. Rebuild and verify the current DOCX ingestion fix against the actual backend runtime.
5. Confirm the Candidate Jobs page's current data source and reproduce the zero-jobs behavior with a Candidate lacking completed matching.

Exit criterion: current failures are documented and attributable before new behavior is added.

### Phase 1 — Schema and policy model

1. Add the Flyway migration for `demo_mode_enabled` and the durable notification outbox.
2. Add required indexes and the unique deduplication constraint.
3. Update entities, repositories, DTOs, API contracts, and account-source-aware defaults.
4. Implement the effective-policy resolver.
5. Add backend unit and persistence tests.

Exit criterion: Candidate/Recruiter policies can toggle Demo Mode without overwriting normal settings, and concurrent enqueue attempts create one logical outbox item.

### Phase 2 — Settings UI and dynamic polling

1. Add the shared Demo Mode settings card/banner to both roles.
2. Return effective timing metadata from the backend.
3. Switch Candidate polling between five seconds and the normal interval.
4. Add manual Refresh and last-updated state.
5. Correct uploaded-file wording for PDF/DOCX.

Exit criterion: both roles can observe and toggle Demo Mode, while no other route displays a Demo banner.

### Phase 3 — Event-first matching and recovery

1. Normalize ACTIVE-transition detection.
2. Reuse `scoreJobAgainstAllCvs` after commit.
3. Enqueue eligible notifications after matching is committed.
4. Implement the 30-second recovery scan using idempotent services.
5. Fix the active-job catalog so jobs remain visible without matching.

Exit criterion: a newly activated job produces matching promptly and appears for the Candidate within at most two five-second polls.

### Phase 4 — Timed email delivery and feedback

1. Implement the outbox dispatcher.
2. Implement the 12-second first slot and 30-second per-recipient spacing.
3. Route all matching email producers through the outbox.
4. Route Candidate email feedback to an immediate Recruiter outbox item.
5. Preserve token security, recipient preferences, quotas where applicable, and delivery audit logs.

Exit criterion: event and scheduler races produce exactly one email, and the live timing falls within the accepted windows.

### Phase 5 — Duplicate protection and internal application flow

1. Add exact duplicate detection for newly activated jobs.
2. Add near-duplicate warning/confirmation.
3. Verify internal versus imported application behavior.
4. Verify Recruiter ownership on application and feedback views.

Exit criterion: exact duplicate live postings are blocked, near duplicates can be confirmed, and the Recruiter sees only activity for owned jobs.

### Phase 6 — Reset, end-to-end proof, and demo runbook

1. Update reset-script assertions without changing the canonical command.
2. Run the destructive reset only when it is safe and explicitly intended.
3. Register the two live accounts through the real flow.
4. Upload the calibrated DOCX CV and wait for `SCORING_DONE`.
5. Create and activate the three calibrated jobs.
6. Record matching times, UI refresh times, mail times, deduplication evidence, email-action results, and Recruiter application visibility.
7. Write a concise operator runbook for the thesis presentation and a fallback using `ca`/`re`.

Exit criterion: the complete scenario is repeatable from the canonical reset command.

## 13. Likely Code Areas

Inspect actual code and conventions before editing. Expected areas include, but are not limited to:

### Backend

- `Backend/careerfit-backend/src/main/resources/db/migration/`
- `Backend/careerfit-backend/src/main/resources/application.yml`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/auth/`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/automation/`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/job/`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/cv/`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/matching/`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/notification/`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/scheduler/`
- `Backend/careerfit-backend/src/main/java/com/careerfit/backend/settings/`

### Frontend

- `Frontend/src/App.tsx`
- `Frontend/src/api.ts`
- `Frontend/src/types.ts`
- `Frontend/src/components/AutomationPolicyPanel.tsx`
- `Frontend/src/i18n/LanguageProvider.tsx`
- relevant CSS and Playwright specifications

### Operations and documentation

- `scripts/reset-local-demo-data.ps1`
- `scripts/test-api-smoke.mjs`
- `scripts/test-integration.mjs`
- a new thesis demo runbook under the repository's existing documentation structure

## 14. Required Tests

### Backend unit/integration tests

- default Demo Mode for newly registered Candidate;
- default Demo Mode for newly registered Recruiter;
- imported-account automation remains disabled;
- toggling Demo Mode preserves stored normal settings;
- effective timing resolution for on/off states;
- matching fires after an ACTIVE transition;
- irrelevant updates do not create duplicate matching jobs;
- atomic outbox deduplication under two competing producers;
- first and subsequent email-slot calculation;
- quiet hours and cooldown overridden only by effective Demo policy;
- Candidate feedback idempotency and correct Recruiter ownership;
- DOCX ingestion reaches `SCORING_DONE` or a visible `FAILED` state;
- exact/near duplicate job behavior.

### Frontend tests

- Candidate Settings banner/toggle;
- Recruiter Settings banner/toggle;
- no Demo banner outside Settings;
- five-second polling only when Demo Mode is on;
- manual Refresh invokes the correct query refresh;
- active jobs display without a completed CV;
- matching scores appear after refresh;
- uploaded DOCX uses generic CV-file wording;
- toggle loading/error/success behavior.

### End-to-end tests

- run from a verified reset baseline;
- register the two specified live accounts;
- upload DOCX and verify extracted content;
- create/activate three Recruiter-owned jobs;
- observe new matches from the Candidate account;
- verify first email in 10–15 seconds and later emails at least 30 seconds apart;
- deliberately run event and recovery processing for the same match and prove one sent email;
- click a Candidate email action and verify Recruiter notification;
- apply to one of the three internal jobs and verify it appears for the owning Recruiter;
- verify the demo Recruiter cannot access an imported Recruiter's job/application data;
- rerun the canonical reset and prove the original manifest and quick-login accounts are restored.

## 15. Minimum Verification Commands

Discover the precise supported commands from the project before execution. At minimum, expect to run equivalents of:

```powershell
# Targeted and full backend verification
mvn -f Backend/careerfit-backend/pom.xml test

# Frontend static verification
pnpm --dir Frontend type-check
pnpm --dir Frontend lint
pnpm --dir Frontend build

# Relevant browser tests
pnpm --dir Frontend test

# Canonical destructive reset and smoke verification
pwsh -NoProfile -File scripts/reset-local-demo-data.ps1 -Force
```

Do not run the destructive reset casually. Before doing so, confirm that current local data may be destroyed and that the script's workspace/volume safety checks are intact.

## 16. Acceptance Criteria

- [ ] The project still uses one shared `careerfit` database.
- [ ] The canonical reset command completes successfully and restores the full current baseline.
- [ ] The reset baseline remains 993 total jobs and 974 imported jobs unless an independently approved baseline change occurs.
- [ ] `ca`, `re`, and `ad` still log in with password `1`.
- [ ] The two live-demo emails are absent immediately after reset and can be registered normally.
- [ ] Newly registered Candidate and Recruiter accounts start with Demo Mode enabled.
- [ ] Candidate and Recruiter Settings show the Demo banner and toggle; no other route shows it.
- [ ] Disabling Demo Mode exposes normal timing/preferences without losing saved values.
- [ ] A DOCX CV contains extracted text, skills, and summary and reaches `SCORING_DONE`.
- [ ] Active jobs remain visible even when no matching row exists.
- [ ] A newly activated job is scored without waiting for the fallback scheduler.
- [ ] Candidate results refresh every five seconds in Demo Mode and can be manually refreshed.
- [ ] The first eligible suggestion email is observed within 10–15 seconds.
- [ ] Later suggestion emails for the same Candidate are at least approximately 30 seconds apart.
- [ ] Event and scheduler concurrency sends one logical email for one deduplication identity.
- [ ] Candidate email feedback creates one immediate alert for the correct owning Recruiter.
- [ ] The demo Recruiter owns exactly the three jobs created during the live scenario, not imported jobs.
- [ ] Creating the three jobs increases the baseline job count by exactly three.
- [ ] Exact new-job duplicates are blocked and near duplicates are warning-only.
- [ ] Existing imported job count, ownership, normalization, and idempotency checks still pass.
- [ ] Relevant backend tests, frontend type-check, lint, build, and browser tests pass.
- [ ] No unrelated user changes are reverted, overwritten, or reformatted.

## 17. Out of Scope

- A separate demo database or schema.
- Reducing or replacing the current job corpus.
- Reassigning imported jobs to the live demo Recruiter.
- Enabling hundreds of imported Recruiter accounts for interactive login.
- A full Company entity and multi-Recruiter Company membership model.
- Production-grade infrastructure redesign.
- Hard-coded matching scores or special scoring rules for the two demo emails.
- Disabling authentication, verification, token validation, ownership checks, or security controls to make the demo easier.

## 18. Final Delivery Report

When implementation is complete, produce a concise evidence report containing:

1. the final behavior implemented;
2. every changed file and its purpose;
3. migrations and schema changes;
4. exact test/build/reset commands and results;
5. observed timing evidence for matching and emails;
6. database evidence for deduplication and ownership;
7. the reset baseline manifest before and after the live scenario; and
8. any remaining environmental risk, especially SMTP delivery variability.

Do not claim completion if the complete two-account scenario has not been executed from the canonical reset baseline or if deduplication is proven only by a non-unique pre-send check.
