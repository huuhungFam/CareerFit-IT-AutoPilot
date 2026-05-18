package com.careerfit.backend.candidate.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "candidate_portfolio_link",
        indexes = @Index(name = "idx_portfolio_link_candidate", columnList = "candidate_id"))
public class CandidatePortfolioLink {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @Column(name = "type", length = 50)
    private String type;

    @Column(name = "url", nullable = false, length = 500)
    private String url;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected CandidatePortfolioLink() {}

    public CandidatePortfolioLink(Candidate candidate, String type, String url) {
        this.candidate = candidate;
        this.type = type;
        this.url = url;
    }

    public UUID getId() { return id; }
    public Candidate getCandidate() { return candidate; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
