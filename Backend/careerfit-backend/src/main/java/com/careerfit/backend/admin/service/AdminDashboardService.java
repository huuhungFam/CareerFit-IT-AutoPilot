package com.careerfit.backend.admin.service;

import com.careerfit.backend.admin.dto.AdminDashboardResponse;
import com.careerfit.backend.application.repository.ApplicationRepository;
import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.candidate.repository.CandidateRepository;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.matching.repository.MatchingRepository;
import com.careerfit.backend.notification.entity.EmailAction;
import com.careerfit.backend.notification.repository.EmailActionRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class AdminDashboardService {

    private final CandidateRepository candidateRepo;
    private final UserAccountRepository userRepo;
    private final JobRepository jobRepo;
    private final ApplicationRepository applicationRepo;
    private final MatchingRepository matchingRepo;
    private final EmailActionRepository emailActionRepo;
    private final AuditLogRepository auditRepo;

    public AdminDashboardService(CandidateRepository candidateRepo,
                                 UserAccountRepository userRepo,
                                 JobRepository jobRepo,
                                 ApplicationRepository applicationRepo,
                                 MatchingRepository matchingRepo,
                                 EmailActionRepository emailActionRepo,
                                 AuditLogRepository auditRepo) {
        this.candidateRepo = candidateRepo;
        this.userRepo = userRepo;
        this.jobRepo = jobRepo;
        this.applicationRepo = applicationRepo;
        this.matchingRepo = matchingRepo;
        this.emailActionRepo = emailActionRepo;
        this.auditRepo = auditRepo;
    }

    public AdminDashboardResponse getDashboardMetrics() {
        long totalCandidates = candidateRepo.count();
        long totalRecruiters = userRepo.countByRole(UserAccount.Role.RECRUITER);
        long activeJobs = jobRepo.countByStatus(Job.JobStatus.ACTIVE);
        long applications = applicationRepo.count();
        long highMatches = matchingRepo.countByLabel(Matching.MatchLabel.HIGH);
        long potentialMatches = matchingRepo.countByIsPotentialTrue();
        
        Instant startOfDay = Instant.now().truncatedTo(ChronoUnit.DAYS);
        long emailActionsSentToday = emailActionRepo.countByCreatedAtAfter(startOfDay);
        long failedEmailActions = 0; // MVP placeholder as EmailAction doesn't have FAILED status right now
        long pendingAutomationActions = emailActionRepo.countByStatus(EmailAction.ActionStatus.PENDING);
        
        // MVP placeholder for system errors
        long systemErrorsLast24h = 0; 
        
        return new AdminDashboardResponse(
                totalCandidates,
                totalRecruiters,
                activeJobs,
                applications,
                highMatches,
                potentialMatches,
                emailActionsSentToday,
                failedEmailActions,
                pendingAutomationActions,
                systemErrorsLast24h,
                Instant.now()
        );
    }
}
