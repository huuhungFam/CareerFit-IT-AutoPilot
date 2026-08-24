package com.careerfit.backend.application.service;

import com.careerfit.backend.application.dto.ApplicationDtos;
import com.careerfit.backend.application.entity.Application;
import com.careerfit.backend.application.repository.ApplicationRepository;
import com.careerfit.backend.audit.entity.AuditLog;
import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.candidate.entity.Candidate;
import com.careerfit.backend.candidate.repository.CandidateRepository;
import com.careerfit.backend.candidate.service.CandidatePortfolioVisibilityService;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.matching.repository.MatchingRepository;
import com.careerfit.backend.notification.service.NotificationEmailService;
import com.careerfit.backend.notification.service.EmailActionService;
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
import java.time.Instant;
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
    private final NotificationEmailService notificationEmailService;
    private final CandidatePortfolioVisibilityService portfolioVisibilityService;
    private final EmailActionService emailActionService;

    public ApplicationService(ApplicationRepository appRepo,
                               CandidateRepository candidateRepo,
                               JobRepository jobRepo,
                               CVRepository cvRepo,
                               MatchingRepository matchingRepo,
                               AuditLogRepository auditRepo,
                               ObjectMapper objectMapper,
                               NotificationEmailService notificationEmailService,
                               CandidatePortfolioVisibilityService portfolioVisibilityService,
                               EmailActionService emailActionService) {
        this.appRepo = appRepo;
        this.candidateRepo = candidateRepo;
        this.jobRepo = jobRepo;
        this.cvRepo = cvRepo;
        this.matchingRepo = matchingRepo;
        this.auditRepo = auditRepo;
        this.objectMapper = objectMapper;
        this.notificationEmailService = notificationEmailService;
        this.portfolioVisibilityService = portfolioVisibilityService;
        this.emailActionService = emailActionService;
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
        if (!job.isInternalApplication()) {
            String source = job.getSourceUrl();
            throw AppException.conflict(source == null || source.isBlank()
                    ? "This imported job is externally hosted and cannot accept an internal CareerFit application"
                    : "This imported job is externally hosted. Apply at: " + source);
        }

        // Resolve CV — explicit or default
        CV cv = resolveCv(candidate, req.cvId());

        // Link to matching if exists
        Matching matching = matchingRepo.findByCvIdAndJobId(cv.getId(), req.jobId())
                .orElse(null);

        Application application = appRepo.findByCandidateIdAndJobId(candidate.getId(), req.jobId()).orElse(null);
        if (application != null && !application.isInvitationWithdrawn()) {
            throw AppException.conflict("You have already applied to this job");
        }
        if (application == null) {
            application = new Application(candidate, job, cv, matching, false);
        } else {
            application.setInvitationWithdrawn(false);
            application.setStatus(Application.ApplicationStatus.PENDING);
        }
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
        notificationEmailService.sendApplicationSubmitted(application);
        notificationEmailService.sendRecruiterNewApplication(application);
        return toMyApplicationResponse(application, matching);
    }

    /** Redeems an APPLY token against the CV/JD pair that generated the email. */
    @Transactional
    public ApplicationDtos.MyApplicationResponse submitFromEmail(UUID matchingId, UUID userId) {
        Matching matching = matchingRepo.findById(matchingId)
                .orElseThrow(() -> AppException.notFound("Matching", matchingId));
        Candidate candidate = resolveCandidate(userId);
        if (!matching.getCv().getCandidate().getId().equals(candidate.getId())) {
            throw AppException.forbidden("This application link belongs to another candidate");
        }
        Job job = matching.getJob();
        if (job.getStatus() != Job.JobStatus.ACTIVE || !job.isInternalApplication()) {
            throw AppException.badRequest("This job is no longer accepting applications");
        }
        CV cv = matching.getCv(); // Snapshot captured by the matching/email action.
        Application application = appRepo.findByCandidateIdAndJobId(candidate.getId(), job.getId()).orElse(null);
        if (application != null && !application.isInvitationWithdrawn()) {
            throw AppException.conflict("You have already applied to this job");
        }
        if (application == null) {
            application = new Application(candidate, job, cv, matching, false);
        } else {
            application.setInvitationWithdrawn(false);
            application.setStatus(Application.ApplicationStatus.PENDING);
        }
        try {
            appRepo.saveAndFlush(application);
        } catch (DataIntegrityViolationException e) {
            throw AppException.conflict("You have already applied to this job");
        }
        auditRepo.save(new AuditLog(AuditLog.ActorType.USER, userId, "APPLICATION_SUBMITTED_EMAIL")
                .withTarget("Job", job.getId()).withChannel(AuditLog.SourceChannel.EMAIL));
        notificationEmailService.sendApplicationSubmitted(application);
        notificationEmailService.sendRecruiterNewApplication(application);
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
        notificationEmailService.sendApplicationWithdrawn(app);
    }

    @Transactional
    public void respondToInvitation(UUID applicationId, UUID userId,
                                    ApplicationDtos.InvitationResponseRequest req) {
        Application app = resolveAndAuthorizeCandidate(applicationId, userId);
        if (!app.isInvitationOrigin() || app.isInvitationWithdrawn()
                || app.getStatus() != Application.ApplicationStatus.INVITED) {
            throw AppException.badRequest("This invitation is no longer available");
        }
        String decision = req == null || req.decision() == null ? "" : req.decision().trim().toUpperCase();
        if (!"ACCEPT".equals(decision) && !"DECLINE".equals(decision)) {
            throw AppException.badRequest("Invitation response must be ACCEPT or DECLINE");
        }

        app.setStatus("ACCEPT".equals(decision)
                ? Application.ApplicationStatus.PENDING
                : Application.ApplicationStatus.NOT_INTERESTED);
        appRepo.save(app);
        auditRepo.save(new AuditLog(AuditLog.ActorType.USER, userId,
                "ACCEPT".equals(decision) ? "CANDIDATE_INVITATION_ACCEPTED" : "CANDIDATE_INVITATION_DECLINED")
                .withTarget("Application", applicationId)
                .withChannel(AuditLog.SourceChannel.WEB));
        notificationEmailService.sendRecruiterCandidateRespondedToInvite(app, decision);
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
                page, size, resultPage.getTotalPages(),
                applicationListMeta(responses, resultPage.getTotalElements(), null));
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
                resultPage.getTotalPages(),
                applicationListMeta(applicants, resultPage.getTotalElements(), status));
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
        notificationEmailService.sendApplicationStatusChanged(app);
    }

    // ── Recruiter: invite not-yet-applied candidate ──────────────────────

    @Transactional
    public ApplicationDtos.ApplicantResponse inviteCandidate(UUID jobId, UUID candidateId, UUID recruiterId) {
        Job job = jobRepo.findByIdWithRecruiter(jobId)
                .orElseThrow(() -> AppException.notFound("Job", jobId));

        if (!job.getRecruiter().getId().equals(recruiterId)) {
            throw AppException.forbidden("You do not own this job");
        }
        if (job.getStatus() != Job.JobStatus.ACTIVE) {
            throw AppException.badRequest("Job is no longer accepting invitations");
        }

        Candidate candidate = candidateRepo.findById(candidateId)
                .orElseThrow(() -> AppException.notFound("Candidate", candidateId));

        Application existing = appRepo.findByCandidateIdAndJobId(candidateId, jobId).orElse(null);
        if (existing != null) {
            if (existing.isInvitationWithdrawn()) {
                existing.setInvitationWithdrawn(false);
                existing.setInvitationOrigin(true);
                existing.setStatus(Application.ApplicationStatus.INVITED);
                appRepo.saveAndFlush(existing);
                auditRepo.save(new AuditLog(AuditLog.ActorType.USER, recruiterId, "CANDIDATE_REINVITED")
                        .withTarget("Job", jobId)
                        .withMetadata("{\"candidateId\":\"" + candidateId + "\"}")
                        .withChannel(AuditLog.SourceChannel.WEB));
                emailActionService.sendRecruiterInvitation(existing);
            }
            return toApplicantResponse(existing);
        }

        CV cv = cvRepo.findByCandidateIdAndIsDefaultTrue(candidateId)
                .orElseThrow(() -> AppException.badRequest("Candidate has no default CV to invite"));
        Matching matching = matchingRepo.findByCvIdAndJobId(cv.getId(), jobId).orElse(null);

        Application invitation = new Application(candidate, job, cv, matching, false);
        invitation.setStatus(Application.ApplicationStatus.INVITED);
        invitation.setInvitationOrigin(true);

        try {
            appRepo.saveAndFlush(invitation);
        } catch (DataIntegrityViolationException e) {
            return appRepo.findByCandidateIdAndJobId(candidateId, jobId)
                    .map(this::toApplicantResponse)
                    .orElseThrow(() -> AppException.conflict("Candidate invitation conflicted with another write"));
        }

        auditRepo.save(new AuditLog(AuditLog.ActorType.USER, recruiterId, "CANDIDATE_INVITED")
                .withTarget("Job", jobId)
                .withMetadata("{\"candidateId\":\"" + candidateId + "\"}")
                .withChannel(AuditLog.SourceChannel.WEB));

        log.info("Candidate invited: candidate={} job={} recruiter={}", candidateId, jobId, recruiterId);
        emailActionService.sendRecruiterInvitation(invitation);
        return toApplicantResponse(invitation);
    }

    @Transactional
    public void withdrawInvitation(UUID applicationId, UUID recruiterId) {
        Application invitation = appRepo.findByIdWithDetails(applicationId)
                .orElseThrow(() -> AppException.notFound("Application", applicationId));
        if (!invitation.getJob().getRecruiter().getId().equals(recruiterId)) {
            throw AppException.forbidden("You do not own this invitation's job");
        }
        if (!invitation.isInvitationOrigin() || invitation.isInvitationWithdrawn()
                || invitation.getStatus() != Application.ApplicationStatus.INVITED) {
            throw AppException.badRequest("Only an active invitation can be withdrawn");
        }
        invitation.setInvitationWithdrawn(true);
        appRepo.save(invitation);
        auditRepo.save(new AuditLog(AuditLog.ActorType.USER, recruiterId, "CANDIDATE_INVITATION_WITHDRAWN")
                .withTarget("Application", applicationId)
                .withChannel(AuditLog.SourceChannel.WEB));
        notificationEmailService.sendInvitationWithdrawn(invitation);
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
        var portfolioVisibility = portfolioVisibilityService.buildForRecruiter(candidate, hasApplied(app));

        return new ApplicationDtos.ApplicantResponse(
                app.getId(),
                candidate.getId(),
                cv != null ? cv.getId() : null,
                user.getFullName(),
                user.getEmail(),
                candidate.getDesiredTitle(),
                candidate.getDesiredSeniority(),
                candidate.getLocation(),
                candidate.getYearsOfExperience(),
                candidate.getAboutMe(),
                cv != null ? parseList(cv.getTopSkillsJson()) : List.of(),
                cv != null ? cv.getParsedSummary() : null,
                matching != null ? matching.getNormalizedScore().doubleValue() : null,
                matching != null ? matching.getLabel().name() : null,
                matching != null && matching.isPotential(),
                matching != null ? parseList(matching.getMatchReasonsJson()) : List.of(),
                matching != null && matching.getPotentialReasonJson() != null ? matching.getPotentialReasonJson().replace("\"", "") : null,
                app.getStatus().name(),
                app.isAutoApplied(),
                app.getCoverLetter(),
                app.getAppliedAt(),
                portfolioVisibility.visible(),
                portfolioVisibility.portfolio(),
                portfolioVisibility.hiddenReason()
        );
    }

    private ApplicationDtos.ListMeta applicationListMeta(List<?> rows,
                                                         long total,
                                                         Application.ApplicationStatus statusFilter) {
        Instant generatedAt = Instant.now();
        Instant lastUpdatedAt = rows.stream()
                .map(this::extractUpdatedAt)
                .filter(java.util.Objects::nonNull)
                .max(Instant::compareTo)
                .orElse(null);
        String state = total == 0 ? "NO_MATCH" : rows.isEmpty() ? "NO_FILTERED_RESULTS" : "READY";
        String message = switch (state) {
            case "NO_MATCH" -> "No applications found.";
            case "NO_FILTERED_RESULTS" -> "No applications match the current page or filters.";
            default -> "Application results are ready.";
        };
        List<String> suggestions = switch (state) {
            case "NO_MATCH" -> List.of("Apply to a matched job or wait for a recruiter invitation.");
            case "NO_FILTERED_RESULTS" -> List.of("Clear status filters or move back to the first page.");
            default -> List.of();
        };
        if (statusFilter != null && "NO_MATCH".equals(state)) {
            suggestions = List.of("Clear the status filter to see all applications.");
        }
        return new ApplicationDtos.ListMeta(generatedAt, lastUpdatedAt, state, message, suggestions);
    }

    private Instant extractUpdatedAt(Object row) {
        if (row instanceof ApplicationDtos.MyApplicationResponse app) return app.updatedAt();
        if (row instanceof ApplicationDtos.ApplicantResponse app) return app.appliedAt();
        return null;
    }

    private boolean hasApplied(Application app) {
        return app.getStatus() != Application.ApplicationStatus.INVITED;
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
