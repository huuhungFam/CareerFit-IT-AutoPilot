package com.careerfit.backend.employer.entity;

import com.careerfit.backend.auth.entity.UserAccount;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "employer_profile",
        indexes = {
            @Index(name = "idx_employer_slug", columnList = "slug"),
            @Index(name = "idx_employer_featured", columnList = "is_featured")
        })
public class EmployerProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recruiter_id", nullable = false, unique = true)
    private UserAccount recruiter;

    @Column(name = "company_name", nullable = false, length = 255)
    private String companyName;

    @Column(name = "slug", nullable = false, unique = true, length = 255)
    private String slug;

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    @Column(name = "cover_url", length = 500)
    private String coverUrl;

    @Column(name = "summary", columnDefinition = "text")
    private String summary;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "industry", length = 100)
    private String industry;

    @Column(name = "company_size", length = 50)
    private String companySize;

    @Column(name = "location", length = 255)
    private String location;

    @Column(name = "website_url", length = 500)
    private String websiteUrl;

    /** JSONB: list of benefit strings */
    @Column(name = "benefits", columnDefinition = "jsonb")
    private String benefitsJson;

    @Column(name = "is_featured", nullable = false)
    private boolean isFeatured = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected EmployerProfile() {}

    public EmployerProfile(UserAccount recruiter, String companyName, String slug) {
        this.recruiter = recruiter;
        this.companyName = companyName;
        this.slug = slug;
    }

    // ── Getters / Setters ─────────────────────────────────────────────────

    public UUID getId()                          { return id; }
    public UserAccount getRecruiter()            { return recruiter; }
    public String getCompanyName()               { return companyName; }
    public void setCompanyName(String n)         { this.companyName = n; }
    public String getSlug()                      { return slug; }
    public void setSlug(String s)                { this.slug = s; }
    public String getLogoUrl()                   { return logoUrl; }
    public void setLogoUrl(String u)             { this.logoUrl = u; }
    public String getCoverUrl()                  { return coverUrl; }
    public void setCoverUrl(String u)            { this.coverUrl = u; }
    public String getSummary()                   { return summary; }
    public void setSummary(String s)             { this.summary = s; }
    public String getDescription()               { return description; }
    public void setDescription(String d)         { this.description = d; }
    public String getIndustry()                  { return industry; }
    public void setIndustry(String i)            { this.industry = i; }
    public String getCompanySize()               { return companySize; }
    public void setCompanySize(String s)         { this.companySize = s; }
    public String getLocation()                  { return location; }
    public void setLocation(String l)            { this.location = l; }
    public String getWebsiteUrl()                { return websiteUrl; }
    public void setWebsiteUrl(String u)          { this.websiteUrl = u; }
    public String getBenefitsJson()              { return benefitsJson; }
    public void setBenefitsJson(String j)        { this.benefitsJson = j; }
    public boolean isFeatured()                  { return isFeatured; }
    public void setFeatured(boolean f)           { this.isFeatured = f; }
    public Instant getCreatedAt()                { return createdAt; }
    public Instant getUpdatedAt()                { return updatedAt; }
}
