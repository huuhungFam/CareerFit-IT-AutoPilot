package com.careerfit.backend.report.controller;

import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.common.response.ApiResponse;
import com.careerfit.backend.report.dto.ReportDtos;
import com.careerfit.backend.report.entity.ContentReport;
import com.careerfit.backend.report.service.ContentReportService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/reports")
public class AdminReportController {
    private final ContentReportService reportService;

    public AdminReportController(ContentReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<ReportDtos.AdminReportQueue>> getQueue(
            @RequestParam(required = false) String targetType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getQueue(parseOptionalType(targetType), page, size)));
    }

    @GetMapping("/{targetType}/{targetId}")
    public ResponseEntity<ApiResponse<ReportDtos.AdminReportDetail>> getDetail(
            @PathVariable String targetType,
            @PathVariable UUID targetId) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getAdminDetail(parseType(targetType), targetId)));
    }

    @PostMapping("/{targetType}/{targetId}/ban")
    public ResponseEntity<ApiResponse<Void>> ban(
            @PathVariable String targetType,
            @PathVariable UUID targetId,
            @Valid @RequestBody(required = false) ReportDtos.ResolutionRequest request,
            @RequestAttribute("userId") UUID adminId) {
        reportService.ban(parseType(targetType), targetId, adminId, request == null ? null : request.note());
        return ResponseEntity.ok(ApiResponse.ok());
    }

    @PostMapping("/{targetType}/{targetId}/dismiss")
    public ResponseEntity<ApiResponse<Void>> dismiss(
            @PathVariable String targetType,
            @PathVariable UUID targetId,
            @Valid @RequestBody(required = false) ReportDtos.ResolutionRequest request,
            @RequestAttribute("userId") UUID adminId) {
        reportService.dismiss(parseType(targetType), targetId, adminId, request == null ? null : request.note());
        return ResponseEntity.ok(ApiResponse.ok());
    }

    private ContentReport.TargetType parseOptionalType(String value) {
        if (value == null || value.isBlank()) return null;
        return parseType(value);
    }

    private ContentReport.TargetType parseType(String value) {
        try {
            return ContentReport.TargetType.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw AppException.badRequest("Unsupported report target type: " + value);
        }
    }
}
