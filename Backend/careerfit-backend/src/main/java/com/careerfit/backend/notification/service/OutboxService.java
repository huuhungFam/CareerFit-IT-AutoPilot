package com.careerfit.backend.notification.service;

import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.notification.repository.NotificationOutboxRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class OutboxService {

    private final NotificationOutboxRepository outboxRepository;
    private final UserAccountRepository userAccountRepository;
    private final NotificationPolicyGuard notificationPolicyGuard;

    public OutboxService(NotificationOutboxRepository outboxRepository, UserAccountRepository userAccountRepository,
                         NotificationPolicyGuard notificationPolicyGuard) {
        this.outboxRepository = outboxRepository;
        this.userAccountRepository = userAccountRepository;
        this.notificationPolicyGuard = notificationPolicyGuard;
    }

    @Transactional
    public boolean enqueue(UUID recipientId, String emailType, UUID matchingId, UUID jobId, Instant scheduledAt) {
        return enqueueInternal(recipientId, emailType, matchingId, jobId, scheduledAt);
    }

    /**
     * Queues a candidate suggestion.  Demo mode deliberately exposes delivery timing:
     * the first suggestion is delayed 12 seconds and all following suggestions for the
     * same recipient are at least 30 seconds apart.  Normal mode keeps the caller's
     * effective policy time and is never delayed by demo spacing.
     */
    @Transactional
    public boolean enqueueSuggestion(UUID recipientId, UUID matchingId, UUID jobId, Instant scheduledAt, boolean demoMode) {
        // Locking the stable recipient row serializes the aggregate latest-slot read.
        // A row lock is used rather than a delivery log so concurrent producers cannot
        // allocate the same slot before either outbox row is committed.
        UserAccount recipient = userAccountRepository.findByIdForUpdate(recipientId)
                .orElseThrow(() -> new IllegalArgumentException("Outbox recipient does not exist"));
        var policyDecision = notificationPolicyGuard.evaluate(recipient, "HIGH_MATCH", matchingId.toString());
        if (!policyDecision.allowed()) {
            notificationPolicyGuard.logSkipped(recipient, "HIGH_MATCH", matchingId.toString(), policyDecision.reason());
            return false;
        }
        if (!demoMode) {
            return enqueueInternal(recipientId, "HIGH_MATCH", matchingId, jobId, scheduledAt);
        }
        Instant latest = outboxRepository.latestSuggestionSlot(recipientId);
        Instant first = Instant.now().plusSeconds(12);
        Instant effectiveScheduledAt = latest == null
                ? max(scheduledAt, first)
                : max(scheduledAt, latest.plusSeconds(30));
        return enqueueInternal(recipientId, "HIGH_MATCH", matchingId, jobId, effectiveScheduledAt);
    }

    private boolean enqueueInternal(UUID recipientId, String emailType, UUID matchingId, UUID jobId, Instant scheduledAt) {
        String targetType;
        String targetKey;
        if (matchingId != null) {
            targetType = "MATCHING";
            targetKey = matchingId.toString();
        } else if (jobId != null) {
            targetType = "JOB";
            targetKey = jobId.toString();
        } else {
            throw new IllegalArgumentException("Cannot create OutboxTargetIdentity without matchingId or jobId");
        }

        int inserted = outboxRepository.enqueueIdempotent(
                UUID.randomUUID(),
                recipientId,
                emailType,
                targetType,
                targetKey,
                scheduledAt
        );
        return inserted > 0;
    }

    private Instant max(Instant left, Instant right) { return left.isAfter(right) ? left : right; }
}
