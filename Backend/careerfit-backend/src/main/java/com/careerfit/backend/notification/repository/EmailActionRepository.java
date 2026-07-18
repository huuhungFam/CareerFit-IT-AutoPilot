package com.careerfit.backend.notification.repository;

import com.careerfit.backend.notification.entity.EmailAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EmailActionRepository extends JpaRepository<EmailAction, UUID> {

    Optional<EmailAction> findByTokenHash(String tokenHash);

    List<EmailAction> findByMatchingId(UUID matchingId);

    @Modifying
    @Query("UPDATE EmailAction e SET e.status = 'EXPIRED' WHERE e.expiresAt < :now AND e.status = 'PENDING'")
    int expireOlderThan(@Param("now") Instant now);

    @Modifying
    @Query("DELETE FROM EmailAction e WHERE e.expiresAt < :cutoff AND e.status = 'EXPIRED'")
    int deleteExpiredBefore(@Param("cutoff") Instant cutoff);

    long countByStatus(EmailAction.ActionStatus status);
    long countByCreatedAtAfter(Instant after);
}
