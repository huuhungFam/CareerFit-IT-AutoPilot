package com.careerfit.backend.analytics.controller;

import com.careerfit.backend.analytics.service.AdvancedAnalyticsService;
import com.careerfit.backend.analytics.service.AnalyticsEventService;
import com.careerfit.backend.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@Tag(name = "Advanced Analytics", description = "Role-aware analytics for market, candidate, and recruiter dashboards")
public class AdvancedAnalyticsController {

    private final AdvancedAnalyticsService analyticsService;
    private final AnalyticsEventService eventService;

    public AdvancedAnalyticsController(AdvancedAnalyticsService analyticsService,
                                       AnalyticsEventService eventService) {
        this.analyticsService = analyticsService;
        this.eventService = eventService;
    }

    // Market analytics: public GET, same access model as existing /api/analytics routes.

    @GetMapping("/api/analytics/market/overview")
    @Operation(summary = "Get advanced market overview with skills, salary, search, view, application, and matching counts")
    public ResponseEntity<ApiResponse<AdvancedAnalyticsService.MarketOverview>> marketOverview(
            @RequestParam(defaultValue = "30") int rangeDays) {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.marketOverview(rangeDays)));
    }

    @GetMapping("/api/analytics/market/skills")
    @Operation(summary = "Get top required skills from active jobs")
    public ResponseEntity<ApiResponse<List<AdvancedAnalyticsService.SkillDemandItem>>> marketSkills(
            @RequestParam(defaultValue = "20") int top) {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.marketSkills(top)));
    }

    @GetMapping("/api/analytics/market/salary")
    @Operation(summary = "Get visible salary distribution by currency and seniority")
    public ResponseEntity<ApiResponse<List<AdvancedAnalyticsService.SalaryBucket>>> marketSalary() {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.marketSalary()));
    }

    @GetMapping("/api/analytics/market/trends")
    @Operation(summary = "Get market trend time series for jobs, matches, applications, and tracked views")
    public ResponseEntity<ApiResponse<List<AdvancedAnalyticsService.TrendPoint>>> marketTrends(
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.marketTrends(days)));
    }

    @PostMapping("/api/analytics/events")
    @Operation(summary = "Record an authenticated analytics event for future dashboard metrics")
    public ResponseEntity<ApiResponse<AnalyticsEventService.EventRecordedResponse>> recordEvent(
            @RequestAttribute("userId") UUID userId,
            Authentication authentication,
            @RequestBody AnalyticsEventService.EventRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(eventService.record(userId, authentication, request)));
    }

    // Candidate analytics: requires ROLE_CANDIDATE in SecurityConfig.

    @GetMapping("/api/candidate/analytics/overview")
    @Operation(summary = "Get candidate advanced analytics overview")
    public ResponseEntity<ApiResponse<AdvancedAnalyticsService.CandidateOverview>> candidateOverview(
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.candidateOverview(userId)));
    }

    @GetMapping("/api/candidate/analytics/skill-demand")
    @Operation(summary = "Get market demand counts for candidate skills")
    public ResponseEntity<ApiResponse<List<AdvancedAnalyticsService.SkillDemandItem>>> candidateSkillDemand(
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.candidateSkillDemand(userId)));
    }

    @GetMapping("/api/candidate/analytics/profile-gaps")
    @Operation(summary = "Get high-demand skills missing from the candidate profile/default CV")
    public ResponseEntity<ApiResponse<List<AdvancedAnalyticsService.ProfileGapItem>>> candidateProfileGaps(
            @RequestAttribute("userId") UUID userId,
            @RequestParam(defaultValue = "12") int top) {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.candidateProfileGaps(userId, top)));
    }

    @GetMapping("/api/candidate/analytics/match-trends")
    @Operation(summary = "Get candidate match/application trend time series")
    public ResponseEntity<ApiResponse<List<AdvancedAnalyticsService.TrendPoint>>> candidateTrends(
            @RequestAttribute("userId") UUID userId,
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.candidateTrends(userId, days)));
    }

    // Recruiter analytics: /api/recruiter/** already requires ROLE_RECRUITER.

    @GetMapping("/api/recruiter/analytics/overview")
    @Operation(summary = "Get recruiter advanced analytics overview")
    public ResponseEntity<ApiResponse<AdvancedAnalyticsService.RecruiterOverview>> recruiterOverview(
            @RequestAttribute("userId") UUID userId,
            @RequestParam(defaultValue = "30") int rangeDays) {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.recruiterOverview(userId, rangeDays)));
    }

    @GetMapping("/api/recruiter/analytics/jobs/{jobId}/funnel")
    @Operation(summary = "Get recruiter-owned job funnel analytics")
    public ResponseEntity<ApiResponse<AdvancedAnalyticsService.JobFunnel>> recruiterJobFunnel(
            @RequestAttribute("userId") UUID userId,
            @PathVariable UUID jobId,
            @RequestParam(defaultValue = "30") int rangeDays) {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.recruiterJobFunnel(userId, jobId, rangeDays)));
    }

    @GetMapping("/api/recruiter/analytics/jobs/{jobId}/skill-gap")
    @Operation(summary = "Get required-skill coverage among matched candidates for a recruiter-owned job")
    public ResponseEntity<ApiResponse<List<AdvancedAnalyticsService.JobSkillGapItem>>> recruiterJobSkillGap(
            @RequestAttribute("userId") UUID userId,
            @PathVariable UUID jobId) {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.recruiterJobSkillGap(userId, jobId)));
    }

    @GetMapping("/api/recruiter/analytics/trends")
    @Operation(summary = "Get recruiter trend time series for matches, applications, and tracked job views")
    public ResponseEntity<ApiResponse<List<AdvancedAnalyticsService.TrendPoint>>> recruiterTrends(
            @RequestAttribute("userId") UUID userId,
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.recruiterTrends(userId, days)));
    }
}
