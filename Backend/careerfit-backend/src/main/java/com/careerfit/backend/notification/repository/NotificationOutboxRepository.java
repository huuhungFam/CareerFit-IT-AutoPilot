package com.careerfit.backend.notification.repository;

import com.careerfit.backend.notification.entity.NotificationOutbox;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.UUID;

public interface NotificationOutboxRepository extends JpaRepository<NotificationOutbox, UUID> {

    @Modifying
    @Query(value = """
        INSERT INTO notification_outbox (id, recipient_user_id, email_type, target_type, target_key, scheduled_at, status, attempt_count, created_at, updated_at)
        VALUES (:id, :recipientId, :emailType, :targetType, :targetKey, :scheduledAt, 'PENDING', 0, NOW(), NOW())
        ON CONFLICT (recipient_user_id, email_type, target_type, target_key) DO NOTHING
        """, nativeQuery = true)
    int enqueueIdempotent(
            @Param("id") UUID id,
            @Param("recipientId") UUID recipientId,
            @Param("emailType") String emailType,
            @Param("targetType") String targetType,
            @Param("targetKey") String targetKey,
            @Param("scheduledAt") Instant scheduledAt
    );
}
