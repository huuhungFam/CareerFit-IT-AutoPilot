package com.careerfit.backend.matching.service;

import com.careerfit.backend.candidate.entity.Candidate;
import com.careerfit.backend.candidate.repository.CandidateRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.config.AppProperties;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.employer.entity.EmployerProfile;
import com.careerfit.backend.employer.repository.EmployerProfileRepository;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.careerfit.backend.matching.dto.MatchingDtos;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.matching.repository.MatchingRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.UUID;

/**
 * Recruiter ranking view + candidate matched-job feed.
 */
@Service
public class MatchingQueryService {

    private static final Logger log = LoggerFactory.getLogger(MatchingQueryService.class);
    private static final TypeReference<List<String>> LIST_TYPE = new TypeReference<>() {};

    private final MatchingRepository matchingRepo;
    private final JobRepository jobRepo;
    private final CandidateRepository candidateRepo;
    private final CVRepository cvRepo;
    private final EmployerProfileRepository employerRepo;
    private final ObjectMapper objectMapper;
    private final AppProperties appProperties;

    public MatchingQueryService(MatchingRepository matchingRepo,
                                JobRepository jobRepo,
                                CandidateRepository candidateRepo,
                                CVRepository cvRepo,
                                EmployerProfileRepository employerRepo,
                                ObjectMapper objectMapper,
                                AppProperties appProperties) {
        this.matchingRepo = matchingRepo;
        this.jobRepo = jobRepo;
        this.candidateRepo = candidateRepo;
        this.cvRepo = cvRepo;
        this.employerRepo = employerRepo;
        this.objectMapper = objectMapper;
        this.appProperties = appProperties;
    }

    // ── Recruiter: Top CVs per Job ────────────────────────────────────────

    @Transactional(readOnly = true)
    public MatchingDtos.RankingPageResponse getRankedCandidates(UUID jobId, UUID recruiterId,
                                                                 int page, int size,
                                                                 boolean potentialOnly) {
        Job job = jobRepo.findById(jobId)
                .orElseThrow(() -> AppException.notFound("Job", jobId));

        if (!job.getRecruiter().getId().equals(recruiterId)) {
            throw AppException.forbidden("You do not own this job");
        }

        int pageSize = Math.min(50, Math.max(1, size == 0 ? 20 : size));
        Pageable pageable = PageRequest.of(Math.max(0, page), pageSize);

        Page<Matching> matchingPage = potentialOnly
                ? matchingRepo.findPotentialByJobId(jobId, pageable)
                : matchingRepo.findRankingByJobId(jobId, pageable);

        List<MatchingDtos.RankedCandidateResponse> ranked = matchingPage.getContent().stream()
                .map(m -> toRanked(m, m.getCv()))
                .toList();

        return new MatchingDtos.RankingPageResponse(
                jobId.toString(),
                job.getTitle(),
                ranked,
                matchingPage.getTotalElements(),
                page, pageSize,
                matchingPage.getTotalPages()
        );
    }

    // ── Candidate: Matched Job Feed ───────────────────────────────────────

    @Transactional(readOnly = true)
    public MatchingDtos.MatchedJobPageResponse getMatchedJobs(UUID userId, int page, int size,
                                                               String label, boolean potentialOnly,
                                                               double minScore) {
        Candidate candidate = candidateRepo.findByUserId(userId)
                .orElseThrow(() -> AppException.notFound("Candidate", userId));

        // Get default CV for matching feed
        CV defaultCv = cvRepo.findByCandidateIdAndIsDefaultTrue(candidate.getId())
                .orElseThrow(() -> AppException.badRequest(
                        "No default CV found. Please upload a CV and set it as default."));

        int pageSize = Math.min(50, Math.max(1, size == 0 ? 20 : size));
        Pageable pageable = PageRequest.of(Math.max(0, page), pageSize);

        List<Matching> matches = matchingRepo.findTopMatchesByCvId(defaultCv.getId(), pageable);

        // Optional label filter
        List<Matching> filtered = label != null && !label.isBlank()
                ? matches.stream()
                    .filter(m -> m.getLabel().name().equalsIgnoreCase(label))
                    .toList()
                : matches;

        if (potentialOnly) filtered = filtered.stream().filter(Matching::isPotential).toList();

        double effectiveMinScore = normalizeScore(minScore);
        List<Matching> visible = filterByMinimumScore(filtered, effectiveMinScore);

        Map<UUID, EmployerProfile> employersByRecruiter = loadEmployersByRecruiter(visible);

        List<MatchingDtos.MatchedJobResponse> responses = visible.stream()
                .map(m -> toMatchedJob(m, employersByRecruiter))
                .toList();

        return new MatchingDtos.MatchedJobPageResponse(
                responses, responses.size(), page, pageSize, 1,
                buildMeta(defaultCv, filtered, visible, effectiveMinScore)
        );
    }

