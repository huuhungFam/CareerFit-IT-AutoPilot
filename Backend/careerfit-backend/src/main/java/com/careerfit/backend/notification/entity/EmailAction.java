package com.careerfit.backend.notification.entity;

import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.application.entity.Application;
import com.careerfit.backend.matching.entity.Matching;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * One-click action tokens embedded in email notifications.
 * When candidate clicks a link in the email, the token is redeemed and mapped to an action.
 *
 * Lifecycle: PENDING → REDEEMED (or expires via scheduler)
 *
 * Example email link:
 *   GET /api/email-action/redeem?token=<UUID>&type=GOOD_MATCH
 */
@Entity
@Table(name = "email_action_token",
        indexes = {
            @Index(name = "idx_email_action_token_hash",    columnList = "token_hash"),
            @Index(name = "idx_email_action_token_expires", columnList = "expires_at"),
            @Index(name = "idx_email_action_token_recip",   columnList = "recipient_id")
        })
public class EmailAction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private UserAccount recipient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matching_id")
    private Matching matching;

    /** Present for invitation actions; matching-backed actions keep this null. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id")
    private Application application;

    @Column(name = "action_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private ActionType actionType;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ActionStatus status = ActionStatus.PENDING;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "redeemed_at")
    private Instant redeemedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    // ── Enums ──────────────────────────────────────────────────────────────

    public enum ActionType {
        GOOD_MATCH,
        POTENTIAL,
        BAD_MATCH,
        NOT_INTERESTED,
        APPLY,
        ACCEPT_INVITATION,
        DECLINE_INVITATION,
        VIEW_JOB,               // open job detail in browser
        UNSUBSCRIBE_DIGEST      // one-click unsubscribe
    }

    public enum ActionStatus { PENDING, REDEEMED, EXPIRED }

    // ── Constructors ──────────────────────────────────────────────────────

    protected EmailAction() {}

    public EmailAction(String tokenHash, UserAccount recipient, Matching matching,
                       ActionType actionType, Instant expiresAt) {
        this.tokenHash = tokenHash;
        this.recipient = recipient;
        this.matching = matching;
        this.actionType = actionType;
        this.expiresAt = expiresAt;
    }

    public EmailAction(String tokenHash, UserAccount recipient, Application application,
                       ActionType actionType, Instant expiresAt) {
        this.tokenHash = tokenHash;
        this.recipient = recipient;
        this.application = application;
        this.actionType = actionType;
        this.expiresAt = expiresAt;
    }

    // ── Domain helpers ────────────────────────────────────────────────────

    public boolean isExpired()   { return Instant.now().isAfter(expiresAt); }
    public boolean isPending()   { return status == ActionStatus.PENDING; }

    public void redeem() {
        this.status = ActionStatus.REDEEMED;
        this.redeemedAt = Instant.now();
    }

    // ── Getters / Setters ─────────────────────────────────────────────────

    public UUID getId()                     { return id; }
    public String getTokenHash()            { return tokenHash; }
    public UserAccount getRecipient()       { return recipient; }
    public Matching getMatching()           { return matching; }
    public Application getApplication()      { return application; }
    public ActionType getActionType()       { return actionType; }
    public ActionStatus getStatus()         { return status; }
    public void setStatus(ActionStatus s)   { this.status = s; }
    public Instant getExpiresAt()           { return expiresAt; }
    public Instant getRedeemedAt()          { return redeemedAt; }
    public Instant getCreatedAt()           { return createdAt; }
}
