package com.careerfit.backend.job.dto;

import com.careerfit.backend.common.dto.ValidationDtos;
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
        String language,                         // vi | en
        boolean isUrgent
    ) {}

    /** Partial payload accepted while a recruiter is still writing a draft. */
    public record SaveJobDraftRequest(
        String title,
        String company,
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
        String domain,
        String language,
        Boolean isUrgent
    ) {}

    /** Non-blocking quality preview used by the JD editor while fields are incomplete. */
    public record JobQualityPreviewRequest(
        String originalText,
        List<String> requiredSkills,
        String seniorityLevel,
        String employmentType,
        String salaryMode,
        BigDecimal salaryMin,
        BigDecimal salaryMax,
        String salaryCurrency,
        String salaryType
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
        String status,  // ACTIVE | CLOSED | DRAFT
        Boolean isUrgent
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
        Instant createdAt,
        String applicationMode,
        String sourceUrl,
        boolean isUrgent,
        List<ValidationDtos.QualitySignal> qualitySignals
    ) {}

    public record JobDetailResponse(
        String id,
        String title,
        String company,
        String companyLogoUrl,
        String companyId,
        String companySlug,
        String recruiterLogin,
        String recruiterName,
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
        Instant updatedAt,
        String applicationMode,
        String sourceUrl,
        boolean isUrgent,
        List<ValidationDtos.QualitySignal> qualitySignals
    ) {}

    public record JobListResponse(
        List<JobCardResponse> jobs,
        long total,
        int page,
        int size,
        int totalPages
    ) {}

    /** Public JD data plus the current candidate's optional catalog state. */
    public record CandidateJobCatalogResponse(
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
        List<String> niceToHaveSkills,
        String originalText,
        String domain,
        String language,
        Instant createdAt,
        String applicationMode,
        String sourceUrl,
        boolean isUrgent,
        String matchingId,
        BigDecimal matchScore,
        String matchLabel,
        boolean isPotential,
        boolean isSaved,
        String applicationStatus,
        String feedbackStatus,
        List<String> matchReasons
    ) {}

    public record CandidateJobCatalogPageResponse(
        List<CandidateJobCatalogResponse> jobs,
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

    public record JobUrgencyUpdateResponse(
        String id,
        boolean isUrgent,
        Instant updatedAt
    ) {}

    public record SuggestionsResponse(
        List<String> titles,
        List<String> companies,
        List<String> skills,
        List<String> locations,
        List<String> domains
    ) {}

    public record JobQualityPreviewResponse(List<ValidationDtos.QualitySignal> qualitySignals) {}

    /** Publish preflight. Near duplicates are warning-only and require explicit confirmation to publish. */
    public record DuplicateCheckRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 255) String company,
        @NotBlank String originalText,
        @Size(max = 50) String employmentType,
        @Size(max = 255) String location
    ) {}

    public record NearDuplicateResponse(String jobId, String title, double similarity) {}

    public record DuplicateCheckResponse(
        String fingerprint,
        boolean exactDuplicate,
        double nearDuplicateThreshold,
        List<NearDuplicateResponse> nearDuplicates
    ) {}
}
