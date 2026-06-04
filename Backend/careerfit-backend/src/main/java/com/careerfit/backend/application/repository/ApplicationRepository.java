package com.careerfit.backend.application.repository;

import com.careerfit.backend.application.entity.Application;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ApplicationRepository extends JpaRepository<Application, UUID> {

    @EntityGraph(attributePaths = {"candidate", "candidate.user", "job", "job.recruiter", "cv", "matching"})
    @Query("SELECT a FROM Application a WHERE a.id = :id")
    Optional<Application> findByIdWithDetails(@Param("id") UUID id);

    Optional<Application> findByCandidateIdAndJobId(UUID candidateId, UUID jobId);

    boolean existsByCandidateIdAndJobId(UUID candidateId, UUID jobId);

    /** Candidate's applications, newest first. */
    @EntityGraph(attributePaths = {"job", "matching"})
    Page<Application> findByCandidateIdOrderByAppliedAtDesc(UUID candidateId, Pageable pageable);

    /** Recruiter: all applicants for a job, with optional status filter. */
    @EntityGraph(attributePaths = {"candidate", "candidate.user", "cv", "matching", "job"})
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

    long countByCandidateIdAndStatus(UUID candidateId, Application.ApplicationStatus status);

    long countByJobRecruiterId(UUID recruiterId);

    long countByJobRecruiterIdAndStatus(UUID recruiterId, Application.ApplicationStatus status);

    long countByJobRecruiterIdAndAutoAppliedTrue(UUID recruiterId);

    @Query(value = """
        SELECT CAST(applied_at AS date) AS bucket_date, COUNT(*) AS application_count
        FROM application
        WHERE applied_at >= :since
        GROUP BY CAST(applied_at AS date)
        ORDER BY bucket_date ASC
        """, nativeQuery = true)
    List<Object[]> countDailySince(@Param("since") java.time.Instant since);

    @Query(value = """
        SELECT CAST(applied_at AS date) AS bucket_date, COUNT(*) AS application_count
        FROM application
        WHERE candidate_id = :candidateId
          AND applied_at >= :since
        GROUP BY CAST(applied_at AS date)
        ORDER BY bucket_date ASC
        """, nativeQuery = true)
    List<Object[]> countCandidateApplicationsDailySince(@Param("candidateId") UUID candidateId,
                                                        @Param("since") java.time.Instant since);

    @Query(value = """
        SELECT CAST(a.applied_at AS date) AS bucket_date, COUNT(*) AS application_count
        FROM application a
        JOIN job j ON j.id = a.job_id
        WHERE j.recruiter_id = :recruiterId
          AND a.applied_at >= :since
        GROUP BY CAST(a.applied_at AS date)
        ORDER BY bucket_date ASC
        """, nativeQuery = true)
    List<Object[]> countRecruiterApplicationsDailySince(@Param("recruiterId") UUID recruiterId,
                                                        @Param("since") java.time.Instant since);
}
