package com.careerfit.backend.employer.controller;

import com.careerfit.backend.common.response.ApiResponse;
import com.careerfit.backend.employer.dto.EmployerDtos;
import com.careerfit.backend.employer.service.EmployerService;
import com.careerfit.backend.job.dto.JobDtos;
import com.careerfit.backend.job.service.JobService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/employers")
@Tag(name = "Employers", description = "Employer profiles and company pages")
public class EmployerController {

    private final EmployerService employerService;
    private final JobService jobService;

    public EmployerController(EmployerService employerService, JobService jobService) {
        this.employerService = employerService;
        this.jobService = jobService;
    }

    // ── Public: Featured employers ────────────────────────────────────────

    @GetMapping("/featured")
    @Operation(summary = "List featured employers for homepage display")
    public ResponseEntity<ApiResponse<List<EmployerDtos.EmployerSummaryResponse>>> getFeatured() {
        return ResponseEntity.ok(ApiResponse.ok(employerService.getFeatured()));
    }

    // ── Public: Employer by slug ──────────────────────────────────────────

    @GetMapping("/{slug}")
    @Operation(summary = "Get employer profile by slug (public company page)")
    public ResponseEntity<ApiResponse<EmployerDtos.EmployerDetailResponse>> getBySlug(
            @PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.ok(employerService.getBySlug(slug)));
    }

    @GetMapping("/{slug}/jobs")
    @Operation(summary = "List active jobs posted by this employer")
    public ResponseEntity<ApiResponse<JobDtos.JobListResponse>> getJobsBySlug(
            @PathVariable String slug,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        // Resolve recruiter ID from slug then fetch jobs
        var employer = employerService.getBySlug(slug);
        // Use search endpoint internally for simplicity
        var req = new com.careerfit.backend.job.dto.JobDtos.JobSearchRequest(
                null, null, null, null, null, null, null, null, null, page, size, "recent");
        // We need to filter by company name
        var allJobs = jobService.search(req);
        // Filter by company name matching employer
        var filtered = allJobs.jobs().stream()
                .filter(j -> employer.companyName().equals(j.company()))
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(new JobDtos.JobListResponse(
                filtered, filtered.size(), page, size, 1)));
    }

    // ── Recruiter: Manage own profile ─────────────────────────────────────

    @GetMapping("/me")
    @Operation(summary = "Get the authenticated recruiter's employer profile")
    public ResponseEntity<ApiResponse<EmployerDtos.EmployerDetailResponse>> getMyProfile(
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(employerService.getMyProfile(userId)));
    }

    @PutMapping("/me")
    @Operation(summary = "Create or update employer profile (RECRUITER only)")
    public ResponseEntity<ApiResponse<EmployerDtos.EmployerDetailResponse>> upsertMyProfile(
            @Valid @RequestBody EmployerDtos.CreateOrUpdateEmployerRequest req,
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(employerService.createOrUpdate(userId, req)));
    }
}
