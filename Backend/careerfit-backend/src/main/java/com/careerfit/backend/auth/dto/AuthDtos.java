package com.careerfit.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthDtos {

    public record RegisterRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, message = "Password must be at least 8 characters") String password,
        @NotBlank String fullName,
        @NotBlank String role   // "CANDIDATE" or "RECRUITER"
    ) {}

    public record LoginRequest(
        @NotBlank @Email String email,
        @NotBlank String password
    ) {}

    public record PasswordlessRequest(
        @NotBlank @Email String email
    ) {}

    public record TokenVerifyRequest(
        @NotBlank String token
    ) {}

    public record AuthResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        UserInfo user
    ) {}

    public record UserInfo(
        String id,
        String email,
        String fullName,
        String role,
        boolean emailVerified
    ) {}

    public record MeResponse(
        String id,
        String email,
        String fullName,
        String role,
        boolean emailVerified,
        String preferredLanguage
    ) {}
}
