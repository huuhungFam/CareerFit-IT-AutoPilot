package com.careerfit.backend.automation.entity;

import com.careerfit.backend.auth.entity.UserAccount;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Secure token for email actions and passwordless login.
 * Raw token is NEVER stored — only its SHA-256 hash.
 */
@Entity
@Table(name = "email_token",
        indexes = @Index(name = "idx_email_token_hash", columnList = "token_hash"))
public class EmailToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** SHA-256 hash of the raw token. */
    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "purpose", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private TokenPurpose purpose;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    /** Optional reference to an EmailAction. */
    @Column(name = "action_id")
    private UUID actionId;

    /** Optional polymorphic target (e.g. matchingId, jobId). */
    @Column(name = "target_type", length = 50)
    private String targetType;

    @Column(name = "target_id")
    private UUID targetId;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    // ── Enum ──────────────────────────────────────────────────────────────

    public enum TokenPurpose {
        PASSWORDLESS_LOGIN,
        APPROVE_MATCH,
        REJECT_MATCH,
        APPLY_JOB,
        ALLOW_AUTO_APPLY,
        CHANGE_THRESHOLD,
        INVITE_CANDIDATE,
        FEEDBACK_ACTION
    }

    protected EmailToken() {}

    public EmailToken(String tokenHash, TokenPurpose purpose, UserAccount user, Instant expiresAt) {
        this.tokenHash = tokenHash;
        this.purpose = purpose;
        this.user = user;
        this.expiresAt = expiresAt;
    }

    // ── Domain logic ──────────────────────────────────────────────────────

    public boolean isExpired()  { return Instant.now().isAfter(expiresAt); }
    public boolean isUsed()     { return usedAt != null; }
    public boolean isRevoked()  { return revokedAt != null; }
    public boolean isValid()    { return !isExpired() && !isUsed() && !isRevoked(); }

    public void markUsed()      { this.usedAt = Instant.now(); }
    public void revoke()        { this.revokedAt = Instant.now(); }

    // ── Getters / Setters ─────────────────────────────────────────────────

    public UUID getId()                      { return id; }
    public String getTokenHash()             { return tokenHash; }
    public TokenPurpose getPurpose()         { return purpose; }
    public UserAccount getUser()             { return user; }
    public UUID getActionId()               { return actionId; }
    public void setActionId(UUID a)         { this.actionId = a; }
    public String getTargetType()           { return targetType; }
    public void setTargetType(String t)     { this.targetType = t; }
    public UUID getTargetId()              { return targetId; }
    public void setTargetId(UUID t)        { this.targetId = t; }
    public Instant getExpiresAt()           { return expiresAt; }
    public Instant getUsedAt()              { return usedAt; }
    public Instant getRevokedAt()           { return revokedAt; }
    public Instant getCreatedAt()           { return createdAt; }
}
