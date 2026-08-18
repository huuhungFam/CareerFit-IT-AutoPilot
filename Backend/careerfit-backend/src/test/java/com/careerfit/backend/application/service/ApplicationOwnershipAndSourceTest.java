package com.careerfit.backend.application.service;

import com.careerfit.backend.application.dto.ApplicationDtos;
import com.careerfit.backend.application.entity.Application;
import com.careerfit.backend.application.repository.ApplicationRepository;
import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.candidate.entity.Candidate;
import com.careerfit.backend.candidate.repository.CandidateRepository;
import com.careerfit.backend.candidate.service.CandidatePortfolioVisibilityService;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.careerfit.backend.matching.repository.MatchingRepository;
import com.careerfit.backend.notification.service.NotificationEmailService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ApplicationOwnershipAndSourceTest {
    @Test
    void internalApplicationIsPersistedAndVisibleToItsOwningRecruiter() {
        ApplicationRepository applications = mock(ApplicationRepository.class);
        CandidateRepository candidates = mock(CandidateRepository.class);
        JobRepository jobs = mock(JobRepository.class);
        CVRepository cvs = mock(CVRepository.class);
        UUID candidateUserId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();
        UUID cvId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        UUID recruiterId = UUID.randomUUID();

        UserAccount candidateUser = new UserAccount("candidate@test.local", "hash", UserAccount.Role.CANDIDATE, "Candidate");
        ReflectionTestUtils.setField(candidateUser, "id", candidateUserId);
        Candidate candidate = new Candidate(candidateUser);
        ReflectionTestUtils.setField(candidate, "id", candidateId);
        CV cv = new CV(candidate, "Candidate CV", CV.CvSource.UPLOAD);
        ReflectionTestUtils.setField(cv, "id", cvId);
        UserAccount recruiter = new UserAccount("recruiter@test.local", "hash", UserAccount.Role.RECRUITER, "Recruiter");
        ReflectionTestUtils.setField(recruiter, "id", recruiterId);
        Job internal = new Job(recruiter, "Backend Engineer", "MB Bank", "Java Spring Boot", Job.SalaryMode.NEGOTIABLE);
        ReflectionTestUtils.setField(internal, "id", jobId);
        internal.setStatus(Job.JobStatus.ACTIVE);

        when(candidates.findByUserId(candidateUserId)).thenReturn(Optional.of(candidate));
        when(jobs.findByIdWithRecruiter(jobId)).thenReturn(Optional.of(internal));
        when(applications.existsByCandidateIdAndJobId(candidateId, jobId)).thenReturn(false);
        when(cvs.findByCandidateIdAndIsDefaultTrue(candidateId)).thenReturn(Optional.of(cv));
        when(applications.saveAndFlush(any(Application.class))).thenAnswer(invocation -> invocation.getArgument(0));
        ApplicationService service = service(applications, candidates, jobs, cvs);

        ApplicationDtos.MyApplicationResponse submitted = service.submit(candidateUserId,
                new ApplicationDtos.SubmitApplicationRequest(jobId, null, "Interested"));
        assertThat(submitted.jobId()).isEqualTo(jobId);
        var application = org.mockito.ArgumentCaptor.forClass(Application.class);
        verify(applications).saveAndFlush(application.capture());

        when(applications.findByJobId(eq(jobId), isNull(), any()))
                .thenReturn(new PageImpl<>(List.of(application.getValue())));
        ApplicationDtos.ApplicantPageResponse applicants = service.getJobApplicants(jobId, recruiterId, null, 0, 20);
        assertThat(applicants.total()).isEqualTo(1);
        assertThat(applicants.applicants()).singleElement().satisfies(item ->
                assertThat(item.candidateId()).isEqualTo(candidateId));
    }

    @Test
    void importedJobCreatesAnInternalApplicationForItsGeneratedRecruiter() {
        ApplicationRepository applications = mock(ApplicationRepository.class);
        CandidateRepository candidates = mock(CandidateRepository.class);
        JobRepository jobs = mock(JobRepository.class);
        CVRepository cvs = mock(CVRepository.class);
        UUID candidateUserId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();
        UUID cvId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        UserAccount candidateUser = new UserAccount("candidate@test.local", "hash", UserAccount.Role.CANDIDATE, "Candidate");
        ReflectionTestUtils.setField(candidateUser, "id", candidateUserId);
        Candidate candidate = new Candidate(candidateUser);
        ReflectionTestUtils.setField(candidate, "id", candidateId);
        CV cv = new CV(candidate, "Candidate CV", CV.CvSource.UPLOAD);
        ReflectionTestUtils.setField(cv, "id", cvId);
        UserAccount recruiter = new UserAccount("recruiter@test.local", "hash", UserAccount.Role.RECRUITER, "Recruiter");
        Job imported = new Job(recruiter, "Imported Backend Engineer", "Imported Co", "Java Spring Boot", Job.SalaryMode.NEGOTIABLE);
        imported.setSourceType(Job.SourceType.IMPORTED);
        imported.setStatus(Job.JobStatus.ACTIVE);
        ReflectionTestUtils.setField(imported, "id", jobId);
        when(candidates.findByUserId(candidateUserId)).thenReturn(Optional.of(candidate));
        when(jobs.findByIdWithRecruiter(jobId)).thenReturn(Optional.of(imported));
        when(applications.existsByCandidateIdAndJobId(candidateId, jobId)).thenReturn(false);
        when(cvs.findByCandidateIdAndIsDefaultTrue(candidateId)).thenReturn(Optional.of(cv));
        when(applications.saveAndFlush(any(Application.class))).thenAnswer(invocation -> invocation.getArgument(0));
        ApplicationService service = service(applications, candidates, jobs, cvs);

        ApplicationDtos.MyApplicationResponse submitted = service.submit(candidateUserId,
                new ApplicationDtos.SubmitApplicationRequest(jobId, null, null));

        assertThat(submitted.jobId()).isEqualTo(jobId);
        verify(applications).saveAndFlush(any(Application.class));
    }

    @Test
    void crossOwnerApplicantAccessIsDeniedBeforeAnyApplicantQuery() {
        ApplicationRepository applications = mock(ApplicationRepository.class);
        JobRepository jobs = mock(JobRepository.class);
        Job job = mock(Job.class);
        com.careerfit.backend.auth.entity.UserAccount owner = mock(com.careerfit.backend.auth.entity.UserAccount.class);
        when(owner.getId()).thenReturn(UUID.randomUUID());
        when(job.getRecruiter()).thenReturn(owner);
        UUID jobId = UUID.randomUUID();
        when(jobs.findByIdWithRecruiter(jobId)).thenReturn(Optional.of(job));
        ApplicationService service = service(applications, mock(CandidateRepository.class), jobs, mock(CVRepository.class));

        assertThatThrownBy(() -> service.getJobApplicants(jobId, UUID.randomUUID(), null, 0, 20))
                .isInstanceOf(AppException.class)
                .satisfies(error -> org.assertj.core.api.Assertions.assertThat(((AppException) error).getCode()).isEqualTo("FORBIDDEN"));
        verify(applications, never()).findByJobId(any(), any(), any());
    }

    private ApplicationService service(ApplicationRepository applications, CandidateRepository candidates, JobRepository jobs,
                                       CVRepository cvs) {
        CandidatePortfolioVisibilityService portfolios = mock(CandidatePortfolioVisibilityService.class);
        when(portfolios.buildForRecruiter(any(), anyBoolean())).thenReturn(
                new CandidatePortfolioVisibilityService.PortfolioVisibility(false, null, "NOT_CONFIGURED"));
        return new ApplicationService(applications, candidates, jobs, cvs, mock(MatchingRepository.class),
                mock(AuditLogRepository.class), new ObjectMapper(), mock(NotificationEmailService.class),
                portfolios);
    }
}
