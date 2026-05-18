package com.careerfit.backend.application.entity;

import com.careerfit.backend.candidate.entity.Candidate;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.matching.entity.Matching;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Tracks a candidate's job application (manual or auto-applied by AutoPilot).
 *
 * Status flow:
 *   PENDING → APPROVED | REJECTED | NOT_INTERESTED
 *   (or AUTO_APPLIED → APPROVED | REJECTED)
 *   INVITED (recruiter sent invitation) → PENDING → ...
 */
@Entity
@Table(name = "application",
        indexes = {
            @Index(name = "idx_application_candidate_job", columnList = "candidate_id, job_id"),
            @Index(name = "idx_application_job_id",        columnList = "job_id")
        },
        uniqueConstraints = @UniqueConstraint(
                name = "uq_application_candidate_job",
                columnNames = {"candidate_id", "job_id"}))
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    /** Associated matching row — null if applied before matching ran. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matching_id")
    private Matching matching;

    /** The CV submitted with this application. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cv_id")
    private CV cv;

    @Column(name = "status", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private ApplicationStatus status = ApplicationStatus.PENDING;

    @Column(name = "is_auto_applied", nullable = false)
    private boolean autoApplied = false;

    /** Optional cover letter / note from candidate. */
    @Column(name = "cover_letter", columnDefinition = "text")
    private String coverLetter;

    /** Recruiter's internal notes on this application. */
    @Column(name = "recruiter_notes", columnDefinition = "text")
    private String recruiterNotes;

    @CreationTimestamp
    @Column(name = "applied_at", nullable = false, updatable = false)
    private Instant appliedAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    // ── Enums ──────────────────────────────────────────────────────────────

    public enum ApplicationStatus {
        PENDING,
        AUTO_APPLIED,
        APPROVED,
        REJECTED,
        INVITED,          // recruiter invited before candidate applied
        NOT_INTERESTED    // candidate withdrew or declined
    }

    // ── Constructors ──────────────────────────────────────────────────────

    protected Application() {}

    public Application(Candidate candidate, Job job, CV cv, Matching matching,
                       boolean autoApplied) {
        this.candidate   = candidate;
        this.job         = job;
        this.cv          = cv;
        this.matching    = matching;
        this.autoApplied = autoApplied;
        this.status      = autoApplied ? ApplicationStatus.AUTO_APPLIED : ApplicationStatus.PENDING;
    }

    // ── Getters / Setters ─────────────────────────────────────────────────

    public UUID getId()                               { return id; }
    public Candidate getCandidate()                   { return candidate; }
    public Job getJob()                               { return job; }
    public Matching getMatching()                     { return matching; }
    public CV getCv()                                 { return cv; }
    public ApplicationStatus getStatus()              { return status; }
    public void setStatus(ApplicationStatus s)        { this.status = s; }
    public boolean isAutoApplied()                    { return autoApplied; }
    public String getCoverLetter()                    { return coverLetter; }
    public void setCoverLetter(String c)              { this.coverLetter = c; }
    public String getRecruiterNotes()                 { return recruiterNotes; }
    public void setRecruiterNotes(String n)           { this.recruiterNotes = n; }
    public Instant getAppliedAt()                     { return appliedAt; }
    public Instant getUpdatedAt()                     { return updatedAt; }
}
