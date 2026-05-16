package com.careerfit.backend.config.security;

import com.careerfit.backend.config.AppProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;
    private final UserIdResolutionFilter userIdFilter;
    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;

    public SecurityConfig(JwtAuthenticationFilter jwtFilter,
                          UserIdResolutionFilter userIdFilter,
                          AppProperties appProperties,
                          ObjectMapper objectMapper) {
        this.jwtFilter = jwtFilter;
        this.userIdFilter = userIdFilter;
        this.appProperties = appProperties;
        this.objectMapper = objectMapper;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex.authenticationEntryPoint(authEntryPoint()))
            .authorizeHttpRequests(auth -> auth
                // ── Fully public ───────────────────────────────────────────
                .requestMatchers(
                    "/api/auth/**",
                    "/api/employers/featured",
                    "/api/email-action/redeem",     // tokenized — no JWT needed
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/api-docs/**",
                    "/actuator/health"
                ).permitAll()
                // Public GET-only routes (jobs / employers)
                .requestMatchers(org.springframework.http.HttpMethod.GET,
                    "/api/jobs",
                    "/api/jobs/search",
                    "/api/jobs/suggestions",
                    "/api/jobs/{id}",
                    "/api/employers/{slug}",
                    "/api/employers/{slug}/jobs",
                    "/api/analytics/**"
                ).permitAll()
                // ── Candidate-only ─────────────────────────────────────────
                .requestMatchers("/api/cv/**", "/api/matches/**").hasRole("CANDIDATE")
                .requestMatchers("/api/candidates/**").hasRole("CANDIDATE")
                // ── Recruiter-only ─────────────────────────────────────────
                .requestMatchers("/api/recruiter/**").hasRole("RECRUITER")
                .requestMatchers("/api/employers/me/**").hasRole("RECRUITER")
                // ── Admin-only ─────────────────────────────────────────────
                .requestMatchers("/api/admin/**", "/api/audit-logs/**").hasRole("ADMIN")
                // ── Authenticated (jobs write + employer write) ─────────────
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
            res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            res.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(res.getWriter(), Map.of(
                "success", false,
                "error", Map.of("code", "UNAUTHORIZED", "message", "Authentication required")
            ));
        };
    }
}
