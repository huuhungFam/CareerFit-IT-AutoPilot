package com.careerfit.backend.report.service;

import com.careerfit.backend.application.repository.ApplicationRepository;
import com.careerfit.backend.audit.entity.AuditLog;
import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.careerfit.backend.matching.repository.MatchingRepository;
import com.careerfit.backend.report.dto.ReportDtos;
import com.careerfit.backend.report.entity.ContentReport;
import com.careerfit.backend.report.repository.ContentReportRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class ContentReportService {
    private static final TypeReference<List<String>> LIST_TYPE = new TypeReference<>() {};

    private final ContentReportRepository reportRepo;
    private final UserAccountRepository userRepo;
    private final JobRepository jobRepo;
    private final CVRepository cvRepo;
    private final ApplicationRepository applicationRepo;
    private final MatchingRepository matchingRepo;
    private final AuditLogRepository auditRepo;
    private final ObjectMapper objectMapper;

    public ContentReportService(ContentReportRepository reportRepo,
                                UserAccountRepository userRepo,
                                JobRepository jobRepo,
                                CVRepository cvRepo,
                                ApplicationRepository applicationRepo,
                                MatchingRepository matchingRepo,
                                AuditLogRepository auditRepo,
                                ObjectMapper objectMapper) {
        this.reportRepo = reportRepo;
        this.userRepo = userRepo;
        this.jobRepo = jobRepo;
        this.cvRepo = cvRepo;
        this.applicationRepo = applicationRepo;
        this.matchingRepo = matchingRepo;
        this.auditRepo = auditRepo;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ReportDtos.ReportItem reportJob(UUID jobId, UUID reporterId,
                                            ReportDtos.CreateReportRequest request) {
        UserAccount reporter = requireRole(reporterId, UserAccount.Role.CANDIDATE);
        Job job = jobRepo.findByIdForUpdate(jobId)
                .orElseThrow(() -> AppException.notFound("Job", jobId));
        if (job.getStatus() != Job.JobStatus.ACTIVE) {
            throw AppException.badRequest("Only an active job can be reported");
        }
        ContentReport report = create(reporter, ContentReport.TargetType.JOB, jobId, request);
        job.setPendingReportCount(job.getPendingReportCount() + 1);
        jobRepo.save(job);
        audit(reporterId, "JOB_REPORTED", "JOB", jobId, report.getReason().name());
        return toItem(report, true);
    }

    @Transactional
    public ReportDtos.ReportItem reportCv(UUID cvId, UUID reporterId,
                                           ReportDtos.CreateReportRequest request) {
        UserAccount reporter = requireRole(reporterId, UserAccount.Role.RECRUITER);
        if (request.jobId() == null) {
            throw AppException.badRequest("jobId is required when reporting a CV");
        }
        Job job = jobRepo.findByIdWithRecruiter(request.jobId())
                .orElseThrow(() -> AppException.notFound("Job", request.jobId()));
        if (!job.getRecruiter().getId().equals(reporterId)) {
            throw AppException.forbidden("You do not own the referenced job");
        }
        boolean visibleRelationship = applicationRepo.existsByCvIdAndJobId(cvId, job.getId())
                || matchingRepo.findByCvIdAndJobId(cvId, job.getId()).isPresent();
        if (!visibleRelationship) {
            throw AppException.forbidden("This CV is not visible for the referenced job");
        }
        CV cv = cvRepo.findByIdForUpdate(cvId)
                .orElseThrow(() -> AppException.notFound("CV", cvId));
        if (cv.getStatus() == CV.CvStatus.BANNED) {
            throw AppException.badRequest("This CV has already been banned");
        }
        ContentReport report = create(reporter, ContentReport.TargetType.CV, cvId, request);
        cv.setPendingReportCount(cv.getPendingReportCount() + 1);
        cvRepo.save(cv);
        audit(reporterId, "CV_REPORTED", "CV", cvId, report.getReason().name());
        return toItem(report, true);
    }

    @Transactional(readOnly = true)
    public ReportDtos.TargetReportSummary getSummary(ContentReport.TargetType type, UUID targetId,
                                                      UUID viewerId) {
        UserAccount viewer = userRepo.findById(viewerId)
                .orElseThrow(() -> AppException.notFound("User", viewerId));
        boolean admin = viewer.getRole() == UserAccount.Role.ADMIN;
        boolean banned = authorizeTargetView(type, targetId, viewer, admin);
        List<ContentReport> reports = reportRepo
                .findByTargetTypeAndTargetIdAndStatusOrderByCreatedAtDesc(
                        type, targetId, ContentReport.ReportStatus.PENDING);
        return new ReportDtos.TargetReportSummary(type.name(), targetId, reports.size(), banned,
                reports.stream().map(report -> toItem(report, admin)).toList());
    }

    @Transactional(readOnly = true)
    public ReportDtos.AdminReportQueue getQueue(ContentReport.TargetType type, int page, int size) {
        int safePage = Math.max(0, page);
        int pageSize = Math.min(50, Math.max(1, size));
        List<ContentReport> pending = reportRepo.findByStatusOrderByCreatedAtDesc(
                ContentReport.ReportStatus.PENDING);
        Map<TargetKey, List<ContentReport>> grouped = new LinkedHashMap<>();
        for (ContentReport report : pending) {
            grouped.computeIfAbsent(new TargetKey(report.getTargetType(), report.getTargetId()), ignored -> new ArrayList<>())
                    .add(report);
        }
        List<ReportDtos.AdminReportCase> cases = grouped.entrySet().stream()
                .filter(entry -> type == null || entry.getKey().type() == type)
                .map(entry -> toCase(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparing(ReportDtos.AdminReportCase::latestReportedAt).reversed())
                .toList();
        int from = Math.min(cases.size(), safePage * pageSize);
        int to = Math.min(cases.size(), from + pageSize);
        long pendingJobs = grouped.keySet().stream().filter(key -> key.type() == ContentReport.TargetType.JOB).count();
        long pendingCvs = grouped.keySet().stream().filter(key -> key.type() == ContentReport.TargetType.CV).count();
        return new ReportDtos.AdminReportQueue(cases.subList(from, to), cases.size(), safePage, pageSize,
                cases.isEmpty() ? 0 : (int) Math.ceil((double) cases.size() / pageSize), pendingJobs, pendingCvs);
    }

    @Transactional(readOnly = true)
    public ReportDtos.AdminReportDetail getAdminDetail(ContentReport.TargetType type, UUID targetId) {
        List<ContentReport> reports = reportRepo.findByTargetTypeAndTargetIdOrderByCreatedAtDesc(type, targetId);
        if (reports.isEmpty()) throw AppException.notFound("Report target", targetId);
        List<ContentReport> pending = reports.stream()
                .filter(report -> report.getStatus() == ContentReport.ReportStatus.PENDING).toList();
        return new ReportDtos.AdminReportDetail(
                toCase(new TargetKey(type, targetId), pending.isEmpty() ? reports : pending),
                reports.stream().map(report -> toItem(report, true)).toList(),
                targetDetail(type, targetId));
    }

    @Transactional
    public void ban(ContentReport.TargetType type, UUID targetId, UUID adminId, String note) {
        UserAccount admin = requireRole(adminId, UserAccount.Role.ADMIN);
        if (type == ContentReport.TargetType.JOB) {
            Job job = jobRepo.findByIdForUpdate(targetId)
                    .orElseThrow(() -> AppException.notFound("Job", targetId));
            job.setStatus(Job.JobStatus.BANNED);
            job.setPendingReportCount(0);
            jobRepo.save(job);
        } else {
            CV cv = cvRepo.findByIdForUpdate(targetId)
                    .orElseThrow(() -> AppException.notFound("CV", targetId));
            cv.setStatus(CV.CvStatus.BANNED);
            cv.setDefault(false);
            cv.setPendingReportCount(0);
            cvRepo.save(cv);
        }
        resolvePending(type, targetId, ContentReport.ReportStatus.ACTIONED, admin, note);
        audit(adminId, type.name() + "_BANNED_FROM_REPORT", type.name(), targetId, note);
    }

    @Transactional
    public void dismiss(ContentReport.TargetType type, UUID targetId, UUID adminId, String note) {
        UserAccount admin = requireRole(adminId, UserAccount.Role.ADMIN);
        if (type == ContentReport.TargetType.JOB) {
            Job job = jobRepo.findByIdForUpdate(targetId)
                    .orElseThrow(() -> AppException.notFound("Job", targetId));
            job.setPendingReportCount(0);
            jobRepo.save(job);
        } else {
            CV cv = cvRepo.findByIdForUpdate(targetId)
                    .orElseThrow(() -> AppException.notFound("CV", targetId));
            cv.setPendingReportCount(0);
            cvRepo.save(cv);
        }
        resolvePending(type, targetId, ContentReport.ReportStatus.DISMISSED, admin, note);
        audit(adminId, type.name() + "_REPORTS_DISMISSED", type.name(), targetId, note);
    }

    private ContentReport create(UserAccount reporter, ContentReport.TargetType type, UUID targetId,
                                 ReportDtos.CreateReportRequest request) {
        ContentReport.Reason reason;
        try {
            reason = ContentReport.Reason.valueOf(request.reason().trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw AppException.badRequest("Unsupported report reason: " + request.reason());
        }
        String comment = normalizeComment(request.comment());
        if (reason == ContentReport.Reason.OTHER && comment == null) {
            throw AppException.badRequest("A comment is required for OTHER reports");
        }
        if (reportRepo.existsByReporterIdAndTargetTypeAndTargetIdAndStatus(
                reporter.getId(), type, targetId, ContentReport.ReportStatus.PENDING)) {
            throw AppException.conflict("You already have a pending report for this content");
        }
        try {
            return reportRepo.saveAndFlush(new ContentReport(reporter, type, targetId, reason, comment));
        } catch (DataIntegrityViolationException ex) {
            throw AppException.conflict("You already have a pending report for this content");
        }
    }

    private void resolvePending(ContentReport.TargetType type, UUID targetId,
                                ContentReport.ReportStatus status, UserAccount admin, String note) {
        List<ContentReport> pending = reportRepo.findByTargetTypeAndTargetIdAndStatusOrderByCreatedAtDesc(
                type, targetId, ContentReport.ReportStatus.PENDING);
        if (pending.isEmpty()) throw AppException.conflict("This content has no pending reports");
        pending.forEach(report -> report.resolve(status, admin, normalizeNote(note)));
        reportRepo.saveAll(pending);
    }

    private boolean authorizeTargetView(ContentReport.TargetType type, UUID targetId,
                                        UserAccount viewer, boolean admin) {
        if (type == ContentReport.TargetType.JOB) {
            Job job = jobRepo.findByIdWithRecruiter(targetId)
                    .orElseThrow(() -> AppException.notFound("Job", targetId));
            boolean candidateCanView = viewer.getRole() == UserAccount.Role.CANDIDATE
                    && job.getStatus() == Job.JobStatus.ACTIVE;
            boolean ownerCanView = viewer.getRole() == UserAccount.Role.RECRUITER
                    && job.getRecruiter().getId().equals(viewer.getId());
            if (!admin && !candidateCanView && !ownerCanView) {
                throw AppException.forbidden("You cannot view report details for this job");
            }
            return job.getStatus() == Job.JobStatus.BANNED;
        }
        CV cv = cvRepo.findById(targetId).orElseThrow(() -> AppException.notFound("CV", targetId));
        boolean ownerCanView = viewer.getRole() == UserAccount.Role.CANDIDATE
                && cv.getCandidate().getUser().getId().equals(viewer.getId());
        boolean reporterCanView = viewer.getRole() == UserAccount.Role.RECRUITER
                && reportRepo.existsByReporterIdAndTargetTypeAndTargetIdAndStatus(
                viewer.getId(), ContentReport.TargetType.CV, targetId, ContentReport.ReportStatus.PENDING);
        if (!admin && !ownerCanView && !reporterCanView) {
            throw AppException.forbidden("You cannot view report details for this CV");
        }
        return cv.getStatus() == CV.CvStatus.BANNED;
    }

    private ReportDtos.AdminReportCase toCase(TargetKey key, List<ContentReport> reports) {
        if (reports.isEmpty()) throw AppException.notFound("Pending reports", key.id());
        Instant first = reports.stream().map(ContentReport::getCreatedAt).min(Instant::compareTo).orElse(null);
        Instant latest = reports.stream().map(ContentReport::getCreatedAt).max(Instant::compareTo).orElse(null);
        List<String> reasons = reports.stream().map(report -> report.getReason().name()).distinct().toList();
        if (key.type() == ContentReport.TargetType.JOB) {
            Job job = jobRepo.findByIdWithRecruiter(key.id()).orElseThrow(() -> AppException.notFound("Job", key.id()));
            return new ReportDtos.AdminReportCase("JOB", key.id(), job.getTitle(), job.getRecruiter().getEmail(),
                    job.getStatus().name(), reports.size(), reasons, first, latest);
        }
        CV cv = cvRepo.findById(key.id()).orElseThrow(() -> AppException.notFound("CV", key.id()));
        return new ReportDtos.AdminReportCase("CV", key.id(), cv.getDisplayName(),
                cv.getCandidate().getUser().getEmail(), cv.getStatus().name(), reports.size(), reasons, first, latest);
    }

    private ReportDtos.TargetContentDetail targetDetail(ContentReport.TargetType type, UUID targetId) {
        if (type == ContentReport.TargetType.JOB) {
            Job job = jobRepo.findByIdWithRecruiter(targetId).orElseThrow(() -> AppException.notFound("Job", targetId));
            return new ReportDtos.TargetContentDetail("JOB", targetId, job.getTitle(), job.getRecruiter().getEmail(),
                    job.getStatus().name(), job.getCompany(), job.getLocation(), job.getOriginalText(),
                    parseList(job.getRequiredSkillsJson()), job.getRecruiter().getEmail());
        }
        CV cv = cvRepo.findById(targetId).orElseThrow(() -> AppException.notFound("CV", targetId));
        return new ReportDtos.TargetContentDetail("CV", targetId, cv.getDisplayName(),
                cv.getCandidate().getUser().getEmail(), cv.getStatus().name(), null,
                cv.getCandidate().getLocation(), cv.getRawText(), parseList(cv.getTopSkillsJson()),
                cv.getCandidate().getUser().getEmail());
    }

    private ReportDtos.ReportItem toItem(ContentReport report, boolean includePrivate) {
        return new ReportDtos.ReportItem(report.getId(), report.getReason().name(),
                includePrivate ? report.getComment() : null, report.getStatus().name(),
                includePrivate ? report.getReporter().getEmail() : null,
                report.getCreatedAt(), report.getResolvedAt());
    }

    private UserAccount requireRole(UUID userId, UserAccount.Role role) {
        UserAccount user = userRepo.findById(userId).orElseThrow(() -> AppException.notFound("User", userId));
        if (user.getRole() != role) throw AppException.forbidden("This action requires role " + role);
        return user;
    }

    private List<String> parseList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return objectMapper.readValue(json, LIST_TYPE); }
        catch (Exception ignored) { return List.of(); }
    }

    private String normalizeComment(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private String normalizeNote(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private void audit(UUID actorId, String action, String targetType, UUID targetId, String metadata) {
        String safeMetadata = metadata == null ? "" : metadata.replace("\\", "\\\\").replace("\"", "\\\"");
        auditRepo.save(new AuditLog(AuditLog.ActorType.USER, actorId, action)
                .withTarget(targetType, targetId)
                .withChannel(AuditLog.SourceChannel.WEB)
                .withMetadata("{\"detail\":\"" + safeMetadata + "\"}"));
    }

    private record TargetKey(ContentReport.TargetType type, UUID id) {}
}
