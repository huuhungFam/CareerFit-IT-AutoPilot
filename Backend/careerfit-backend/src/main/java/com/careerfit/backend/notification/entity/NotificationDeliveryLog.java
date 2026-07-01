package com.careerfit.backend.notification.entity;

import com.careerfit.backend.auth.entity.UserAccount;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notification_delivery_log",
        indexes = {
                @Index(name = "idx_notification_delivery_user_created", columnList = "recipient_user_id, created_at"),
                @Index(name = "idx_notification_delivery_dedupe", columnList = "recipient_user_id, email_type, context_key, status, created_at")
        })
public class NotificationDeliveryLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_user_id", nullable = false)
    private UserAccount recipient;

    @Column(name = "email_type", nullable = false, length = 80)
    private String emailType;

    @Column(name = "context_key", length = 120)
    private String contextKey;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private DeliveryStatus status;

    @Column(name = "reason", length = 255)
    private String reason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public enum DeliveryStatus { SENT, SKIPPED, FAILED }

    protected NotificationDeliveryLog() {}

    public NotificationDeliveryLog(UserAccount recipient, String emailType, String contextKey,
                                   DeliveryStatus status, String reason) {
        this.recipient = recipient;
        this.emailType = emailType;
        this.contextKey = contextKey;
        this.status = status;
        this.reason = reason;
    }

    public UUID getId()                         { return id; }
    public UserAccount getRecipient()           { return recipient; }
    public String getEmailType()                { return emailType; }
    public String getContextKey()               { return contextKey; }
    public DeliveryStatus getStatus()           { return status; }
    public String getReason()                   { return reason; }
    public Instant getCreatedAt()               { return createdAt; }
}
