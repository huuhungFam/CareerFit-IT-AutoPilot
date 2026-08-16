package com.careerfit.backend.application.service;

import com.careerfit.backend.application.dto.ApplicationDtos;
import com.careerfit.backend.application.entity.RecruiterCvBookmark;
import com.careerfit.backend.application.repository.RecruiterCvBookmarkRepository;
import com.careerfit.backend.audit.entity.AuditLog;
import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.candidate.entity.Candidate;
import com.careerfit.backend.candidate.repository.CandidateRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class RecruiterTalentService {

    private final RecruiterCvBookmarkRepository bookmarkRepo;
    private final JobRepository jobRepo;
    private final CandidateRepository candidateRepo;
    private final CVRepository cvRepo;
    private final AuditLogRepository auditRepo;

    public RecruiterTalentService(RecruiterCvBookmarkRepository bookmarkRepo,
                                  JobRepository jobRepo,
                                  CandidateRepository candidateRepo,
                                  CVRepository cvRepo,
                                  AuditLogRepository auditRepo) {
        this.bookmarkRepo = bookmarkRepo;
        this.jobRepo = jobRepo;
        this.candidateRepo = candidateRepo;
        this.cvRepo = cvRepo;
        this.auditRepo = auditRepo;
    }

    @Transactional(readOnly = true)
    public List<ApplicationDtos.CvBookmarkResponse> listBookmarks(UUID jobId, UUID recruiterId) {
        requireOwnedJob(jobId, recruiterId);
        return bookmarkRepo.findByJobIdOrderByCreatedAtDesc(jobId).stream()
                .filter(item -> item.getCv().getStatus() != CV.CvStatus.BANNED)
                .map(item -> new ApplicationDtos.CvBookmarkResponse(
                        item.getId(), item.getJob().getId(), item.getCandidate().getId(),
                        item.getCv().getId(), item.getCreatedAt()))
                .toList();
    }

    @Transactional
    public ApplicationDtos.CvBookmarkResponse bookmark(UUID jobId, UUID candidateId, UUID recruiterId) {
        Job job = requireOwnedJob(jobId, recruiterId);
        RecruiterCvBookmark existing = bookmarkRepo.findByJobIdAndCandidateId(jobId, candidateId).orElse(null);
        if (existing != null) return toResponse(existing);

        Candidate candidate = candidateRepo.findById(candidateId)
                .orElseThrow(() -> AppException.notFound("Candidate", candidateId));
        CV cv = cvRepo.findByCandidateIdAndIsDefaultTrue(candidateId)
                .orElseThrow(() -> AppException.badRequest("Candidate has no default CV to bookmark"));
        if (cv.getStatus() == CV.CvStatus.BANNED) {
            throw AppException.badRequest("A banned CV cannot be bookmarked");
        }

        RecruiterCvBookmark saved;
        try {
            saved = bookmarkRepo.saveAndFlush(new RecruiterCvBookmark(job, candidate, cv));
        } catch (DataIntegrityViolationException conflict) {
            saved = bookmarkRepo.findByJobIdAndCandidateId(jobId, candidateId)
                    .orElseThrow(() -> AppException.conflict("CV bookmark conflicted with another write"));
        }

        auditRepo.save(new AuditLog(AuditLog.ActorType.USER, recruiterId, "RECRUITER_CV_BOOKMARKED")
                .withTarget("Candidate", candidateId)
                .withMetadata("{\"jobId\":\"" + jobId + "\"}")
                .withChannel(AuditLog.SourceChannel.WEB));
        return toResponse(saved);
    }

    @Transactional
    public void removeBookmark(UUID jobId, UUID candidateId, UUID recruiterId) {
        requireOwnedJob(jobId, recruiterId);
        RecruiterCvBookmark bookmark = bookmarkRepo.findByJobIdAndCandidateId(jobId, candidateId)
                .orElseThrow(() -> AppException.notFound("CV bookmark", candidateId));
        bookmarkRepo.delete(bookmark);
        auditRepo.save(new AuditLog(AuditLog.ActorType.USER, recruiterId, "RECRUITER_CV_BOOKMARK_REMOVED")
                .withTarget("Candidate", candidateId)
                .withMetadata("{\"jobId\":\"" + jobId + "\"}")
                .withChannel(AuditLog.SourceChannel.WEB));
    }

    private Job requireOwnedJob(UUID jobId, UUID recruiterId) {
        Job job = jobRepo.findByIdWithRecruiter(jobId)
                .orElseThrow(() -> AppException.notFound("Job", jobId));
        if (!job.getRecruiter().getId().equals(recruiterId)) {
            throw AppException.forbidden("You do not own this job");
        }
        return job;
    }

    private ApplicationDtos.CvBookmarkResponse toResponse(RecruiterCvBookmark item) {
        return new ApplicationDtos.CvBookmarkResponse(
                item.getId(), item.getJob().getId(), item.getCandidate().getId(),
                item.getCv().getId(), item.getCreatedAt());
    }
}
