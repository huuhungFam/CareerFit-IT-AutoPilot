package com.careerfit.backend.report.entity;

import com.careerfit.backend.auth.entity.UserAccount;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "content_report", indexes = {
        @Index(name = "idx_content_report_queue", columnList = "status,target_type,created_at"),
        @Index(name = "idx_content_report_target", columnList = "target_type,target_id,created_at")
})
public class ContentReport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reporter_id", nullable = false)
    private UserAccount reporter;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 10)
    private TargetType targetType;

    @Column(name = "target_id", nullable = false)
    private UUID targetId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private Reason reason;

    @Column(length = 1000)
    private String comment;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReportStatus status = ReportStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by")
    private UserAccount resolvedBy;

    @Column(name = "resolution_note", length = 500)
    private String resolutionNote;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    protected ContentReport() {}

    public ContentReport(UserAccount reporter, TargetType targetType, UUID targetId,
                         Reason reason, String comment) {
        this.reporter = reporter;
        this.targetType = targetType;
        this.targetId = targetId;
        this.reason = reason;
        this.comment = comment;
    }

    public void resolve(ReportStatus newStatus, UserAccount admin, String note) {
        this.status = newStatus;
        this.resolvedBy = admin;
        this.resolutionNote = note;
        this.resolvedAt = Instant.now();
    }

    public enum TargetType { JOB, CV }
    public enum Reason {
        IMPERSONATION, FRAUD_SCAM, FALSE_INFORMATION, INAPPROPRIATE_CONTENT,
        DISCRIMINATION_HARASSMENT, PRIVACY_VIOLATION, SPAM, OTHER
    }
    public enum ReportStatus { PENDING, DISMISSED, ACTIONED }

    public UUID getId() { return id; }
    public UserAccount getReporter() { return reporter; }
    public TargetType getTargetType() { return targetType; }
    public UUID getTargetId() { return targetId; }
    public Reason getReason() { return reason; }
    public String getComment() { return comment; }
    public ReportStatus getStatus() { return status; }
    public UserAccount getResolvedBy() { return resolvedBy; }
    public String getResolutionNote() { return resolutionNote; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getResolvedAt() { return resolvedAt; }
}
