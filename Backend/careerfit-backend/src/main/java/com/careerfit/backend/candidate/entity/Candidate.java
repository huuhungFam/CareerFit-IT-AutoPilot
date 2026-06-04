package com.careerfit.backend.candidate.entity;

import com.careerfit.backend.auth.entity.UserAccount;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "candidate")
public class Candidate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private UserAccount user;

    // ── Fixed profile fields ───────────────────────────────────────────────

    @Column(name = "phone", length = 30)
    private String phone;

    @Column(name = "location", length = 255)
    private String location;

    @Column(name = "desired_title", length = 255)
    private String desiredTitle;

    @Column(name = "desired_seniority", length = 50)
    private String desiredSeniority;

    /** JSONB: list of desired skills */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "desired_skills", columnDefinition = "jsonb")
    private String desiredSkillsJson;

    @Column(name = "desired_work_model", length = 50)
    private String desiredWorkModel;

    @Column(name = "desired_salary_min", precision = 15, scale = 2)
    private BigDecimal desiredSalaryMin;

    @Column(name = "desired_salary_max", precision = 15, scale = 2)
    private BigDecimal desiredSalaryMax;

    @Column(name = "desired_salary_currency", length = 10)
    private String desiredSalaryCurrency;

    @Column(name = "years_of_experience")
    private Integer yearsOfExperience;

    @Column(name = "about_me", columnDefinition = "text")
    private String aboutMe;

    @Column(name = "auto_apply_enabled", nullable = false)
    private boolean autoApplyEnabled = false;

    @Column(name = "auto_apply_threshold", precision = 5, scale = 2)
    private BigDecimal autoApplyThreshold = new BigDecimal("90.00");

    @Column(name = "preferred_language", length = 10)
    private String preferredLanguage = "vi";

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    protected Candidate() {}

    public Candidate(UserAccount user) {
        this.user = user;
    }

    // ── Getters / Setters ─────────────────────────────────────────────────

    public UUID getId()                          { return id; }
    public UserAccount getUser()                 { return user; }
    public String getPhone()                     { return phone; }
    public void setPhone(String phone)           { this.phone = phone; }
    public String getLocation()                  { return location; }
    public void setLocation(String location)     { this.location = location; }
    public String getDesiredTitle()              { return desiredTitle; }
    public void setDesiredTitle(String t)        { this.desiredTitle = t; }
    public String getDesiredSeniority()          { return desiredSeniority; }
    public void setDesiredSeniority(String s)    { this.desiredSeniority = s; }
    public String getDesiredSkillsJson()         { return desiredSkillsJson; }
    public void setDesiredSkillsJson(String j)   { this.desiredSkillsJson = j; }
    public String getDesiredWorkModel()          { return desiredWorkModel; }
    public void setDesiredWorkModel(String m)    { this.desiredWorkModel = m; }
    public BigDecimal getDesiredSalaryMin()      { return desiredSalaryMin; }
    public void setDesiredSalaryMin(BigDecimal v){ this.desiredSalaryMin = v; }
    public BigDecimal getDesiredSalaryMax()      { return desiredSalaryMax; }
    public void setDesiredSalaryMax(BigDecimal v){ this.desiredSalaryMax = v; }
    public String getDesiredSalaryCurrency()     { return desiredSalaryCurrency; }
    public void setDesiredSalaryCurrency(String c){ this.desiredSalaryCurrency = c; }
    public Integer getYearsOfExperience()        { return yearsOfExperience; }
    public void setYearsOfExperience(Integer y)  { this.yearsOfExperience = y; }
    public String getAboutMe()                   { return aboutMe; }
    public void setAboutMe(String m)             { this.aboutMe = m; }
    public boolean isAutoApplyEnabled()          { return autoApplyEnabled; }
    public void setAutoApplyEnabled(boolean b)   { this.autoApplyEnabled = b; }
    public BigDecimal getAutoApplyThreshold()    { return autoApplyThreshold; }
    public void setAutoApplyThreshold(BigDecimal t){ this.autoApplyThreshold = t; }
    public String getPreferredLanguage()         { return preferredLanguage; }
    public void setPreferredLanguage(String l)   { this.preferredLanguage = l; }
    public String getAvatarUrl()                 { return avatarUrl; }
    public void setAvatarUrl(String u)           { this.avatarUrl = u; }
    public Instant getCreatedAt()                { return createdAt; }
    public Instant getUpdatedAt()                { return updatedAt; }
    public long getVersion()                     { return version; }
}
