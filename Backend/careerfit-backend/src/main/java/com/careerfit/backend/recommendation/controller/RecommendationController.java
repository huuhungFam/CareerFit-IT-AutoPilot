package com.careerfit.backend.recommendation.controller;

import com.careerfit.backend.common.response.ApiResponse;
import com.careerfit.backend.recommendation.service.RecommendationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/recommendations")
@Tag(name = "Recommendations", description = "Personalized job recommendations and similar job suggestions")
public class RecommendationController {

    private final RecommendationService recommendationService;

    public RecommendationController(RecommendationService recommendationService) {
        this.recommendationService = recommendationService;
    }

    @GetMapping("/jobs")
    @Operation(summary = "Get personalized job recommendations for the logged-in candidate (CANDIDATE)")
    public ResponseEntity<ApiResponse<RecommendationService.CatalogResponse>> getRecommendations(
            @RequestParam(defaultValue = "20") int limit,
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(
                recommendationService.getRecommendations(userId, limit)));
    }

    @GetMapping("/jobs/{jobId}/similar")
    @Operation(summary = "Get similar jobs based on required skills overlap (PUBLIC)")
    public ResponseEntity<ApiResponse<List<RecommendationService.JobRecommendation>>> getSimilarJobs(
            @PathVariable UUID jobId,
            @RequestParam(defaultValue = "5") int limit) {
        return ResponseEntity.ok(ApiResponse.ok(
                recommendationService.getSimilarJobs(jobId, limit)));
    }
}
