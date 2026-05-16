package com.careerfit.backend.recruiter.controller;

import com.careerfit.backend.common.response.ApiResponse;
import com.careerfit.backend.job.dto.JobDtos;
import com.careerfit.backend.job.service.JobService;
import com.careerfit.backend.matching.dto.MatchingDtos;
import com.careerfit.backend.matching.service.MatchingQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Recruiter-only portal endpoints.
 * All protected by ROLE_RECRUITER in SecurityConfig.
 */
@RestController
@RequestMapping("/api/recruiter")
@Tag(name = "Recruiter", description = "Recruiter portal: jobs management and candidate ranking")
public class RecruiterController {

    private final JobService jobService;
    private final MatchingQueryService matchingQueryService;

    public RecruiterController(JobService jobService,
                               MatchingQueryService matchingQueryService) {
        this.jobService = jobService;
        this.matchingQueryService = matchingQueryService;
    }

    // ── My Jobs ───────────────────────────────────────────────────────────

    @GetMapping("/jobs")
    @Operation(summary = "List all of the recruiter's own job postings")
    public ResponseEntity<ApiResponse<JobDtos.JobListResponse>> myJobs(
            @RequestAttribute("userId") UUID userId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(jobService.getMyJobs(userId, status, page, size)));
    }

    // ── Ranking View ──────────────────────────────────────────────────────

    @GetMapping("/jobs/{jobId}/ranking")
    @Operation(summary = "Get ranked list of matching candidates for a specific job (sorted by score DESC)")
    public ResponseEntity<ApiResponse<MatchingDtos.RankingPageResponse>> getRanking(
            @PathVariable UUID jobId,
            @RequestAttribute("userId") UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "false") boolean potentialOnly) {
        return ResponseEntity.ok(ApiResponse.ok(
                matchingQueryService.getRankedCandidates(jobId, userId, page, size, potentialOnly)));
    }

    // ── Dashboard Stats ───────────────────────────────────────────────────

    @GetMapping("/dashboard")
    @Operation(summary = "Recruiter dashboard: job counts, top-performing job stats")
    public ResponseEntity<ApiResponse<RecruiterDashboardResponse>> getDashboard(
            @RequestAttribute("userId") UUID userId) {
        var myJobs = jobService.getMyJobs(userId, null, 0, 100);
        long activeJobs = myJobs.jobs().stream()
                .filter(j -> "ACTIVE".equals(j.status())).count();

        return ResponseEntity.ok(ApiResponse.ok(new RecruiterDashboardResponse(
                activeJobs,
                myJobs.total(),
                myJobs.jobs().stream()
                        .filter(j -> "CLOSED".equals(j.status())).count()
        )));
    }

    // ── Inner record ──────────────────────────────────────────────────────

    public record RecruiterDashboardResponse(
        long activeJobs,
        long totalJobs,
        long closedJobs
    ) {}
}
