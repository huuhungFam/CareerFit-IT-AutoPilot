package com.careerfit.backend.report.repository;

import com.careerfit.backend.report.entity.ContentReport;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ContentReportRepository extends JpaRepository<ContentReport, UUID> {

    boolean existsByReporterIdAndTargetTypeAndTargetIdAndStatus(
            UUID reporterId, ContentReport.TargetType targetType, UUID targetId,
            ContentReport.ReportStatus status);

    @EntityGraph(attributePaths = {"reporter", "resolvedBy"})
    List<ContentReport> findByStatusOrderByCreatedAtDesc(ContentReport.ReportStatus status);

    @EntityGraph(attributePaths = {"reporter", "resolvedBy"})
    List<ContentReport> findByTargetTypeAndTargetIdOrderByCreatedAtDesc(
            ContentReport.TargetType targetType, UUID targetId);

    @EntityGraph(attributePaths = {"reporter"})
    List<ContentReport> findByTargetTypeAndTargetIdAndStatusOrderByCreatedAtDesc(
            ContentReport.TargetType targetType, UUID targetId, ContentReport.ReportStatus status);
}
