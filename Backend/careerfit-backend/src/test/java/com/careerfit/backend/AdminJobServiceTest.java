package com.careerfit.backend;

import com.careerfit.backend.admin.service.AdminJobService;
import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AdminJobServiceTest {
    private final UUID jobId = UUID.randomUUID();
    private final UUID adminId = UUID.randomUUID();
    private JobRepository jobRepo;
    private AuditLogRepository auditRepo;
    private AdminJobService service;

    @BeforeEach
    void setUp() {
        jobRepo = mock(JobRepository.class);
        auditRepo = mock(AuditLogRepository.class);
        service = new AdminJobService(jobRepo, auditRepo);
    }

    @Test
    void refusesToHideAJobThatIsNotActive() {
        Job job = jobWithStatus(Job.JobStatus.DRAFT);

        assertThatThrownBy(() -> service.hideJob(jobId, adminId))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Only active jobs");

        verify(jobRepo, never()).save(job);
    }

    @Test
    void refusesToRestoreAJobThatWasNotHiddenByAdmin() {
        Job job = jobWithStatus(Job.JobStatus.CLOSED);

        assertThatThrownBy(() -> service.restoreJob(jobId, adminId))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("hidden by an administrator");

        verify(jobRepo, never()).save(job);
    }

    @Test
    void restoresOnlyAnAdminHiddenJob() {
        Job job = jobWithStatus(Job.JobStatus.HIDDEN_BY_ADMIN);

        service.restoreJob(jobId, adminId);

        verify(job).setStatus(Job.JobStatus.ACTIVE);
        verify(jobRepo).save(job);
    }

    private Job jobWithStatus(Job.JobStatus status) {
        Job job = mock(Job.class);
        when(job.getStatus()).thenReturn(status);
        when(jobRepo.findById(jobId)).thenReturn(Optional.of(job));
        return job;
    }
}
