package com.careerfit.backend.application.entity;

import com.careerfit.backend.candidate.entity.Candidate;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.job.entity.Job;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * A recruiter's private shortlist entry for one candidate in the context of a JD.
 * It is deliberately separate from Application so bookmarking never contacts the
 * candidate or changes the application lifecycle.
 */
@Entity
@Table(name = "recruiter_cv_bookmark",
        indexes = {
            @Index(name = "idx_recruiter_cv_bookmark_job", columnList = "job_id"),
            @Index(name = "idx_recruiter_cv_bookmark_candidate", columnList = "candidate_id")
        },
        uniqueConstraints = @UniqueConstraint(
                name = "uq_recruiter_cv_bookmark_job_candidate",
                columnNames = {"job_id", "candidate_id"}))
public class RecruiterCvBookmark {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cv_id", nullable = false)
    private CV cv;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected RecruiterCvBookmark() {}

    public RecruiterCvBookmark(Job job, Candidate candidate, CV cv) {
        this.job = job;
        this.candidate = candidate;
        this.cv = cv;
    }

    public UUID getId() { return id; }
    public Job getJob() { return job; }
    public Candidate getCandidate() { return candidate; }
    public CV getCv() { return cv; }
    public Instant getCreatedAt() { return createdAt; }
}
