package com.careerfit.backend.matching.controller;

import com.careerfit.backend.common.response.ApiResponse;
import com.careerfit.backend.matching.dto.MatchingDtos;
import com.careerfit.backend.matching.service.MatchingQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Candidate-facing matching endpoints:
 * matched job feed, match detail, manual feedback.
 */
@RestController
@RequestMapping("/api/matches")
@Tag(name = "Matches", description = "Candidate's matched job feed and feedback")
public class MatchingController {

    private final MatchingQueryService queryService;

    public MatchingController(MatchingQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping("/me")
    @Operation(summary = "Get candidate's matched job feed (sorted by score DESC, paginated)")
    public ResponseEntity<ApiResponse<MatchingDtos.MatchedJobPageResponse>> getMyMatches(
            @RequestAttribute("userId") UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String label,
            @RequestParam(defaultValue = "false") boolean potentialOnly) {
        return ResponseEntity.ok(ApiResponse.ok(
                queryService.getMatchedJobs(userId, page, size, label, potentialOnly)));
    }
}
