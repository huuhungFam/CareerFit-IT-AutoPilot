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
    private final com.careerfit.backend.auth.repository.UserAccountRepository userRepo;

    public JwtAuthenticationFilter(JwtService jwtService,
                                   SecurityErrorResponseWriter errorWriter,
                                   com.careerfit.backend.auth.repository.UserAccountRepository userRepo) {
        this.jwtService = jwtService;
        this.errorWriter = errorWriter;
        this.userRepo = userRepo;
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
        String tokenUserId = jwtService.extractUserId(token);
        if (!StringUtils.hasText(email) || !ALLOWED_ROLES.contains(role) || !StringUtils.hasText(tokenUserId)) {
            SecurityContextHolder.clearContext();
            errorWriter.write(response, HttpServletResponse.SC_UNAUTHORIZED,
                    "TOKEN_CLAIMS_INVALID", "Token claims are invalid");
            return;
        }

        var user = userRepo.findByEmail(email).orElse(null);
        if (user == null || !user.isActive()) {
            SecurityContextHolder.clearContext();
            errorWriter.write(response, HttpServletResponse.SC_FORBIDDEN,
                    "ACCOUNT_DISABLED", "Account is disabled or not found");
            return;
        }
        if (!user.getId().toString().equals(tokenUserId) || !user.getRole().name().equals(role)) {
            SecurityContextHolder.clearContext();
            errorWriter.write(response, HttpServletResponse.SC_UNAUTHORIZED,
                    "TOKEN_ACCOUNT_MISMATCH", "Token no longer belongs to this account");
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