    @Transactional(readOnly = true)
    public MatchingDtos.CandidateJobCardPageResponse getCandidateJobCards(UUID userId, int page, int size,
                                                                          String label, boolean potentialOnly,
                                                                          double minScore) {
        Candidate candidate = candidateRepo.findByUserId(userId)
                .orElseThrow(() -> AppException.notFound("Candidate", userId));
        CV defaultCv = cvRepo.findByCandidateIdAndIsDefaultTrue(candidate.getId())
                .orElseThrow(() -> AppException.badRequest(
                        "No default CV found. Please upload a CV and set it as default."));

        int pageSize = Math.min(50, Math.max(1, size == 0 ? 20 : size));
        Pageable pageable = PageRequest.of(Math.max(0, page), pageSize);
        List<Matching> matches = matchingRepo.findTopMatchesByCvId(defaultCv.getId(), pageable);

        List<Matching> filtered = label != null && !label.isBlank()
                ? matches.stream()
                    .filter(m -> m.getLabel().name().equalsIgnoreCase(label))
                    .toList()
                : matches;

        if (potentialOnly) filtered = filtered.stream().filter(Matching::isPotential).toList();

        double effectiveMinScore = normalizeScore(minScore);
        List<Matching> visible = filterByMinimumScore(filtered, effectiveMinScore);

        Map<UUID, EmployerProfile> employersByRecruiter = loadEmployersByRecruiter(visible);

        List<MatchingDtos.CandidateJobCardResponse> jobs = visible.stream()
                .map(m -> toCandidateJobCard(m, employersByRecruiter))
                .toList();

        return new MatchingDtos.CandidateJobCardPageResponse(
                jobs, jobs.size(), page, pageSize, 1,
                buildMeta(defaultCv, filtered, visible, effectiveMinScore));
    }

    // ── Mappers ───────────────────────────────────────────────────────────

    private MatchingDtos.RankedCandidateResponse toRanked(Matching m, CV cv) {
        Candidate candidate = cv.getCandidate();
        var user = candidate.getUser();

        return new MatchingDtos.RankedCandidateResponse(
                m.getId().toString(),
                cv.getId().toString(),
                candidate.getId().toString(),
                user.getFullName(),
                user.getEmail(),
                candidate.getDesiredTitle(),
                candidate.getLocation(),
                candidate.getYearsOfExperience(),
                parseList(cv.getTopSkillsJson()),
                cv.getParsedSummary(),
                m.getNormalizedScore(),
                m.getLabel().name(),
                m.isPotential(),
                parseList(m.getMatchReasonsJson()),
                m.getPotentialReasonJson() != null
                        ? m.getPotentialReasonJson().replace("\"", "") : null,
                m.getCreatedAt()
        );
    }

    private MatchingDtos.MatchedJobResponse toMatchedJob(Matching m, Map<UUID, EmployerProfile> employersByRecruiter) {
        Job job = m.getJob();
        EmployerProfile employer = employersByRecruiter.get(job.getRecruiter().getId());

        // Resolve display salary text
        String salaryDisplay = buildSalaryText(job);

        return new MatchingDtos.MatchedJobResponse(
                m.getId().toString(),
                job.getId().toString(),
                job.getTitle(),
                job.getCompany(),
                employer != null ? employer.getLogoUrl() : null,
                job.getLocation(),
                job.getRemoteType(),
                job.getSeniorityLevel(),
                salaryDisplay,
                parseList(job.getRequiredSkillsJson()),
                m.getNormalizedScore(),
                m.getLabel().name(),
                m.isPotential(),
                parseList(m.getMatchReasonsJson()),
                m.getPotentialReasonJson() != null
                        ? m.getPotentialReasonJson().replace("\"", "") : null,
                m.getCreatedAt()
        );
    }

