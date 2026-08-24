package com.careerfit.backend.admin.service;

import com.careerfit.backend.audit.entity.AuditLog;
import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AdminJobService {

    private final JobRepository jobRepo;
    private final AuditLogRepository auditRepo;

    public AdminJobService(JobRepository jobRepo, AuditLogRepository auditRepo) {
        this.jobRepo = jobRepo;
        this.auditRepo = auditRepo;
    }

    public Page<Job> getJobs(String statusStr, Pageable pageable) {
        if (statusStr != null && !statusStr.isBlank()) {
            try {
                Job.JobStatus status = Job.JobStatus.valueOf(statusStr.toUpperCase());
                return jobRepo.findByStatusOrderByCreatedAtDesc(status, pageable);
            } catch (Exception ignored) {}
        }
        return jobRepo.findAll(pageable); // MVP: without complex search for now
    }

    @Transactional
    public void hideJob(UUID jobId, UUID adminId) {
        Job job = jobRepo.findById(jobId).orElseThrow(() -> AppException.notFound("Job", jobId));
        if (job.getStatus() != Job.JobStatus.ACTIVE) {
            throw new AppException(org.springframework.http.HttpStatus.BAD_REQUEST, "INVALID_STATUS", "Only active jobs can be hidden.");
        }
        job.setStatus(Job.JobStatus.HIDDEN_BY_ADMIN);
        jobRepo.save(job);

        auditRepo.save(new AuditLog(AuditLog.ActorType.USER, adminId, "JOB_HIDDEN")
                .withTarget("JOB", jobId)
                .withChannel(AuditLog.SourceChannel.WEB)
                .withResult(AuditLog.Result.SUCCESS));
    }

    @Transactional
    public void restoreJob(UUID jobId, UUID adminId) {
        Job job = jobRepo.findById(jobId).orElseThrow(() -> AppException.notFound("Job", jobId));
        if (job.getStatus() != Job.JobStatus.HIDDEN_BY_ADMIN) {
            throw new AppException(org.springframework.http.HttpStatus.BAD_REQUEST, "INVALID_STATUS", "Only jobs hidden by an administrator can be restored.");
        }
        job.setStatus(Job.JobStatus.ACTIVE); // or previous status if we tracked it, ACTIVE is safe default
        jobRepo.save(job);

        auditRepo.save(new AuditLog(AuditLog.ActorType.USER, adminId, "JOB_RESTORED")
                .withTarget("JOB", jobId)
                .withChannel(AuditLog.SourceChannel.WEB)
                .withResult(AuditLog.Result.SUCCESS));
    }
}
