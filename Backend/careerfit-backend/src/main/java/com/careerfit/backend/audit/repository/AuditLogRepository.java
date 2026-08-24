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

    /** Admin multi-filter query: enum/date filters are optional; string filters use "" = skip. */
    @Query("""
        SELECT a FROM AuditLog a
        WHERE (:actorId IS NULL OR a.actorId = :actorId)
          AND (:actorType IS NULL OR a.actorType = :actorType)
          AND (:actionType = '' OR UPPER(a.actionType) LIKE CONCAT('%', UPPER(:actionType), '%'))
          AND (:targetType = '' OR UPPER(a.targetType) LIKE CONCAT('%', UPPER(:targetType), '%'))
          AND (:channel IS NULL OR a.sourceChannel = :channel)
          AND (:result IS NULL OR a.result = :result)
          AND (CAST(:since AS timestamp) IS NULL OR a.createdAt >= :since)
          AND (CAST(:until AS timestamp) IS NULL OR a.createdAt <= :until)
        ORDER BY a.createdAt DESC
        """)
    Page<AuditLog> findFiltered(
            @Param("actorId")    UUID actorId,
            @Param("actorType")  AuditLog.ActorType actorType,
            @Param("actionType") String actionType,
            @Param("targetType") String targetType,
            @Param("channel")    AuditLog.SourceChannel channel,
            @Param("result")     AuditLog.Result result,
            @Param("since")      Instant since,
            @Param("until")      Instant until,
            Pageable pageable);
}
