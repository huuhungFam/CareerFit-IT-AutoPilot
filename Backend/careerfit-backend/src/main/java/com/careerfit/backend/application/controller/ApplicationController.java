package com.careerfit.backend.application.controller;

import com.careerfit.backend.application.dto.ApplicationDtos;
import com.careerfit.backend.application.service.ApplicationService;
import com.careerfit.backend.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@Tag(name = "Applications", description = "Job applications — candidate submit/withdraw, recruiter review")
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    // ── Candidate ─────────────────────────────────────────────────────────

    @PostMapping("/api/applications")
    @Operation(summary = "Apply to a job (CANDIDATE)")
    public ResponseEntity<ApiResponse<ApplicationDtos.MyApplicationResponse>> apply(
            @Valid @RequestBody ApplicationDtos.SubmitApplicationRequest req,
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(applicationService.submit(userId, req)));
    }

    @GetMapping("/api/applications/me")
    @Operation(summary = "Get my applications list (CANDIDATE, paginated)")
    public ResponseEntity<ApiResponse<ApplicationDtos.MyApplicationPageResponse>> getMyApplications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(
                applicationService.getMyApplications(userId, page, size)));
    }

    @DeleteMapping("/api/applications/{id}")
    @Operation(summary = "Withdraw an application (CANDIDATE)")
    public ResponseEntity<ApiResponse<Void>> withdraw(
            @PathVariable UUID id,
            @RequestAttribute("userId") UUID userId) {
        applicationService.withdraw(id, userId);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    @PostMapping("/api/applications/{id}/invitation-response")
    @Operation(summary = "Accept or decline a recruiter invitation (CANDIDATE)")
    public ResponseEntity<ApiResponse<Void>> respondToInvitation(
            @PathVariable UUID id,
            @RequestBody ApplicationDtos.InvitationResponseRequest req,
            @RequestAttribute("userId") UUID userId) {
        applicationService.respondToInvitation(id, userId, req);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    // ── Recruiter ─────────────────────────────────────────────────────────

    @GetMapping("/api/recruiter/jobs/{jobId}/applicants")
    @Operation(summary = "Get applicants for a specific job (RECRUITER)")
    public ResponseEntity<ApiResponse<ApplicationDtos.ApplicantPageResponse>> getApplicants(
            @PathVariable UUID jobId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(
                applicationService.getJobApplicants(jobId, userId, status, page, size)));
    }

    @PatchMapping("/api/recruiter/applications/{id}/status")
    @Operation(summary = "Approve, reject, or invite an applicant (RECRUITER)")
    public ResponseEntity<ApiResponse<Void>> updateStatus(
            @PathVariable UUID id,
            @RequestBody ApplicationDtos.UpdateApplicationStatusRequest req,
            @RequestAttribute("userId") UUID userId) {
        applicationService.updateStatus(id, userId, req);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    @PostMapping("/api/recruiter/jobs/{jobId}/candidates/{candidateId}/invite")
    @Operation(summary = "Invite a matching candidate who has not applied yet (RECRUITER)")
    public ResponseEntity<ApiResponse<ApplicationDtos.ApplicantResponse>> inviteCandidate(
            @PathVariable UUID jobId,
            @PathVariable UUID candidateId,
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(applicationService.inviteCandidate(jobId, candidateId, userId)));
    }

    @DeleteMapping("/api/recruiter/applications/{id}/invitation")
    @Operation(summary = "Withdraw an active recruiter invitation")
    public ResponseEntity<ApiResponse<Void>> withdrawInvitation(
            @PathVariable UUID id,
            @RequestAttribute("userId") UUID userId) {
        applicationService.withdrawInvitation(id, userId);
        return ResponseEntity.ok(ApiResponse.ok());
    }
}
