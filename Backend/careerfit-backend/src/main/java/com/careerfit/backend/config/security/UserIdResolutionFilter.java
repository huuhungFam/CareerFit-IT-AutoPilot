package com.careerfit.backend.config.security;

import com.careerfit.backend.auth.repository.UserAccountRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * After JwtAuthenticationFilter populates SecurityContext,
 * this filter resolves the user's UUID from DB and sets it as
 * a request attribute so controllers can use @RequestAttribute("userId").
 *
 * This avoids repeated DB lookups in every service method.
 */
@Component
public class UserIdResolutionFilter extends OncePerRequestFilter {

    private final UserAccountRepository userRepo;

    public UserIdResolutionFilter(UserAccountRepository userRepo) {
        this.userRepo = userRepo;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof String email) {
            userRepo.findByEmail(email).ifPresent(user ->
                    request.setAttribute("userId", user.getId()));
        }
        filterChain.doFilter(request, response);
    }
}
