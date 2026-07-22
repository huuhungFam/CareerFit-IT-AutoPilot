package com.careerfit.backend.job.repository;

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
        """)
    Page<Job> searchJobs(@Param("keyword") String keyword,
                         @Param("location") String location,
                         @Param("level") String level,
                         @Param("language") String language,
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

    List<Job> findByStatus(Job.JobStatus status);

    Page<Job> findByStatus(Job.JobStatus status, Pageable pageable);

    Page<Job> findByStatusOrderByCreatedAtDesc(Job.JobStatus status, Pageable pageable);

    long countByStatus(Job.JobStatus status);

    long countByRecruiterIdAndStatus(UUID recruiterId, Job.JobStatus status);

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
