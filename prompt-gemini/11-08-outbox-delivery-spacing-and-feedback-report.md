# Phase 4 — Outbox delivery, spacing and feedback report

**Status:** PASS (Phase 4 scope only; no reset and no Phase 5 work was performed).

## Delivered implementation

- `notification_outbox` is dispatched by `OutboxDispatcher`.  Due `PENDING` and retryable `FAILED` rows are pessimistically locked, claimed in one transaction, and end in `SENT` or `FAILED` with `attempt_count`, `last_error`, and `sent_at` updated.
- The outbox unique key remains the deduplication guard. `notification_delivery_log` is written as audit after an attempted delivery; it is not used as the concurrency guard.
- Delivery for the durable path is synchronous and exception-propagating (`deliverOutboxPlainText` / `deliverOutboxHtml`). The pre-existing asynchronous convenience methods remain only for unrelated legacy lifecycle mail.
- Candidate high-match producers (event scoring, recovery reuse through `MatchingService`, post-scoring summary, and the scheduler) now use `OutboxService.enqueueSuggestion`; there are no callers of `EmailActionService.sendMatchNotification`.
- Demo suggestions receive the first slot at `now + 12s` and later slots at least 30 seconds after the latest queued, sent, processing, or failed suggestion. The recipient `user_account` row is locked before calculating the aggregate latest slot, serializing concurrent producers.
- Normal mode goes through the effective policy guard but is not given demo spacing. Effective policy is used for quiet-hours/cooldown decisions, so demo mode correctly disables those restrictions while normal mode retains them.
- A `HIGH_MATCH` row is delivered through `EmailActionService.deliverMatchNotification`, which creates hashed, expiring feedback tokens at delivery time. Other immediate alerts, including candidate-feedback-to-recruiter, bypass suggestion spacing.
- Email action redemption locks the token row (`findByTokenHashForUpdate`) for the feedback/outbox transaction. The recruiter alert is resolved only from `matching.job.recruiter` and deduplicated by the outbox DB key.
- Mail delivery is governed by `APP_MAIL_ALLOWLIST` / `app.mail.allowlist`; `.local` recipients are always suppressed.

## Verification evidence

Executed on 2026-08-16 (Asia/Ho_Chi_Minh):

```text
Backend/careerfit-backend
  mvnw.cmd -Dtest=OutboxServiceTest,OutboxDispatcherTest,
    NotificationPolicyGuardTest,EmailActionControllerTest test
  Result: 12 tests, 0 failures, 0 errors

  mvnw.cmd -Dtest=OutboxDeliveryIntegrationTest,Phase1OutboxPolicyTest test
  Result: 11 tests, 0 failures, 0 errors

  mvnw.cmd test
  Result: completed; every generated Surefire report has 0 failures and 0 errors
```

`OutboxDeliveryIntegrationTest` used a fresh PostgreSQL 16 Testcontainers database migrated through V33. It proved these persisted outcomes:

| Case | Persisted assertion |
| --- | --- |
| Four concurrent demo producers | 4 `notification_outbox` rows; first slot at least T+12s and every subsequent `scheduled_at` at least 30s apart |
| Two competing dispatchers | exactly 1 logical row, `status=SENT`, `attempt_count=1`, non-null `sent_at` |

The mail sink evidence is covered by `OutboxDispatcherTest`: the injectable `IMailService` mock records a normal send, rejected non-allowlisted and `.local` recipients cause no send, SMTP failure becomes `FAILED`, and the next dispatch makes the same row `SENT` with `attempt_count=2`. The high-match route is separately asserted to invoke the tokenized HTML delivery path, not generic plain mail.

`EmailActionControllerTest` covers success, replay, expiry and invalid-token browser responses; it verifies exactly one candidate feedback operation and an immediate `RECRUITER_CANDIDATE_FEEDBACK` outbox row addressed to the owning recruiter. `FeedbackServiceTest` continues to cover cross-candidate owner denial.

## Final checks

- `git diff --check`: pass.
- No destructive reset, commit, push, live SMTP delivery, or Phase 5 implementation was run.
