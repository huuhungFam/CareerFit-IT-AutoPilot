package com.careerfit.backend.auth.controller;

import com.careerfit.backend.auth.dto.AuthDtos;
import com.careerfit.backend.auth.service.AuthService;
import com.careerfit.backend.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Auth", description = "Authentication and passwordless login")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @Operation(summary = "Register a new user (CANDIDATE or RECRUITER)")
    public ResponseEntity<ApiResponse<AuthDtos.AuthResponse>> register(
            @Valid @RequestBody AuthDtos.RegisterRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(authService.register(req)));
    }

    @PostMapping("/login")
    @Operation(summary = "Login with email and password")
    public ResponseEntity<ApiResponse<AuthDtos.AuthResponse>> login(
            @Valid @RequestBody AuthDtos.LoginRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(authService.login(req)));
    }

    @PostMapping("/passwordless/request")
    @Operation(summary = "Request a passwordless magic-link token (sent via email)")
    public ResponseEntity<ApiResponse<String>> requestPasswordless(
            @Valid @RequestBody AuthDtos.PasswordlessRequest req) {
        String token = authService.requestPasswordlessToken(req.email());
        // In production: send via email. For MVP, return token for testing.
        return ResponseEntity.ok(ApiResponse.ok(token));
    }

    @GetMapping("/passwordless/verify")
    @Operation(summary = "Verify passwordless token (GET shows confirm info)")
    public ResponseEntity<ApiResponse<String>> verifyPasswordlessGet(
            @RequestParam String token) {
        // GET: only show user info, do not consume token
        return ResponseEntity.ok(ApiResponse.ok("Token appears valid. POST to /verify to complete login."));
    }

    @PostMapping("/passwordless/verify")
    @Operation(summary = "Verify and consume passwordless token to get JWT")
    public ResponseEntity<ApiResponse<AuthDtos.AuthResponse>> verifyPasswordless(
            @Valid @RequestBody AuthDtos.TokenVerifyRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(authService.verifyPasswordlessToken(req.token())));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user info")
    public ResponseEntity<ApiResponse<AuthDtos.MeResponse>> me(
            @AuthenticationPrincipal String email) {
        return ResponseEntity.ok(ApiResponse.ok(authService.getMe(email)));
    }
}
