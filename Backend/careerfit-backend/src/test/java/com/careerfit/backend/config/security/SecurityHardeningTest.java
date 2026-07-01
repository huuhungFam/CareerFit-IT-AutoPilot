package com.careerfit.backend.config.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.http.MediaType;

import com.careerfit.backend.BaseIntegrationTest;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import static org.hamcrest.Matchers.containsString;

@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityHardeningTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RateLimitFilter rateLimitFilter;

    @BeforeEach
    void setUp() throws Exception {
        // Clear caches using reflection to make tests deterministic
        java.lang.reflect.Field authField = RateLimitFilter.class.getDeclaredField("authBuckets");
        authField.setAccessible(true);
        ((java.util.Map<?, ?>) authField.get(rateLimitFilter)).clear();

        java.lang.reflect.Field actionField = RateLimitFilter.class.getDeclaredField("actionBuckets");
        actionField.setAccessible(true);
        ((java.util.Map<?, ?>) actionField.get(rateLimitFilter)).clear();
    }

    private RequestPostProcessor remoteAddr(String ip) {
        return request -> {
            request.setRemoteAddr(ip);
            return request;
        };
    }

    @Test
    void testSecurityHeaders() throws Exception {
        mockMvc.perform(get("/api/jobs"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().exists("Content-Security-Policy"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"));
    }

    @Test
    void testRateLimiterReturns429OnExcessiveRequests() throws Exception {
        String ip = "192.168.1.100";
        
        String validJson = "{\"email\":\"test@test.com\",\"password\":\"pass\"}";
        
        // Consume all tokens (10 for AUTH)
        for (int i = 0; i < 10; i++) {
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(validJson)
                            .with(remoteAddr(ip)))
                    // Valid JSON but invalid credentials will likely return 401 Unauthorized or 400 Bad Request
                    // but definitely NOT 429. Here we ensure it specifically is 401 or 400.
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized())
                    .andExpect(status().is(org.hamcrest.Matchers.not(429)));
        }
        
        // 11th request should be rate limited
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validJson)
                        .with(remoteAddr(ip)))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.success").value(false))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.error.code").value("TOO_MANY_REQUESTS"));
    }

    @Test
    void testSpoofedXFFDoesNotBypassRateLimit() throws Exception {
        String realIp = "192.168.1.101";
        
        String validJson = "{\"email\":\"test@test.com\",\"password\":\"pass\"}";
        
        // Consume all tokens
        for (int i = 0; i < 10; i++) {
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(validJson)
                            .with(remoteAddr(realIp)))
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized())
                    .andExpect(status().is(org.hamcrest.Matchers.not(429)));
        }
        
        // 11th request with spoofed XFF should still be blocked because remoteAddr is the same
        mockMvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(validJson)
                    .header("X-Forwarded-For", "8.8.8.8")
                    .with(remoteAddr(realIp)))
                .andExpect(status().isTooManyRequests())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.success").value(false))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.error.code").value("TOO_MANY_REQUESTS"));
    }

    @Test
    void testCategoryIndependence() throws Exception {
        String ip = "192.168.1.102";
        
        String validJson = "{\"email\":\"test@test.com\",\"password\":\"pass\"}";
        
        // Consume all tokens for AUTH
        for (int i = 0; i < 10; i++) {
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(validJson)
                            .with(remoteAddr(ip)))
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized())
                    .andExpect(status().is(org.hamcrest.Matchers.not(429)));
        }
        
        // AUTH is blocked
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validJson)
                        .with(remoteAddr(ip)))
                .andExpect(status().isTooManyRequests())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.error.code").value("TOO_MANY_REQUESTS"));
                
        // ACTION should still be allowed (e.g. 20 limit)
        // Using /api/email-action/redeem which is explicitly listed as isActionEndpoint in RateLimitFilter
        mockMvc.perform(post("/api/email-action/redeem")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"fake_token\"}")
                        .with(remoteAddr(ip)))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isMethodNotAllowed())
                .andExpect(status().is(org.hamcrest.Matchers.not(429)));
    }
}

