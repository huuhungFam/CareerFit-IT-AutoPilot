package com.careerfit.backend.notification.repository;

import com.careerfit.backend.notification.entity.NotificationOutbox;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.UUID;
import java.util.List;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

public interface NotificationOutboxRepository extends JpaRepository<NotificationOutbox, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM NotificationOutbox o WHERE o.status IN ('PENDING', 'FAILED') AND o.scheduledAt <= :now ORDER BY o.scheduledAt, o.id")
    List<NotificationOutbox> lockDue(@Param("now") Instant now, Pageable pageable);

    @Query("SELECT MAX(o.scheduledAt) FROM NotificationOutbox o WHERE o.recipient.id = :recipientId AND o.emailType = 'HIGH_MATCH' AND o.status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED')")
    Instant latestSuggestionSlot(@Param("recipientId") UUID recipientId);

    @Query("SELECT MAX(o.scheduledAt) FROM NotificationOutbox o WHERE o.recipient.id = :recipientId AND o.emailType = 'MATCH_NOTIFICATION' AND o.status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED')")
    Instant latestCvMatchNotificationSlot(@Param("recipientId") UUID recipientId);

    @Query("""
        SELECT CASE WHEN COUNT(o) > 0 THEN true ELSE false END
        FROM NotificationOutbox o
        WHERE o.recipient.id = :recipientId
          AND o.emailType = 'HIGH_MATCH'
          AND o.status IN ('PENDING', 'PROCESSING', 'SENT')
          AND o.scheduledAt >= :since
        """)
    boolean hasHighMatchSince(@Param("recipientId") UUID recipientId, @Param("since") Instant since);

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
