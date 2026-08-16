package com.careerfit.backend.candidate.entity;

import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.job.entity.Job;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "candidate_saved_job",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_candidate_saved_job",
                columnNames = {"candidate_user_id", "job_id"}))
public class CandidateSavedJob {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_user_id", nullable = false)
    private UserAccount candidateUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected CandidateSavedJob() {}

    public CandidateSavedJob(UserAccount candidateUser, Job job) {
        this.candidateUser = candidateUser;
        this.job = job;
    }

    public UUID getId() { return id; }
    public Job getJob() { return job; }
    public Instant getCreatedAt() { return createdAt; }
}

