package com.careerfit.backend.analytics.controller;

import com.careerfit.backend.analytics.service.AnalyticsService;
import com.careerfit.backend.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Public analytics endpoints for homepage stats, trend charts, and role distributions.
 */
@RestController
@RequestMapping("/api/analytics")
@Tag(name = "Analytics", description = "Public job market statistics and trend data")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/stats")
    @Operation(summary = "Get homepage market stats: active jobs, employers, new jobs today")
    public ResponseEntity<ApiResponse<AnalyticsService.MarketStatsResponse>> getStats() {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.getHomepageStats()));
    }

    @GetMapping("/trend")
    @Operation(summary = "Get active job count trend for the last N days (default 30)")
    public ResponseEntity<ApiResponse<List<AnalyticsService.SnapshotPoint>>> getTrend(
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.getTrend(days)));
    }

    @GetMapping("/roles")
    @Operation(summary = "Get top demanded role distribution (top N by job count)")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getRoles(
            @RequestParam(defaultValue = "10") int top) {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.getRoleDistribution(top)));
    }
}
