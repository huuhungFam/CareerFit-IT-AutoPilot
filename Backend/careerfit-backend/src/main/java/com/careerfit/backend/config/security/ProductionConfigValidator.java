package com.careerfit.backend.config.security;

import com.careerfit.backend.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * Validates that the application is running with safe configuration in production.
 * Fails fast by throwing an IllegalStateException during bean initialization.
 */
@Component
@Profile("prod")
public class ProductionConfigValidator implements InitializingBean {

    private static final Logger log = LoggerFactory.getLogger(ProductionConfigValidator.class);
    private static final String DEV_JWT_SECRET = "careerfit-dev-secret-key-must-be-at-least-32-chars-long";
    private static final String DEV_DB_CREDENTIAL = "careerfit";

    private final AppProperties appProperties;
    private final Environment env;

    public ProductionConfigValidator(AppProperties appProperties, Environment env) {
        this.appProperties = appProperties;
        this.env = env;
    }

    private boolean isPlaceholder(String value) {
        if (value == null) return false;
        String lower = value.trim().toLowerCase();
        return lower.startsWith("your_") 
            || lower.equals("example") 
            || lower.equals("placeholder")
            || lower.equals("dummy")
            || lower.equals("change_me")
            || lower.equals("changeme")
            || lower.equals("please_change")
            || lower.equals("test_password");
    }

    @Override
    public void afterPropertiesSet() {
        log.info("Running Production Configuration Validation during bean initialization...");

        boolean isLocalSmokeTest = Boolean.parseBoolean(env.getProperty("LOCAL_SMOKE_TEST", "false"));

        // 1. JWT Secret Validation
        String jwtSecret = appProperties.getJwtSecret();
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET is missing.");
        }
        if (DEV_JWT_SECRET.equals(jwtSecret)) {
            throw new IllegalStateException("JWT_SECRET is still using the development default value.");
        }
        if (jwtSecret.length() < 32) {
            throw new IllegalStateException("JWT_SECRET is too short. Must be at least 32 characters.");
        }
        if (isPlaceholder(jwtSecret)) {
            throw new IllegalStateException("JWT_SECRET contains a placeholder value.");
        }

        // 2. Database Credential Validation
        String dbUser = env.getProperty("spring.datasource.username");
        String dbPass = env.getProperty("spring.datasource.password");
        if (dbUser == null || dbUser.isBlank() || dbPass == null || dbPass.isBlank()) {
            throw new IllegalStateException("Database credentials cannot be missing or blank in production.");
        }
        if (DEV_DB_CREDENTIAL.equals(dbUser) || DEV_DB_CREDENTIAL.equals(dbPass) || "please_change_this_password".equals(dbPass)) {
            throw new IllegalStateException("Database credentials must not be default in production.");
        }
        if (isPlaceholder(dbUser) || isPlaceholder(dbPass)) {
            throw new IllegalStateException("Database credentials must not contain placeholders in production.");
        }

        // 3. App Base URL Validation
        String baseUrl = appProperties.getBaseUrl();
        if (baseUrl == null || (!baseUrl.startsWith("https://") && !isLocalSmokeTest)) {
            throw new IllegalStateException("APP_BASE_URL must use HTTPS in production. Set LOCAL_SMOKE_TEST=true to bypass.");
        }
        if (isPlaceholder(baseUrl)) {
            throw new IllegalStateException("APP_BASE_URL contains a placeholder value.");
        }

        // 4. CORS Origins Validation
        String[] allowedOrigins = appProperties.getAllowedOrigins();
        if (allowedOrigins == null || allowedOrigins.length == 0) {
            throw new IllegalStateException("CORS_ORIGINS cannot be empty in production.");
        }
        for (String origin : allowedOrigins) {
            if ("*".equals(origin.trim())) {
                throw new IllegalStateException("CORS_ORIGINS cannot contain wildcard '*' in production.");
            }
            if (!isLocalSmokeTest && (origin.contains("localhost") || origin.contains("127.0.0.1"))) {
                throw new IllegalStateException("CORS_ORIGINS cannot contain localhost in production. Set LOCAL_SMOKE_TEST=true to bypass.");
            }
            if (isPlaceholder(origin)) {
                throw new IllegalStateException("CORS_ORIGINS contains a placeholder value.");
            }
        }

        // 5. Magic Link Exposure
        if (appProperties.isMagicLinkExposeTokenInResponse()) {
            throw new IllegalStateException("MAGIC_LINK_EXPOSE_TOKEN must be false in production.");
        }

        // 6. SMTP Validation
        boolean mailEnabled = Boolean.parseBoolean(env.getProperty("app.mail.enabled", "false"));
        if (mailEnabled) {
            String mailHost = env.getProperty("spring.mail.host");
            String mailUser = env.getProperty("spring.mail.username");
            String mailPass = env.getProperty("spring.mail.password");
            
            if (mailHost == null || mailHost.isBlank() || mailHost.contains("localhost") || isPlaceholder(mailHost)) {
                throw new IllegalStateException("A valid SMTP host is required when mail is enabled in production.");
            }
            if (mailUser == null || mailUser.isBlank() || "no-reply@careerfit.dev".equals(mailUser) || isPlaceholder(mailUser)) {
                throw new IllegalStateException("A valid SMTP username is required in production.");
            }
            if (mailPass == null || mailPass.isBlank() || isPlaceholder(mailPass)) {
                throw new IllegalStateException("A valid SMTP password is required in production. Placeholders are not allowed.");
            }
        }

        log.info("Production Configuration Validation PASSED.");
    }
}
