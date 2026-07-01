package com.careerfit.backend;

import com.careerfit.backend.application.entity.Application;
import com.careerfit.backend.application.repository.ApplicationRepository;
import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.automation.entity.AutomationPolicy;
import com.careerfit.backend.automation.service.AutoApplyService;
import com.careerfit.backend.candidate.entity.Candidate;
import com.careerfit.backend.candidate.repository.CandidateRepository;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.matching.repository.MatchingRepository;
import com.careerfit.backend.notification.service.NotificationEmailService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AutoApplyServiceTest {

    @Mock CandidateRepository candidateRepo;
    @Mock CVRepository cvRepo;
    @Mock MatchingRepository matchingRepo;
    @Mock ApplicationRepository applicationRepo;
    @Mock AuditLogRepository auditRepo;
    @Mock NotificationEmailService notificationEmailService;

    @InjectMocks AutoApplyService service;

    @Test
    void createsAutoAppliedApplicationForEligibleMatch() {
        TestData data = testData(new BigDecimal("92.50"));
        data.policy.setAutoApplyThreshold(new BigDecimal("90"));

        when(candidateRepo.findByUserId(data.userId)).thenReturn(Optional.of(data.candidate));
        when(cvRepo.findByCandidateIdAndIsDefaultTrue(data.candidateId)).thenReturn(Optional.of(data.cv));
        when(matchingRepo.findTopMatchesByCvId(eq(data.cvId), any(Pageable.class))).thenReturn(List.of(data.matching));
        when(applicationRepo.existsByCandidateIdAndJobId(data.candidateId, data.jobId)).thenReturn(false);
        when(applicationRepo.saveAndFlush(any(Application.class))).thenAnswer(invocation -> invocation.getArgument(0));

        int created = service.runForPolicy(data.policy);

        assertThat(created).isEqualTo(1);
        ArgumentCaptor<Application> applicationCaptor = ArgumentCaptor.forClass(Application.class);
        verify(applicationRepo).saveAndFlush(applicationCaptor.capture());
        Application saved = applicationCaptor.getValue();
        assertThat(saved.getStatus()).isEqualTo(Application.ApplicationStatus.AUTO_APPLIED);
        assertThat(saved.isAutoApplied()).isTrue();
        verify(notificationEmailService).sendAutoApplied(saved);
        verify(notificationEmailService).sendRecruiterNewApplication(saved);
        verify(auditRepo).save(any());
    }

    @Test
    void skipsMatchBelowThreshold() {
        TestData data = testData(new BigDecimal("79.00"));
        data.policy.setAutoApplyThreshold(new BigDecimal("80"));

        when(candidateRepo.findByUserId(data.userId)).thenReturn(Optional.of(data.candidate));
        when(cvRepo.findByCandidateIdAndIsDefaultTrue(data.candidateId)).thenReturn(Optional.of(data.cv));
        when(matchingRepo.findTopMatchesByCvId(eq(data.cvId), any(Pageable.class))).thenReturn(List.of(data.matching));

        int created = service.runForPolicy(data.policy);

        assertThat(created).isZero();
        verify(applicationRepo, never()).saveAndFlush(any());
        verify(notificationEmailService, never()).sendAutoApplied(any());
        verify(auditRepo, never()).save(any());
    }

    @Test
    void createsAtMostThreeApplicationsPerRun() {
        TestData data = testData(new BigDecimal("95.00"));
        data.policy.setAutoApplyThreshold(new BigDecimal("80"));
        List<Matching> matches = List.of(
                data.matching,
                matchingFor(data, new BigDecimal("94.00")),
                matchingFor(data, new BigDecimal("93.00")),
                matchingFor(data, new BigDecimal("92.00")),
                matchingFor(data, new BigDecimal("91.00"))
        );

        when(candidateRepo.findByUserId(data.userId)).thenReturn(Optional.of(data.candidate));
        when(cvRepo.findByCandidateIdAndIsDefaultTrue(data.candidateId)).thenReturn(Optional.of(data.cv));
        when(matchingRepo.findTopMatchesByCvId(eq(data.cvId), any(Pageable.class))).thenReturn(matches);
        when(applicationRepo.existsByCandidateIdAndJobId(eq(data.candidateId), any(UUID.class))).thenReturn(false);
        when(applicationRepo.saveAndFlush(any(Application.class))).thenAnswer(invocation -> invocation.getArgument(0));

        int created = service.runForPolicy(data.policy);

        assertThat(created).isEqualTo(3);
        verify(applicationRepo, times(3)).saveAndFlush(any(Application.class));
        verify(notificationEmailService, times(3)).sendAutoApplied(any(Application.class));
        verify(notificationEmailService, times(3)).sendRecruiterNewApplication(any(Application.class));
    }

    @Test
    void skipsExistingApplicationForSameCandidateAndJob() {
        TestData data = testData(new BigDecimal("92.50"));
        data.policy.setAutoApplyThreshold(new BigDecimal("80"));

        when(candidateRepo.findByUserId(data.userId)).thenReturn(Optional.of(data.candidate));
        when(cvRepo.findByCandidateIdAndIsDefaultTrue(data.candidateId)).thenReturn(Optional.of(data.cv));
        when(matchingRepo.findTopMatchesByCvId(eq(data.cvId), any(Pageable.class))).thenReturn(List.of(data.matching));
        when(applicationRepo.existsByCandidateIdAndJobId(data.candidateId, data.jobId)).thenReturn(true);

        int created = service.runForPolicy(data.policy);

        assertThat(created).isZero();
        verify(applicationRepo, never()).saveAndFlush(any());
        verify(notificationEmailService, never()).sendAutoApplied(any());
    }

    private TestData testData(BigDecimal score) {
        UUID userId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();
        UUID cvId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        UUID matchingId = UUID.randomUUID();

        UserAccount user = new UserAccount("ca@example.com", "hash", UserAccount.Role.CANDIDATE, "Candidate Demo");
        ReflectionTestUtils.setField(user, "id", userId);
        UserAccount recruiter = new UserAccount("re@example.com", "hash", UserAccount.Role.RECRUITER, "Recruiter Demo");
        ReflectionTestUtils.setField(recruiter, "id", UUID.randomUUID());

        Candidate candidate = new Candidate(user);
        ReflectionTestUtils.setField(candidate, "id", candidateId);

        CV cv = new CV(candidate, "Default CV", CV.CvSource.UPLOAD);
        ReflectionTestUtils.setField(cv, "id", cvId);
        cv.setDefault(true);
        cv.setStatus(CV.CvStatus.SCORING_DONE);

        Job job = new Job(recruiter, "Backend Engineer", "CareerFit Demo", "Java Spring backend role", Job.SalaryMode.RANGE);
        ReflectionTestUtils.setField(job, "id", jobId);
        job.setStatus(Job.JobStatus.ACTIVE);

        Matching matching = new Matching(cv, job, score, score, Matching.MatchLabel.HIGH);
        ReflectionTestUtils.setField(matching, "id", matchingId);

        AutomationPolicy policy = new AutomationPolicy(user);
        ReflectionTestUtils.setField(policy, "id", UUID.randomUUID());
        policy.setAutoApplyEnabled(true);

        return new TestData(userId, candidateId, cvId, jobId, candidate, cv, matching, policy);
    }

    private Matching matchingFor(TestData data, BigDecimal score) {
        UserAccount recruiter = new UserAccount("re-" + UUID.randomUUID() + "@example.com", "hash",
                UserAccount.Role.RECRUITER, "Recruiter Demo");
        ReflectionTestUtils.setField(recruiter, "id", UUID.randomUUID());
        Job job = new Job(recruiter, "Backend Engineer", "CareerFit Demo", "Java Spring backend role", Job.SalaryMode.RANGE);
        ReflectionTestUtils.setField(job, "id", UUID.randomUUID());
        job.setStatus(Job.JobStatus.ACTIVE);
        Matching matching = new Matching(data.cv, job, score, score, Matching.MatchLabel.HIGH);
        ReflectionTestUtils.setField(matching, "id", UUID.randomUUID());
        return matching;
    }

    private record TestData(
            UUID userId,
            UUID candidateId,
            UUID cvId,
            UUID jobId,
            Candidate candidate,
            CV cv,
            Matching matching,
            AutomationPolicy policy
    ) {}
}
