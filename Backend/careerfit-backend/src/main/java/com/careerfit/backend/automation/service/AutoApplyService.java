package com.careerfit.backend.automation.service;

import com.careerfit.backend.application.entity.Application;
import com.careerfit.backend.application.repository.ApplicationRepository;
import com.careerfit.backend.audit.entity.AuditLog;
import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.automation.entity.AutomationPolicy;
import com.careerfit.backend.candidate.repository.CandidateRepository;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.matching.repository.MatchingRepository;
import com.careerfit.backend.notification.service.NotificationEmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AutoApplyService {

    private static final Logger log = LoggerFactory.getLogger(AutoApplyService.class);
    private static final int MAX_AUTO_APPLY_PER_RUN = 3;

    private final CandidateRepository candidateRepo;
    private final CVRepository cvRepo;
    private final MatchingRepository matchingRepo;
    private final ApplicationRepository applicationRepo;
    private final AuditLogRepository auditRepo;
    private final NotificationEmailService notificationEmailService;

    public AutoApplyService(CandidateRepository candidateRepo,
                            CVRepository cvRepo,
                            MatchingRepository matchingRepo,
                            ApplicationRepository applicationRepo,
                            AuditLogRepository auditRepo,
                            NotificationEmailService notificationEmailService) {
        this.candidateRepo = candidateRepo;
        this.cvRepo = cvRepo;
        this.matchingRepo = matchingRepo;
        this.applicationRepo = applicationRepo;
        this.auditRepo = auditRepo;
        this.notificationEmailService = notificationEmailService;
    }

    @Transactional
    public int runForPolicy(AutomationPolicy policy) {
        var candidateOpt = candidateRepo.findByUserId(policy.getUser().getId());
        if (candidateOpt.isEmpty()) return 0;

        var candidate = candidateOpt.get();
        CV cv = cvRepo.findByCandidateIdAndIsDefaultTrue(candidate.getId()).orElse(null);
        if (cv == null || cv.getStatus() != CV.CvStatus.SCORING_DONE) return 0;

        double threshold = policy.getAutoApplyThreshold().doubleValue();
        List<Matching> matches = matchingRepo.findTopMatchesByCvId(cv.getId(), PageRequest.of(0, 20));

        int created = 0;
        for (Matching matching : matches) {
            if (created >= MAX_AUTO_APPLY_PER_RUN) break;
            Job job = matching.getJob();
            if (job == null || job.getStatus() != Job.JobStatus.ACTIVE) continue;
            if (matching.getNormalizedScore().doubleValue() < threshold) continue;
            if (applicationRepo.existsByCandidateIdAndJobId(candidate.getId(), job.getId())) continue;

            Application application = new Application(candidate, job, cv, matching, true);
            try {
                applicationRepo.saveAndFlush(application);
            } catch (DataIntegrityViolationException e) {
                log.info("Auto-apply skipped duplicate candidate={} job={}", candidate.getId(), job.getId());
                continue;
            }

            auditRepo.save(new AuditLog(AuditLog.ActorType.SYSTEM, policy.getUser().getId(), "AUTO_APPLY_EXECUTED")
                    .withTarget("Job", job.getId())
                    .withChannel(AuditLog.SourceChannel.AUTOPILOT)
                    .withMetadata("{\"matchingId\":\"" + matching.getId() + "\",\"score\":" + matching.getNormalizedScore() + "}"));

            notificationEmailService.sendAutoApplied(application);
            notificationEmailService.sendRecruiterNewApplication(application);
            created++;
        }

        return created;
    }
}
