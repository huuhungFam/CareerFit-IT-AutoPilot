package com.careerfit.backend.config.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Set;

/**
 * Reads Bearer token from Authorization header,
 * validates it with JwtService, and populates SecurityContext.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private static final String BEARER_PREFIX = "Bearer ";
    private static final Set<String> ALLOWED_ROLES = Set.of("CANDIDATE", "RECRUITER", "ADMIN");

    private final JwtService jwtService;
    private final SecurityErrorResponseWriter errorWriter;

    public JwtAuthenticationFilter(JwtService jwtService,
                                   SecurityErrorResponseWriter errorWriter) {
        this.jwtService = jwtService;
        this.errorWriter = errorWriter;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (!StringUtils.hasText(header)) {
            filterChain.doFilter(request, response);
            return;
        }
        if (!header.startsWith(BEARER_PREFIX)) {
            SecurityContextHolder.clearContext();
            errorWriter.write(response, HttpServletResponse.SC_UNAUTHORIZED,
                    "AUTHORIZATION_HEADER_INVALID", "Authorization header must use Bearer token");
            return;
        }

        String token = header.substring(BEARER_PREFIX.length()).trim();
        JwtService.JwtValidationResult validation = jwtService.validateToken(token);
        if (!validation.valid()) {
            SecurityContextHolder.clearContext();
            errorWriter.write(response, HttpServletResponse.SC_UNAUTHORIZED,
                    validation.code(), validation.message());
            return;
        }

        String email = jwtService.extractSubject(token);
        String role  = jwtService.extractRole(token);
        if (!StringUtils.hasText(email) || !ALLOWED_ROLES.contains(role)) {
            SecurityContextHolder.clearContext();
            errorWriter.write(response, HttpServletResponse.SC_UNAUTHORIZED,
                    "TOKEN_CLAIMS_INVALID", "Token claims are invalid");
            return;
        }

        var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
        var auth = new UsernamePasswordAuthenticationToken(email, null, authorities);
        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(auth);
        log.debug("Authenticated user: {} role: {}", email, role);
        filterChain.doFilter(request, response);
    }
}
