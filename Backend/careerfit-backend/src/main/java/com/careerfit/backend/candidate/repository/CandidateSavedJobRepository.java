package com.careerfit.backend.candidate.repository;

import com.careerfit.backend.candidate.entity.CandidateSavedJob;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CandidateSavedJobRepository extends JpaRepository<CandidateSavedJob, UUID> {

    @EntityGraph(attributePaths = "job")
    List<CandidateSavedJob> findByCandidateUserIdOrderByCreatedAtDesc(UUID candidateUserId);

    Optional<CandidateSavedJob> findByCandidateUserIdAndJobId(UUID candidateUserId, UUID jobId);

    boolean existsByCandidateUserIdAndJobId(UUID candidateUserId, UUID jobId);

    @EntityGraph(attributePaths = {"job", "job.recruiter"})
    Page<CandidateSavedJob> findByCandidateUserIdAndJobStatusOrderByCreatedAtDesc(
            UUID candidateUserId, com.careerfit.backend.job.entity.Job.JobStatus status, Pageable pageable);

    @Query("""
            select saved.job.id
            from CandidateSavedJob saved
            where saved.candidateUser.id = :candidateUserId
              and saved.job.id in :jobIds
            """)
    List<UUID> findSavedJobIds(@Param("candidateUserId") UUID candidateUserId,
                               @Param("jobIds") List<UUID> jobIds);

    @Modifying
    @Query(value = """
            insert into candidate_saved_job (id, candidate_user_id, job_id, created_at)
            values (:id, :candidateUserId, :jobId, current_timestamp)
            on conflict (candidate_user_id, job_id) do nothing
            """, nativeQuery = true)
    int insertIfAbsent(@Param("id") UUID id,
                       @Param("candidateUserId") UUID candidateUserId,
                       @Param("jobId") UUID jobId);
}
