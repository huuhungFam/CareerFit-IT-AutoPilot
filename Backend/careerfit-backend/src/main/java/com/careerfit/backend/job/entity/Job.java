package com.careerfit.backend.job.entity;

import com.careerfit.backend.auth.entity.UserAccount;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "job",
        indexes = {
            @Index(name = "idx_job_language", columnList = "language"),
            @Index(name = "idx_job_salary_mode", columnList = "salary_mode"),
            @Index(name = "idx_job_title", columnList = "title"),
            @Index(name = "idx_job_company", columnList = "company"),
            @Index(name = "idx_job_status", columnList = "status")
        })
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recruiter_id", nullable = false)
    private UserAccount recruiter;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, length = 255)
    private String company;

    /** Full JD text as entered by recruiter. */
    @Column(name = "original_text", columnDefinition = "text", nullable = false)
    private String originalText;

    /** JSONB: list of required skills. */
    @Column(name = "required_skills", columnDefinition = "jsonb")
    private String requiredSkillsJson;

    /** JSONB: list of nice-to-have skills. */
    @Column(name = "nice_to_have_skills", columnDefinition = "jsonb")
    private String niceToHaveSkillsJson;

    @Column(name = "seniority_level", length = 50)
    private String seniorityLevel;

    @Column(name = "employment_type", length = 50)
    private String employmentType;

    @Column(name = "location", length = 255)
    private String location;

    @Column(name = "remote_type", length = 50)
    private String remoteType;

    // ── Salary fields (conditional on salaryMode) ──────────────────────────

    @Column(name = "salary_mode", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private SalaryMode salaryMode;

    @Column(name = "salary_min", precision = 15, scale = 2)
    private BigDecimal salaryMin;

    @Column(name = "salary_max", precision = 15, scale = 2)
    private BigDecimal salaryMax;

    @Column(name = "salary_currency", length = 10)
    private String salaryCurrency;

    @Column(name = "salary_type", length = 20)
    private String salaryType;  // MONTHLY, HOURLY, YEARLY

    @Column(name = "salary_is_visible", nullable = false)
    private boolean salaryIsVisible = true;

    @Column(name = "salary_display_text", length = 255)
    private String salaryDisplayText;

    // ── AI / Vectorization fields ──────────────────────────────────────────

    /** JSONB: Rocchio-learned profile vector (updated by feedback). */
    @Column(name = "learned_profile_vector", columnDefinition = "jsonb")
    private String learnedProfileVectorJson;

    /** JSONB: TF-IDF term weights for this JD. */
    @Column(name = "tfidf_vector", columnDefinition = "jsonb")
    private String tfidfVectorJson;

    @Column(name = "language", length = 10)
    private String language = "vi";

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private JobStatus status = JobStatus.ACTIVE;

    @Column(name = "domain", length = 100)
    private String domain;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    // ── Enums ──────────────────────────────────────────────────────────────

    public enum SalaryMode { NEGOTIABLE, RANGE, UP_TO, FROM, HIDDEN }

    public enum JobStatus { ACTIVE, CLOSED, DRAFT, PAUSED }

    // ── Constructors ──────────────────────────────────────────────────────

    protected Job() {}

    public Job(UserAccount recruiter, String title, String company,
               String originalText, SalaryMode salaryMode) {
        this.recruiter = recruiter;
        this.title = title;
        this.company = company;
        this.originalText = originalText;
        this.salaryMode = salaryMode;
    }

    // ── Getters / Setters ─────────────────────────────────────────────────

    public UUID getId()                                  { return id; }
    public UserAccount getRecruiter()                    { return recruiter; }
    public String getTitle()                             { return title; }
    public void setTitle(String t)                       { this.title = t; }
    public String getCompany()                           { return company; }
    public void setCompany(String c)                     { this.company = c; }
    public String getOriginalText()                      { return originalText; }
    public void setOriginalText(String t)                { this.originalText = t; }
    public String getRequiredSkillsJson()                { return requiredSkillsJson; }
    public void setRequiredSkillsJson(String j)          { this.requiredSkillsJson = j; }
    public String getNiceToHaveSkillsJson()              { return niceToHaveSkillsJson; }
    public void setNiceToHaveSkillsJson(String j)        { this.niceToHaveSkillsJson = j; }
    public String getSeniorityLevel()                    { return seniorityLevel; }
    public void setSeniorityLevel(String s)              { this.seniorityLevel = s; }
    public String getEmploymentType()                    { return employmentType; }
    public void setEmploymentType(String t)              { this.employmentType = t; }
    public String getLocation()                          { return location; }
    public void setLocation(String l)                    { this.location = l; }
    public String getRemoteType()                        { return remoteType; }
    public void setRemoteType(String r)                  { this.remoteType = r; }
    public SalaryMode getSalaryMode()                    { return salaryMode; }
    public void setSalaryMode(SalaryMode m)              { this.salaryMode = m; }
    public BigDecimal getSalaryMin()                     { return salaryMin; }
    public void setSalaryMin(BigDecimal v)               { this.salaryMin = v; }
    public BigDecimal getSalaryMax()                     { return salaryMax; }
    public void setSalaryMax(BigDecimal v)               { this.salaryMax = v; }
    public String getSalaryCurrency()                    { return salaryCurrency; }
    public void setSalaryCurrency(String c)              { this.salaryCurrency = c; }
    public String getSalaryType()                        { return salaryType; }
    public void setSalaryType(String t)                  { this.salaryType = t; }
    public boolean isSalaryIsVisible()                   { return salaryIsVisible; }
    public void setSalaryIsVisible(boolean v)            { this.salaryIsVisible = v; }
    public String getSalaryDisplayText()                 { return salaryDisplayText; }
    public void setSalaryDisplayText(String t)           { this.salaryDisplayText = t; }
    public String getLearnedProfileVectorJson()          { return learnedProfileVectorJson; }
    public void setLearnedProfileVectorJson(String j)    { this.learnedProfileVectorJson = j; }
    public String getTfidfVectorJson()                   { return tfidfVectorJson; }
    public void setTfidfVectorJson(String j)             { this.tfidfVectorJson = j; }
    public String getLanguage()                          { return language; }
    public void setLanguage(String l)                    { this.language = l; }
    public JobStatus getStatus()                         { return status; }
    public void setStatus(JobStatus s)                   { this.status = s; }
    public String getDomain()                            { return domain; }
    public void setDomain(String d)                      { this.domain = d; }
    public Instant getCreatedAt()                        { return createdAt; }
    public Instant getUpdatedAt()                        { return updatedAt; }
}
