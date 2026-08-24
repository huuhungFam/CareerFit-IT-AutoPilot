package com.careerfit.backend.candidate.controller;

import com.careerfit.backend.candidate.dto.CandidateDtos;
import com.careerfit.backend.candidate.service.CandidateProfileService;
import com.careerfit.backend.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Candidate self-service profile management.
 * All routes require ROLE_CANDIDATE via SecurityConfig.
 */
@RestController
@RequestMapping("/api/candidates/me")
@Tag(name = "Candidate Profile", description = "Candidate profile management and CV list")
public class CandidateController {

    private final CandidateProfileService profileService;

    public CandidateController(CandidateProfileService profileService) {
        this.profileService = profileService;
    }

    // ── Profile ───────────────────────────────────────────────────────────

    @GetMapping
    @Operation(summary = "Get my full candidate profile")
    public ResponseEntity<ApiResponse<CandidateDtos.CandidateProfileResponse>> getProfile(
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(profileService.getProfile(userId)));
    }

    @PatchMapping
    @Operation(summary = "Update candidate profile (partial update — only non-null fields updated)")
    public ResponseEntity<ApiResponse<CandidateDtos.CandidateProfileResponse>> updateProfile(
            @Valid @RequestBody CandidateDtos.UpdateCandidateProfileRequest req,
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(profileService.updateProfile(userId, req)));
    }

    @PatchMapping("/account")
    @Operation(summary = "Update display name (user account level)")
    public ResponseEntity<ApiResponse<Void>> updateAccount(
            @Valid @RequestBody CandidateDtos.UpdateAccountRequest req,
            @RequestAttribute("userId") UUID userId) {
        profileService.updateAccount(userId, req);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    // ── CVs ───────────────────────────────────────────────────────────────

    @GetMapping("/cvs")
    @Operation(summary = "List all my CVs with status and top skills")
    public ResponseEntity<ApiResponse<List<CandidateDtos.CvSummaryResponse>>> getMyCvs(
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(profileService.getMyCvs(userId)));
    }

    // ── Portfolio ────────────────────────────────────────────────────────

    @GetMapping("/portfolio")
    @Operation(summary = "Get portfolio links and projects for the authenticated candidate")
    public ResponseEntity<ApiResponse<CandidateDtos.PortfolioResponse>> getPortfolio(
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(profileService.getPortfolio(userId)));
    }

    @PostMapping("/portfolio/links")
    @Operation(summary = "Add a portfolio link")
    public ResponseEntity<ApiResponse<CandidateDtos.PortfolioLinkResponse>> addPortfolioLink(
            @Valid @RequestBody CandidateDtos.PortfolioLinkRequest req,
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(profileService.addPortfolioLink(userId, req)));
    }

    @PatchMapping("/portfolio/links/{linkId}")
    @Operation(summary = "Update a portfolio link")
    public ResponseEntity<ApiResponse<CandidateDtos.PortfolioLinkResponse>> updatePortfolioLink(
            @PathVariable UUID linkId,
            @Valid @RequestBody CandidateDtos.PortfolioLinkRequest req,
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(profileService.updatePortfolioLink(userId, linkId, req)));
    }

    @DeleteMapping("/portfolio/links/{linkId}")
    @Operation(summary = "Delete a portfolio link")
    public ResponseEntity<ApiResponse<Void>> deletePortfolioLink(
            @PathVariable UUID linkId,
            @RequestAttribute("userId") UUID userId) {
        profileService.deletePortfolioLink(userId, linkId);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    @PostMapping("/portfolio/projects")
    @Operation(summary = "Add a portfolio project")
    public ResponseEntity<ApiResponse<CandidateDtos.PortfolioProjectResponse>> addPortfolioProject(
            @Valid @RequestBody CandidateDtos.PortfolioProjectRequest req,
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(profileService.addPortfolioProject(userId, req)));
    }

    @PatchMapping("/portfolio/projects/{projectId}")
    @Operation(summary = "Update a portfolio project")
    public ResponseEntity<ApiResponse<CandidateDtos.PortfolioProjectResponse>> updatePortfolioProject(
            @PathVariable UUID projectId,
            @Valid @RequestBody CandidateDtos.PortfolioProjectRequest req,
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(profileService.updatePortfolioProject(userId, projectId, req)));
    }

    @DeleteMapping("/portfolio/projects/{projectId}")
    @Operation(summary = "Delete a portfolio project")
    public ResponseEntity<ApiResponse<Void>> deletePortfolioProject(
            @PathVariable UUID projectId,
            @RequestAttribute("userId") UUID userId) {
        profileService.deletePortfolioProject(userId, projectId);
        return ResponseEntity.ok(ApiResponse.ok());
    }
}
