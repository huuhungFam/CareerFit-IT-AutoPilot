package com.careerfit.backend.matching.repository;

import com.careerfit.backend.matching.entity.Matching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MatchingRepository extends JpaRepository<Matching, UUID> {

    Optional<Matching> findByCvIdAndJobId(UUID cvId, UUID jobId);

    /** Top ranked CVs for a specific job (recruiter ranking view). */
    @Query("SELECT m FROM Matching m WHERE m.job.id = :jobId ORDER BY m.normalizedScore DESC")
    Page<Matching> findRankingByJobId(@Param("jobId") UUID jobId, Pageable pageable);

    /** Best job matches for a specific CV. */
    @Query("SELECT m FROM Matching m WHERE m.cv.id = :cvId ORDER BY m.normalizedScore DESC")
    List<Matching> findTopMatchesByCvId(@Param("cvId") UUID cvId, Pageable pageable);

    /** Rows flagged for recompute (after Rocchio update). */
    List<Matching> findByNeedsRecomputeTrue();

    /** Potential matches for a job (isPotential flag). */
    @Query("SELECT m FROM Matching m WHERE m.job.id = :jobId AND m.isPotential = true ORDER BY m.normalizedScore DESC")
    Page<Matching> findPotentialByJobId(@Param("jobId") UUID jobId, Pageable pageable);

    List<Matching> findByJobId(UUID jobId);

    void deleteByCvId(UUID cvId);
}
