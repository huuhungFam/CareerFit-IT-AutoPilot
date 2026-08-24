package com.careerfit.backend;

import com.careerfit.backend.application.repository.ApplicationRepository;
import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.common.service.QualityValidationService;
import com.careerfit.backend.common.util.AfterCommitExecutor;
import com.careerfit.backend.common.util.TextNormalizationService;
import com.careerfit.backend.common.util.TfIdfService;
import com.careerfit.backend.employer.repository.EmployerProfileRepository;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.careerfit.backend.job.service.JobService;
import com.careerfit.backend.job.service.JobDuplicateProtectionService;
import com.careerfit.backend.matching.service.MatchingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
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
    private MatchingService matchingService;
    private AfterCommitExecutor afterCommitExecutor;
    private TextNormalizationService normalizer;
    private TfIdfService tfidf;
    private JobDuplicateProtectionService duplicateProtection;
    private JobService service;
    private UserAccount recruiter;

    @BeforeEach
    void setUp() {
        jobRepo = mock(JobRepository.class);
        userRepo = mock(UserAccountRepository.class);
        applicationRepo = mock(ApplicationRepository.class);
        matchingService = mock(MatchingService.class);
        afterCommitExecutor = mock(AfterCommitExecutor.class);
        normalizer = mock(TextNormalizationService.class);
        tfidf = mock(TfIdfService.class);
        duplicateProtection = mock(JobDuplicateProtectionService.class);
        recruiter = new UserAccount("recruiter@test.local", "hash", UserAccount.Role.RECRUITER, "Recruiter");
        ReflectionTestUtils.setField(recruiter, "id", recruiterId);
        service = new JobService(
                jobRepo,
                userRepo,
                mock(EmployerProfileRepository.class),
                normalizer,
                tfidf,
                matchingService,
                new ObjectMapper(),
                mock(QualityValidationService.class),
                applicationRepo,
                afterCommitExecutor,
                duplicateProtection);
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
    void recruiterCannotSetRemovedPausedStatus() {
        Job job = job();
        when(jobRepo.findById(job.getId())).thenReturn(Optional.of(job));

        assertThatThrownBy(() -> service.updateStatus(job.getId(), recruiterId, "PAUSED"))
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

    @Test
    void publicJobDetailDoesNotExposeNonActiveJob() {
        Job hiddenJob = job();
        hiddenJob.setStatus(Job.JobStatus.HIDDEN_BY_ADMIN);
        when(jobRepo.findByIdAndStatus(hiddenJob.getId(), Job.JobStatus.ACTIVE))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(hiddenJob.getId()))
                .isInstanceOf(AppException.class)
                .satisfies(error -> assertThat(((AppException) error).getCode()).isEqualTo("NOT_FOUND"));
    }

    @Test
    void createJobSchedulesMatchingAfterPersistence() {
        when(userRepo.findById(recruiterId)).thenReturn(Optional.of(recruiter));
        when(normalizer.detectLanguage(anyString())).thenReturn("en");
        when(normalizer.normalize(anyString(), eq("en"))).thenReturn(List.of("java"));
        when(tfidf.buildVector(anyList())).thenReturn(Map.of("java", 1.0));
        when(jobRepo.save(any(Job.class))).thenAnswer(invocation -> {
            Job saved = invocation.getArgument(0);
            if (saved.getId() == null) ReflectionTestUtils.setField(saved, "id", UUID.randomUUID());
            return saved;
        });

        var request = new com.careerfit.backend.job.dto.JobDtos.CreateJobRequest(
                "Backend Engineer", "CareerFit", "Java Spring Boot PostgreSQL",
                List.of("Java"), List.of("Docker"), "MID", "FULL_TIME", "Can Tho",
                "HYBRID", "NEGOTIABLE", null, null, "VND", "MONTHLY",
                true, "Negotiable", "Backend", null, false);

        var response = service.createJob(recruiterId, request);

        org.mockito.ArgumentCaptor<Runnable> task = org.mockito.ArgumentCaptor.forClass(Runnable.class);
        verify(afterCommitExecutor).execute(task.capture());
        task.getValue().run();
        verify(matchingService).scoreJobAgainstAllCvs(UUID.fromString(response.id()));
    }

    @Test
    void activeTransitionSchedulesExactlyOneAfterCommitWorkItem() {
        Job job = job();
        job.setStatus(Job.JobStatus.DRAFT);
        when(jobRepo.findById(job.getId())).thenReturn(Optional.of(job));

        service.updateStatus(job.getId(), recruiterId, "ACTIVE");

        verify(duplicateProtection).assertCanActivate(job, false);
        verify(afterCommitExecutor, times(1)).execute(any(Runnable.class));
        assertThat(job.isMatchingRecoveryNeeded()).isTrue();
    }

    @Test
    void duplicateDraftCanExistButItsActivationFailsBeforePersistence() {
        Job job = job();
        job.setStatus(Job.JobStatus.DRAFT);
        when(jobRepo.findById(job.getId())).thenReturn(Optional.of(job));
        doThrow(AppException.conflict("An identical internal job already exists"))
                .when(duplicateProtection).assertCanActivate(job, false);

        assertThatThrownBy(() -> service.updateStatus(job.getId(), recruiterId, "ACTIVE"))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("identical internal job");
        verify(jobRepo, never()).save(job);
        verify(afterCommitExecutor, never()).execute(any(Runnable.class));
    }

    @Test
    void irrelevantActiveUpdateDoesNotScheduleMatching() {
        Job job = job();
        when(jobRepo.findById(job.getId())).thenReturn(Optional.of(job));
        var request = new com.careerfit.backend.job.dto.JobDtos.UpdateJobRequest(
                null, null, null, null, null, null, "Can Tho", null, null,
                null, null, null, null, null, null, null, null, null, null);

        service.updateJob(job.getId(), recruiterId, request);

        verify(afterCommitExecutor, never()).execute(any(Runnable.class));
    }

    @Test
    void relevantActiveUpdateSchedulesOneRecoverySafeWorkItem() {
        Job job = job();
        when(jobRepo.findById(job.getId())).thenReturn(Optional.of(job));
        when(normalizer.normalize(anyString(), anyString())).thenReturn(List.of("java"));
        when(tfidf.buildVector(anyList())).thenReturn(Map.of("java", 1.0));
        var request = new com.careerfit.backend.job.dto.JobDtos.UpdateJobRequest(
                null, "Updated Java Spring matching content", null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null, null);

        service.updateJob(job.getId(), recruiterId, request);

        verify(afterCommitExecutor, times(1)).execute(any(Runnable.class));
        assertThat(job.isMatchingRecoveryNeeded()).isTrue();
    }

    private Job job() {
        Job job = new Job(recruiter, "Backend Engineer", "CareerFit", "Java Spring Boot PostgreSQL Docker testing", Job.SalaryMode.NEGOTIABLE);
        ReflectionTestUtils.setField(job, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(job, "createdAt", Instant.parse("2026-06-21T00:00:00Z"));
        return job;
    }
}
