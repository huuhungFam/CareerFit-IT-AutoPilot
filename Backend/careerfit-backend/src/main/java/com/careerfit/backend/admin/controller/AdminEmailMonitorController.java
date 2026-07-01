package com.careerfit.backend.admin.controller;

import com.careerfit.backend.admin.dto.AdminEmailResponse;
import com.careerfit.backend.admin.service.AdminEmailMonitorService;
import com.careerfit.backend.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@Tag(name = "Admin Email Monitor", description = "Monitor automated emails and tokens")
public class AdminEmailMonitorController {

    private final AdminEmailMonitorService monitorService;

    public AdminEmailMonitorController(AdminEmailMonitorService monitorService) {
        this.monitorService = monitorService;
    }

    @GetMapping("/email-actions")
    @Operation(summary = "Get email actions")
    public ResponseEntity<ApiResponse<Page<AdminEmailResponse.EmailActionSummary>>> getEmailActions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(ApiResponse.ok(
                monitorService.getEmailActions(PageRequest.of(page, size))
        ));
    }

    @PostMapping("/email-actions/{actionId}/retry")
    @Operation(summary = "Retry a failed or pending email action")
    public ResponseEntity<ApiResponse<Void>> retryEmailAction(@PathVariable UUID actionId, @RequestAttribute("userId") UUID adminId) {
        monitorService.retryEmailAction(actionId, adminId);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    @GetMapping("/email-tokens")
    @Operation(summary = "Get email tokens")
    public ResponseEntity<ApiResponse<Page<AdminEmailResponse.EmailTokenSummary>>> getEmailTokens(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(ApiResponse.ok(
                monitorService.getEmailTokens(PageRequest.of(page, size))
        ));
    }

    @PostMapping("/email-tokens/{tokenId}/revoke")
    @Operation(summary = "Revoke an email token")
    public ResponseEntity<ApiResponse<Void>> revokeToken(@PathVariable UUID tokenId, @RequestAttribute("userId") UUID adminId) {
        monitorService.revokeToken(tokenId, adminId);
        return ResponseEntity.ok(ApiResponse.ok());
    }
}
