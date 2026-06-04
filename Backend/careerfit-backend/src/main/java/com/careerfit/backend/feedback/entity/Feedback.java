package com.careerfit.backend.feedback.entity;

import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.matching.entity.Matching;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Explicit feedback given by candidate or recruiter on a CV-JD match.
 * Drives the Rocchio update of the job's learned_profile_vector.
 */
@Entity
@Table(name = "feedback",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_feedback_matching_actor",
                columnNames = {"matching_id", "actor_id"}))
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matching_id", nullable = false)
    private Matching matching;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id", nullable = false)
    private UserAccount actor;

    @Column(name = "actor_role", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ActorRole actorRole;

    @Column(name = "feedback_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private FeedbackType feedbackType;

    @Column(name = "source_channel", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private SourceChannel sourceChannel;

    /** JSONB: optional extra context (threshold change value, etc.) */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    private String metadataJson;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    // ── Enums ──────────────────────────────────────────────────────────────

    public enum ActorRole { CANDIDATE, RECRUITER }

    public enum FeedbackType {
        GOOD_MATCH,        // positive signal → Rocchio push toward
        POTENTIAL,         // weak positive → smaller push
        BAD_MATCH,         // negative signal → Rocchio push away
        NOT_INTERESTED     // soft skip — no Rocchio update
    }

    public enum SourceChannel { WEB, EMAIL, DIGEST, AUTOPILOT }

    // ── Domain helpers ────────────────────────────────────────────────────

    public boolean isPositiveSignal() {
        return feedbackType == FeedbackType.GOOD_MATCH || feedbackType == FeedbackType.POTENTIAL;
    }

    public boolean isNegativeSignal() {
        return feedbackType == FeedbackType.BAD_MATCH;
    }

    // ── Constructors ──────────────────────────────────────────────────────

    protected Feedback() {}

    public Feedback(Matching matching, UserAccount actor, ActorRole actorRole,
                    FeedbackType feedbackType, SourceChannel sourceChannel) {
        this.matching = matching;
        this.actor = actor;
        this.actorRole = actorRole;
        this.feedbackType = feedbackType;
        this.sourceChannel = sourceChannel;
    }

    // ── Getters / Setters ─────────────────────────────────────────────────

    public UUID getId()                          { return id; }
    public Matching getMatching()                { return matching; }
    public UserAccount getActor()                { return actor; }
    public ActorRole getActorRole()              { return actorRole; }
    public void setActorRole(ActorRole r)        { this.actorRole = r; }
    public FeedbackType getFeedbackType()        { return feedbackType; }
    public void setFeedbackType(FeedbackType t)  { this.feedbackType = t; }
    public SourceChannel getSourceChannel()      { return sourceChannel; }
    public void setSourceChannel(SourceChannel c){ this.sourceChannel = c; }
    public String getMetadataJson()              { return metadataJson; }
    public void setMetadataJson(String m)        { this.metadataJson = m; }
    public Instant getCreatedAt()                { return createdAt; }
}
