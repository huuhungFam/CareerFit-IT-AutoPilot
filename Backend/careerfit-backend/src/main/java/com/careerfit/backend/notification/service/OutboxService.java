package com.careerfit.backend.notification.service;

import com.careerfit.backend.notification.repository.NotificationOutboxRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class OutboxService {

    private final NotificationOutboxRepository outboxRepository;

    public OutboxService(NotificationOutboxRepository outboxRepository) {
        this.outboxRepository = outboxRepository;
    }

    @Transactional
    public boolean enqueue(UUID recipientId, String emailType, UUID matchingId, UUID jobId, Instant scheduledAt) {
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
}
