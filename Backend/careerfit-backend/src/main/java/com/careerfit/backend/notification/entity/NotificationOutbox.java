package com.careerfit.backend.notification.entity;

import com.careerfit.backend.auth.entity.UserAccount;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "notification_outbox",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_notification_outbox",
        columnNames = {"recipient_user_id", "email_type", "target_type", "target_key"}
    )
)
public class NotificationOutbox {
    
    public enum OutboxStatus {
        PENDING, PROCESSING, SENT, FAILED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_user_id", nullable = false)
    private UserAccount recipient;

    @Column(name = "email_type", nullable = false, length = 80)
    private String emailType;

    @Column(name = "target_type", nullable = false, length = 80)
    private String targetType;

    @Column(name = "target_key", nullable = false, length = 120)
    private String targetKey;

    @Column(name = "scheduled_at", nullable = false)
    private Instant scheduledAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private OutboxStatus status = OutboxStatus.PENDING;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount = 0;

    @Column(name = "last_error")
    private String lastError;

    @Column(name = "sent_at")
    private Instant sentAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected NotificationOutbox() {}

    protected NotificationOutbox(UserAccount recipient, String emailType, String targetType, String targetKey, Instant scheduledAt) {
        this.recipient = recipient;
        this.emailType = emailType;
        this.targetType = targetType;
        this.targetKey = targetKey;
        this.scheduledAt = scheduledAt;
    }

    public UUID getId() { return id; }
    public UserAccount getRecipient() { return recipient; }
    public String getEmailType() { return emailType; }
    public String getTargetType() { return targetType; }
    public String getTargetKey() { return targetKey; }
    public Instant getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(Instant scheduledAt) { this.scheduledAt = scheduledAt; }
    public OutboxStatus getStatus() { return status; }
    public void setStatus(OutboxStatus status) { this.status = status; }
    public int getAttemptCount() { return attemptCount; }
    public void incrementAttempt() { this.attemptCount++; }
    public String getLastError() { return lastError; }
    public void setLastError(String lastError) { this.lastError = lastError; }
    public Instant getSentAt() { return sentAt; }
    public void setSentAt(Instant sentAt) { this.sentAt = sentAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
