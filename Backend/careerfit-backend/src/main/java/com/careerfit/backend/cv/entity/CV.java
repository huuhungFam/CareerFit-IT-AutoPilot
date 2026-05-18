package com.careerfit.backend.cv.entity;

import com.careerfit.backend.candidate.entity.Candidate;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "cv",
        indexes = {
            @Index(name = "idx_cv_candidate_id", columnList = "candidate_id"),
            @Index(name = "idx_cv_candidate_default", columnList = "candidate_id, is_default")
        })
public class CV {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    /** Human-readable name shown in CV list UI. */
    @Column(name = "display_name", nullable = false, length = 255)
    private String displayName;

    @Column(name = "source", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private CvSource source;

    @Column(name = "is_default", nullable = false)
    private boolean isDefault = false;

    /** Full extracted raw text from PDF or form. */
    @Column(name = "raw_text", columnDefinition = "text")
    private String rawText;

    /** Short auto-generated summary for display. */
    @Column(name = "parsed_summary", columnDefinition = "text")
    private String parsedSummary;

    /** JSONB array of top skills extracted from CV. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "top_skills", columnDefinition = "jsonb")
    private String topSkillsJson;

    /** JSONB: tokenized terms with TF-IDF weights. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "extracted_terms", columnDefinition = "jsonb")
    private String extractedTermsJson;

    /** Detected language: 'vi' or 'en'. */
    @Column(name = "language", length = 10)
    private String language;

    @Column(name = "status", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private CvStatus status = CvStatus.UPLOADED;

    /** Path to the stored file (null for MANUAL source). */
    @Column(name = "file_path", length = 500)
    private String filePath;

    @Column(name = "file_original_name", length = 255)
    private String fileOriginalName;

    @Column(name = "last_scored_at")
    private Instant lastScoredAt;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    // ── Enums ──────────────────────────────────────────────────────────────

    public enum CvSource { UPLOAD, MANUAL }

    public enum CvStatus { UPLOADED, VALIDATING, PROCESSING, SCORING_DONE, FAILED }

    // ── Constructors ──────────────────────────────────────────────────────

    protected CV() {}

    public CV(Candidate candidate, String displayName, CvSource source) {
        this.candidate = candidate;
        this.displayName = displayName;
        this.source = source;
    }

    // ── Getters / Setters ─────────────────────────────────────────────────

    public UUID getId()                              { return id; }
    public Candidate getCandidate()                  { return candidate; }
    public String getDisplayName()                   { return displayName; }
    public void setDisplayName(String n)             { this.displayName = n; }
    public CvSource getSource()                      { return source; }
    public boolean isDefault()                       { return isDefault; }
    public void setDefault(boolean d)                { this.isDefault = d; }
    public String getRawText()                       { return rawText; }
    public void setRawText(String t)                 { this.rawText = t; }
    public String getParsedSummary()                 { return parsedSummary; }
    public void setParsedSummary(String s)           { this.parsedSummary = s; }
    public String getTopSkillsJson()                 { return topSkillsJson; }
    public void setTopSkillsJson(String j)           { this.topSkillsJson = j; }
    public String getExtractedTermsJson()            { return extractedTermsJson; }
    public void setExtractedTermsJson(String j)      { this.extractedTermsJson = j; }
    public String getLanguage()                      { return language; }
    public void setLanguage(String l)                { this.language = l; }
    public CvStatus getStatus()                      { return status; }
    public void setStatus(CvStatus s)                { this.status = s; }
    public String getFilePath()                      { return filePath; }
    public void setFilePath(String p)                { this.filePath = p; }
    public String getFileOriginalName()              { return fileOriginalName; }
    public void setFileOriginalName(String n)        { this.fileOriginalName = n; }
    public Instant getLastScoredAt()                 { return lastScoredAt; }
    public void setLastScoredAt(Instant t)           { this.lastScoredAt = t; }
    public String getFailureReason()                 { return failureReason; }
    public void setFailureReason(String r)           { this.failureReason = r; }
    public Instant getCreatedAt()                    { return createdAt; }
    public Instant getUpdatedAt()                    { return updatedAt; }
}
