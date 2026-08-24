package com.careerfit.backend.config.security;

import com.careerfit.backend.config.AppProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ProductionConfigValidatorTest {

    private AppProperties appProperties;
    private MockEnvironment env;

    @BeforeEach
    void setUp() {
        appProperties = new AppProperties();
        env = new MockEnvironment();
    }

    private void setupValidEnv() {
        ReflectionTestUtils.setField(appProperties, "jwtSecret", "a-very-long-and-secure-random-secret-key-without-placeholders");
        ReflectionTestUtils.setField(appProperties, "baseUrl", "https://production.com");
        ReflectionTestUtils.setField(appProperties, "allowedOriginsRaw", "https://production.com");
        
        env.setProperty("spring.datasource.username", "realuser");
        env.setProperty("spring.datasource.password", "realpassword");
        env.setProperty("app.mail.enabled", "false");
    }

    @Test
    void testValidConfigDoesNotThrow() {
        setupValidEnv();
        ProductionConfigValidator validator = new ProductionConfigValidator(appProperties, env);
        assertDoesNotThrow(validator::afterPropertiesSet);
    }

    @Test
    void testMissingJwtThrows() {
        setupValidEnv();
        ReflectionTestUtils.setField(appProperties, "jwtSecret", "");
        ProductionConfigValidator validator = new ProductionConfigValidator(appProperties, env);
        IllegalStateException ex = assertThrows(IllegalStateException.class, validator::afterPropertiesSet);
        assertEquals("JWT_SECRET is missing.", ex.getMessage());
    }

    @Test
    void testPlaceholderJwtThrows() {
        setupValidEnv();
        ReflectionTestUtils.setField(appProperties, "jwtSecret", "your_super_strong_jwt_secret_key_at_least_32_chars");
        ProductionConfigValidator validator = new ProductionConfigValidator(appProperties, env);
        IllegalStateException ex = assertThrows(IllegalStateException.class, validator::afterPropertiesSet);
        assertEquals("JWT_SECRET contains a placeholder value.", ex.getMessage());
    }

    @Test
    void testMissingDbCredentialsThrows() {
        setupValidEnv();
        env.setProperty("spring.datasource.username", "");
        ProductionConfigValidator validator = new ProductionConfigValidator(appProperties, env);
        IllegalStateException ex = assertThrows(IllegalStateException.class, validator::afterPropertiesSet);
        assertEquals("Database credentials cannot be missing or blank in production.", ex.getMessage());
    }

    @Test
    void testPlaceholderDbCredentialsThrows() {
        setupValidEnv();
        env.setProperty("spring.datasource.username", "dummy");
        ProductionConfigValidator validator = new ProductionConfigValidator(appProperties, env);
        IllegalStateException ex = assertThrows(IllegalStateException.class, validator::afterPropertiesSet);
        assertEquals("Database credentials must not contain placeholders in production.", ex.getMessage());
    }

    @Test
    void testMissingMailHostThrowsWhenEnabled() {
        setupValidEnv();
        env.setProperty("app.mail.enabled", "true");
        ProductionConfigValidator validator = new ProductionConfigValidator(appProperties, env);
        IllegalStateException ex = assertThrows(IllegalStateException.class, validator::afterPropertiesSet);
        assertEquals("A valid SMTP host is required when mail is enabled in production.", ex.getMessage());
    }

    @Test
    void testPlaceholderAllowedOriginsThrows() {
        setupValidEnv();
        ReflectionTestUtils.setField(appProperties, "allowedOriginsRaw", "example");
        ProductionConfigValidator validator = new ProductionConfigValidator(appProperties, env);
        IllegalStateException ex = assertThrows(IllegalStateException.class, validator::afterPropertiesSet);
        assertEquals("CORS_ORIGINS contains a placeholder value.", ex.getMessage());
    }
}
