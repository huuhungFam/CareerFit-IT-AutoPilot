package com.careerfit.backend.candidate.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "candidate_portfolio_project",
        indexes = @Index(name = "idx_portfolio_project_candidate", columnList = "candidate_id"))
public class CandidatePortfolioProject {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "role", length = 255)
    private String role;

    @Column(name = "summary", columnDefinition = "text")
    private String summary;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tech_stack", columnDefinition = "jsonb")
    private String techStackJson;

    @Column(name = "project_url", length = 500)
    private String projectUrl;

    @Column(name = "impact", columnDefinition = "text")
    private String impact;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected CandidatePortfolioProject() {}

    public CandidatePortfolioProject(Candidate candidate, String name) {
        this.candidate = candidate;
        this.name = name;
    }

    public UUID getId() { return id; }
    public Candidate getCandidate() { return candidate; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public String getTechStackJson() { return techStackJson; }
    public void setTechStackJson(String techStackJson) { this.techStackJson = techStackJson; }
    public String getProjectUrl() { return projectUrl; }
    public void setProjectUrl(String projectUrl) { this.projectUrl = projectUrl; }
    public String getImpact() { return impact; }
    public void setImpact(String impact) { this.impact = impact; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
