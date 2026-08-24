package com.careerfit.backend.report.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class ReportDtos {

    public record CreateReportRequest(
            @NotBlank @Size(max = 40) String reason,
            @Size(max = 1000) String comment,
            UUID jobId
    ) {}

    public record ReportItem(
            UUID id,
            String reason,
            String comment,
            String status,
            String reporterEmail,
            Instant createdAt,
            Instant resolvedAt
    ) {}

    public record TargetReportSummary(
            String targetType,
            UUID targetId,
            int pendingCount,
            boolean banned,
            List<ReportItem> reports
    ) {}

    public record AdminReportCase(
            String targetType,
            UUID targetId,
            String title,
            String owner,
            String contentStatus,
            int pendingCount,
            List<String> reasons,
            Instant firstReportedAt,
            Instant latestReportedAt
    ) {}

    public record AdminReportQueue(
            List<AdminReportCase> content,
            long totalElements,
            int page,
            int size,
            int totalPages,
            long pendingJobs,
            long pendingCvs
    ) {}

    public record TargetContentDetail(
            String targetType,
            UUID targetId,
            String title,
            String owner,
            String contentStatus,
            String company,
            String location,
            String description,
            List<String> skills,
            String contactEmail
    ) {}

    public record AdminReportDetail(
            AdminReportCase reportCase,
            List<ReportItem> reports,
            TargetContentDetail content
    ) {}

    public record ResolutionRequest(@Size(max = 500) String note) {}
}
