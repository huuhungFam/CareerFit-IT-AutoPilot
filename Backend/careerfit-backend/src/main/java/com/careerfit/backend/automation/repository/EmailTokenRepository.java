package com.careerfit.backend.automation.repository;

import com.careerfit.backend.automation.entity.EmailToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface EmailTokenRepository extends JpaRepository<EmailToken, UUID> {

    Optional<EmailToken> findByTokenHash(String tokenHash);

    /** Purge expired and already-used tokens. Called by scheduled cleanup. */
    @Modifying
    @Query("DELETE FROM EmailToken t WHERE t.expiresAt < :before AND t.usedAt IS NOT NULL")
    int deleteExpiredUsedTokens(@Param("before") Instant before);

    /** Revoke all active tokens for a user with a specific purpose (e.g. re-send passwordless). */
    @Modifying
    @Query("""
        UPDATE EmailToken t SET t.revokedAt = :now
        WHERE t.user.id = :userId
          AND t.purpose = :purpose
          AND t.usedAt IS NULL
          AND t.revokedAt IS NULL
          AND t.expiresAt > :now
        """)
    int revokeActiveTokens(@Param("userId") UUID userId,
                           @Param("purpose") EmailToken.TokenPurpose purpose,
                           @Param("now") Instant now);
}
