package com.careerfit.backend.automation.entity;

import com.careerfit.backend.auth.entity.UserAccount;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

/**
 * Per-user AutoFit automation policy.
 * Controls all aspects of autonomous behavior:
 * thresholds, email quotas, quiet hours, scan frequency, etc.
 */
@Entity
@Table(name = "automation_policy")
public class AutomationPolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private UserAccount user;

    @Column(name = "demo_mode_enabled", nullable = false)
    private boolean demoModeEnabled = false;

    // ── Auto-apply ────────────────────────────────────────────────────────

    @Column(name = "auto_apply_enabled", nullable = false)
    private boolean autoApplyEnabled = false;

    @Column(name = "auto_apply_threshold", nullable = false, precision = 5, scale = 2)
    private BigDecimal autoApplyThreshold = new BigDecimal("90.00");


    // ── Auto-invite (recruiter) ───────────────────────────────────────────

    @Column(name = "auto_invite_enabled", nullable = false)
    private boolean autoInviteEnabled = false;

    // ── Daily digest ──────────────────────────────────────────────────────

    @Column(name = "daily_digest_enabled", nullable = false)
    private boolean dailyDigestEnabled = true;

    @Column(name = "daily_digest_time")
    private LocalTime dailyDigestTime = LocalTime.of(8, 0);

    // ── Timezone / quiet hours ────────────────────────────────────────────

    @Column(name = "user_timezone", length = 50)
    private String userTimezone = "Asia/Ho_Chi_Minh";

    @Column(name = "quiet_hours_enabled", nullable = false)
    private boolean quietHoursEnabled = false;

    @Column(name = "quiet_hours_start")
    private LocalTime quietHoursStart = LocalTime.of(22, 0);

    @Column(name = "quiet_hours_end")
    private LocalTime quietHoursEnd = LocalTime.of(7, 0);

    // ── Job scan ──────────────────────────────────────────────────────────

    @Column(name = "job_scan_enabled", nullable = false)
    private boolean jobScanEnabled = false;

    @Column(name = "job_scan_frequency_hours", nullable = false)
    private int jobScanFrequencyHours = 1;

    // ── High-match notification ───────────────────────────────────────────

    @Column(name = "email_notifications_enabled", nullable = false)
    private boolean emailNotificationsEnabled = true;

    @Column(name = "high_match_email_enabled", nullable = false)
    private boolean highMatchEmailEnabled = false;

    @Column(name = "high_match_threshold", nullable = false, precision = 5, scale = 2)
    private BigDecimal highMatchThreshold = new BigDecimal("90.00");

    // ── Quota / cooldown ──────────────────────────────────────────────────

    @Column(name = "max_email_per_day", nullable = false)
    private int maxEmailPerDay = 5;

    @Column(name = "notification_cooldown_hours", nullable = false)
    private int notificationCooldownHours = 24;

    // ── Skip replacement ──────────────────────────────────────────────────

    @Column(name = "replacement_after_skip_enabled", nullable = false)
    private boolean replacementAfterSkipEnabled = false;

    @Column(name = "replacement_delay_minutes", nullable = false)
    private int replacementDelayMinutes = 45;


    @Column(name = "email_action_enabled", nullable = false)
    private boolean emailActionEnabled = true;


    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    protected AutomationPolicy() {}

    public AutomationPolicy(UserAccount user) {
        this.user = user;
    }

    // ── Getters / Setters ─────────────────────────────────────────────────

    public UUID getId()                                   { return id; }
    public UserAccount getUser()                          { return user; }
    public boolean isDemoModeEnabled()                    { return demoModeEnabled; }
    public void setDemoModeEnabled(boolean b)             { this.demoModeEnabled = b; }
    public boolean isAutoApplyEnabled()                   { return autoApplyEnabled; }
    public void setAutoApplyEnabled(boolean b)            { this.autoApplyEnabled = b; }
    public BigDecimal getAutoApplyThreshold()             { return autoApplyThreshold; }
    public void setAutoApplyThreshold(BigDecimal t)       { this.autoApplyThreshold = t; }
    public boolean isAutoInviteEnabled()                  { return autoInviteEnabled; }
    public void setAutoInviteEnabled(boolean b)           { this.autoInviteEnabled = b; }
    public boolean isDailyDigestEnabled()                 { return dailyDigestEnabled; }
    public void setDailyDigestEnabled(boolean b)          { this.dailyDigestEnabled = b; }
    public LocalTime getDailyDigestTime()                 { return dailyDigestTime; }
    public void setDailyDigestTime(LocalTime t)           { this.dailyDigestTime = t; }
    public String getUserTimezone()                       { return userTimezone; }
    public void setUserTimezone(String tz)                { this.userTimezone = tz; }
    public boolean isQuietHoursEnabled()                  { return quietHoursEnabled; }
    public void setQuietHoursEnabled(boolean b)           { this.quietHoursEnabled = b; }
    public LocalTime getQuietHoursStart()                 { return quietHoursStart; }
    public void setQuietHoursStart(LocalTime t)           { this.quietHoursStart = t; }
    public LocalTime getQuietHoursEnd()                   { return quietHoursEnd; }
    public void setQuietHoursEnd(LocalTime t)             { this.quietHoursEnd = t; }
    public boolean isJobScanEnabled()                     { return jobScanEnabled; }
    public void setJobScanEnabled(boolean b)              { this.jobScanEnabled = b; }
    public int getJobScanFrequencyHours()                 { return jobScanFrequencyHours; }
    public void setJobScanFrequencyHours(int h)           { this.jobScanFrequencyHours = h; }
    public boolean isEmailNotificationsEnabled()          { return emailNotificationsEnabled; }
    public void setEmailNotificationsEnabled(boolean b)   { this.emailNotificationsEnabled = b; }
    public boolean isHighMatchEmailEnabled()              { return highMatchEmailEnabled; }
    public void setHighMatchEmailEnabled(boolean b)       { this.highMatchEmailEnabled = b; }
    public BigDecimal getHighMatchThreshold()             { return highMatchThreshold; }
    public void setHighMatchThreshold(BigDecimal t)       { this.highMatchThreshold = t; }
    public int getMaxEmailPerDay()                        { return maxEmailPerDay; }
    public void setMaxEmailPerDay(int n)                  { this.maxEmailPerDay = n; }
    public int getNotificationCooldownHours()             { return notificationCooldownHours; }
    public void setNotificationCooldownHours(int h)       { this.notificationCooldownHours = h; }
    public boolean isReplacementAfterSkipEnabled()        { return replacementAfterSkipEnabled; }
    public void setReplacementAfterSkipEnabled(boolean b) { this.replacementAfterSkipEnabled = b; }
    public int getReplacementDelayMinutes()               { return replacementDelayMinutes; }
    public void setReplacementDelayMinutes(int m)         { this.replacementDelayMinutes = m; }
    public boolean isEmailActionEnabled()                 { return emailActionEnabled; }
    public void setEmailActionEnabled(boolean b)          { this.emailActionEnabled = b; }
    public Instant getCreatedAt()                         { return createdAt; }
    public Instant getUpdatedAt()                         { return updatedAt; }
    public long getVersion()                              { return version; }

    // ── Convenience aliases for AutomationPolicyService ───────────────────
    // Maps new service fields to existing entity fields

    public boolean isAutopilotEnabled()                   { return highMatchEmailEnabled; }
    public void setAutopilotEnabled(boolean b)            { this.highMatchEmailEnabled = b; }

    public boolean isDigestEnabled()                      { return dailyDigestEnabled; }
    public void setDigestEnabled(boolean b)               { this.dailyDigestEnabled = b; }

    public String getDigestFrequency() {
        if (jobScanFrequencyHours == 24) return "DAILY";
        if (jobScanFrequencyHours == 168) return "WEEKLY";
        return jobScanFrequencyHours + "h";
    }
    public void setDigestFrequency(String freq) {
        if ("DAILY".equals(freq)) {
            this.jobScanFrequencyHours = 24;
        } else if ("WEEKLY".equals(freq)) {
            this.jobScanFrequencyHours = 168;
        }
    }

    public Double getMinScoreToNotify()                   { return highMatchThreshold.doubleValue(); }
    public void setMinScoreToNotify(Double d)             {
        if (d != null) this.highMatchThreshold = new java.math.BigDecimal(d);
    }

    public boolean isNotifyOnHighOnly()                   { return highMatchEmailEnabled; }
    public void setNotifyOnHighOnly(boolean b)            { this.highMatchEmailEnabled = b; }

    public boolean isNotifyPotential()                    { return emailActionEnabled; }
    public void setNotifyPotential(boolean b)             { this.emailActionEnabled = b; }

    public Integer getMaxNotificationsPerDay()            { return maxEmailPerDay; }
    public void setMaxNotificationsPerDay(Integer n)      { if (n != null) this.maxEmailPerDay = n; }

    public Instant getPausedUntil()                       { return null; /* not in V1 schema */ }
    public void setPausedUntil(Instant t)                 { /* would require V2 migration */ }

    // ── Policy Summary record ─────────────────────────────────────────────

    public record PolicySummary(
        boolean demoModeEnabled,
        boolean autopilotEnabled,
        boolean autoApplyEnabled,
        Double autoApplyThreshold,
        boolean emailNotificationsEnabled,
        boolean digestEnabled,
        String digestFrequency,
        Double minScoreToNotify,
        boolean notifyOnHighOnly,
        boolean notifyPotential,
        Integer maxNotificationsPerDay,
        Integer notificationCooldownHours,
        boolean quietHoursEnabled,
        LocalTime quietHoursStart,
        LocalTime quietHoursEnd,
        boolean replacementAfterSkipEnabled,
        Integer replacementDelayMinutes,
        Instant pausedUntil,
        Instant updatedAt
    ) {}
}
