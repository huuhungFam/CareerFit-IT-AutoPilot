package com.careerfit.backend.application.service;

import com.careerfit.backend.application.dto.ApplicationDtos;
import com.careerfit.backend.application.entity.Application;
import com.careerfit.backend.application.repository.ApplicationRepository;
import com.careerfit.backend.audit.entity.AuditLog;
import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.candidate.entity.Candidate;
import com.careerfit.backend.candidate.repository.CandidateRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.matching.repository.MatchingRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ApplicationService {

    private static final Logger log = LoggerFactory.getLogger(ApplicationService.class);
    private static final TypeReference<List<String>> LIST_TYPE = new TypeReference<>() {};

    private final ApplicationRepository appRepo;
    private final CandidateRepository candidateRepo;
    private final JobRepository jobRepo;
    private final CVRepository cvRepo;
    private final MatchingRepository matchingRepo;
    private final AuditLogRepository auditRepo;
    private final ObjectMapper objectMapper;

    public ApplicationService(ApplicationRepository appRepo,
                               CandidateRepository candidateRepo,
                               JobRepository jobRepo,
                               CVRepository cvRepo,
                               MatchingRepository matchingRepo,
                               AuditLogRepository auditRepo,
                               ObjectMapper objectMapper) {
        this.appRepo = appRepo;
        this.candidateRepo = candidateRepo;
        this.jobRepo = jobRepo;
        this.cvRepo = cvRepo;
        this.matchingRepo = matchingRepo;
        this.auditRepo = auditRepo;
        this.objectMapper = objectMapper;
    }

    // ── Candidate: Submit application ─────────────────────────────────────

    @Transactional
    public ApplicationDtos.MyApplicationResponse submit(UUID userId,
            ApplicationDtos.SubmitApplicationRequest req) {

        Candidate candidate = resolveCandidate(userId);
        Job job = jobRepo.findByIdWithRecruiter(req.jobId())
                .orElseThrow(() -> AppException.notFound("Job", req.jobId()));

        if (job.getStatus() != Job.JobStatus.ACTIVE) {
            throw AppException.badRequest("Job is no longer accepting applications");
        }

        if (appRepo.existsByCandidateIdAndJobId(candidate.getId(), req.jobId())) {
            throw AppException.conflict("You have already applied to this job");
        }

        // Resolve CV — explicit or default
        CV cv = resolveCv(candidate, req.cvId());

        // Link to matching if exists
        Matching matching = matchingRepo.findByCvIdAndJobId(cv.getId(), req.jobId())
                .orElse(null);

        Application application = new Application(candidate, job, cv, matching, false);
        if (req.coverLetter() != null) application.setCoverLetter(req.coverLetter());

        try {
            appRepo.saveAndFlush(application);
        } catch (DataIntegrityViolationException e) {
            throw AppException.conflict("You have already applied to this job");
        }

        auditRepo.save(new AuditLog(AuditLog.ActorType.USER, userId, "APPLICATION_SUBMITTED")
                .withTarget("Job", req.jobId())
                .withChannel(AuditLog.SourceChannel.WEB));

        log.info("Application submitted: candidate={} job={}", candidate.getId(), req.jobId());
        return toMyApplicationResponse(application, matching);
    }

    // ── Candidate: withdraw ───────────────────────────────────────────────

    @Transactional
    public void withdraw(UUID applicationId, UUID userId) {
        Application app = resolveAndAuthorizeCandidate(applicationId, userId);

        if (app.getStatus() == Application.ApplicationStatus.APPROVED ||
            app.getStatus() == Application.ApplicationStatus.REJECTED) {
            throw AppException.badRequest("Cannot withdraw a finalised application");
        }

        app.setStatus(Application.ApplicationStatus.NOT_INTERESTED);
        appRepo.save(app);

        auditRepo.save(new AuditLog(AuditLog.ActorType.USER, userId, "APPLICATION_WITHDRAWN")
                .withTarget("Application", applicationId)
                .withChannel(AuditLog.SourceChannel.WEB));
        log.info("Application {} withdrawn by user={}", applicationId, userId);
    }

    // ── Candidate: my applications ────────────────────────────────────────

    @Transactional(readOnly = true)
    public ApplicationDtos.MyApplicationPageResponse getMyApplications(UUID userId,
            int page, int size) {
        Candidate candidate = resolveCandidate(userId);
        Page<Application> resultPage = appRepo.findByCandidateIdOrderByAppliedAtDesc(
                candidate.getId(), PageRequest.of(page, Math.min(size, 50)));

        List<ApplicationDtos.MyApplicationResponse> responses = resultPage.getContent().stream()
                .map(a -> toMyApplicationResponse(a, a.getMatching()))
                .toList();

        return new ApplicationDtos.MyApplicationPageResponse(
                responses, resultPage.getTotalElements(),
                page, size, resultPage.getTotalPages());
    }

    // ── Recruiter: view applicants ────────────────────────────────────────

    @Transactional(readOnly = true)
    public ApplicationDtos.ApplicantPageResponse getJobApplicants(UUID jobId, UUID recruiterId,
            String statusFilter, int page, int size) {

        Job job = jobRepo.findByIdWithRecruiter(jobId)
                .orElseThrow(() -> AppException.notFound("Job", jobId));

        if (!job.getRecruiter().getId().equals(recruiterId)) {
            throw AppException.forbidden("You do not own this job");
        }

        Application.ApplicationStatus status = null;
        if (statusFilter != null && !statusFilter.isBlank()) {
            try { status = Application.ApplicationStatus.valueOf(statusFilter.toUpperCase()); }
            catch (Exception ignored) {}
        }

        Page<Application> resultPage = appRepo.findByJobId(jobId, status,
                PageRequest.of(page, Math.min(size, 50)));

        List<ApplicationDtos.ApplicantResponse> applicants = resultPage.getContent().stream()
                .map(this::toApplicantResponse)
                .toList();

        return new ApplicationDtos.ApplicantPageResponse(
                jobId, job.getTitle(), applicants,
                resultPage.getTotalElements(), page, size,
                resultPage.getTotalPages());
    }

    // ── Recruiter: update application status ─────────────────────────────

    @Transactional
    public void updateStatus(UUID applicationId, UUID recruiterId,
                              ApplicationDtos.UpdateApplicationStatusRequest req) {
        Application app = appRepo.findByIdWithDetails(applicationId)
                .orElseThrow(() -> AppException.notFound("Application", applicationId));

        if (!app.getJob().getRecruiter().getId().equals(recruiterId)) {
            throw AppException.forbidden("You do not own this application's job");
        }

        Application.ApplicationStatus newStatus;
        try {
            newStatus = Application.ApplicationStatus.valueOf(req.status().toUpperCase());
        } catch (Exception e) {
            throw AppException.badRequest("Invalid status: " + req.status());
        }

        app.setStatus(newStatus);
        if (req.recruiterNotes() != null) app.setRecruiterNotes(req.recruiterNotes());
        try {
            appRepo.saveAndFlush(app);
        } catch (DataIntegrityViolationException e) {
            throw AppException.conflict("Application status update conflicted with another write");
        }

        auditRepo.save(new AuditLog(AuditLog.ActorType.USER, recruiterId, "APPLICATION_STATUS_UPDATED")
                .withTarget("Application", applicationId)
                .withMetadata("{\"status\":\"" + req.status() + "\"}"));

        log.info("Application {} status updated to {} by recruiter={}", applicationId, req.status(), recruiterId);
    }

    // ── Mappers ───────────────────────────────────────────────────────────

    private ApplicationDtos.MyApplicationResponse toMyApplicationResponse(Application app,
                                                                            Matching matching) {
        return new ApplicationDtos.MyApplicationResponse(
                app.getId(),
                app.getJob().getId(),
                app.getJob().getTitle(),
                app.getJob().getCompany(),
                app.getStatus().name(),
                app.isAutoApplied(),
                app.getCoverLetter(),
                matching != null ? matching.getNormalizedScore().doubleValue() : null,
                matching != null ? matching.getLabel().name() : null,
                app.getAppliedAt(),
                app.getUpdatedAt()
        );
    }

    private ApplicationDtos.ApplicantResponse toApplicantResponse(Application app) {
        Candidate candidate = app.getCandidate();
        var user = candidate.getUser();
        CV cv = app.getCv();
        Matching matching = app.getMatching();

        return new ApplicationDtos.ApplicantResponse(
                app.getId(),
                candidate.getId(),
                cv != null ? cv.getId() : null,
                user.getFullName(),
                user.getEmail(),
                candidate.getDesiredTitle(),
                candidate.getLocation(),
                candidate.getYearsOfExperience(),
                cv != null ? parseList(cv.getTopSkillsJson()) : List.of(),
                cv != null ? cv.getParsedSummary() : null,
                matching != null ? matching.getNormalizedScore().doubleValue() : null,
                matching != null ? matching.getLabel().name() : null,
                app.getStatus().name(),
                app.isAutoApplied(),
                app.getCoverLetter(),
                app.getAppliedAt()
        );
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private Candidate resolveCandidate(UUID userId) {
        return candidateRepo.findByUserId(userId)
                .orElseThrow(() -> AppException.notFound("Candidate", userId));
    }

    private CV resolveCv(Candidate candidate, UUID requestedCvId) {
        if (requestedCvId != null) {
            CV cv = cvRepo.findById(requestedCvId)
                    .orElseThrow(() -> AppException.notFound("CV", requestedCvId));
            if (!cv.getCandidate().getId().equals(candidate.getId())) {
                throw AppException.forbidden("CV does not belong to you");
            }
            return cv;
        }
        return cvRepo.findByCandidateIdAndIsDefaultTrue(candidate.getId())
                .orElseThrow(() -> AppException.badRequest(
                        "No default CV found. Please upload or specify a CV."));
    }

    private Application resolveAndAuthorizeCandidate(UUID applicationId, UUID userId) {
        Application app = appRepo.findByIdWithDetails(applicationId)
                .orElseThrow(() -> AppException.notFound("Application", applicationId));
        Candidate candidate = resolveCandidate(userId);
        if (!app.getCandidate().getId().equals(candidate.getId())) {
            throw AppException.forbidden("You do not own this application");
        }
        return app;
    }

    private List<String> parseList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return objectMapper.readValue(json, LIST_TYPE); }
        catch (Exception e) { return List.of(); }
    }
}
