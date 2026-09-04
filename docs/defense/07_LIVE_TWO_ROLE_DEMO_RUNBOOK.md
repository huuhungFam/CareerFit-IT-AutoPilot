# CareerFit live two-role thesis demo runbook

## Purpose and safety boundary

This is the operator path for a live thesis demonstration. CareerFit uses one local PostgreSQL database named `careerfit`. The reset below is destructive: it removes only the two Docker volumes validated by label and restores the approved baseline. Do not run it until the current local data may be discarded.

```powershell
pwsh -NoProfile -File scripts/reset-local-demo-data.ps1 -Force
```

The script itself owns volume validation, Flyway migration, scraped-job import, idempotency comparison, backend startup, baseline manifest, and API smoke checks. Do not substitute `flyway clean`, a manual database drop, or a different compose project.

## Before the presentation

1. Run the canonical reset command and wait for `RESET MANIFEST PASS`.
2. Confirm backend health at `http://localhost:8080/actuator/health` and launch the frontend.
3. Keep two browser profiles (or normal/incognito windows) ready so Candidate and Recruiter sessions remain separate.
4. Keep the prepared CV and [calibrated job instructions](../../demo/PHASE_6_CALIBRATED_ARTIFACTS.md) available. Do not create the three jobs before the presentation.
5. If real mail is required, configure the environment allowlist with exactly the two live addresses. Never add `@careerfit.local`; imported synthetic accounts must remain mail-disabled.

## Normal path

### 1. Register the two live accounts

Register through the real UI, not by SQL or seed migration.

| Role | Email | Password |
| --- | --- | --- |
| Candidate | `hungb2203557@student.ctu.edu.vn` | `12345678` |
| Recruiter | `phamhuuhung216@gmail.com` | `12345678` |

In each Settings page, show the Demo Mode card. It must be enabled and display effective 5-second polling, 12-second first suggestion, and 30-second spacing. Demo Mode appears only in Settings.

### 2. Upload the Candidate CV

Upload `demo/CV_Candidate_CF_Demo_Matching.docx` as the Candidate. Observe the normal state sequence and wait until `SCORING_DONE`. Show extracted text, summary, and skills. If the CV is `FAILED`, show the reason, use the retry action once, and do not continue until the terminal state is visible.

### 3. Create the three jobs as the live Recruiter

Create and activate the three jobs specified in `demo/PHASE_6_CALIBRATED_ARTIFACTS.md`. The Recruiter owns exactly those three jobs. The job count must move from 993 to 996, while imported jobs remain with their imported owners.

Record each activation time. Candidate job discovery must show the active catalog independently of matching; personalized score cards should appear within two Demo Mode polls (10 seconds).

### 4. Show matching and mail behavior

For each job, record score/label and the first UI visibility timestamp. The intended calibration bands are HIGH >=90, 80-89, and 65-74.

For high-match suggestion mail, distinguish an **outbox dispatch** from an external SMTP-provider inbox delivery. Record:

- first eligible outbox/sent timestamp (target 10-15 seconds after the eligible match);
- later candidate-suggestion timestamps (at least 30 seconds apart);
- one unique outbox key for the logical matching notification, even if event and recovery both run.

Open one Candidate email action. It must show success once, then an already-used result if replayed. The corresponding alert must be directed only to the Recruiter who owns that job.

### 5. Show application and ownership

Apply to one of the three internal live jobs as the Candidate. Open that job's Applicants page as the live Recruiter and show the application. Attempting a different imported recruiter's applicant endpoint must be denied. Imported jobs keep their source route and do not become live Recruiter jobs.

### 6. Duplicate behavior

Try publishing an exact duplicate of one live job: it must be rejected. Create a near duplicate and show its warning; continue only after the explicit confirmation. Do not use imported jobs to demonstrate internal application flow.

## Fallback path

If registration, CV upload, or SMTP is unavailable, use the reset-preserved quick accounts:

| Role | Login | Password |
| --- | --- | --- |
| Candidate | `ca` | `1` |
| Recruiter | `re` | `1` |
| Admin | `ad` | `1` |

Use `re` only with jobs it owns. This fallback demonstrates Settings, job management, applicants, discovery/ranking, analytics, and external/imported routing; it does not claim the two-account live E2E was completed.

## SMTP troubleshooting

1. First inspect `notification_outbox`: a `SENT` row proves application dispatch, not inbox receipt.
2. If a row is `FAILED`, inspect `last_error`, allowlist configuration, and provider credentials outside version control. Do not place credentials in code or reports.
3. Confirm only the two live addresses are allowlisted for a live rehearsal. Imported `.local` addresses are intentionally suppressed.
4. If provider delivery is slow, present the database outbox evidence and state that inbox timing is an environmental SMTP risk.

## After the demonstration

With approval to remove the live accounts, jobs, applications, and notification artifacts, rerun the same canonical reset command. Confirm the final 993/974/433 manifest, the absence of both live addresses, an empty outbox for them, and quick-login account availability.
