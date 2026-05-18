package com.careerfit.backend.audit.repository;

import com.careerfit.backend.audit.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    Page<AuditLog> findByActorIdOrderByCreatedAtDesc(UUID actorId, Pageable pageable);

    Page<AuditLog> findByActionTypeOrderByCreatedAtDesc(String actionType, Pageable pageable);

    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /** Admin multi-filter query: all filters are optional (null = skip). */
    @Query("""
        SELECT a FROM AuditLog a
        WHERE (:actorId IS NULL OR a.actorId = :actorId)
          AND (:actionType IS NULL OR UPPER(a.actionType) LIKE UPPER(CONCAT('%', :actionType, '%')))
          AND (:channel IS NULL OR a.sourceChannel = :channel)
          AND (:since IS NULL OR a.createdAt >= :since)
        ORDER BY a.createdAt DESC
        """)
    Page<AuditLog> findFiltered(
            @Param("actorId")    UUID actorId,
            @Param("actionType") String actionType,
            @Param("channel")    AuditLog.SourceChannel channel,
            @Param("since")      Instant since,
            Pageable pageable);
}
