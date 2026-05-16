package com.careerfit.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * Strongly-typed binding of app.* configuration properties.
 */
@Configuration
public class AppProperties {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-ms}")
    private long jwtExpirationMs;

    @Value("${app.jwt.refresh-expiration-ms}")
    private long jwtRefreshExpirationMs;

    @Value("${app.magic-link.expiration-minutes}")
    private int magicLinkExpirationMinutes;

    @Value("${app.magic-link.base-url}")
    private String baseUrl;

    @Value("${app.storage.local-path}")
    private String localStoragePath;

    @Value("${app.storage.max-file-size-mb}")
    private int maxFileSizeMb;

    @Value("${app.matching.high-match-threshold-candidate}")
    private double highMatchThresholdCandidate;

    @Value("${app.matching.high-match-threshold-recruiter}")
    private double highMatchThresholdRecruiter;

    @Value("${app.matching.score-label-low-max}")
    private double scoreLabelLowMax;

    @Value("${app.matching.score-label-medium-max}")
    private double scoreLabelMediumMax;

    @Value("${app.matching.score-label-high-max}")
    private double scoreLabelHighMax;

    @Value("${app.cors.allowed-origins}")
    private String allowedOriginsRaw;

    @Value("${app.email-action.base-url:http://localhost:8080/api/email-action/redeem}")
    private String emailActionBaseUrl;

    public String getJwtSecret()                    { return jwtSecret; }
    public long getJwtExpirationMs()                { return jwtExpirationMs; }
    public long getJwtRefreshExpirationMs()         { return jwtRefreshExpirationMs; }
    public int getMagicLinkExpirationMinutes()      { return magicLinkExpirationMinutes; }
    public String getBaseUrl()                      { return baseUrl; }
    public String getLocalStoragePath()             { return localStoragePath; }
    public int getMaxFileSizeMb()                   { return maxFileSizeMb; }
    public double getHighMatchThresholdCandidate()  { return highMatchThresholdCandidate; }
    public double getHighMatchThresholdRecruiter()  { return highMatchThresholdRecruiter; }
    public double getScoreLabelLowMax()             { return scoreLabelLowMax; }
    public double getScoreLabelMediumMax()          { return scoreLabelMediumMax; }
    public double getScoreLabelHighMax()            { return scoreLabelHighMax; }
    public String[] getAllowedOrigins()             { return allowedOriginsRaw.split(","); }
    public String getEmailActionBaseUrl()           { return emailActionBaseUrl; }
}
