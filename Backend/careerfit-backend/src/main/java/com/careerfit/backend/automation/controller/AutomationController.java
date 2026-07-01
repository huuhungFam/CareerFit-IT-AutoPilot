package com.careerfit.backend.automation.controller;

import com.careerfit.backend.automation.entity.AutomationPolicy;
import com.careerfit.backend.automation.service.AutoApplyService;
import com.careerfit.backend.automation.service.AutomationPolicyService;
import com.careerfit.backend.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/automation")
@Tag(name = "Automation Policy", description = "Control autopilot, digest and notification settings")
public class AutomationController {

    private final AutomationPolicyService policyService;
    private final AutoApplyService autoApplyService;

    public AutomationController(AutomationPolicyService policyService, AutoApplyService autoApplyService) {
        this.policyService = policyService;
        this.autoApplyService = autoApplyService;
    }

    @GetMapping("/policy")
    @Operation(summary = "Get the current user's automation policy (auto-creates default if none)")
    public ResponseEntity<ApiResponse<AutomationPolicy.PolicySummary>> getPolicy(
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(policyService.getSummary(userId)));
    }

    @PatchMapping("/policy")
    @Operation(summary = "Update automation policy settings (all fields optional)")
    public ResponseEntity<ApiResponse<AutomationPolicy.PolicySummary>> updatePolicy(
            @RequestBody AutomationPolicyService.PolicyUpdateRequest req,
            @RequestAttribute("userId") UUID userId) {
        policyService.update(userId, req);
        return ResponseEntity.ok(ApiResponse.ok(policyService.getSummary(userId)));
    }

    @PatchMapping("/policy/email-notifications")
    @Operation(summary = "Enable or disable all non-security email notifications for the current user")
    public ResponseEntity<ApiResponse<AutomationPolicy.PolicySummary>> updateEmailNotifications(
            @RequestBody AutomationPolicyService.EmailNotificationsToggleRequest req,
            @RequestAttribute("userId") UUID userId) {
        boolean enabled = req.enabled() != null && req.enabled();
        return ResponseEntity.ok(ApiResponse.ok(policyService.updateEmailNotifications(userId, enabled)));
    }

    @PostMapping("/auto-apply/run-now")
    @Operation(summary = "Run Auto-Apply once for the current user's policy")
    public ResponseEntity<ApiResponse<Map<String, Object>>> runAutoApplyNow(
            @RequestAttribute("userId") UUID userId) {
        AutomationPolicy policy = policyService.getOrCreate(userId);
        if (!policy.isAutoApplyEnabled()) {
            return ResponseEntity.ok(ApiResponse.ok(Map.of(
                    "created", 0,
                    "reason", "AUTO_APPLY_DISABLED")));
        }

        int created = autoApplyService.runForPolicy(policy);
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "created", created,
                "reason", created > 0 ? "CREATED_APPLICATIONS" : "NO_ELIGIBLE_MATCHES")));
    }

    @PostMapping("/pause")
    @Operation(summary = "Pause autopilot notifications until a given time (or indefinitely)")
    public ResponseEntity<ApiResponse<AutomationPolicy.PolicySummary>> pause(
            @RequestParam(required = false) String until,
            @RequestAttribute("userId") UUID userId) {
        java.time.Instant pauseUntil = until != null
                ? java.time.Instant.parse(until)
                : java.time.Instant.now().plus(7, java.time.temporal.ChronoUnit.DAYS);

        policyService.update(userId, new AutomationPolicyService.PolicyUpdateRequest(
                false, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, pauseUntil));
        return ResponseEntity.ok(ApiResponse.ok(policyService.getSummary(userId)));
    }

    @PostMapping("/resume")
    @Operation(summary = "Resume autopilot (clear pause, re-enable)")
    public ResponseEntity<ApiResponse<AutomationPolicy.PolicySummary>> resume(
            @RequestAttribute("userId") UUID userId) {
        policyService.update(userId, new AutomationPolicyService.PolicyUpdateRequest(
                true, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null));
        return ResponseEntity.ok(ApiResponse.ok(policyService.getSummary(userId)));
    }
}
