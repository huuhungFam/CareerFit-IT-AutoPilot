package com.careerfit.backend.admin.controller;

import com.careerfit.backend.admin.dto.AdminAuditLogResponse;
import com.careerfit.backend.audit.entity.AuditLog;
import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/audit-logs")
@Tag(name = "Admin Audit Logs", description = "Admin Audit Log Viewer")
public class AdminAuditLogController {

    private final AuditLogRepository auditRepo;

    public AdminAuditLogController(AuditLogRepository auditRepo) {
        this.auditRepo = auditRepo;
    }

    @GetMapping
    @Operation(summary = "Browse audit logs with advanced filters")
    public ResponseEntity<ApiResponse<AdminAuditLogResponse.AuditLogPageResponse>> getAuditLogs(
            @RequestParam(required = false) UUID actorId,
            @RequestParam(required = false) String actorTypeStr,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) String channelStr,
            @RequestParam(required = false) String resultStr,
            @RequestParam(required = false) Instant since,
            @RequestParam(required = false) Instant until,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        AuditLog.ActorType actorType = null;
        if (actorTypeStr != null && !actorTypeStr.isBlank()) {
            try { actorType = AuditLog.ActorType.valueOf(actorTypeStr.toUpperCase()); } catch (Exception ignored) {}
        }

        AuditLog.SourceChannel channel = null;
        if (channelStr != null && !channelStr.isBlank()) {
            try { channel = AuditLog.SourceChannel.valueOf(channelStr.toUpperCase()); } catch (Exception ignored) {}
        }

        AuditLog.Result result = null;
        if (resultStr != null && !resultStr.isBlank()) {
            try { result = AuditLog.Result.valueOf(resultStr.toUpperCase()); } catch (Exception ignored) {}
        }

        String actionTypeFilter = actionType == null ? "" : actionType.trim();
        String targetTypeFilter = targetType == null ? "" : targetType.trim();

        Page<AuditLog> auditPage = auditRepo.findFiltered(
                actorId, actorType, actionTypeFilter, targetTypeFilter, channel, result, since, until,
                PageRequest.of(page, Math.min(size, 200)));

        List<AdminAuditLogResponse.AuditLogEntry> entries = auditPage.getContent().stream()
                .map(a -> new AdminAuditLogResponse.AuditLogEntry(
                        a.getId(), a.getActorType().name(), a.getActorId(),
                        a.getActionType(), a.getTargetType(), a.getTargetId(),
                        a.getResult() != null ? a.getResult().name() : null,
                        a.getSourceChannel() != null ? a.getSourceChannel().name() : null,
                        a.getMetadataJson(), a.getCreatedAt()
                ))
                .toList();

        return ResponseEntity.ok(ApiResponse.ok(new AdminAuditLogResponse.AuditLogPageResponse(
                entries, auditPage.getTotalElements(), page, size, auditPage.getTotalPages()
        )));
    }
}
