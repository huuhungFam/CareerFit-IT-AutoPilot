package com.careerfit.backend.matching.service;

import com.careerfit.backend.audit.entity.AuditLog;
import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.automation.service.AutomationPolicyService;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.matching.repository.MatchingRepository;
import com.careerfit.backend.notification.service.EmailActionService;
import com.careerfit.backend.notification.service.NotificationEmailService;
import com.careerfit.backend.notification.service.OutboxService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Orchestrates matching of a single CV against all eligible ACTIVE jobs.
 * Runs asynchronously after CV processing is complete.
 */
@Service
public class MatchingService {

    private static final Logger log = LoggerFactory.getLogger(MatchingService.class);

    private final JobRepository jobRepo;
    private final MatchingRepository matchingRepo;
    private final ScoringService scoringService;
    private final AuditLogRepository auditRepo;
    private final ObjectMapper objectMapper;
    private final NotificationEmailService notificationEmailService;
    private final CVRepository cvRepo;
    private final AutomationPolicyService automationPolicyService;
    private final EmailActionService emailActionService;
    private final OutboxService outboxService;

    public MatchingService(JobRepository jobRepo,
                           MatchingRepository matchingRepo,
                           ScoringService scoringService,
                           AuditLogRepository auditRepo,
                           ObjectMapper objectMapper,
                           NotificationEmailService notificationEmailService,
                           CVRepository cvRepo,
                           AutomationPolicyService automationPolicyService,
                           EmailActionService emailActionService,
                           OutboxService outboxService) {
        this.jobRepo = jobRepo;
        this.matchingRepo = matchingRepo;
        this.scoringService = scoringService;
        this.auditRepo = auditRepo;
        this.objectMapper = objectMapper;
        this.notificationEmailService = notificationEmailService;
        this.cvRepo = cvRepo;
        this.automationPolicyService = automationPolicyService;
        this.emailActionService = emailActionService;
        this.outboxService = outboxService;
    }

    /**
     * Score a CV against all active jobs.
     * Runs in background thread (called after CV vectorization completes).
     */
    @Transactional
    public void scoreAllJobsForCv(UUID cvId) {
        CV cv = cvRepo.findById(cvId).orElse(null);
        if (cv == null) {
            log.warn("Skipping matching because CV no longer exists: {}", cvId);
            return;
        }
        log.info("Starting batch matching for CV id={}", cv.getId());

        List<Job> activeJobs = jobRepo.findByStatus(Job.JobStatus.ACTIVE);
        int scored = 0;
        int skipped = 0;

        for (Job job : activeJobs) {
            // Language filter: match same-language docs, or allow cross-language
            if (!isLanguageCompatible(cv.getLanguage(), job.getLanguage())) {
                skipped++;
                continue;
            }

            try {
                upsertMatching(cv, job);
                scored++;
            } catch (Exception e) {
                log.error("Failed to score CV={} against Job={}: {}", cv.getId(), job.getId(), e.getMessage());
            }
        }

        log.info("Batch matching done for CV={}. Scored={}, Skipped={}", cv.getId(), scored, skipped);
        notifyCandidateAfterScoring(cv, activeJobs.size(), scored);

        auditRepo.save(new AuditLog(AuditLog.ActorType.SYSTEM, null, "CV_BATCH_MATCH_DONE")
                .withTarget("CV", cv.getId())
                .withMetadata("{\"scored\":" + scored + ",\"skipped\":" + skipped + "}"));
    }

    /**
     * Recompute matching for a specific CV-Job pair (triggered by Rocchio update or JD change).
     */
    @Transactional
    public void recomputeMatching(CV cv, Job job) {
        upsertMatching(cv, job);
    }

    /**
     * Score a single job against all CVs that belong to candidate (used when new job is created/updated).
     */
    @Transactional
    public void scoreJobAgainstAllCvs(UUID jobId) {
        Job job = jobRepo.findById(jobId).orElse(null);
        if (job == null || job.getStatus() != Job.JobStatus.ACTIVE) {
            log.warn("Skipping matching because job no longer exists: {}", jobId);
            return;
        }
        log.info("Scoring job id={} against all CVs...", job.getId());
        List<CV> cvs = cvRepo.findByStatus(CV.CvStatus.SCORING_DONE);
        int scored = 0;
        for (CV cv : cvs) {
            if (!isLanguageCompatible(cv.getLanguage(), job.getLanguage())) continue;
            try {
                upsertMatching(cv, job);
                scored++;
            } catch (Exception e) {
                log.error("Failed to score Job={} against CV={}: {}", job.getId(), cv.getId(), e.getMessage());
            }
        }
        log.info("Job {} matching complete. CVs={}, scored={}", job.getId(), cvs.size(), scored);
        job.setMatchingRecoveryNeeded(false);
        jobRepo.save(job);
    }

