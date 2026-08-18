package com.careerfit.backend.config.security;

import com.careerfit.backend.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;
    private final UserIdResolutionFilter userIdFilter;
    private final AppProperties appProperties;
    private final SecurityErrorResponseWriter errorWriter;

    public SecurityConfig(JwtAuthenticationFilter jwtFilter,
                          UserIdResolutionFilter userIdFilter,
                          AppProperties appProperties,
                          SecurityErrorResponseWriter errorWriter) {
        this.jwtFilter = jwtFilter;
        this.userIdFilter = userIdFilter;
        this.appProperties = appProperties;
        this.errorWriter = errorWriter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(authEntryPoint())
                .accessDeniedHandler(accessDeniedHandler()))
            .headers(headers -> headers
                .frameOptions(frame -> frame.deny())
                .xssProtection(xss -> xss.disable()) // using CSP instead
                // Email-action redemption renders a same-origin confirmation form.
                // A sandboxed document otherwise has an opaque Origin, which Spring
                // CORS rejects on POST. Keep the sandbox, but allow this local form
                // to retain its same origin and submit.
                .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'; frame-ancestors 'none'; sandbox allow-forms allow-same-origin"))
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000)
                )
            )
            .authorizeHttpRequests(auth -> auth
                // ── Fully public ───────────────────────────────────────────
                .requestMatchers(
                    "/api/email-action/redeem",     // tokenized — no JWT needed
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/api-docs/**",
                    "/actuator/health",
                    "/actuator/health/**",
                    "/actuator/prometheus"
                ).permitAll()
                .requestMatchers(HttpMethod.POST,
                    "/api/auth/register",
                    "/api/auth/login"
                ).permitAll()
                // Protected routes that would otherwise look like public slug/id routes.
                .requestMatchers(HttpMethod.GET, "/api/auth/me").authenticated()
                .requestMatchers("/api/employers/me", "/api/employers/me/**").hasRole("RECRUITER")
                .requestMatchers(HttpMethod.GET, "/api/recommendations/jobs").hasRole("CANDIDATE")
                .requestMatchers(HttpMethod.GET, "/api/jobs/export").hasRole("RECRUITER")
                // Public GET-only routes (jobs / employers / analytics / similar jobs)
                .requestMatchers(HttpMethod.GET,
                    "/api/jobs",
                    "/api/jobs/search",
                    "/api/jobs/suggestions",
                    "/api/jobs/search/suggestions",
                    "/api/jobs/{id}",
                    "/api/employers/featured",
                    "/api/employers/{slug}",
                    "/api/employers/{slug}/jobs",
                    "/api/analytics/**",
                    "/api/recommendations/jobs/*/similar"
                ).permitAll()
                // ── Candidate-only ─────────────────────────────────────────
                .requestMatchers("/api/candidate/analytics/**").hasRole("CANDIDATE")
                .requestMatchers("/api/cv/**", "/api/matches/**").hasRole("CANDIDATE")
                .requestMatchers("/api/candidates/**").hasRole("CANDIDATE")
                .requestMatchers("/api/applications/me", "/api/applications").hasRole("CANDIDATE")
                .requestMatchers("/api/applications/{id}").hasRole("CANDIDATE")
                // ── Recruiter-only ─────────────────────────────────────────
                .requestMatchers("/api/recruiter/**").hasRole("RECRUITER")
                .requestMatchers(HttpMethod.POST, "/api/jobs").hasRole("RECRUITER")
                .requestMatchers(HttpMethod.PATCH, "/api/jobs/**").hasRole("RECRUITER")
                .requestMatchers(HttpMethod.DELETE, "/api/jobs/**").hasRole("RECRUITER")
                // ── Admin-only ─────────────────────────────────────────────
                .requestMatchers("/api/admin/**", "/api/audit-logs/**").hasRole("ADMIN")
                // ── Authenticated (jobs write + automation + email-action post) ──
                .requestMatchers("/api/automation/**").authenticated()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(userIdFilter, JwtAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList(appProperties.getAllowedOrigins()));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    private AuthenticationEntryPoint authEntryPoint() {
        return (HttpServletRequest req, HttpServletResponse res, AuthenticationException ex) -> {
            errorWriter.write(res, HttpServletResponse.SC_UNAUTHORIZED,
                    "UNAUTHORIZED", "Authentication required");
        };
    }

    private AccessDeniedHandler accessDeniedHandler() {
        return (HttpServletRequest req, HttpServletResponse res, org.springframework.security.access.AccessDeniedException ex) -> {
            errorWriter.write(res, HttpServletResponse.SC_FORBIDDEN,
                    "FORBIDDEN", "Access denied");
        };
    }
}
