package com.careerfit.backend.job.repository;

import com.careerfit.backend.job.entity.Job;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface JobRepository extends JpaRepository<Job, UUID> {

    List<Job> findByRecruiterIdAndStatus(UUID recruiterId, Job.JobStatus status);

    /** All jobs for a recruiter, regardless of status. */
    List<Job> findByRecruiterId(UUID recruiterId);

    long countByRecruiterId(UUID recruiterId);

    @Query("""
        SELECT j FROM Job j
        WHERE j.status = 'ACTIVE'
          AND (:keyword IS NULL OR
               LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
               LOWER(j.company) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
               LOWER(j.originalText) LIKE LOWER(CONCAT('%', :keyword, '%')))
          AND (:location IS NULL OR LOWER(j.location) LIKE LOWER(CONCAT('%', :location, '%')))
          AND (:level IS NULL OR LOWER(j.seniorityLevel) = LOWER(:level))
          AND (:language IS NULL OR j.language = :language)
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

    Page<Job> findByStatusOrderByCreatedAtDesc(Job.JobStatus status, Pageable pageable);

    long countByStatus(Job.JobStatus status);
}
