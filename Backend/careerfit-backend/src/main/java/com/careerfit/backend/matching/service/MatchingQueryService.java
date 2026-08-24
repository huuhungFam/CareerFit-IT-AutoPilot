package com.careerfit.backend.matching.service;

import com.careerfit.backend.application.entity.Application;
import com.careerfit.backend.application.repository.ApplicationRepository;
import com.careerfit.backend.candidate.entity.Candidate;
import com.careerfit.backend.candidate.repository.CandidateRepository;
import com.careerfit.backend.candidate.service.CandidatePortfolioVisibilityService;
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
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
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
    private final ApplicationRepository applicationRepo;
    private final EmployerProfileRepository employerRepo;
    private final ObjectMapper objectMapper;
    private final AppProperties appProperties;
    private final CandidatePortfolioVisibilityService portfolioVisibilityService;

    public MatchingQueryService(MatchingRepository matchingRepo,
                                JobRepository jobRepo,
                                CandidateRepository candidateRepo,
                                CVRepository cvRepo,
                                ApplicationRepository applicationRepo,
                                EmployerProfileRepository employerRepo,
                                ObjectMapper objectMapper,
                                AppProperties appProperties,
                                CandidatePortfolioVisibilityService portfolioVisibilityService) {
        this.matchingRepo = matchingRepo;
        this.jobRepo = jobRepo;
        this.candidateRepo = candidateRepo;
        this.cvRepo = cvRepo;
        this.applicationRepo = applicationRepo;
        this.employerRepo = employerRepo;
        this.objectMapper = objectMapper;
        this.appProperties = appProperties;
        this.portfolioVisibilityService = portfolioVisibilityService;
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

        int safePage = Math.max(0, page);
        int pageSize = Math.min(50, Math.max(1, size == 0 ? 20 : size));
        List<Matching> all = matchingRepo.findRankingListByJobId(jobId);
        if (potentialOnly) {
            all = all.stream().filter(Matching::isPotential).toList();
        }
        all = sortMatches(all, "score_desc");
        Map<UUID, MatchingDtos.TieBreakMeta> tieMeta = buildTieMeta(all);
        List<Matching> pageItems = page(all, safePage, pageSize);

        List<MatchingDtos.RankedCandidateResponse> ranked = pageItems.stream()
                .map(m -> toRanked(m, m.getCv(), tieMeta.get(m.getId())))
                .toList();
        int totalPages = totalPages(all.size(), pageSize);

        return new MatchingDtos.RankingPageResponse(
                jobId.toString(),
                job.getTitle(),
                ranked,
                all.size(),
                safePage, pageSize,
                totalPages,
                listMeta(pageItems, all.isEmpty() ? "NO_MATCH" : hasTopTie(tieMeta, pageItems) ? "HIGH_TIE" : "READY")
        );
    }

    @Transactional(readOnly = true)
    public MatchingDtos.RecruiterCandidateDiscoveryPageResponse discoverCandidates(
            UUID jobId,
            UUID recruiterId,
            String label,
            Boolean isPotential,
            boolean excludeHighPotential,
            String applicationStatus,
            double minScore,
            String sort,
            int page,
            int size,
            String candidateQuery) {
        Job job = jobRepo.findById(jobId)
                .orElseThrow(() -> AppException.notFound("Job", jobId));

        if (!job.getRecruiter().getId().equals(recruiterId)) {
            throw AppException.forbidden("You do not own this job");
        }

        Matching.MatchLabel labelFilter = parseLabel(label);
        Application.ApplicationStatus statusFilter = parseApplicationStatus(applicationStatus);
        boolean noneStatus = applicationStatus != null && applicationStatus.equalsIgnoreCase("NONE");
        double effectiveMinScore = normalizeScore(minScore);

        List<Application> applications = applicationRepo.findAllByJobIdWithDetails(jobId).stream()
                .filter(application -> !application.isInvitationWithdrawn())
                .toList();
        Map<UUID, Application> applicationsByCandidate = applications.stream()
                .collect(Collectors.toMap(
                        app -> app.getCandidate().getId(),
                        Function.identity(),
                        (first, ignored) -> first));

        List<Matching> all = matchingRepo.findRankingListByJobId(jobId);
        List<Matching> filtered = all.stream()
                .filter(m -> labelFilter == null || m.getLabel() == labelFilter)
                .filter(m -> isPotential == null || m.isPotential() == isPotential)
                .filter(m -> !excludeHighPotential || m.getLabel() != Matching.MatchLabel.HIGH)
                .filter(m -> effectiveMinScore <= 0 || m.getNormalizedScore().doubleValue() >= effectiveMinScore)
                .filter(m -> matchesApplicationStatus(m, applicationsByCandidate, statusFilter, noneStatus))
                .filter(m -> matchesCandidateQuery(m, candidateQuery))
                .toList();

        filtered = sortDiscoveryMatches(filtered, sort, applicationsByCandidate);
        Map<UUID, MatchingDtos.TieBreakMeta> tieMeta = buildTieMeta(filtered);

        int safePage = Math.max(0, page);
        int pageSize = Math.min(50, Math.max(1, size == 0 ? 20 : size));
        List<Matching> pageItems = page(filtered, safePage, pageSize);

        List<MatchingDtos.RecruiterCandidateDiscoveryResponse> candidates = pageItems.stream()
                .map(m -> toDiscoveryCandidate(m,
                        applicationsByCandidate.get(m.getCv().getCandidate().getId()),
                        tieMeta.get(m.getId())))
                .toList();

        String state = resultState(all, filtered, tieMeta);
        return new MatchingDtos.RecruiterCandidateDiscoveryPageResponse(
                jobId.toString(),
                job.getTitle(),
                state,
                resultMessage(state),
                candidates,
                filtered.size(),
                safePage,
                pageSize,
                totalPages(filtered.size(), pageSize),
                Instant.now(),
                lastUpdatedIn(pageItems),
                suggestionsForState(state)
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
        Map<UUID, MatchingDtos.TieBreakMeta> tieMeta = buildTieMeta(visible);
        long totalMatches = matchingRepo.countActiveMatchesByCvId(defaultCv.getId());
        int responseTotalPages = totalPages((int) totalMatches, pageSize);

        List<MatchingDtos.MatchedJobResponse> responses = visible.stream()
                .map(m -> toMatchedJob(m, employersByRecruiter, tieMeta.get(m.getId())))
                .toList();

        return new MatchingDtos.MatchedJobPageResponse(
                responses, totalMatches, page, pageSize, responseTotalPages,
                buildMeta(defaultCv, filtered, visible, effectiveMinScore)
        );
    }

    @Transactional(readOnly = true)
    public MatchingDtos.CandidateJobCardPageResponse getCandidateJobCards(UUID userId, int page, int size,
                                                                          String label, boolean potentialOnly,
                                                                          double minScore, UUID requestedCvId) {
        Candidate candidate = candidateRepo.findByUserId(userId)
                .orElseThrow(() -> AppException.notFound("Candidate", userId));
        CV selectedCv = requestedCvId == null
                ? cvRepo.findByCandidateIdAndIsDefaultTrue(candidate.getId())
                    .orElseThrow(() -> AppException.badRequest(
                            "No default CV found. Please upload a CV and set it as default."))
                : cvRepo.findById(requestedCvId)
                    .filter(cv -> cv.getCandidate().getId().equals(candidate.getId()))
                    .orElseThrow(() -> AppException.notFound("CV", requestedCvId));

        int pageSize = Math.min(50, Math.max(1, size == 0 ? 20 : size));
        Pageable pageable = PageRequest.of(Math.max(0, page), pageSize);
        List<Matching> matches = matchingRepo.findTopMatchesByCvId(selectedCv.getId(), pageable);

        List<Matching> filtered = label != null && !label.isBlank()
                ? matches.stream()
                    .filter(m -> m.getLabel().name().equalsIgnoreCase(label))
                    .toList()
                : matches;

        if (potentialOnly) filtered = filtered.stream().filter(Matching::isPotential).toList();

        double effectiveMinScore = normalizeScore(minScore);
        List<Matching> visible = filterByMinimumScore(filtered, effectiveMinScore);

        Map<UUID, EmployerProfile> employersByRecruiter = loadEmployersByRecruiter(visible);
        Map<UUID, MatchingDtos.TieBreakMeta> tieMeta = buildTieMeta(visible);
        long totalMatches = matchingRepo.countActiveMatchesByCvId(selectedCv.getId());
        int responseTotalPages = totalPages((int) totalMatches, pageSize);

        List<MatchingDtos.CandidateJobCardResponse> jobs = visible.stream()
                .map(m -> toCandidateJobCard(m, employersByRecruiter, tieMeta.get(m.getId())))
                .toList();

        return new MatchingDtos.CandidateJobCardPageResponse(
                jobs, totalMatches, page, pageSize, responseTotalPages,
                buildMeta(selectedCv, filtered, visible, effectiveMinScore));
    }

    // ── Mappers ───────────────────────────────────────────────────────────

    private MatchingDtos.RankedCandidateResponse toRanked(Matching m, CV cv, MatchingDtos.TieBreakMeta tie) {
        Candidate candidate = cv.getCandidate();
        var user = candidate.getUser();

        return new MatchingDtos.RankedCandidateResponse(
                m.getId().toString(),
                cv.getId().toString(),
                candidate.getId().toString(),
                user.getFullName(),
                user.getEmail(),
                candidate.getDesiredTitle(),
                candidate.getDesiredSeniority(),
                candidate.getLocation(),
                candidate.getYearsOfExperience(),
                candidate.getAboutMe(),
                parseList(cv.getTopSkillsJson()),
                cv.getParsedSummary(),
                m.getNormalizedScore(),
                m.getLabel().name(),
                m.isPotential(),
                parseList(m.getMatchReasonsJson()),
                m.getPotentialReasonJson() != null
                        ? m.getPotentialReasonJson().replace("\"", "") : null,
                m.getCreatedAt(),
                tie
        );
    }

    private MatchingDtos.MatchedJobResponse toMatchedJob(Matching m, Map<UUID, EmployerProfile> employersByRecruiter,
                                                         MatchingDtos.TieBreakMeta tie) {
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
                m.getCreatedAt(),
                tie
        );
    }

    private MatchingDtos.CandidateJobCardResponse toCandidateJobCard(Matching m, Map<UUID, EmployerProfile> employersByRecruiter,
                                                                     MatchingDtos.TieBreakMeta tie) {
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
                m.getCreatedAt(),
                tie
        );
    }

    private MatchingDtos.RecruiterCandidateDiscoveryResponse toDiscoveryCandidate(
            Matching m,
            Application application,
            MatchingDtos.TieBreakMeta tie) {
        CV cv = m.getCv();
        Candidate candidate = cv.getCandidate();
        var user = candidate.getUser();
        var portfolioVisibility = portfolioVisibilityService.buildForRecruiter(candidate, hasApplied(application));
        return new MatchingDtos.RecruiterCandidateDiscoveryResponse(
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
                application != null ? application.getId().toString() : null,
                application != null ? application.getStatus().name() : "NONE",
                hasApplied(application),
                parseList(m.getMatchReasonsJson()),
                m.getPotentialReasonJson() != null
                        ? m.getPotentialReasonJson().replace("\"", "") : null,
                m.getCreatedAt(),
                tie,
                portfolioVisibility.visible(),
                portfolioVisibility.portfolio(),
                portfolioVisibility.hiddenReason()
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

    private List<Matching> sortDiscoveryMatches(List<Matching> matches, String sort,
                                                Map<UUID, Application> applicationsByCandidate) {
        if ("status_asc".equalsIgnoreCase(sort)) {
            return matches.stream()
                    .sorted(Comparator
                            .comparingInt((Matching m) -> statusOrder(
                                    applicationsByCandidate.get(m.getCv().getCandidate().getId())))
                            .thenComparing(scoreComparator()))
                    .toList();
        }
        return sortMatches(matches, sort);
    }

    private List<Matching> sortMatches(List<Matching> matches, String sort) {
        Comparator<Matching> comparator = switch (sort == null ? "" : sort.toLowerCase()) {
            case "updated_desc" -> Comparator
                    .comparing(this::lastUpdated, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(scoreComparator());
            case "experience_desc" -> Comparator
                    .comparingInt((Matching m) -> {
                        Integer years = m.getCv().getCandidate().getYearsOfExperience();
                        return years != null ? years : 0;
                    })
                    .reversed()
                    .thenComparing(scoreComparator());
            case "score_desc", "" -> scoreComparator();
            default -> throw AppException.badRequest("Unsupported sort: " + sort);
        };
        return matches.stream().sorted(comparator).toList();
    }

    private Comparator<Matching> scoreComparator() {
        return Comparator
                .comparing(Matching::getNormalizedScore, Comparator.nullsLast(BigDecimal::compareTo))
                .reversed()
                .thenComparing((Matching m) -> m.isPotential() ? 1 : 0, Comparator.reverseOrder())
                .thenComparing(this::lastUpdated, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(m -> m.getId().toString());
    }

    private Map<UUID, MatchingDtos.TieBreakMeta> buildTieMeta(List<Matching> matches) {
        Map<String, Integer> counts = new HashMap<>();
        Map<String, Integer> firstRank = new HashMap<>();
        for (int i = 0; i < matches.size(); i++) {
            String key = scoreKey(matches.get(i).getNormalizedScore());
            counts.merge(key, 1, Integer::sum);
            firstRank.putIfAbsent(key, i + 1);
        }

        Map<UUID, MatchingDtos.TieBreakMeta> meta = new HashMap<>();
        for (int i = 0; i < matches.size(); i++) {
            Matching m = matches.get(i);
            String key = scoreKey(m.getNormalizedScore());
            int groupSize = counts.getOrDefault(key, 1);
            meta.put(m.getId(), new MatchingDtos.TieBreakMeta(
                    i + 1,
                    firstRank.getOrDefault(key, i + 1),
                    groupSize,
                    groupSize > 1,
                    "score_desc|potential_desc|updated_desc|id_asc",
                    lastUpdated(m)
            ));
        }
        return meta;
    }

    private List<Matching> page(List<Matching> matches, int page, int size) {
        int from = Math.min(matches.size(), Math.max(0, page) * size);
        int to = Math.min(matches.size(), from + size);
        return matches.subList(from, to);
    }

    private int totalPages(int total, int size) {
        if (total == 0) return 0;
        return (int) Math.ceil((double) total / size);
    }

    private Matching.MatchLabel parseLabel(String label) {
        if (label == null || label.isBlank()) return null;
        try {
            return Matching.MatchLabel.valueOf(label.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw AppException.badRequest("Unsupported match label: " + label);
        }
    }

    private Application.ApplicationStatus parseApplicationStatus(String status) {
        if (status == null || status.isBlank() || status.equalsIgnoreCase("NONE")) return null;
        try {
            return Application.ApplicationStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw AppException.badRequest("Unsupported application status: " + status);
        }
    }

    private boolean matchesApplicationStatus(Matching matching,
                                             Map<UUID, Application> applicationsByCandidate,
                                             Application.ApplicationStatus statusFilter,
                                             boolean noneStatus) {
        Application application = applicationsByCandidate.get(matching.getCv().getCandidate().getId());
        if (noneStatus) return application == null;
        return statusFilter == null || (application != null && application.getStatus() == statusFilter);
    }

    private boolean matchesCandidateQuery(Matching matching, String candidateQuery) {
        if (candidateQuery == null || candidateQuery.isBlank()) return true;
        String query = candidateQuery.trim().toLowerCase();
        var candidate = matching.getCv().getCandidate();
        return containsIgnoreCase(candidate.getUser().getFullName(), query)
                || containsIgnoreCase(candidate.getDesiredTitle(), query)
                || containsIgnoreCase(candidate.getLocation(), query)
                || parseList(matching.getCv().getTopSkillsJson()).stream()
                        .anyMatch(skill -> containsIgnoreCase(skill, query));
    }

    private boolean containsIgnoreCase(String value, String query) {
        return value != null && value.toLowerCase().contains(query);
    }

    private boolean hasApplied(Application application) {
        if (application == null) return false;
        return application.getStatus() != Application.ApplicationStatus.INVITED;
    }

    private int statusOrder(Application application) {
        if (application == null) return 0;
        return switch (application.getStatus()) {
            case INVITED -> 1;
            case PENDING -> 2;
            case AUTO_APPLIED -> 3;
            case APPROVED -> 4;
            case INTERVIEW_RESCHEDULED -> 5;
            case INTERVIEW_CANCELLED -> 6;
            case REJECTED -> 7;
            case NOT_INTERESTED -> 8;
        };
    }

    private String resultState(List<Matching> all, List<Matching> filtered,
                               Map<UUID, MatchingDtos.TieBreakMeta> tieMeta) {
        if (all.isEmpty()) return "NO_CANDIDATE_MATCHES";
        if (filtered.isEmpty()) return "NO_FILTERED_RESULTS";
        MatchingDtos.TieBreakMeta first = tieMeta.get(filtered.get(0).getId());
        if (first != null && first.tied()) return "HIGH_TIE";
        return "READY";
    }

    private String resultMessage(String state) {
        return switch (state) {
            case "NO_MATCH" -> "No matching records are available yet.";
            case "NO_CANDIDATE_MATCHES" -> "No candidates have been scored for this job yet.";
            case "NO_FILTERED_RESULTS" -> "No candidates match the current filters.";
            case "HIGH_TIE" -> "Multiple candidates share the same top score; tie-breaker metadata is included.";
            case "LOW_MATCH_ONLY" -> "Only low-confidence matches are currently available.";
            case "PROCESSING" -> "Matching is still processing.";
            case "FAILED" -> "Matching failed for the current CV or job.";
            default -> "Candidate discovery results are ready.";
        };
    }

    private List<String> suggestionsForState(String state) {
        return switch (state) {
            case "NO_MATCH", "NO_CANDIDATE_MATCHES" -> List.of("Upload or rescore CVs for this job.");
            case "NO_FILTERED_RESULTS" -> List.of("Clear filters or lower the minimum score.");
            case "LOW_MATCH_ONLY" -> List.of("Review CV/JD quality signals and broaden skill filters.");
            case "HIGH_TIE" -> List.of("Use tie metadata such as freshness and potential flags for display.");
            case "PROCESSING" -> List.of("Refresh after scoring completes.");
            case "FAILED" -> List.of("Check CV parsing and scoring logs.");
            default -> List.of();
        };
    }

    private MatchingDtos.ListMeta listMeta(List<Matching> rows, String state) {
        return new MatchingDtos.ListMeta(
                Instant.now(),
                lastUpdatedIn(rows),
                state,
                resultMessage(state),
                suggestionsForState(state)
        );
    }

    private boolean hasTopTie(Map<UUID, MatchingDtos.TieBreakMeta> tieMeta, List<Matching> rows) {
        if (rows.isEmpty()) return false;
        MatchingDtos.TieBreakMeta first = tieMeta.get(rows.get(0).getId());
        return first != null && first.tied();
    }

    private Instant lastUpdatedIn(List<Matching> rows) {
        return rows.stream()
                .map(this::lastUpdated)
                .filter(Objects::nonNull)
                .max(Instant::compareTo)
                .orElse(null);
    }

    private Instant lastUpdated(Matching matching) {
        return matching.getUpdatedAt() != null ? matching.getUpdatedAt() : matching.getCreatedAt();
    }

    private String scoreKey(BigDecimal score) {
        return score == null ? "NULL" : score.stripTrailingZeros().toPlainString();
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
                strongThreshold,
                Instant.now(),
                lastUpdatedIn(visible.isEmpty() ? considered : visible),
                matchFeedState(cv, considered, visible, hasStrongMatches),
                matchFeedMessage(cv, considered, visible, hasStrongMatches),
                matchFeedSuggestions(cv, considered, visible, hasStrongMatches)
        );
    }

    private String matchFeedState(CV cv, List<Matching> considered, List<Matching> visible, boolean hasStrongMatches) {
        if (cv.getStatus() == CV.CvStatus.PROCESSING) return "PROCESSING";
        if (cv.getStatus() == CV.CvStatus.FAILED) return "FAILED";
        if (considered.isEmpty()) return "NO_MATCH";
        if (visible.isEmpty() || !hasStrongMatches) return "LOW_MATCH_ONLY";
        return "READY";
    }

    private String matchFeedMessage(CV cv, List<Matching> considered, List<Matching> visible, boolean hasStrongMatches) {
        return switch (matchFeedState(cv, considered, visible, hasStrongMatches)) {
            case "PROCESSING" -> "CV scoring is still processing.";
            case "FAILED" -> "CV scoring failed. Please review the CV or upload another file.";
            case "NO_MATCH" -> "No matching jobs are available for this CV yet.";
            case "LOW_MATCH_ONLY" -> "Only low-confidence matches are currently available.";
            default -> "Matched job results are ready.";
        };
    }

    private List<String> matchFeedSuggestions(CV cv, List<Matching> considered, List<Matching> visible, boolean hasStrongMatches) {
        return switch (matchFeedState(cv, considered, visible, hasStrongMatches)) {
            case "PROCESSING" -> List.of("Refresh after scoring completes.");
            case "FAILED" -> List.of("Upload another CV or edit the manual CV fields.");
            case "NO_MATCH" -> List.of("Upload another CV, update your profile, or wait for new jobs.");
            case "LOW_MATCH_ONLY" -> List.of("Add clearer skills, seniority, projects, and preferred roles to your CV/profile.");
            default -> List.of();
        };
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
