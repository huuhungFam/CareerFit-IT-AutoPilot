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

    @Value("${app.magic-link.expose-token-in-response:true}")
    private boolean magicLinkExposeTokenInResponse;

    @Value("${app.storage.local-path}")
    private String localStoragePath;

    @Value("${app.storage.max-file-size-mb}")
    private int maxFileSizeMb;

    @Value("${app.ocr.enabled:true}")
    private boolean ocrEnabled;

    @Value("${app.ocr.tesseract-command:tesseract}")
    private String tesseractCommand;

    @Value("${app.ocr.languages:vie+eng}")
    private String ocrLanguages;

    @Value("${app.ocr.dpi:220}")
    private int ocrDpi;

    @Value("${app.ocr.max-pages:8}")
    private int ocrMaxPages;

    @Value("${app.ocr.timeout-seconds:45}")
    private int ocrTimeoutSeconds;

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

    @Value("${app.email-action.base-url:}")
    private String emailActionBaseUrl;

    public String getJwtSecret()                    { return jwtSecret; }
    public long getJwtExpirationMs()                { return jwtExpirationMs; }
    public long getJwtRefreshExpirationMs()         { return jwtRefreshExpirationMs; }
    public int getMagicLinkExpirationMinutes()      { return magicLinkExpirationMinutes; }
    public String getBaseUrl()                      { return baseUrl; }
    public boolean isMagicLinkExposeTokenInResponse() { return magicLinkExposeTokenInResponse; }
    public String getLocalStoragePath()             { return localStoragePath; }
    public int getMaxFileSizeMb()                   { return maxFileSizeMb; }
    public boolean isOcrEnabled()                   { return ocrEnabled; }
    public String getTesseractCommand()             { return tesseractCommand; }
    public String getOcrLanguages()                 { return ocrLanguages; }
    public int getOcrDpi()                          { return ocrDpi; }
    public int getOcrMaxPages()                     { return ocrMaxPages; }
    public int getOcrTimeoutSeconds()               { return ocrTimeoutSeconds; }

    public int getOcrPreprocessingMinWidth() { return 1000; }
    public int getOcrPreprocessingMaxPixels() { return 8000000; }

    public double getHighMatchThresholdCandidate()  { return highMatchThresholdCandidate; }
    public double getHighMatchThresholdRecruiter()  { return highMatchThresholdRecruiter; }
    public double getScoreLabelLowMax()             { return scoreLabelLowMax; }
    public double getScoreLabelMediumMax()          { return scoreLabelMediumMax; }
    public double getScoreLabelHighMax()            { return scoreLabelHighMax; }
    public String[] getAllowedOrigins()             { return allowedOriginsRaw.split(","); }
    public String getEmailActionBaseUrl() {
        if (emailActionBaseUrl != null && !emailActionBaseUrl.isBlank()) {
            return emailActionBaseUrl;
        }
        String normalizedBaseUrl = baseUrl.endsWith("/")
                ? baseUrl.substring(0, baseUrl.length() - 1)
                : baseUrl;
        return normalizedBaseUrl + "/api/email-action/redeem";
    }
}
