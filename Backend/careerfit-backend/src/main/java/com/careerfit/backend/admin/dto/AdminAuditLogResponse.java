package com.careerfit.backend.admin.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class AdminAuditLogResponse {

    public record AuditLogEntry(
        UUID id, String actorType, UUID actorId,
        String actionType, String targetType, UUID targetId,
        String result, String channel, String metadata,
        Instant createdAt
    ) {}

    public record AuditLogPageResponse(
        List<AuditLogEntry> logs,
        long total, int page, int size, int totalPages
    ) {}
}
