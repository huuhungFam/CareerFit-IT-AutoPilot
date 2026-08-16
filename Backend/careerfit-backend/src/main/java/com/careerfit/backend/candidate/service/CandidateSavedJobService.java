package com.careerfit.backend.candidate.service;

import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.candidate.repository.CandidateSavedJobRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class CandidateSavedJobService {

    private final CandidateSavedJobRepository savedJobRepository;
    private final UserAccountRepository userAccountRepository;
    private final JobRepository jobRepository;

    public CandidateSavedJobService(CandidateSavedJobRepository savedJobRepository,
                                    UserAccountRepository userAccountRepository,
                                    JobRepository jobRepository) {
        this.savedJobRepository = savedJobRepository;
        this.userAccountRepository = userAccountRepository;
        this.jobRepository = jobRepository;
    }

    @Transactional(readOnly = true)
    public List<UUID> listSavedJobIds(UUID userId) {
        return savedJobRepository.findByCandidateUserIdOrderByCreatedAtDesc(userId).stream()
                .map(saved -> saved.getJob().getId())
                .toList();
    }

    @Transactional
    public void save(UUID userId, UUID jobId) {
        if (savedJobRepository.existsByCandidateUserIdAndJobId(userId, jobId)) return;
        var user = userAccountRepository.findById(userId)
                .orElseThrow(() -> AppException.notFound("User", userId));
        var job = jobRepository.findById(jobId)
                .orElseThrow(() -> AppException.notFound("Job", jobId));
        if (job.getStatus() != Job.JobStatus.ACTIVE) {
            throw AppException.badRequest("Only active jobs can be saved");
        }
        savedJobRepository.insertIfAbsent(UUID.randomUUID(), user.getId(), job.getId());
    }

    @Transactional
    public void remove(UUID userId, UUID jobId) {
        savedJobRepository.findByCandidateUserIdAndJobId(userId, jobId)
                .ifPresent(savedJobRepository::delete);
    }
}
