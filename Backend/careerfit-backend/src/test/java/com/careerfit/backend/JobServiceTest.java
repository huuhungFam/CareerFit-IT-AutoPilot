package com.careerfit.backend;

import com.careerfit.backend.application.repository.ApplicationRepository;
import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.common.service.QualityValidationService;
import com.careerfit.backend.common.util.TextNormalizationService;
import com.careerfit.backend.common.util.TfIdfService;
import com.careerfit.backend.employer.repository.EmployerProfileRepository;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.careerfit.backend.job.service.JobService;
import com.careerfit.backend.matching.service.MatchingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class JobServiceTest {
    private final UUID recruiterId = UUID.randomUUID();
    private JobRepository jobRepo;
    private UserAccountRepository userRepo;
    private ApplicationRepository applicationRepo;
    private JobService service;
    private UserAccount recruiter;

    @BeforeEach
    void setUp() {
        jobRepo = mock(JobRepository.class);
        userRepo = mock(UserAccountRepository.class);
        applicationRepo = mock(ApplicationRepository.class);
        recruiter = new UserAccount("recruiter@test.local", "hash", UserAccount.Role.RECRUITER, "Recruiter");
        ReflectionTestUtils.setField(recruiter, "id", recruiterId);
        service = new JobService(
                jobRepo,
                userRepo,
                mock(EmployerProfileRepository.class),
                mock(TextNormalizationService.class),
                mock(TfIdfService.class),
                mock(MatchingService.class),
                new ObjectMapper(),
                mock(QualityValidationService.class),
                applicationRepo);
    }

    @Test
    void recruiterCannotSetAdminOnlyHiddenStatus() {
        Job job = job();
        when(jobRepo.findById(job.getId())).thenReturn(Optional.of(job));

        assertThatThrownBy(() -> service.updateStatus(job.getId(), recruiterId, "HIDDEN_BY_ADMIN"))
                .isInstanceOf(AppException.class)
                .satisfies(error -> assertThat(((AppException) error).getCode()).isEqualTo("BAD_REQUEST"));
        verify(jobRepo, never()).save(any());
    }

    @Test
    void recruiterCannotDeleteJobWithApplications() {
        Job job = job();
        when(jobRepo.findById(job.getId())).thenReturn(Optional.of(job));
        when(applicationRepo.countByJobId(job.getId())).thenReturn(1L);

        assertThatThrownBy(() -> service.deleteJob(job.getId(), recruiterId))
                .isInstanceOf(AppException.class)
                .satisfies(error -> assertThat(((AppException) error).getCode()).isEqualTo("CONFLICT"));
        verify(jobRepo, never()).delete(any());
    }

    @Test
    void exportUsesUtf8BomAndEscapesCsvValues() {
        Job job = job();
        job.setTitle("Java \"Platform\", Engineer");
        when(userRepo.findById(recruiterId)).thenReturn(Optional.of(recruiter));
        when(jobRepo.findByRecruiterId(recruiterId)).thenReturn(List.of(job));
        when(applicationRepo.countByJobId(job.getId())).thenReturn(3L);

        String csv = new String(service.exportMyJobsCsv(recruiterId), StandardCharsets.UTF_8);

        assertThat(csv).startsWith("\uFEFFid,title,company");
        assertThat(csv).contains("\"Java \"\"Platform\"\", Engineer\"");
        assertThat(csv).contains(",3,");
    }

    @Test
    void candidateCannotExportRecruiterJobs() {
        UserAccount candidate = new UserAccount("candidate@test.local", "hash", UserAccount.Role.CANDIDATE, "Candidate");
        when(userRepo.findById(recruiterId)).thenReturn(Optional.of(candidate));

        assertThatThrownBy(() -> service.exportMyJobsCsv(recruiterId))
                .isInstanceOf(AppException.class)
                .satisfies(error -> assertThat(((AppException) error).getCode()).isEqualTo("FORBIDDEN"));
    }

    private Job job() {
        Job job = new Job(recruiter, "Backend Engineer", "CareerFit", "Java Spring Boot PostgreSQL Docker testing", Job.SalaryMode.NEGOTIABLE);
        ReflectionTestUtils.setField(job, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(job, "createdAt", Instant.parse("2026-06-21T00:00:00Z"));
        return job;
    }
}
