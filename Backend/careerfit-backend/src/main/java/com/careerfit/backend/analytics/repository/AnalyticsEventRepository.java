package com.careerfit.backend.analytics.repository;

import com.careerfit.backend.analytics.entity.AnalyticsEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface AnalyticsEventRepository extends JpaRepository<AnalyticsEvent, UUID> {

    long countByEventTypeAndOccurredAtAfter(String eventType, Instant since);

    long countByEventTypeAndSubjectTypeAndSubjectId(String eventType, String subjectType, UUID subjectId);

    long countByEventTypeAndSubjectTypeAndSubjectIdAndOccurredAtAfter(
            String eventType, String subjectType, UUID subjectId, Instant since);

    @Query(value = """
        SELECT CAST(occurred_at AS date) AS event_date, COUNT(*) AS event_count
        FROM analytics_event
        WHERE event_type = :eventType
          AND occurred_at >= :since
        GROUP BY CAST(occurred_at AS date)
        ORDER BY event_date ASC
        """, nativeQuery = true)
    List<Object[]> countDailyByEventTypeSince(@Param("eventType") String eventType,
                                              @Param("since") Instant since);

    @Query(value = """
        SELECT CAST(occurred_at AS date) AS event_date, COUNT(*) AS event_count
        FROM analytics_event
        WHERE actor_user_id = :actorUserId
          AND event_type = :eventType
          AND occurred_at >= :since
        GROUP BY CAST(occurred_at AS date)
        ORDER BY event_date ASC
        """, nativeQuery = true)
    List<Object[]> countDailyByActorAndEventTypeSince(@Param("actorUserId") UUID actorUserId,
                                                      @Param("eventType") String eventType,
                                                      @Param("since") Instant since);

    @Query(value = """
        SELECT CAST(ae.occurred_at AS date) AS event_date, COUNT(*) AS event_count
        FROM analytics_event ae
        JOIN job j ON j.id = ae.subject_id
        WHERE ae.event_type = :eventType
          AND ae.subject_type = 'JOB'
          AND j.recruiter_id = :recruiterId
          AND ae.occurred_at >= :since
        GROUP BY CAST(ae.occurred_at AS date)
        ORDER BY event_date ASC
        """, nativeQuery = true)
    List<Object[]> countDailyRecruiterJobEventsSince(@Param("recruiterId") UUID recruiterId,
                                                     @Param("eventType") String eventType,
                                                     @Param("since") Instant since);
}
