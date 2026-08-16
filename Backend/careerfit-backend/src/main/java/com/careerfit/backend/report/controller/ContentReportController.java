package com.careerfit.backend.report.controller;

import com.careerfit.backend.common.response.ApiResponse;
import com.careerfit.backend.report.dto.ReportDtos;
import com.careerfit.backend.report.entity.ContentReport;
import com.careerfit.backend.report.service.ContentReportService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/reports")
public class ContentReportController {
    private final ContentReportService reportService;

    public ContentReportController(ContentReportService reportService) {
        this.reportService = reportService;
    }

    @PostMapping("/jobs/{jobId}")
    public ResponseEntity<ApiResponse<ReportDtos.ReportItem>> reportJob(
            @PathVariable UUID jobId,
            @Valid @RequestBody ReportDtos.CreateReportRequest request,
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(reportService.reportJob(jobId, userId, request)));
    }

    @PostMapping("/cvs/{cvId}")
    public ResponseEntity<ApiResponse<ReportDtos.ReportItem>> reportCv(
            @PathVariable UUID cvId,
            @Valid @RequestBody ReportDtos.CreateReportRequest request,
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(reportService.reportCv(cvId, userId, request)));
    }

    @GetMapping("/jobs/{jobId}")
    public ResponseEntity<ApiResponse<ReportDtos.TargetReportSummary>> getJobReports(
            @PathVariable UUID jobId,
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getSummary(
                ContentReport.TargetType.JOB, jobId, userId)));
    }

    @GetMapping("/cvs/{cvId}")
    public ResponseEntity<ApiResponse<ReportDtos.TargetReportSummary>> getCvReports(
            @PathVariable UUID cvId,
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getSummary(
                ContentReport.TargetType.CV, cvId, userId)));
    }
}
