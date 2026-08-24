package com.careerfit.backend.feedback.repository;

import com.careerfit.backend.feedback.entity.Feedback;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FeedbackRepository extends JpaRepository<Feedback, UUID> {

    Optional<Feedback> findByMatchingIdAndActorId(UUID matchingId, UUID actorId);

    List<Feedback> findByActorIdAndMatchingIdIn(UUID actorId, List<UUID> matchingIds);

    /** All feedbacks for a specific job (across all its matchings). */
    @Query("""
        SELECT f FROM Feedback f
        JOIN f.matching m
        WHERE m.job.id = :jobId
        """)
    List<Feedback> findByJobId(@Param("jobId") UUID jobId);

    /** All feedbacks given by a specific actor. */
    List<Feedback> findByActorIdOrderByCreatedAtDesc(UUID actorId);

    /** Positive feedbacks for a job (used by Rocchio positive set). */
    @EntityGraph(attributePaths = {"matching", "matching.cv"})
    @Query("""
        SELECT f FROM Feedback f
        JOIN f.matching m
        WHERE m.job.id = :jobId
          AND f.feedbackType IN ('GOOD_MATCH', 'POTENTIAL')
        """)
    List<Feedback> findPositiveByJobId(@Param("jobId") UUID jobId);

    /** Negative feedbacks for a job (used by Rocchio negative set). */
    @EntityGraph(attributePaths = {"matching", "matching.cv"})
    @Query("""
        SELECT f FROM Feedback f
        JOIN f.matching m
        WHERE m.job.id = :jobId
          AND f.feedbackType = 'BAD_MATCH'
        """)
    List<Feedback> findNegativeByJobId(@Param("jobId") UUID jobId);
}
