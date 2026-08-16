package com.careerfit.backend.application.repository;

import com.careerfit.backend.application.entity.RecruiterCvBookmark;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RecruiterCvBookmarkRepository extends JpaRepository<RecruiterCvBookmark, UUID> {

    @EntityGraph(attributePaths = {"candidate", "cv", "job", "job.recruiter"})
    List<RecruiterCvBookmark> findByJobIdOrderByCreatedAtDesc(UUID jobId);

    Optional<RecruiterCvBookmark> findByJobIdAndCandidateId(UUID jobId, UUID candidateId);

    boolean existsByJobIdAndCandidateId(UUID jobId, UUID candidateId);
}
