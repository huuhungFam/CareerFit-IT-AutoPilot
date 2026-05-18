package com.careerfit.backend.application.repository;

import com.careerfit.backend.application.entity.Application;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ApplicationRepository extends JpaRepository<Application, UUID> {

    Optional<Application> findByCandidateIdAndJobId(UUID candidateId, UUID jobId);

    boolean existsByCandidateIdAndJobId(UUID candidateId, UUID jobId);

    /** Candidate's applications, newest first. */
    Page<Application> findByCandidateIdOrderByAppliedAtDesc(UUID candidateId, Pageable pageable);

    /** Recruiter: all applicants for a job, with optional status filter. */
    @Query("""
        SELECT a FROM Application a
        WHERE a.job.id = :jobId
          AND (:status IS NULL OR a.status = :status)
        ORDER BY a.appliedAt DESC
        """)
    Page<Application> findByJobId(@Param("jobId") UUID jobId,
                                   @Param("status") Application.ApplicationStatus status,
                                   Pageable pageable);

    /** Count applicants per job. */
    long countByJobId(UUID jobId);

    /** Count by job and status. */
    long countByJobIdAndStatus(UUID jobId, Application.ApplicationStatus status);

    /** All applications for a specific CV (used for cascade delete guard). */
    List<Application> findByCvId(UUID cvId);

    /** Stats: applications by candidate. */
    long countByCandidateId(UUID candidateId);
}
