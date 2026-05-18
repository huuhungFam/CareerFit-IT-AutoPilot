package com.careerfit.backend.audit.controller;

import com.careerfit.backend.audit.entity.AuditLog;
import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.common.response.ApiResponse;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.matching.service.MatchingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * ADMIN-only portal:
 *  - Audit log viewer (filterable)
 *  - User management (list, deactivate)
 *  - Force matching recompute
 *  - System health/stats
 */
@RestController
@RequestMapping("/api/admin")
@Tag(name = "Admin", description = "Admin-only portal: audit logs, user management, system ops")
public class AdminController {

    private final AuditLogRepository auditRepo;
    private final UserAccountRepository userRepo;
    private final MatchingService matchingService;
    private final CVRepository cvRepo;

    public AdminController(AuditLogRepository auditRepo,
                           UserAccountRepository userRepo,
                           MatchingService matchingService,
                           CVRepository cvRepo) {
        this.auditRepo = auditRepo;
        this.userRepo = userRepo;
        this.matchingService = matchingService;
        this.cvRepo = cvRepo;
    }

    // ── Audit Log ─────────────────────────────────────────────────────────

    @GetMapping("/audit-logs")
    @Operation(summary = "Browse audit logs with optional filters (actor, action, channel, since)")
    public ResponseEntity<ApiResponse<AuditLogPageResponse>> getAuditLogs(
            @RequestParam(required = false) UUID actorId,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String channel,
            @RequestParam(defaultValue = "7") int lastDays,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        Instant since = Instant.now().minus(lastDays, ChronoUnit.DAYS);

        AuditLog.SourceChannel ch = null;
        if (channel != null && !channel.isBlank()) {
            try { ch = AuditLog.SourceChannel.valueOf(channel.toUpperCase()); }
            catch (Exception ignored) {}
        }

        Page<AuditLog> result = auditRepo.findFiltered(
                actorId, actionType, ch, since,
                PageRequest.of(page, Math.min(size, 200)));

        List<AuditLogEntry> entries = result.getContent().stream()
                .map(this::toEntry)
                .toList();

        return ResponseEntity.ok(ApiResponse.ok(new AuditLogPageResponse(
                entries, result.getTotalElements(), page, size,
                result.getTotalPages())));
    }

    // ── Users ─────────────────────────────────────────────────────────────

    @GetMapping("/users")
    @Operation(summary = "List all users with role and status")
    public ResponseEntity<ApiResponse<List<UserSummary>>> listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        var results = userRepo.findAll(PageRequest.of(page, Math.min(size, 200)));
        List<UserSummary> users = results.getContent().stream()
                .map(u -> new UserSummary(
                        u.getId(), u.getEmail(), u.getFullName(),
                        u.getRole().name(), u.isActive(), u.isEmailVerified(),
                        u.getCreatedAt()))
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(users));
    }

    @PatchMapping("/users/{userId}/deactivate")
    @Operation(summary = "Deactivate a user account")
    public ResponseEntity<ApiResponse<Void>> deactivateUser(@PathVariable UUID userId) {
        var user = userRepo.findById(userId)
                .orElseThrow(() -> AppException.notFound("User", userId));
        user.setActive(false);
        userRepo.save(user);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    @PatchMapping("/users/{userId}/activate")
    @Operation(summary = "Re-activate a user account")
    public ResponseEntity<ApiResponse<Void>> activateUser(@PathVariable UUID userId) {
        var user = userRepo.findById(userId)
                .orElseThrow(() -> AppException.notFound("User", userId));
        user.setActive(true);
        userRepo.save(user);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    // ── System ops ────────────────────────────────────────────────────────

    @PostMapping("/matching/rebuild")
    @Operation(summary = "Force full matching recompute for a specific CV")
    public ResponseEntity<ApiResponse<Map<String, String>>> rebuildMatchingForCv(
            @RequestParam UUID cvId) {
        var cv = cvRepo.findById(cvId)
                .orElseThrow(() -> AppException.notFound("CV", cvId));
        matchingService.scoreAllJobsForCv(cv);
        return ResponseEntity.ok(ApiResponse.ok(
                Map.of("message", "Full recompute triggered for CV " + cvId)));
    }

    @GetMapping("/system/stats")
    @Operation(summary = "Quick system health stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSystemStats() {
        long totalUsers = userRepo.count();
        long totalLogs  = auditRepo.count();
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "totalUsers", totalUsers,
                "totalAuditLogs", totalLogs,
                "serverTime", Instant.now().toString()
        )));
    }

    // ── Inner response types ──────────────────────────────────────────────

    private AuditLogEntry toEntry(AuditLog a) {
        return new AuditLogEntry(
                a.getId(), a.getActorType().name(), a.getActorId(),
                a.getActionType(), a.getTargetType(), a.getTargetId(),
                a.getResult() != null ? a.getResult().name() : null,
                a.getSourceChannel() != null ? a.getSourceChannel().name() : null,
                a.getMetadataJson(), a.getCreatedAt()
        );
    }

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

    public record UserSummary(
        UUID id, String email, String fullName,
        String role, boolean active, boolean emailVerified,
        Instant createdAt
    ) {}
}
