package com.careerfit.backend;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Base class for Integration Tests.
 * Uses Testcontainers to spin up an ephemeral PostgreSQL instance.
 */
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
        "spring.main.allow-bean-definition-overriding=true"
    }
)
@org.springframework.context.annotation.Import(com.careerfit.backend.config.TestAsyncConfig.class)
public abstract class BaseIntegrationTest {

    static final PostgreSQLContainer<?> postgres;
    
    static {
        postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("careerfit_test")
            .withUsername("test")
            .withPassword("test");
        postgres.start();
    }

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        // Ensure Flyway runs on the test DB
        registry.add("spring.flyway.url", postgres::getJdbcUrl);
        registry.add("spring.flyway.user", postgres::getUsername);
        registry.add("spring.flyway.password", postgres::getPassword);
        
        // Disable real email sending during tests
        registry.add("app.mail.enabled", () -> "false");
        // Background jobs must not race the Testcontainers shutdown lifecycle.
        registry.add("app.scheduling.enabled", () -> "false");
        // Allow overriding taskExecutor with TestAsyncConfig
        registry.add("spring.main.allow-bean-definition-overriding", () -> "true");
    }
}