    private MatchingDtos.CandidateJobCardResponse toCandidateJobCard(Matching m, Map<UUID, EmployerProfile> employersByRecruiter) {
        Job job = m.getJob();
        EmployerProfile employer = employersByRecruiter.get(job.getRecruiter().getId());
        return new MatchingDtos.CandidateJobCardResponse(
                m.getId().toString(),
                job.getId().toString(),
                job.getTitle(),
                job.getCompany(),
                employer != null ? employer.getLogoUrl() : null,
                job.getLocation(),
                job.getRemoteType(),
                job.getSeniorityLevel(),
                job.getEmploymentType(),
                buildSalaryText(job),
                parseList(job.getRequiredSkillsJson()),
                parseList(job.getNiceToHaveSkillsJson()),
                m.getNormalizedScore(),
                m.getLabel().name(),
                m.isPotential(),
                parseList(m.getMatchReasonsJson()),
                m.getPotentialReasonJson() != null
                        ? m.getPotentialReasonJson().replace("\"", "") : null,
                m.getCreatedAt()
        );
    }

    private Map<UUID, EmployerProfile> loadEmployersByRecruiter(List<Matching> matches) {
        List<UUID> recruiterIds = matches.stream()
                .map(Matching::getJob)
                .filter(Objects::nonNull)
                .map(Job::getRecruiter)
                .filter(Objects::nonNull)
                .map(recruiter -> recruiter.getId())
                .distinct()
                .toList();

        if (recruiterIds.isEmpty()) return Map.of();

        return employerRepo.findByRecruiterIdIn(recruiterIds).stream()
                .collect(Collectors.toMap(
                        employer -> employer.getRecruiter().getId(),
                        Function.identity(),
                        (first, ignored) -> first
                ));
    }

    private List<Matching> filterByMinimumScore(List<Matching> matches, double minScore) {
        if (minScore <= 0) return matches;
        return matches.stream()
                .filter(m -> m.getNormalizedScore().doubleValue() >= minScore)
                .toList();
    }

    private MatchingDtos.MatchFeedMeta buildMeta(CV cv, List<Matching> considered,
                                                 List<Matching> visible, double minScore) {
        BigDecimal bestScore = considered.stream()
                .map(Matching::getNormalizedScore)
                .findFirst()
                .orElse(null);
        BigDecimal strongThreshold = BigDecimal.valueOf(appProperties.getScoreLabelMediumMax());
        boolean hasStrongMatches = bestScore != null && bestScore.compareTo(strongThreshold) >= 0;
        int hiddenLowScoreCount = Math.max(0, considered.size() - visible.size());
        String reason = null;
        if (considered.isEmpty()) {
            reason = "NO_MATCHING_JOBS";
        } else if (visible.isEmpty()) {
            reason = "ONLY_LOW_SCORE_MATCHES";
        } else if (!hasStrongMatches) {
            reason = "LOW_CONFIDENCE_MATCHES";
        }
        return new MatchingDtos.MatchFeedMeta(
                cv.getId().toString(),
                bestScore,
                hasStrongMatches,
                reason,
                hiddenLowScoreCount,
                BigDecimal.valueOf(minScore),
                strongThreshold
        );
    }

    private double normalizeScore(double value) {
        if (Double.isNaN(value) || value < 0) return 0;
        return Math.min(100, value);
    }

    private String buildSalaryText(Job job) {
        if (!job.isSalaryIsVisible()) return "Thỏa thuận";
        if (job.getSalaryDisplayText() != null && !job.getSalaryDisplayText().isBlank()) {
            return job.getSalaryDisplayText();
        }
        return switch (job.getSalaryMode()) {
            case NEGOTIABLE -> "Thỏa thuận";
            case HIDDEN     -> "Thỏa thuận";
            case RANGE      -> format(job.getSalaryMin()) + " – " + format(job.getSalaryMax())
                               + " " + defaultCurrency(job);
            case UP_TO      -> "Lên đến " + format(job.getSalaryMax()) + " " + defaultCurrency(job);
            case FROM       -> "Từ " + format(job.getSalaryMin()) + " " + defaultCurrency(job);
        };
    }

    private String format(java.math.BigDecimal v) {
        if (v == null) return "?";
        return v.stripTrailingZeros().toPlainString();
    }

    private String defaultCurrency(Job job) {
        return job.getSalaryCurrency() != null ? job.getSalaryCurrency() : "VND";
    }

    private List<String> parseList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return objectMapper.readValue(json, LIST_TYPE); }
        catch (Exception e) { return List.of(); }
    }
}
