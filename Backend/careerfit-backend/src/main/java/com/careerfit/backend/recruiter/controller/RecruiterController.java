package com.careerfit.backend.recruiter.controller;

import com.careerfit.backend.common.response.ApiResponse;
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

    private final MatchingQueryService matchingQueryService;

    public RecruiterController(MatchingQueryService matchingQueryService) {
        this.matchingQueryService = matchingQueryService;
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

}
