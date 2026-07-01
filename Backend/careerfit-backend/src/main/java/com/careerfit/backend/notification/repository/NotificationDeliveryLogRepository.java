package com.careerfit.backend.notification.repository;

import com.careerfit.backend.notification.entity.NotificationDeliveryLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.UUID;

public interface NotificationDeliveryLogRepository extends JpaRepository<NotificationDeliveryLog, UUID> {

    @Query("""
        SELECT COUNT(l) FROM NotificationDeliveryLog l
        WHERE l.recipient.id = :recipientId
          AND l.status = :status
          AND l.createdAt >= :from
          AND l.createdAt < :to
        """)
    long countDeliveredBetween(@Param("recipientId") UUID recipientId,
                               @Param("status") NotificationDeliveryLog.DeliveryStatus status,
                               @Param("from") Instant from,
                               @Param("to") Instant to);

    @Query("""
        SELECT COUNT(l) > 0 FROM NotificationDeliveryLog l
        WHERE l.recipient.id = :recipientId
          AND l.status = :status
          AND l.emailType = :emailType
          AND (:contextKey IS NULL OR l.contextKey = :contextKey)
          AND l.createdAt >= :since
        """)
    boolean existsRecentSent(@Param("recipientId") UUID recipientId,
                             @Param("emailType") String emailType,
                             @Param("contextKey") String contextKey,
                             @Param("status") NotificationDeliveryLog.DeliveryStatus status,
                             @Param("since") Instant since);
}
