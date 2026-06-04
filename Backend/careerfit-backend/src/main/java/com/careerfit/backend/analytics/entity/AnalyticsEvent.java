package com.careerfit.backend.analytics.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "analytics_event",
        indexes = {
            @Index(name = "idx_analytics_event_type_time", columnList = "event_type, occurred_at"),
            @Index(name = "idx_analytics_event_actor_time", columnList = "actor_user_id, occurred_at"),
            @Index(name = "idx_analytics_event_subject_time", columnList = "subject_type, subject_id, occurred_at")
        })
public class AnalyticsEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "actor_user_id")
    private UUID actorUserId;

    @Column(name = "actor_role", length = 30)
    private String actorRole;

    @Column(name = "event_type", nullable = false, length = 60)
    private String eventType;

    @Column(name = "subject_type", length = 60)
    private String subjectType;

    @Column(name = "subject_id")
    private UUID subjectId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    private String metadataJson;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt = Instant.now();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected AnalyticsEvent() {}

    public AnalyticsEvent(UUID actorUserId, String actorRole, String eventType,
                          String subjectType, UUID subjectId, String metadataJson,
                          Instant occurredAt) {
        this.actorUserId = actorUserId;
        this.actorRole = actorRole;
        this.eventType = eventType;
        this.subjectType = subjectType;
        this.subjectId = subjectId;
        this.metadataJson = metadataJson;
        this.occurredAt = occurredAt != null ? occurredAt : Instant.now();
    }

    public UUID getId()              { return id; }
    public UUID getActorUserId()     { return actorUserId; }
    public String getActorRole()     { return actorRole; }
    public String getEventType()     { return eventType; }
    public String getSubjectType()   { return subjectType; }
    public UUID getSubjectId()       { return subjectId; }
    public String getMetadataJson()  { return metadataJson; }
    public Instant getOccurredAt()   { return occurredAt; }
    public Instant getCreatedAt()    { return createdAt; }
}
