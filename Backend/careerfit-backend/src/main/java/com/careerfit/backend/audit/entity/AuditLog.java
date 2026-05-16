package com.careerfit.backend.audit.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Append-only audit log.
 * Records every significant action performed by a user or the system.
 */
@Entity
@Table(name = "audit_log",
        indexes = @Index(name = "idx_audit_log_created_at", columnList = "created_at DESC"))
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "actor_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ActorType actorType;

    /** UUID of the user or null for SYSTEM actor. */
    @Column(name = "actor_id")
    private UUID actorId;

    @Column(name = "action_type", nullable = false, length = 100)
    private String actionType;

    @Column(name = "target_type", length = 50)
    private String targetType;

    @Column(name = "target_id")
    private UUID targetId;

    @Column(name = "result", length = 20)
    @Enumerated(EnumType.STRING)
    private Result result;

    @Column(name = "source_channel", length = 20)
    @Enumerated(EnumType.STRING)
    private SourceChannel sourceChannel;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    /** JSONB: extra context (tokenPurpose, score, matchingId, etc.). */
    @Column(name = "metadata", columnDefinition = "jsonb")
    private String metadataJson;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    // ── Enums ──────────────────────────────────────────────────────────────

    public enum ActorType { USER, SYSTEM }

    public enum Result { SUCCESS, FAILURE, DENIED }

    public enum SourceChannel { WEB, EMAIL, DIGEST, AUTOPILOT, SYSTEM }

    protected AuditLog() {}

    public AuditLog(ActorType actorType, UUID actorId, String actionType) {
        this.actorType = actorType;
        this.actorId = actorId;
        this.actionType = actionType;
        this.result = Result.SUCCESS;
        this.sourceChannel = SourceChannel.SYSTEM;
    }

    // ── Fluent builder-style setters ──────────────────────────────────────

    public AuditLog withTarget(String type, UUID id) {
        this.targetType = type;
        this.targetId = id;
        return this;
    }

    public AuditLog withResult(Result result) {
        this.result = result;
        return this;
    }

    public AuditLog withChannel(SourceChannel channel) {
        this.sourceChannel = channel;
        return this;
    }

    public AuditLog withIp(String ip) {
        this.ipAddress = ip;
        return this;
    }

    public AuditLog withUserAgent(String ua) {
        this.userAgent = ua;
        return this;
    }

    public AuditLog withMetadata(String json) {
        this.metadataJson = json;
        return this;
    }

    // ── Getters ──────────────────────────────────────────────────────────

    public UUID getId()               { return id; }
    public ActorType getActorType()   { return actorType; }
    public UUID getActorId()         { return actorId; }
    public String getActionType()    { return actionType; }
    public String getTargetType()    { return targetType; }
    public UUID getTargetId()        { return targetId; }
    public Result getResult()        { return result; }
    public SourceChannel getSourceChannel() { return sourceChannel; }
    public String getIpAddress()     { return ipAddress; }
    public String getUserAgent()     { return userAgent; }
    public String getMetadataJson()  { return metadataJson; }
    public Instant getCreatedAt()    { return createdAt; }
}
