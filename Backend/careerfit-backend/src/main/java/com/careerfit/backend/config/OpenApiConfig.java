package com.careerfit.backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * OpenAPI 3.1 / Swagger configuration.
 *
 * UI: http://localhost:8080/swagger-ui.html
 * JSON: http://localhost:8080/api-docs
 *
 * Security: Bearer JWT token via "Authorization: Bearer <token>" header.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI careerFitOpenApi() {
        final String securitySchemeName = "bearerAuth";

        return new OpenAPI()
                .info(new Info()
                        .title("CareerFit IT AutoPilot API")
                        .description("""
                            ## CareerFit Backend REST API
                            
                            AI-driven job matching platform for Vietnamese IT professionals.
                            
                            ### Authentication
                            All protected endpoints require a **JWT Bearer token** obtained from `/api/auth/login` or `/api/auth/magic-link/verify`.
                            
                            ### Roles
                            - **CANDIDATE**: Apply for jobs, manage CVs, view matches, configure autopilot
                            - **RECRUITER**: Post jobs, view applicant rankings, manage employer profile
                            - **ADMIN**: Full access to audit logs, user management, system ops
                            
                            ### Key Features
                            - TF-IDF based CV-JD matching with cosine similarity
                            - Rocchio feedback learning (adjusts job profile vector based on user signals)
                            - Async CV processing pipeline (PDF extraction → vectorization → scoring)
                            - One-click email action tokens (72h expiry, no JWT required)
                            - AutoPilot: daily digest, high-match notifications, scheduled scoring
                            """)
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("CareerFit Dev Team")
                                .email("dev@careerfit.vn")
                                .url("https://careerfit.vn"))
                        .license(new License()
                                .name("Proprietary")
                                .url("https://careerfit.vn/terms")))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("Local Dev"),
                        new Server().url("https://api.careerfit.vn").description("Production")))
                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName,
                                new SecurityScheme()
                                        .name(securitySchemeName)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("JWT token from /api/auth/login")));
    }
}
