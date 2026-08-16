package com.careerfit.backend.config.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Bounded in-memory Rate Limiting filter for abuse protection.
 * Protects login, register, and email-action endpoints.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final SecurityErrorResponseWriter errorWriter;

    private static class TokenBucket {
        int tokens;
        long lastRefillTime;

        TokenBucket(int maxTokens) {
            this.tokens = maxTokens;
            this.lastRefillTime = Instant.now().toEpochMilli();
        }
    }

    // Bounded cache with LRU eviction to prevent memory leaks
    private static class BoundedCache<K, V> extends LinkedHashMap<K, V> {
        private final int maxSize;

        public BoundedCache(int maxSize) {
            super(maxSize, 0.75f, true);
            this.maxSize = maxSize;
        }

        @Override
        protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
            return size() > maxSize;
        }
    }

    // Two separate bounded caches for different categories
    private final Map<String, TokenBucket> authBuckets = Collections.synchronizedMap(new BoundedCache<>(10000));
    private final Map<String, TokenBucket> actionBuckets = Collections.synchronizedMap(new BoundedCache<>(10000));

    private final int AUTH_MAX_TOKENS = 10;
    private final long AUTH_REFILL_DURATION_MS = 60_000;

    private final int ACTION_MAX_TOKENS = 20;
    private final long ACTION_REFILL_DURATION_MS = 60_000;

    public RateLimitFilter(SecurityErrorResponseWriter errorWriter) {
        this.errorWriter = errorWriter;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod();
        
        if (isAuthEndpoint(method, path)) {
            String clientIp = getClientIp(request);
            if (!allowRequest(authBuckets, clientIp, AUTH_MAX_TOKENS, AUTH_REFILL_DURATION_MS)) {
                response.setHeader("Retry-After", "60");
                errorWriter.write(response, 429, "TOO_MANY_REQUESTS", "Rate limit exceeded for auth endpoints. Try again later.");
                return;
            }
        } else if (isActionEndpoint(method, path)) {
            String clientIp = getClientIp(request);
            if (!allowRequest(actionBuckets, clientIp, ACTION_MAX_TOKENS, ACTION_REFILL_DURATION_MS)) {
                response.setHeader("Retry-After", "60");
                errorWriter.write(response, 429, "TOO_MANY_REQUESTS", "Rate limit exceeded for actions. Try again later.");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean isAuthEndpoint(String method, String path) {
        if (!"POST".equalsIgnoreCase(method)) return false;
        return "/api/auth/login".equals(path) ||
               "/api/auth/register".equals(path);
    }

    private boolean isActionEndpoint(String method, String path) {
        if (!"POST".equalsIgnoreCase(method)) return false;
        return "/api/email-action/redeem".equals(path);
    }

    private boolean allowRequest(Map<String, TokenBucket> buckets, String clientIp, int maxTokens, long refillDuration) {
        long now = Instant.now().toEpochMilli();
        boolean allowed = false;

        synchronized (buckets) {
            TokenBucket b = buckets.get(clientIp);
            if (b == null) {
                b = new TokenBucket(maxTokens - 1);
                buckets.put(clientIp, b);
                return true;
            }

            long timePassed = now - b.lastRefillTime;
            if (timePassed > refillDuration) {
                b.tokens = maxTokens;
                b.lastRefillTime = now;
            }

            if (b.tokens > 0) {
                b.tokens--;
                allowed = true;
            }
        }
        return allowed;
    }
    
    private String getClientIp(HttpServletRequest request) {
        // Stop blindly trusting X-Forwarded-For. Rely on server.forward-headers-strategy or trusted proxy configuration.
        return request.getRemoteAddr();
    }
}
