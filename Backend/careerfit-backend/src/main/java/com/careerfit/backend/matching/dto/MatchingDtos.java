package com.careerfit.backend.matching.dto;

import com.careerfit.backend.candidate.dto.CandidateDtos;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Matching-related DTOs for recruiter ranking view and candidate recommendation feed.
 */
public class MatchingDtos {

    // ── Recruiter: Top CVs per Job ────────────────────────────────────────

    public record RankedCandidateResponse(
        String matchingId,
        String cvId,
        String candidateId,
        String candidateName,
        String candidateEmail,
        String desiredTitle,
        String location,
        Integer yearsOfExperience,
        List<String> topSkills,
        String cvSummary,
        BigDecimal normalizedScore,
        String label,              // HIGH | MEDIUM | LOW | POTENTIAL
        boolean isPotential,
        List<String> matchReasons,
        String potentialReason,
        Instant matchedAt,
        TieBreakMeta tie
    ) {}

    public record RankingPageResponse(
        String jobId,
        String jobTitle,
        List<RankedCandidateResponse> candidates,
        long total,
        int page,
        int size,
        int totalPages,
        ListMeta meta
    ) {}

    // ── Candidate: Matched Job Feed ───────────────────────────────────────

    public record MatchedJobResponse(
        String matchingId,
        String jobId,
        String title,
        String company,
        String companyLogoUrl,
        String location,
        String remoteType,
        String seniorityLevel,
        String salaryDisplay,
        List<String> requiredSkills,
        BigDecimal normalizedScore,
        String label,
        boolean isPotential,
        List<String> matchReasons,
        String potentialReason,
        Instant matchedAt,
        TieBreakMeta tie
    ) {}

    public record MatchedJobPageResponse(
        List<MatchedJobResponse> matches,
        long total,
        int page,
        int size,
        int totalPages,
        MatchFeedMeta meta
    ) {}

    // ── Feedback ──────────────────────────────────────────────────────────

    public record CandidateJobCardResponse(
        String matchingId,
        String id,
        String title,
        String company,
        String companyLogoUrl,
        String location,
        String remoteType,
        String seniorityLevel,
        String employmentType,
        String salaryDisplay,
        List<String> requiredSkills,
        List<String> optionalSkills,
        BigDecimal normalizedScore,
        String label,
        boolean isPotential,
        List<String> reasons,
        String potentialReason,
        Instant matchedAt,
        TieBreakMeta tie
    ) {}

    public record CandidateJobCardPageResponse(
        List<CandidateJobCardResponse> jobs,
        long total,
        int page,
        int size,
        int totalPages,
        MatchFeedMeta meta
    ) {}

    public record MatchFeedMeta(
        String cvId,
        BigDecimal bestScore,
        boolean hasStrongMatches,
        String emptyReason,
        int hiddenLowScoreCount,
        BigDecimal minimumVisibleScore,
        BigDecimal strongMatchThreshold,
        Instant generatedAt,
        Instant lastUpdatedAt,
        String resultState,
        String message,
        List<String> suggestions
    ) {}

    public record TieBreakMeta(
        int rank,
        int tieRank,
        int tieGroupSize,
        boolean tied,
        String sortKey,
        Instant lastUpdatedAt
    ) {}

    public record RecruiterCandidateDiscoveryResponse(
        String matchingId,
        String cvId,
        String candidateId,
        String candidateName,
        String candidateEmail,
        String desiredTitle,
        String location,
        Integer yearsOfExperience,
        List<String> topSkills,
        String cvSummary,
        BigDecimal normalizedScore,
        String label,
        boolean isPotential,
        String applicationId,
        String applicationStatus,
        boolean hasApplied,
        List<String> matchReasons,
        String potentialReason,
        Instant matchedAt,
        TieBreakMeta tie,
        boolean portfolioVisible,
        CandidateDtos.PortfolioResponse portfolio,
        String portfolioHiddenReason
    ) {}

    public record RecruiterCandidateDiscoveryPageResponse(
        String jobId,
        String jobTitle,
        String resultState,
        String message,
        List<RecruiterCandidateDiscoveryResponse> candidates,
        long total,
        int page,
        int size,
        int totalPages,
        Instant generatedAt,
        Instant lastUpdatedAt,
        List<String> suggestions
    ) {}

    public record ListMeta(
        Instant generatedAt,
        Instant lastUpdatedAt,
        String resultState,
        String message,
        List<String> suggestions
    ) {}

    public record FeedbackRequest(
        String feedbackType   // GOOD_MATCH | POTENTIAL | BAD_MATCH | NOT_INTERESTED
    ) {}
}
