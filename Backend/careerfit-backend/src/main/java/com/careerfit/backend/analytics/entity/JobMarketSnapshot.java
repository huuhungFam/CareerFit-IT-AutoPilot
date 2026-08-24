package com.careerfit.backend.analytics.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Daily snapshot of job market aggregates.
 * Written by AnalyticsService each morning.
 */
@Entity
@Table(name = "job_market_snapshot",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_market_snapshot_date",
                columnNames = "snapshot_date"))
public class JobMarketSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;

    @Column(name = "total_posted_jobs", nullable = false)
    private int totalPostedJobs;

    @Column(name = "active_jobs", nullable = false)
    private int activeJobs;

    @Column(name = "new_jobs", nullable = false)
    private int newJobs;

    @Column(name = "employer_count", nullable = false)
    private int employerCount;

    /** JSONB: { "Backend Java": 120, "Frontend React": 80, ... } */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "distribution_by_role", columnDefinition = "jsonb")
    private String distributionByRoleJson;

    /** JSONB: { "< 10M": 30, "10-20M": 45, "> 20M": 25 } */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "distribution_by_salary", columnDefinition = "jsonb")
    private String distributionBySalaryJson;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected JobMarketSnapshot() {}

    public JobMarketSnapshot(LocalDate date, int total, int active, int newJobs, int employers) {
        this.snapshotDate    = date;
        this.totalPostedJobs = total;
        this.activeJobs      = active;
        this.newJobs         = newJobs;
        this.employerCount   = employers;
    }

    public UUID getId()                              { return id; }
    public LocalDate getSnapshotDate()               { return snapshotDate; }
    public int getTotalPostedJobs()                  { return totalPostedJobs; }
    public int getActiveJobs()                       { return activeJobs; }
    public int getNewJobs()                          { return newJobs; }
    public int getEmployerCount()                    { return employerCount; }
    public String getDistributionByRoleJson()        { return distributionByRoleJson; }
    public void setDistributionByRoleJson(String j)  { this.distributionByRoleJson = j; }
    public String getDistributionBySalaryJson()      { return distributionBySalaryJson; }
    public void setDistributionBySalaryJson(String j){ this.distributionBySalaryJson = j; }
    public Instant getCreatedAt()                    { return createdAt; }
}
