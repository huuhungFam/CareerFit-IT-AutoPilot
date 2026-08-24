package com.careerfit.backend.report;

import com.careerfit.backend.application.repository.ApplicationRepository;
import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.careerfit.backend.matching.repository.MatchingRepository;
import com.careerfit.backend.report.dto.ReportDtos;
import com.careerfit.backend.report.entity.ContentReport;
import com.careerfit.backend.report.repository.ContentReportRepository;
import com.careerfit.backend.report.service.ContentReportService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ContentReportServiceTest {
    private final UUID userId = UUID.randomUUID();
    private final UUID targetId = UUID.randomUUID();
    private ContentReportRepository reportRepo;
    private UserAccountRepository userRepo;
    private JobRepository jobRepo;
    private CVRepository cvRepo;
    private ApplicationRepository applicationRepo;
    private MatchingRepository matchingRepo;
    private ContentReportService service;

    @BeforeEach
    void setUp() {
        reportRepo = mock(ContentReportRepository.class);
        userRepo = mock(UserAccountRepository.class);
        jobRepo = mock(JobRepository.class);
        cvRepo = mock(CVRepository.class);
        applicationRepo = mock(ApplicationRepository.class);
        matchingRepo = mock(MatchingRepository.class);
        service = new ContentReportService(reportRepo, userRepo, jobRepo, cvRepo,
                applicationRepo, matchingRepo, mock(AuditLogRepository.class), new ObjectMapper());
        when(reportRepo.saveAndFlush(any(ContentReport.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void candidateReportIncrementsPendingJobCounter() {
        UserAccount candidate = user(UserAccount.Role.CANDIDATE);
        Job job = mock(Job.class);
        when(job.getStatus()).thenReturn(Job.JobStatus.ACTIVE);
        when(job.getPendingReportCount()).thenReturn(2);
        when(userRepo.findById(userId)).thenReturn(Optional.of(candidate));
        when(jobRepo.findByIdForUpdate(targetId)).thenReturn(Optional.of(job));

        service.reportJob(targetId, userId,
                new ReportDtos.CreateReportRequest("FRAUD_SCAM", "Yêu cầu đóng phí", null));

        verify(job).setPendingReportCount(3);
        verify(jobRepo).save(job);
        verify(reportRepo).saveAndFlush(any(ContentReport.class));
    }

    @Test
    void duplicatePendingReportIsRejected() {
        UserAccount candidate = user(UserAccount.Role.CANDIDATE);
        Job job = mock(Job.class);
        when(job.getStatus()).thenReturn(Job.JobStatus.ACTIVE);
        when(userRepo.findById(userId)).thenReturn(Optional.of(candidate));
        when(jobRepo.findByIdForUpdate(targetId)).thenReturn(Optional.of(job));
        when(reportRepo.existsByReporterIdAndTargetTypeAndTargetIdAndStatus(
                userId, ContentReport.TargetType.JOB, targetId, ContentReport.ReportStatus.PENDING)).thenReturn(true);

        assertThatThrownBy(() -> service.reportJob(targetId, userId,
                new ReportDtos.CreateReportRequest("SPAM", null, null)))
                .hasMessageContaining("already have a pending report");
        verify(jobRepo, never()).save(any());
    }

    @Test
    void recruiterCannotReportCvOutsideOwnedJobRelationship() {
        UUID jobId = UUID.randomUUID();
        UserAccount recruiter = user(UserAccount.Role.RECRUITER);
        Job job = mock(Job.class);
        when(job.getRecruiter()).thenReturn(recruiter);
        when(userRepo.findById(userId)).thenReturn(Optional.of(recruiter));
        when(jobRepo.findByIdWithRecruiter(jobId)).thenReturn(Optional.of(job));

        assertThatThrownBy(() -> service.reportCv(targetId, userId,
                new ReportDtos.CreateReportRequest("FALSE_INFORMATION", null, jobId)))
                .hasMessageContaining("not visible");
        verify(cvRepo, never()).findByIdForUpdate(any());
    }

    @Test
    void recruiterCanReportCvReachedThroughOwnedJobMatching() {
        UUID jobId = UUID.randomUUID();
        UserAccount recruiter = user(UserAccount.Role.RECRUITER);
        Job job = mock(Job.class);
        CV cv = mock(CV.class);
        when(job.getId()).thenReturn(jobId);
        when(job.getRecruiter()).thenReturn(recruiter);
        when(userRepo.findById(userId)).thenReturn(Optional.of(recruiter));
        when(jobRepo.findByIdWithRecruiter(jobId)).thenReturn(Optional.of(job));
        when(matchingRepo.findByCvIdAndJobId(targetId, jobId)).thenReturn(Optional.of(mock(com.careerfit.backend.matching.entity.Matching.class)));
        when(cvRepo.findByIdForUpdate(targetId)).thenReturn(Optional.of(cv));
        when(cv.getStatus()).thenReturn(CV.CvStatus.SCORING_DONE);
        when(cv.getPendingReportCount()).thenReturn(0);

        service.reportCv(targetId, userId,
                new ReportDtos.CreateReportRequest("FALSE_INFORMATION", "Experience cannot be verified", jobId));

        verify(cv).setPendingReportCount(1);
        verify(cvRepo).save(cv);
        verify(reportRepo).saveAndFlush(any(ContentReport.class));
    }

    @Test
    void recruiterWithMatchingCanViewCvReportSummary() {
        UserAccount recruiter = user(UserAccount.Role.RECRUITER);
        CV cv = mock(CV.class);
        when(userRepo.findById(userId)).thenReturn(Optional.of(recruiter));
        when(cvRepo.findById(targetId)).thenReturn(Optional.of(cv));
        when(applicationRepo.existsByCvIdAndJobRecruiterId(targetId, userId)).thenReturn(false);
        when(matchingRepo.existsByCvIdAndJobRecruiterId(targetId, userId)).thenReturn(true);
        when(cv.getStatus()).thenReturn(CV.CvStatus.SCORING_DONE);
        when(reportRepo.findByTargetTypeAndTargetIdAndStatusOrderByCreatedAtDesc(
                ContentReport.TargetType.CV, targetId, ContentReport.ReportStatus.PENDING)).thenReturn(List.of());

        var summary = service.getSummary(ContentReport.TargetType.CV, targetId, userId);

        assertThat(summary.pendingCount()).isZero();
        verify(matchingRepo).existsByCvIdAndJobRecruiterId(targetId, userId);
    }

    @Test
    void adminBanMarksCvBannedAndResolvesEveryPendingReport() {
        UserAccount admin = user(UserAccount.Role.ADMIN);
        UserAccount reporter = user(UserAccount.Role.RECRUITER);
        CV cv = mock(CV.class);
        ContentReport first = new ContentReport(reporter, ContentReport.TargetType.CV, targetId,
                ContentReport.Reason.FALSE_INFORMATION, "Fake experience");
        ContentReport second = new ContentReport(reporter, ContentReport.TargetType.CV, targetId,
                ContentReport.Reason.IMPERSONATION, null);
        when(userRepo.findById(userId)).thenReturn(Optional.of(admin));
        when(cvRepo.findByIdForUpdate(targetId)).thenReturn(Optional.of(cv));
        when(reportRepo.findByTargetTypeAndTargetIdAndStatusOrderByCreatedAtDesc(
                ContentReport.TargetType.CV, targetId, ContentReport.ReportStatus.PENDING))
                .thenReturn(List.of(first, second));

        service.ban(ContentReport.TargetType.CV, targetId, userId, "Confirmed by admin");

        verify(cv).setStatus(CV.CvStatus.BANNED);
        verify(cv).setDefault(false);
        verify(cv).setPendingReportCount(0);
        assertThat(first.getStatus()).isEqualTo(ContentReport.ReportStatus.ACTIONED);
        assertThat(second.getStatus()).isEqualTo(ContentReport.ReportStatus.ACTIONED);
        verify(reportRepo).saveAll(List.of(first, second));
    }

    private UserAccount user(UserAccount.Role role) {
        UserAccount user = mock(UserAccount.class);
        when(user.getId()).thenReturn(userId);
        when(user.getRole()).thenReturn(role);
        return user;
    }
}
