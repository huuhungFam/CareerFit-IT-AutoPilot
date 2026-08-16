package com.careerfit.backend.admin.controller;

import com.careerfit.backend.admin.dto.AdminEmailResponse;
import com.careerfit.backend.admin.service.AdminEmailSampleService;
import com.careerfit.backend.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/email-templates")
@Tag(name = "Admin Email Templates", description = "Send safe email template samples to the configured SMTP account")
public class AdminEmailSampleController {

    private final AdminEmailSampleService sampleService;

    public AdminEmailSampleController(AdminEmailSampleService sampleService) {
        this.sampleService = sampleService;
    }

    @PostMapping("/send-samples")
    @Operation(summary = "Send every current email template sample to MAIL_USERNAME")
    public ResponseEntity<ApiResponse<AdminEmailResponse.EmailSampleBatchResult>> sendAllSamples(
            @RequestAttribute("userId") UUID adminId) {
        return ResponseEntity.ok(ApiResponse.ok(sampleService.sendAll(adminId)));
    }
}
