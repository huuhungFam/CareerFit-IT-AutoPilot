package com.careerfit.backend.auth.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Core user account.
 * Both candidates and recruiters share this entity;
 * role differentiates their access.
 */
@Entity
@Table(name = "user_account",
        uniqueConstraints = @UniqueConstraint(name = "uq_user_email", columnNames = "email"))
public class UserAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 255)
    private String email;

    /** Nullable for accounts that have no password (e.g. some imported accounts or 3rd-party auth). */
    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private Role role;

    @Column(name = "full_name", length = 255)
    private String fullName;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified = false;

    @Column(name = "preferred_language", length = 10)
    private String preferredLanguage = "vi";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    public enum Role { CANDIDATE, RECRUITER, ADMIN }
    public enum AccountSource { LOCAL, IMPORTED }

    @Column(name = "account_source", length = 20, nullable = false)
    @Enumerated(EnumType.STRING)
    private AccountSource source = AccountSource.LOCAL;

    // ── Constructors ──────────────────────────────────────────────────────

    protected UserAccount() {}

    public UserAccount(String email, String passwordHash, Role role, String fullName) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
        this.fullName = fullName;
    }

    // ── Getters / Setters ─────────────────────────────────────────────────

    public UUID getId()                  { return id; }
    public String getEmail()             { return email; }
    public void setEmail(String email)   { this.email = email; }
    public String getPasswordHash()              { return passwordHash; }
    public void setPasswordHash(String h)        { this.passwordHash = h; }
    public Role getRole()                        { return role; }
    public void setRole(Role role)               { this.role = role; }
    public AccountSource getSource()             { return source; }
    public void setSource(AccountSource s)       { this.source = s; }
    public String getFullName()                  { return fullName; }
    public void setFullName(String fullName)     { this.fullName = fullName; }
    public boolean isActive()                    { return isActive; }
    public void setActive(boolean active)        { this.isActive = active; }
    public boolean isEmailVerified()             { return emailVerified; }
    public void setEmailVerified(boolean v)      { this.emailVerified = v; }
    public String getPreferredLanguage()         { return preferredLanguage; }
    public void setPreferredLanguage(String l)   { this.preferredLanguage = l; }
    public Instant getCreatedAt()                { return createdAt; }
    public Instant getUpdatedAt()                { return updatedAt; }
    public long getVersion()                     { return version; }

    @Transient
    public boolean isImported() {
        return source == AccountSource.IMPORTED;
    }

    @Transient
    public boolean isLocal() {
        return source == AccountSource.LOCAL;
    }
}
