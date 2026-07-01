package com.careerfit.backend.matching.repository;

import com.careerfit.backend.matching.entity.Matching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MatchingRepository extends JpaRepository<Matching, UUID> {

    Optional<Matching> findByCvIdAndJobId(UUID cvId, UUID jobId);

    /** Top ranked CVs for a specific job (recruiter ranking view). */
    @EntityGraph(attributePaths = {"cv", "cv.candidate", "cv.candidate.user", "job"})
    @Query("""
        SELECT m FROM Matching m
        WHERE m.job.id = :jobId
        ORDER BY m.normalizedScore DESC, m.isPotential DESC, m.cv.createdAt DESC, m.id ASC
        """)
    Page<Matching> findRankingByJobId(@Param("jobId") UUID jobId, Pageable pageable);

    @EntityGraph(attributePaths = {"cv", "cv.candidate", "cv.candidate.user", "job"})
    @Query("""
        SELECT m FROM Matching m
        WHERE m.job.id = :jobId
        ORDER BY m.normalizedScore DESC, m.isPotential DESC, m.cv.createdAt DESC, m.id ASC
        """)
    List<Matching> findRankingListByJobId(@Param("jobId") UUID jobId);

    /** Best job matches for a specific CV. */
    @EntityGraph(attributePaths = {"job", "job.recruiter"})
    @Query("""
        SELECT m FROM Matching m
        WHERE m.cv.id = :cvId
          AND m.job.status = 'ACTIVE'
        ORDER BY m.normalizedScore DESC, m.isPotential DESC, m.job.createdAt DESC, m.job.id ASC
        """)
    List<Matching> findTopMatchesByCvId(@Param("cvId") UUID cvId, Pageable pageable);

    /** Rows flagged for recompute (after Rocchio update). */
    List<Matching> findByNeedsRecomputeTrue();

    /** Potential matches for a job (isPotential flag). */
    @EntityGraph(attributePaths = {"cv", "cv.candidate", "cv.candidate.user", "job"})
    @Query("""
        SELECT m FROM Matching m
        WHERE m.job.id = :jobId AND m.isPotential = true
        ORDER BY m.normalizedScore DESC, m.cv.createdAt DESC, m.id ASC
        """)
    Page<Matching> findPotentialByJobId(@Param("jobId") UUID jobId, Pageable pageable);

    List<Matching> findByJobId(UUID jobId);

    /** Top N candidates for a job by score (recruiter dashboard). */
    @EntityGraph(attributePaths = {"cv", "cv.candidate", "cv.candidate.user", "job"})
    @Query("""
        SELECT m FROM Matching m
        WHERE m.job.id = :jobId
        ORDER BY m.normalizedScore DESC, m.isPotential DESC, m.cv.createdAt DESC, m.id ASC
        """)
    List<Matching> findTopByJobIdOrderByNormalizedScoreDesc(
            @Param("jobId") UUID jobId, Pageable pageable);

    long countByJobId(UUID jobId);

    long countByJobRecruiterId(UUID recruiterId);

    long countByCvCandidateId(UUID candidateId);

    long countByCvCandidateIdAndLabel(UUID candidateId, Matching.MatchLabel label);

    @Query("SELECT COUNT(m) FROM Matching m WHERE m.cv.candidate.id = :candidateId AND m.isPotential = true")
    long countPotentialByCandidateId(@Param("candidateId") UUID candidateId);

    long countByJobRecruiterIdAndLabel(UUID recruiterId, Matching.MatchLabel label);

    @Query("SELECT COUNT(m) FROM Matching m WHERE m.job.recruiter.id = :recruiterId AND m.isPotential = true")
    long countPotentialByRecruiterId(@Param("recruiterId") UUID recruiterId);

    @Query("SELECT COALESCE(AVG(m.normalizedScore), 0) FROM Matching m WHERE m.cv.candidate.id = :candidateId")
    java.math.BigDecimal averageScoreByCandidateId(@Param("candidateId") UUID candidateId);

    @Query("SELECT COALESCE(MAX(m.normalizedScore), 0) FROM Matching m WHERE m.cv.candidate.id = :candidateId")
    java.math.BigDecimal bestScoreByCandidateId(@Param("candidateId") UUID candidateId);

    @Query("SELECT COALESCE(AVG(m.normalizedScore), 0) FROM Matching m WHERE m.job.recruiter.id = :recruiterId")
    java.math.BigDecimal averageScoreByRecruiterId(@Param("recruiterId") UUID recruiterId);

    @Query(value = """
        SELECT CAST(created_at AS date) AS bucket_date, COUNT(*) AS match_count, AVG(normalized_score) AS avg_score
        FROM matching
        WHERE created_at >= :since
        GROUP BY CAST(created_at AS date)
        ORDER BY bucket_date ASC
        """, nativeQuery = true)
    List<Object[]> countDailySince(@Param("since") java.time.Instant since);

    @Query(value = """
        SELECT CAST(created_at AS date) AS bucket_date, COUNT(*) AS match_count, AVG(normalized_score) AS avg_score
        FROM matching
        WHERE cv_id IN (SELECT id FROM cv WHERE candidate_id = :candidateId)
          AND created_at >= :since
        GROUP BY CAST(created_at AS date)
        ORDER BY bucket_date ASC
        """, nativeQuery = true)
    List<Object[]> countCandidateMatchesDailySince(@Param("candidateId") UUID candidateId,
                                                   @Param("since") java.time.Instant since);

    @Query(value = """
        SELECT CAST(m.created_at AS date) AS bucket_date, COUNT(*) AS match_count, AVG(m.normalized_score) AS avg_score
        FROM matching m
        JOIN job j ON j.id = m.job_id
        WHERE j.recruiter_id = :recruiterId
          AND m.created_at >= :since
        GROUP BY CAST(m.created_at AS date)
        ORDER BY bucket_date ASC
        """, nativeQuery = true)
    List<Object[]> countRecruiterMatchesDailySince(@Param("recruiterId") UUID recruiterId,
                                                   @Param("since") java.time.Instant since);

    void deleteByCvId(UUID cvId);

    long countByLabel(Matching.MatchLabel label);
    long countByIsPotentialTrue();
}
