package com.careerfit.backend.job.dto;

import com.careerfit.backend.job.entity.Job;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * All Job-related DTOs grouped in one file.
 */
public class JobDtos {

    // ── Requests ──────────────────────────────────────────────────────────

    public record CreateJobRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 255) String company,
        @NotBlank String originalText,           // full JD (used for vectorization)

        List<String> requiredSkills,
        List<String> niceToHaveSkills,

        @Size(max = 50) String seniorityLevel,   // JUNIOR, MID, SENIOR, LEAD, PRINCIPAL
        @Size(max = 50) String employmentType,   // FULL_TIME, PART_TIME, CONTRACT, INTERN
        @Size(max = 255) String location,
        @Size(max = 50) String remoteType,       // ONSITE, REMOTE, HYBRID

        // Salary
        @NotNull String salaryMode,              // NEGOTIABLE | RANGE | UP_TO | FROM | HIDDEN
        BigDecimal salaryMin,
        BigDecimal salaryMax,
        String salaryCurrency,
        String salaryType,                       // MONTHLY | YEARLY | HOURLY
        boolean salaryIsVisible,
        String salaryDisplayText,

        @Size(max = 100) String domain,
        String language                          // vi | en
    ) {}

    public record UpdateJobRequest(
        @Size(max = 255) String title,
        String originalText,

        List<String> requiredSkills,
        List<String> niceToHaveSkills,
        String seniorityLevel,
        String employmentType,
        String location,
        String remoteType,

        String salaryMode,
        BigDecimal salaryMin,
        BigDecimal salaryMax,
        String salaryCurrency,
        String salaryType,
        Boolean salaryIsVisible,
        String salaryDisplayText,

        String domain,
        String language,
        String status   // ACTIVE | CLOSED | DRAFT | PAUSED
    ) {}

    public record JobSearchRequest(
        String keyword,
        String location,
        String level,
        String remoteType,
        String language,
        String salaryMode,
        BigDecimal salaryMin,
        BigDecimal salaryMax,
        String domain,
        int page,
        int size,
        String sort   // recent | salary_asc | salary_desc
    ) {}

    // ── Salary sub-record ─────────────────────────────────────────────────

    public record SalaryDisplay(
        String mode,
        BigDecimal min,
        BigDecimal max,
        String currency,
        String type,
        boolean isVisible,
        String displayText
    ) {}

    // ── Responses ─────────────────────────────────────────────────────────

    public record JobCardResponse(
        String id,
        String title,
        String company,
        String companyLogoUrl,
        String location,
        String remoteType,
        String seniorityLevel,
        String employmentType,
        SalaryDisplay salary,
        List<String> requiredSkills,
        String domain,
        String language,
        String status,
        Instant createdAt
    ) {}

    public record JobDetailResponse(
        String id,
        String title,
        String company,
        String companyLogoUrl,
        String companyId,
        String location,
        String remoteType,
        String seniorityLevel,
        String employmentType,
        SalaryDisplay salary,
        List<String> requiredSkills,
        List<String> niceToHaveSkills,
        String originalText,
        String domain,
        String language,
        String status,
        Instant createdAt,
        Instant updatedAt
    ) {}

    public record JobListResponse(
        List<JobCardResponse> jobs,
        long total,
        int page,
        int size,
        int totalPages
    ) {}

    public record JobStatusUpdateResponse(
        String id,
        String status,
        Instant updatedAt
    ) {}

    public record SuggestionsResponse(
        List<String> titles,
        List<String> companies,
        List<String> skills
    ) {}
}
