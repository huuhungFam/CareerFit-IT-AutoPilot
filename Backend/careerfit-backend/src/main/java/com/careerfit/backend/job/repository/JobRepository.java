package com.careerfit.backend.job.repository;

import com.careerfit.backend.application.entity.Application;
import com.careerfit.backend.job.entity.Job;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface JobRepository extends JpaRepository<Job, UUID> {

    @EntityGraph(attributePaths = {"recruiter"})
    @Query("SELECT j FROM Job j WHERE j.id = :id")
    Optional<Job> findByIdWithRecruiter(@Param("id") UUID id);

    Optional<Job> findByIdAndStatus(UUID id, Job.JobStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT j FROM Job j WHERE j.id = :id")
    Optional<Job> findByIdForUpdate(@Param("id") UUID id);

    List<Job> findByRecruiterIdAndStatus(UUID recruiterId, Job.JobStatus status);

    /** All jobs for a recruiter, regardless of status. */
    List<Job> findByRecruiterId(UUID recruiterId);

    long countByRecruiterId(UUID recruiterId);

    @EntityGraph(attributePaths = {"recruiter"})
    @Query("""
        SELECT j FROM Job j
        WHERE j.status = 'ACTIVE'
          AND (:keyword = '' OR
               LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
               LOWER(j.company) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
               LOWER(j.originalText) LIKE LOWER(CONCAT('%', :keyword, '%')))
          AND (:location = '' OR LOWER(j.location) LIKE LOWER(CONCAT('%', :location, '%')))
          AND (:level = '' OR LOWER(j.seniorityLevel) = LOWER(:level))
          AND (:language = '' OR j.language = :language)
          AND (:remoteType = '' OR LOWER(COALESCE(j.remoteType, '')) = LOWER(:remoteType))
          AND (:salaryMode IS NULL OR j.salaryMode = :salaryMode)
          AND (:salaryMin IS NULL OR j.salaryMax >= :salaryMin OR (j.salaryMax IS NULL AND j.salaryMin >= :salaryMin))
          AND (:domain = '' OR LOWER(COALESCE(j.domain, '')) LIKE LOWER(CONCAT('%', :domain, '%')))
          AND (:minScore IS NULL OR EXISTS (
              SELECT m FROM Matching m
              WHERE m.cv.id = :matchingCvId
                AND m.job.id = j.id
                AND m.normalizedScore >= :minScore
          ))
        """)
    Page<Job> searchJobs(@Param("keyword") String keyword,
                         @Param("location") String location,
                         @Param("level") String level,
                         @Param("language") String language,
                         @Param("remoteType") String remoteType,
                         @Param("salaryMode") Job.SalaryMode salaryMode,
                         @Param("salaryMin") java.math.BigDecimal salaryMin,
                         @Param("domain") String domain,
                         @Param("matchingCvId") UUID matchingCvId,
                         @Param("minScore") java.math.BigDecimal minScore,
                         Pageable pageable);

    /** Candidate catalog ordered by the current default CV's matching score. */
    @EntityGraph(attributePaths = {"recruiter"})
    @Query(value = """
        SELECT j FROM Job j
        LEFT JOIN Matching m ON m.job.id = j.id AND m.cv.id = :matchingCvId
        WHERE j.status = 'ACTIVE'
          AND (:keyword = '' OR
               LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
               LOWER(j.company) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
               LOWER(j.originalText) LIKE LOWER(CONCAT('%', :keyword, '%')))
          AND (:location = '' OR LOWER(j.location) LIKE LOWER(CONCAT('%', :location, '%')))
          AND (:level = '' OR LOWER(j.seniorityLevel) = LOWER(:level))
          AND (:language = '' OR j.language = :language)
          AND (:remoteType = '' OR LOWER(COALESCE(j.remoteType, '')) = LOWER(:remoteType))
          AND (:salaryMode IS NULL OR j.salaryMode = :salaryMode)
          AND (:salaryMin IS NULL OR j.salaryMax >= :salaryMin OR (j.salaryMax IS NULL AND j.salaryMin >= :salaryMin))
          AND (:domain = '' OR LOWER(COALESCE(j.domain, '')) LIKE LOWER(CONCAT('%', :domain, '%')))
          AND (:minScore IS NULL OR m.normalizedScore >= :minScore)
        ORDER BY CASE WHEN m.normalizedScore IS NULL THEN 1 ELSE 0 END ASC,
                 m.normalizedScore DESC, j.createdAt DESC, j.id ASC
        """, countQuery = """
        SELECT COUNT(j) FROM Job j
        LEFT JOIN Matching m ON m.job.id = j.id AND m.cv.id = :matchingCvId
        WHERE j.status = 'ACTIVE'
          AND (:keyword = '' OR
               LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
               LOWER(j.company) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
               LOWER(j.originalText) LIKE LOWER(CONCAT('%', :keyword, '%')))
          AND (:location = '' OR LOWER(j.location) LIKE LOWER(CONCAT('%', :location, '%')))
          AND (:level = '' OR LOWER(j.seniorityLevel) = LOWER(:level))
          AND (:language = '' OR j.language = :language)
          AND (:remoteType = '' OR LOWER(COALESCE(j.remoteType, '')) = LOWER(:remoteType))
          AND (:salaryMode IS NULL OR j.salaryMode = :salaryMode)
          AND (:salaryMin IS NULL OR j.salaryMax >= :salaryMin OR (j.salaryMax IS NULL AND j.salaryMin >= :salaryMin))
          AND (:domain = '' OR LOWER(COALESCE(j.domain, '')) LIKE LOWER(CONCAT('%', :domain, '%')))
          AND (:minScore IS NULL OR m.normalizedScore >= :minScore)
        """)
    Page<Job> searchJobsByMatchingScore(@Param("keyword") String keyword,
                                        @Param("location") String location,
                                        @Param("level") String level,
                                        @Param("language") String language,
                                        @Param("remoteType") String remoteType,
                                        @Param("salaryMode") Job.SalaryMode salaryMode,
                                        @Param("salaryMin") java.math.BigDecimal salaryMin,
                                        @Param("domain") String domain,
                                        @Param("matchingCvId") UUID matchingCvId,
                                        @Param("minScore") java.math.BigDecimal minScore,
                                        Pageable pageable);

    @Query(value = """
        SELECT j FROM Job j
        LEFT JOIN Application a ON a.job.id = j.id
        WHERE j.status = 'ACTIVE'
          AND (:keyword = '' OR LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(j.company) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(j.originalText) LIKE LOWER(CONCAT('%', :keyword, '%')))
          AND (:location = '' OR LOWER(j.location) LIKE LOWER(CONCAT('%', :location, '%')))
          AND (:level = '' OR LOWER(j.seniorityLevel) = LOWER(:level))
          AND (:language = '' OR j.language = :language)
          AND (:remoteType = '' OR LOWER(COALESCE(j.remoteType, '')) = LOWER(:remoteType))
          AND (:salaryMode IS NULL OR j.salaryMode = :salaryMode)
          AND (:salaryMin IS NULL OR j.salaryMax >= :salaryMin OR (j.salaryMax IS NULL AND j.salaryMin >= :salaryMin))
          AND (:domain = '' OR LOWER(COALESCE(j.domain, '')) LIKE LOWER(CONCAT('%', :domain, '%')))
          AND (:minScore IS NULL OR EXISTS (
              SELECT m FROM Matching m
              WHERE m.cv.id = :matchingCvId
                AND m.job.id = j.id
                AND m.normalizedScore >= :minScore
          ))
        GROUP BY j
        ORDER BY COUNT(a.id) DESC, j.createdAt DESC, j.id ASC
        """, countQuery = """
        SELECT COUNT(j) FROM Job j
        WHERE j.status = 'ACTIVE'
          AND (:keyword = '' OR LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(j.company) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(j.originalText) LIKE LOWER(CONCAT('%', :keyword, '%')))
          AND (:location = '' OR LOWER(j.location) LIKE LOWER(CONCAT('%', :location, '%')))
          AND (:level = '' OR LOWER(j.seniorityLevel) = LOWER(:level))
          AND (:language = '' OR j.language = :language)
          AND (:remoteType = '' OR LOWER(COALESCE(j.remoteType, '')) = LOWER(:remoteType))
          AND (:salaryMode IS NULL OR j.salaryMode = :salaryMode)
          AND (:salaryMin IS NULL OR j.salaryMax >= :salaryMin OR (j.salaryMax IS NULL AND j.salaryMin >= :salaryMin))
          AND (:domain = '' OR LOWER(COALESCE(j.domain, '')) LIKE LOWER(CONCAT('%', :domain, '%')))
          AND (:minScore IS NULL OR EXISTS (
              SELECT m FROM Matching m
              WHERE m.cv.id = :matchingCvId
                AND m.job.id = j.id
                AND m.normalizedScore >= :minScore
          ))
        """)
    Page<Job> searchJobsByPopularity(@Param("keyword") String keyword,
                                     @Param("location") String location,
                                     @Param("level") String level,
                                     @Param("language") String language,
                                     @Param("remoteType") String remoteType,
                                     @Param("salaryMode") Job.SalaryMode salaryMode,
                                     @Param("salaryMin") java.math.BigDecimal salaryMin,
                                     @Param("domain") String domain,
                                     @Param("matchingCvId") UUID matchingCvId,
                                     @Param("minScore") java.math.BigDecimal minScore,
                                     Pageable pageable);

    @Query("""
        SELECT DISTINCT j.title FROM Job j
        WHERE j.status = 'ACTIVE'
          AND LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
        ORDER BY j.title
        """)
    List<String> findTitleSuggestions(@Param("keyword") String keyword, Pageable pageable);

    @Query("""
        SELECT DISTINCT j.company FROM Job j
        WHERE j.status = 'ACTIVE'
          AND LOWER(j.company) LIKE LOWER(CONCAT('%', :keyword, '%'))
        ORDER BY j.company
        """)
    List<String> findCompanySuggestions(@Param("keyword") String keyword, Pageable pageable);

    @Query("""
        SELECT DISTINCT j.location FROM Job j
        WHERE j.status = 'ACTIVE'
          AND j.location IS NOT NULL
          AND TRIM(j.location) <> ''
          AND LOWER(j.location) LIKE LOWER(CONCAT('%', :keyword, '%'))
        ORDER BY j.location
        """)
    List<String> findLocationSuggestions(@Param("keyword") String keyword, Pageable pageable);

    @Query("""
        SELECT DISTINCT j.domain FROM Job j
        WHERE j.status = 'ACTIVE'
          AND j.domain IS NOT NULL
          AND TRIM(j.domain) <> ''
          AND LOWER(j.domain) LIKE LOWER(CONCAT('%', :keyword, '%'))
        ORDER BY j.domain
        """)
    List<String> findDomainSuggestions(@Param("keyword") String keyword, Pageable pageable);

    List<Job> findByStatus(Job.JobStatus status);

    Page<Job> findByStatusAndMatchingRecoveryNeededTrue(Job.JobStatus status, Pageable pageable);

    Page<Job> findByStatus(Job.JobStatus status, Pageable pageable);

    Page<Job> findByStatusOrderByCreatedAtDesc(Job.JobStatus status, Pageable pageable);

    long countByStatus(Job.JobStatus status);

    long countByCreatedAtGreaterThanEqual(Instant createdAt);

    @Query("SELECT COUNT(DISTINCT j.company) FROM Job j WHERE j.status = :status AND j.company IS NOT NULL AND TRIM(j.company) <> ''")
    long countDistinctCompaniesByStatus(@Param("status") Job.JobStatus status);

    @Query("SELECT j.domain, COUNT(j) FROM Job j WHERE j.status = :status GROUP BY j.domain")
    List<Object[]> countByStatusGroupedByDomain(@Param("status") Job.JobStatus status);

    long countByRecruiterIdAndStatus(UUID recruiterId, Job.JobStatus status);

    List<Job> findByDuplicateFingerprint(String duplicateFingerprint);

    List<Job> findBySourceType(Job.SourceType sourceType);

    @Query(value = """
        SELECT skill, COUNT(*) AS demand_count
        FROM job j
        CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(j.required_skills, CAST('[]' AS jsonb))) AS skill
        WHERE j.status = 'ACTIVE'
        GROUP BY skill
        ORDER BY demand_count DESC, skill ASC
        LIMIT :limit
        """, nativeQuery = true)
    List<Object[]> findTopActiveRequiredSkills(@Param("limit") int limit);

    @Query(value = """
        SELECT skill, COUNT(*) AS demand_count
        FROM job j
        CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(j.required_skills, CAST('[]' AS jsonb))) AS skill
        WHERE j.recruiter_id = :recruiterId
        GROUP BY skill
        ORDER BY demand_count DESC, skill ASC
        LIMIT :limit
        """, nativeQuery = true)
    List<Object[]> findTopRequiredSkillsByRecruiter(@Param("recruiterId") UUID recruiterId,
                                                    @Param("limit") int limit);

    @Query(value = """
        SELECT
            COALESCE(NULLIF(salary_currency, ''), 'UNKNOWN') AS currency,
            COALESCE(NULLIF(seniority_level, ''), 'UNKNOWN') AS seniority,
            COUNT(*) AS job_count,
            MIN(COALESCE(salary_min, salary_max)) AS min_salary,
            AVG(COALESCE(salary_max, salary_min)) AS avg_salary,
            MAX(COALESCE(salary_max, salary_min)) AS max_salary
        FROM job
        WHERE status = 'ACTIVE'
          AND salary_is_visible = TRUE
          AND (salary_min IS NOT NULL OR salary_max IS NOT NULL)
        GROUP BY COALESCE(NULLIF(salary_currency, ''), 'UNKNOWN'),
                 COALESCE(NULLIF(seniority_level, ''), 'UNKNOWN')
        ORDER BY currency ASC, seniority ASC
        """, nativeQuery = true)
    List<Object[]> findActiveSalaryDistribution();

    @Query(value = """
        SELECT CAST(created_at AS date) AS bucket_date, COUNT(*) AS job_count
        FROM job
        WHERE created_at >= :since
        GROUP BY CAST(created_at AS date)
        ORDER BY bucket_date ASC
        """, nativeQuery = true)
    List<Object[]> countCreatedDailySince(@Param("since") java.time.Instant since);
}
