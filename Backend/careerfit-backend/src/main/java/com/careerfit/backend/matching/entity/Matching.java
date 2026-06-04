package com.careerfit.backend.matching.entity;

import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.job.entity.Job;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "matching",
        indexes = {
            @Index(name = "idx_matching_job_score", columnList = "job_id, normalized_score DESC"),
            @Index(name = "idx_matching_cv_id", columnList = "cv_id")
        },
        uniqueConstraints = @UniqueConstraint(name = "uq_matching_cv_job", columnNames = {"cv_id", "job_id"}))
public class Matching {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cv_id", nullable = false)
    private CV cv;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    /** Cosine similarity [0.0, 1.0]. */
    @Column(name = "raw_score", nullable = false, precision = 10, scale = 6)
    private BigDecimal rawScore;

    /** rawScore * 100, rounded to 2 dp. Range: [0.00, 100.00]. */
    @Column(name = "normalized_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal normalizedScore;

    @Column(name = "label", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private MatchLabel label;

    /** True when potential heuristic fires even if score is not HIGH. */
    @Column(name = "is_potential", nullable = false)
    private boolean isPotential = false;

    /** JSONB: list of human-readable reason chips for UI/email. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "match_reasons", columnDefinition = "jsonb")
    private String matchReasonsJson;

    /** JSONB: potential reason string (why it's flagged as potential). */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "potential_reason", columnDefinition = "jsonb")
    private String potentialReasonJson;

    /** Marks this row as needing recompute (after feedback or job vector update). */
    @Column(name = "needs_recompute", nullable = false)
    private boolean needsRecompute = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    // ── Enum ──────────────────────────────────────────────────────────────

    public enum MatchLabel { LOW, MEDIUM, HIGH, POTENTIAL }

    // ── Constructors ──────────────────────────────────────────────────────

    protected Matching() {}

    public Matching(CV cv, Job job, BigDecimal rawScore, BigDecimal normalizedScore,
                    MatchLabel label) {
        this.cv = cv;
        this.job = job;
        this.rawScore = rawScore;
        this.normalizedScore = normalizedScore;
        this.label = label;
    }

    // ── Getters / Setters ─────────────────────────────────────────────────

    public UUID getId()                          { return id; }
    public CV getCv()                            { return cv; }
    public Job getJob()                          { return job; }
    public BigDecimal getRawScore()              { return rawScore; }
    public void setRawScore(BigDecimal r)        { this.rawScore = r; }
    public BigDecimal getNormalizedScore()       { return normalizedScore; }
    public void setNormalizedScore(BigDecimal n) { this.normalizedScore = n; }
    public MatchLabel getLabel()                 { return label; }
    public void setLabel(MatchLabel l)           { this.label = l; }
    public boolean isPotential()                 { return isPotential; }
    public void setPotential(boolean p)          { this.isPotential = p; }
    public String getMatchReasonsJson()          { return matchReasonsJson; }
    public void setMatchReasonsJson(String j)    { this.matchReasonsJson = j; }
    public String getPotentialReasonJson()       { return potentialReasonJson; }
    public void setPotentialReasonJson(String j) { this.potentialReasonJson = j; }
    public boolean isNeedsRecompute()            { return needsRecompute; }
    public void setNeedsRecompute(boolean b)     { this.needsRecompute = b; }
    public Instant getCreatedAt()                { return createdAt; }
    public Instant getUpdatedAt()                { return updatedAt; }
    public long getVersion()                     { return version; }
}