    // ── Core upsert ───────────────────────────────────────────────────────

    private Matching upsertMatching(CV cv, Job job) {
        ScoringService.ScoringResult result = scoringService.score(cv, job);

        Optional<Matching> existing = matchingRepo.findByCvIdAndJobId(cv.getId(), job.getId());

        Matching matching = existing.orElse(new Matching(
                cv, job,
                result.rawScore(),
                result.normalizedScore(),
                result.label()
        ));

        matching.setRawScore(result.rawScore());
        matching.setNormalizedScore(result.normalizedScore());
        matching.setLabel(result.label());
        matching.setPotential(result.isPotential());
        matching.setNeedsRecompute(false);

        try {
            matching.setMatchReasonsJson(objectMapper.writeValueAsString(result.matchReasons()));
            if (result.potentialReason() != null) {
                matching.setPotentialReasonJson(objectMapper.writeValueAsString(result.potentialReason()));
            }
        } catch (Exception e) {
            log.warn("Failed to serialize match reasons: {}", e.getMessage());
        }

        try {
            matching = matchingRepo.saveAndFlush(matching);
        } catch (DataIntegrityViolationException e) {
            Matching concurrent = matchingRepo.findByCvIdAndJobId(cv.getId(), job.getId())
                    .orElseThrow(() -> e);
            concurrent.setRawScore(result.rawScore());
            concurrent.setNormalizedScore(result.normalizedScore());
            concurrent.setLabel(result.label());
            concurrent.setPotential(result.isPotential());
            concurrent.setNeedsRecompute(false);
            concurrent.setMatchReasonsJson(matching.getMatchReasonsJson());
            concurrent.setPotentialReasonJson(matching.getPotentialReasonJson());
            matching = matchingRepo.saveAndFlush(concurrent);
        }
        enqueueEligibleMatch(matching);
        return matching;
    }

    /** Both event and recovery paths arrive here, so the outbox unique key is the sole dedupe winner. */
    private void enqueueEligibleMatch(Matching matching) {
        if (matching.getLabel() != Matching.MatchLabel.HIGH) return;
        var candidate = matching.getCv().getCandidate().getUser();
        var policy = automationPolicyService.getOrCreate(candidate.getId());
        if (policy == null || !policy.isEmailNotificationsEnabled() || !policy.isHighMatchEmailEnabled()) return;
        if (matching.getNormalizedScore().doubleValue() < policy.getMinScoreToNotify()) return;
        outboxService.enqueueSuggestion(candidate.getId(), matching.getId(), matching.getJob().getId(),
                java.time.Instant.now(), policy.isDemoModeEnabled());
    }

    private boolean isLanguageCompatible(String cvLang, String jobLang) {
        if (cvLang == null || jobLang == null) return true; // unknown — allow
        return cvLang.equals(jobLang) || "en".equals(jobLang); // English jobs accept all CVs
    }

    private void notifyCandidateAfterScoring(CV cv, int activeJobCount, int scored) {
        var user = cv.getCandidate().getUser();
        if (activeJobCount == 0 || scored == 0) {
            notificationEmailService.sendNoMatches(user, cv.getDisplayName());
            return;
        }

        var best = matchingRepo.findTopMatchesByCvId(cv.getId(), PageRequest.of(0, 1))
                .stream()
                .findFirst()
                .orElse(null);
        if (best == null) {
            notificationEmailService.sendNoMatches(user, cv.getDisplayName());
            return;
        }
        double bestScore = best.getNormalizedScore().doubleValue();
        var policy = automationPolicyService.getOrCreate(user.getId());
        if (policy != null && policy.isEmailNotificationsEnabled()
                && policy.isHighMatchEmailEnabled()
                && bestScore >= policy.getMinScoreToNotify()
                && best.getLabel() == Matching.MatchLabel.HIGH) {
            enqueueEligibleMatch(best);
            return;
        }
        if (bestScore < 40.0) {
            notificationEmailService.sendLowMatches(user, bestScore);
        }
    }
}
