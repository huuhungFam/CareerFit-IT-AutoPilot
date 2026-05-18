package com.careerfit.backend.candidate.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class CandidateDtos {

    // ── GET profile response ──────────────────────────────────────────────

    public record CandidateProfileResponse(
        UUID candidateId,
        UUID userId,
        String email,
        String fullName,
        String avatarUrl,
        String phone,
        String location,
        String desiredTitle,
        String desiredSeniority,
        List<String> desiredSkills,
        String desiredWorkModel,
        BigDecimal desiredSalaryMin,
        BigDecimal desiredSalaryMax,
        String desiredSalaryCurrency,
        Integer yearsOfExperience,
        String aboutMe,
        String preferredLanguage,
        boolean autoApplyEnabled,
        BigDecimal autoApplyThreshold,
        Instant createdAt,
        Instant updatedAt
    ) {}

    // ── UPDATE profile request ────────────────────────────────────────────

    public record UpdateCandidateProfileRequest(
        @Size(max = 500) String avatarUrl,
        @Size(max = 30)  String phone,
        @Size(max = 255) String location,
        @Size(max = 255) String desiredTitle,
        @Size(max = 50)  String desiredSeniority,
        List<@Size(max = 100) String> desiredSkills,
        @Size(max = 50)  String desiredWorkModel,
        BigDecimal desiredSalaryMin,
        BigDecimal desiredSalaryMax,
        @Size(max = 10)  String desiredSalaryCurrency,
        @Min(0) @Max(50) Integer yearsOfExperience,
        @Size(max = 3000) String aboutMe,
        @Size(max = 10)  String preferredLanguage
    ) {}

    // ── UPDATE name/email response ────────────────────────────────────────

    public record UpdateAccountRequest(
        @Size(max = 255) String fullName,
        @Size(max = 500) String avatarUrl
    ) {}

    // ── CV list item (shown on profile page) ─────────────────────────────

    public record CvSummaryResponse(
        UUID id,
        String displayName,
        String source,
        boolean isDefault,
        String status,
        String language,
        String parsedSummary,
        List<String> topSkills,
        Instant createdAt
    ) {}

    // ── Portfolio links ───────────────────────────────────────────────────

    public record PortfolioLinkRequest(
        @Size(max = 50)  String type,  // GITHUB, LINKEDIN, PORTFOLIO, OTHER
        @Size(max = 500) String url
    ) {}

    public record PortfolioLinkResponse(
        UUID id,
        String type,
        String url,
        Instant createdAt,
        Instant updatedAt
    ) {}

    public record PortfolioProjectRequest(
        @Size(max = 255) String name,
        @Size(max = 255) String role,
        @Size(max = 3000) String summary,
        List<@Size(max = 100) String> techStack,
        @Size(max = 500) String projectUrl,
        @Size(max = 3000) String impact
    ) {}

    public record PortfolioProjectResponse(
        UUID id,
        String name,
        String role,
        String summary,
        List<String> techStack,
        String projectUrl,
        String impact,
        Instant createdAt,
        Instant updatedAt
    ) {}

    public record PortfolioResponse(
        List<PortfolioLinkResponse> links,
        List<PortfolioProjectResponse> projects
    ) {}
}
