package com.careerfit.backend.job.controller;

import com.careerfit.backend.common.response.ApiResponse;
import com.careerfit.backend.job.dto.JobDtos;
import com.careerfit.backend.job.service.JobService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/jobs")
@Tag(name = "Jobs", description = "Public job search and job management")
public class JobController {

    private final JobService jobService;

    public JobController(JobService jobService) {
        this.jobService = jobService;
    }

    // ── Public: Search ────────────────────────────────────────────────────

    @GetMapping({"", "/search"})
    @Operation(summary = "Search active jobs with multi-filter (keyword, location, level, language)")
    public ResponseEntity<ApiResponse<JobDtos.JobListResponse>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String language,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "recent") String sort) {

        var req = new JobDtos.JobSearchRequest(
                keyword, location, level, null, language,
                null, null, null, null,
                page, size, sort);

        return ResponseEntity.ok(ApiResponse.ok(jobService.search(req)));
    }

    @GetMapping({"/suggestions", "/search/suggestions"})
    @Operation(summary = "Autocomplete suggestions for job titles, company names and skills")
    public ResponseEntity<ApiResponse<JobDtos.SuggestionsResponse>> suggestions(
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(ApiResponse.ok(jobService.getSuggestions(keyword)));
    }

    // ── Public: Get by ID ─────────────────────────────────────────────────

    @GetMapping("/{id}")
    @Operation(summary = "Get job detail by ID (public)")
    public ResponseEntity<ApiResponse<JobDtos.JobDetailResponse>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(jobService.getById(id)));
    }

    // ── Recruiter: CRUD ───────────────────────────────────────────────────

    @PostMapping
    @Operation(summary = "Create a new job posting (RECRUITER only)")
    public ResponseEntity<ApiResponse<JobDtos.JobDetailResponse>> createJob(
            @Valid @RequestBody JobDtos.CreateJobRequest req,
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(jobService.createJob(userId, req)));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update a job (RECRUITER only, partial update)")
    public ResponseEntity<ApiResponse<JobDtos.JobDetailResponse>> updateJob(
            @PathVariable UUID id,
            @RequestBody JobDtos.UpdateJobRequest req,
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(jobService.updateJob(id, userId, req)));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Change job status: ACTIVE | CLOSED | DRAFT | PAUSED")
    public ResponseEntity<ApiResponse<JobDtos.JobStatusUpdateResponse>> updateStatus(
            @PathVariable UUID id,
            @RequestParam String status,
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(jobService.updateStatus(id, userId, status)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a job posting (RECRUITER only)")
    public ResponseEntity<ApiResponse<Void>> deleteJob(
            @PathVariable UUID id,
            @RequestAttribute("userId") UUID userId) {
        jobService.deleteJob(id, userId);
        return ResponseEntity.ok(ApiResponse.ok());
    }
}
