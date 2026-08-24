package com.careerfit.backend.analytics.service;

import com.careerfit.backend.analytics.repository.AnalyticsEventRepository;
import com.careerfit.backend.application.entity.Application;
import com.careerfit.backend.application.repository.ApplicationRepository;
import com.careerfit.backend.candidate.entity.Candidate;
import com.careerfit.backend.candidate.repository.CandidateRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.employer.repository.EmployerProfileRepository;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.matching.repository.MatchingRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdvancedAnalyticsService {

    private static final TypeReference<List<String>> LIST_TYPE = new TypeReference<>() {};
    private static final int DEFAULT_TOP_LIMIT = 12;

    private final JobRepository jobRepo;
    private final ApplicationRepository applicationRepo;
    private final MatchingRepository matchingRepo;
    private final CandidateRepository candidateRepo;
    private final CVRepository cvRepo;
    private final EmployerProfileRepository employerRepo;
    private final AnalyticsEventRepository eventRepo;
    private final ObjectMapper objectMapper;

    public AdvancedAnalyticsService(JobRepository jobRepo,
                                    ApplicationRepository applicationRepo,
                                    MatchingRepository matchingRepo,
                                    CandidateRepository candidateRepo,
                                    CVRepository cvRepo,
                                    EmployerProfileRepository employerRepo,
                                    AnalyticsEventRepository eventRepo,
                                    ObjectMapper objectMapper) {
        this.jobRepo = jobRepo;
        this.applicationRepo = applicationRepo;
        this.matchingRepo = matchingRepo;
        this.candidateRepo = candidateRepo;
        this.cvRepo = cvRepo;
        this.employerRepo = employerRepo;
        this.eventRepo = eventRepo;
        this.objectMapper = objectMapper;
    }

    // Market analytics

    @Transactional(readOnly = true)
    public MarketOverview marketOverview(int rangeDays) {
        Instant since = since(rangeDays);
        List<SkillDemandItem> topSkills = marketSkills(DEFAULT_TOP_LIMIT);
        List<SalaryBucket> salaryDistribution = marketSalary();

        return new MarketOverview(
                jobRepo.countByStatus(Job.JobStatus.ACTIVE),
                jobRepo.count(),
                jobRepo.countCreatedDailySince(since).stream().mapToLong(row -> toLong(row[1])).sum(),
                employerRepo.count(),
                eventRepo.countByEventTypeAndOccurredAtAfter("JOB_VIEWED", since),
                eventRepo.countByEventTypeAndOccurredAtAfter("JOB_SEARCHED", since),
                applicationRepo.countDailySince(since).stream().mapToLong(row -> toLong(row[1])).sum(),
                matchingRepo.countDailySince(since).stream().mapToLong(row -> toLong(row[1])).sum(),
                topSkills,
                salaryDistribution
        );
    }

    @Transactional(readOnly = true)
    public List<SkillDemandItem> marketSkills(int top) {
        return jobRepo.findTopActiveRequiredSkills(safeLimit(top)).stream()
                .map(row -> new SkillDemandItem(toText(row[0]), toLong(row[1]), false))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SalaryBucket> marketSalary() {
        return jobRepo.findActiveSalaryDistribution().stream()
                .map(row -> new SalaryBucket(
                        toText(row[0]),
                        toText(row[1]),
                        toLong(row[2]),
                        toBigDecimal(row[3]),
                        toBigDecimal(row[4]),
                        toBigDecimal(row[5])))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TrendPoint> marketTrends(int days) {
        Instant since = since(days);
        Map<String, TrendAccumulator> trends = emptyTrend(days);
        mergeCount(trends, jobRepo.countCreatedDailySince(since), Metric.JOBS);
        mergeCountAndAverage(trends, matchingRepo.countDailySince(since), Metric.MATCHES);
        mergeCount(trends, applicationRepo.countDailySince(since), Metric.APPLICATIONS);
        mergeCount(trends, eventRepo.countDailyByEventTypeSince("JOB_VIEWED", since), Metric.VIEWS);
        return toTrendPoints(trends);
    }

    // Candidate analytics

    @Transactional(readOnly = true)
    public CandidateOverview candidateOverview(UUID userId) {
        Candidate candidate = resolveCandidate(userId);
        UUID candidateId = candidate.getId();
        long totalMatches = matchingRepo.countByCvCandidateId(candidateId);
        long totalApplications = applicationRepo.countByCandidateId(candidateId);

        return new CandidateOverview(
                profileCompleteness(candidate),
                cvRepo.countByCandidateId(candidateId),
                cvRepo.countByCandidateIdAndStatus(candidateId, CV.CvStatus.SCORING_DONE),
                totalMatches,
                matchingRepo.countByCvCandidateIdAndLabel(candidateId, Matching.MatchLabel.HIGH),
                matchingRepo.countPotentialByCandidateId(candidateId),
                toDouble(matchingRepo.averageScoreByCandidateId(candidateId)),
                toDouble(matchingRepo.bestScoreByCandidateId(candidateId)),
                totalApplications,
                candidateApplicationFunnel(candidateId),
                candidateSkillDemand(userId),
                candidateProfileGaps(userId, DEFAULT_TOP_LIMIT)
        );
    }

    @Transactional(readOnly = true)
    public List<SkillDemandItem> candidateSkillDemand(UUID userId) {
        Candidate candidate = resolveCandidate(userId);
        Set<String> candidateSkills = candidateSkillSet(candidate);
        Map<String, Long> demand = activeSkillDemand();

        if (candidateSkills.isEmpty()) {
            return demand.entrySet().stream()
                    .limit(DEFAULT_TOP_LIMIT)
                    .map(e -> new SkillDemandItem(e.getKey(), e.getValue(), false))
                    .toList();
        }

        return candidateSkills.stream()
                .sorted()
                .map(skill -> new SkillDemandItem(skill, demand.getOrDefault(skill, 0L), true))
                .sorted(Comparator.comparingLong(SkillDemandItem::jobCount).reversed()
                        .thenComparing(SkillDemandItem::skill))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProfileGapItem> candidateProfileGaps(UUID userId, int top) {
        Candidate candidate = resolveCandidate(userId);
        Set<String> candidateSkills = candidateSkillSet(candidate);

        return jobRepo.findTopActiveRequiredSkills(safeLimit(top * 3)).stream()
                .map(row -> new ProfileGapItem(toText(row[0]), toLong(row[1]),
                        "High market demand skill not found in candidate profile/CV"))
                .filter(item -> !candidateSkills.contains(normalizeSkill(item.skill())))
                .limit(safeLimit(top))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TrendPoint> candidateTrends(UUID userId, int days) {
        Candidate candidate = resolveCandidate(userId);
        Instant since = since(days);
        Map<String, TrendAccumulator> trends = emptyTrend(days);
        mergeCountAndAverage(trends, matchingRepo.countCandidateMatchesDailySince(candidate.getId(), since), Metric.MATCHES);
        mergeCount(trends, applicationRepo.countCandidateApplicationsDailySince(candidate.getId(), since), Metric.APPLICATIONS);
        mergeCount(trends, eventRepo.countDailyByActorAndEventTypeSince(userId, "MATCH_CARD_VIEWED", since), Metric.VIEWS);
        return toTrendPoints(trends);
    }

    // Recruiter analytics

    @Transactional(readOnly = true)
    public RecruiterOverview recruiterOverview(UUID recruiterId, int rangeDays) {
        Instant since = since(rangeDays);
        List<Job> jobs = jobRepo.findByRecruiterId(recruiterId);

        List<JobPerformanceItem> topJobs = jobs.stream()
                .map(job -> new JobPerformanceItem(
                        job.getId(),
                        job.getTitle(),
                        job.getStatus().name(),
                        eventRepo.countByEventTypeAndSubjectTypeAndSubjectIdAndOccurredAtAfter(
                                "JOB_VIEWED", "JOB", job.getId(), since),
                        matchingRepo.countByJobId(job.getId()),
                        applicationRepo.countByJobId(job.getId()),
                        toDouble(jobAverageScore(job.getId()))))
                .sorted(Comparator.comparingLong(JobPerformanceItem::applications).reversed()
                        .thenComparing(Comparator.comparingLong(JobPerformanceItem::matches).reversed()))
                .limit(5)
                .toList();

        return new RecruiterOverview(
                jobs.size(),
                jobRepo.countByRecruiterIdAndStatus(recruiterId, Job.JobStatus.ACTIVE),
                applicationRepo.countByJobRecruiterId(recruiterId),
                applicationRepo.countByJobRecruiterIdAndStatus(recruiterId, Application.ApplicationStatus.PENDING),
                applicationRepo.countByJobRecruiterIdAndStatus(recruiterId, Application.ApplicationStatus.APPROVED),
                applicationRepo.countByJobRecruiterIdAndStatus(recruiterId, Application.ApplicationStatus.REJECTED),
                applicationRepo.countByJobRecruiterIdAndStatus(recruiterId, Application.ApplicationStatus.INVITED),
                applicationRepo.countByJobRecruiterIdAndAutoAppliedTrue(recruiterId),
                matchingRepo.countByJobRecruiterId(recruiterId),
                matchingRepo.countByJobRecruiterIdAndLabel(recruiterId, Matching.MatchLabel.HIGH),
                matchingRepo.countPotentialByRecruiterId(recruiterId),
                toDouble(matchingRepo.averageScoreByRecruiterId(recruiterId)),
                eventRepo.countDailyRecruiterJobEventsSince(recruiterId, "JOB_VIEWED", since)
                        .stream().mapToLong(row -> toLong(row[1])).sum(),
                topJobs
        );
    }

    @Transactional(readOnly = true)
    public JobFunnel recruiterJobFunnel(UUID recruiterId, UUID jobId, int rangeDays) {
        Job job = resolveRecruiterJob(recruiterId, jobId);
        Instant since = since(rangeDays);
        long views = eventRepo.countByEventTypeAndSubjectTypeAndSubjectIdAndOccurredAtAfter(
                "JOB_VIEWED", "JOB", jobId, since);
        long matches = matchingRepo.countByJobId(jobId);
        long applications = applicationRepo.countByJobId(jobId);
        long invited = applicationRepo.countByJobIdAndStatus(jobId, Application.ApplicationStatus.INVITED);
        long approved = applicationRepo.countByJobIdAndStatus(jobId, Application.ApplicationStatus.APPROVED);
        long rejected = applicationRepo.countByJobIdAndStatus(jobId, Application.ApplicationStatus.REJECTED);

        Map<String, Long> steps = new LinkedHashMap<>();
        steps.put("views", views);
        steps.put("matches", matches);
        steps.put("applications", applications);
        steps.put("invited", invited);
        steps.put("approved", approved);
        steps.put("rejected", rejected);

        Map<String, Double> rates = new LinkedHashMap<>();
        rates.put("viewToApplication", percent(applications, views));
        rates.put("matchToApplication", percent(applications, matches));
        rates.put("applicationToApproved", percent(approved, applications));
        rates.put("applicationToRejected", percent(rejected, applications));

        return new JobFunnel(job.getId(), job.getTitle(), job.getStatus().name(), steps, rates);
    }

    @Transactional(readOnly = true)
    public List<JobSkillGapItem> recruiterJobSkillGap(UUID recruiterId, UUID jobId) {
        Job job = resolveRecruiterJob(recruiterId, jobId);
        List<String> requiredSkills = parseList(job.getRequiredSkillsJson());
        List<Matching> matchings = matchingRepo.findByJobId(jobId);
        long matchedCandidates = matchings.size();

        return requiredSkills.stream()
                .map(skill -> {
                    String normalized = normalizeSkill(skill);
                    long hasSkill = matchings.stream()
                            .filter(m -> parseNormalizedSkillSet(m.getCv().getTopSkillsJson()).contains(normalized))
                            .count();
                    return new JobSkillGapItem(
                            skill,
                            matchedCandidates,
                            hasSkill,
                            Math.max(0, matchedCandidates - hasSkill),
                            percent(hasSkill, matchedCandidates));
                })
                .sorted(Comparator.comparingDouble(JobSkillGapItem::coverageRate).thenComparing(JobSkillGapItem::skill))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TrendPoint> recruiterTrends(UUID recruiterId, int days) {
        Instant since = since(days);
        Map<String, TrendAccumulator> trends = emptyTrend(days);
        mergeCountAndAverage(trends, matchingRepo.countRecruiterMatchesDailySince(recruiterId, since), Metric.MATCHES);
        mergeCount(trends, applicationRepo.countRecruiterApplicationsDailySince(recruiterId, since), Metric.APPLICATIONS);
        mergeCount(trends, eventRepo.countDailyRecruiterJobEventsSince(recruiterId, "JOB_VIEWED", since), Metric.VIEWS);
        return toTrendPoints(trends);
    }

    // Helpers

    private Candidate resolveCandidate(UUID userId) {
        return candidateRepo.findByUserId(userId)
                .orElseThrow(() -> AppException.notFound("Candidate", userId));
    }

    private Job resolveRecruiterJob(UUID recruiterId, UUID jobId) {
        Job job = jobRepo.findByIdWithRecruiter(jobId)
                .orElseThrow(() -> AppException.notFound("Job", jobId));
        if (!job.getRecruiter().getId().equals(recruiterId)) {
            throw AppException.forbidden("You do not own this job");
        }
        return job;
    }

    private Map<String, Long> candidateApplicationFunnel(UUID candidateId) {
        Map<String, Long> funnel = new LinkedHashMap<>();
        for (Application.ApplicationStatus status : Application.ApplicationStatus.values()) {
            funnel.put(status.name(), applicationRepo.countByCandidateIdAndStatus(candidateId, status));
        }
        return funnel;
    }

    private int profileCompleteness(Candidate candidate) {
        int total = 8;
        int done = 0;
        if (hasText(candidate.getDesiredTitle())) done++;
        if (hasText(candidate.getDesiredSeniority())) done++;
        if (!parseList(candidate.getDesiredSkillsJson()).isEmpty()) done++;
        if (hasText(candidate.getDesiredWorkModel())) done++;
        if (hasText(candidate.getLocation())) done++;
        if (candidate.getYearsOfExperience() != null) done++;
        if (candidate.getDesiredSalaryMin() != null || candidate.getDesiredSalaryMax() != null) done++;
        if (cvRepo.existsByCandidateIdAndIsDefaultTrue(candidate.getId())) done++;
        return (int) Math.round((done * 100.0) / total);
    }

    private Set<String> candidateSkillSet(Candidate candidate) {
        Set<String> skills = parseNormalizedSkillSet(candidate.getDesiredSkillsJson());
        cvRepo.findByCandidateIdAndIsDefaultTrue(candidate.getId())
                .map(CV::getTopSkillsJson)
                .map(this::parseNormalizedSkillSet)
                .ifPresent(skills::addAll);
        return skills;
    }

    private Map<String, Long> activeSkillDemand() {
        return jobRepo.findByStatus(Job.JobStatus.ACTIVE).stream()
                .flatMap(job -> {
                    List<String> skills = new ArrayList<>();
                    skills.addAll(parseList(job.getRequiredSkillsJson()));
                    skills.addAll(parseList(job.getNiceToHaveSkillsJson()));
                    return skills.stream();
                })
                .map(this::normalizeSkill)
                .filter(skill -> !skill.isBlank())
                .collect(Collectors.groupingBy(skill -> skill, LinkedHashMap::new, Collectors.counting()))
                .entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed()
                        .thenComparing(Map.Entry::getKey))
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (a, b) -> a,
                        LinkedHashMap::new));
    }

    private BigDecimal jobAverageScore(UUID jobId) {
        List<Matching> matchings = matchingRepo.findByJobId(jobId);
        return matchings.stream()
                .map(Matching::getNormalizedScore)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(Math.max(1, matchings.size())), 2, RoundingMode.HALF_UP);
    }

    private List<String> parseList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return objectMapper.readValue(json, LIST_TYPE); }
        catch (Exception e) { return List.of(); }
    }

    private Set<String> parseNormalizedSkillSet(String json) {
        return parseList(json).stream()
                .map(this::normalizeSkill)
                .filter(skill -> !skill.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private String normalizeSkill(String skill) {
        return skill == null ? "" : skill.trim().toLowerCase(Locale.ROOT);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private int safeLimit(int value) {
        return Math.max(1, Math.min(value, 50));
    }

    private Instant since(int days) {
        int safeDays = Math.max(1, Math.min(days, 365));
        return Instant.now().minusSeconds(safeDays * 24L * 60L * 60L);
    }

    private Map<String, TrendAccumulator> emptyTrend(int days) {
        int safeDays = Math.max(1, Math.min(days, 365));
        LocalDate start = LocalDate.now(ZoneOffset.UTC).minusDays(safeDays - 1L);
        Map<String, TrendAccumulator> result = new LinkedHashMap<>();
        for (int i = 0; i < safeDays; i++) {
            String date = start.plusDays(i).toString();
            result.put(date, new TrendAccumulator(date));
        }
        return result;
    }

    private void mergeCount(Map<String, TrendAccumulator> trends, List<Object[]> rows, Metric metric) {
        for (Object[] row : rows) {
            TrendAccumulator acc = trends.computeIfAbsent(dateString(row[0]), TrendAccumulator::new);
            long count = toLong(row[1]);
            switch (metric) {
                case JOBS -> acc.jobs += count;
                case APPLICATIONS -> acc.applications += count;
                case VIEWS -> acc.views += count;
                case MATCHES -> acc.matches += count;
            }
        }
    }

    private void mergeCountAndAverage(Map<String, TrendAccumulator> trends, List<Object[]> rows, Metric metric) {
        for (Object[] row : rows) {
            TrendAccumulator acc = trends.computeIfAbsent(dateString(row[0]), TrendAccumulator::new);
            long count = toLong(row[1]);
            if (metric == Metric.MATCHES) {
                acc.matches += count;
                acc.avgMatchScore = toDouble(toBigDecimal(row.length > 2 ? row[2] : null));
            }
        }
    }

    private List<TrendPoint> toTrendPoints(Map<String, TrendAccumulator> trends) {
        return trends.values().stream()
                .sorted(Comparator.comparing(TrendAccumulator::date))
                .map(acc -> new TrendPoint(acc.date, acc.jobs, acc.matches, acc.applications, acc.views, acc.avgMatchScore))
                .toList();
    }

    private String dateString(Object value) {
        if (value == null) return LocalDate.now(ZoneOffset.UTC).toString();
        if (value instanceof LocalDate date) return date.toString();
        if (value instanceof Date date) return date.toLocalDate().toString();
        return value.toString();
    }

    private String toText(Object value) {
        return value == null ? "" : value.toString();
    }

    private long toLong(Object value) {
        if (value instanceof Number n) return n.longValue();
        if (value == null) return 0L;
        try { return Long.parseLong(value.toString()); }
        catch (Exception e) { return 0L; }
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value instanceof BigDecimal bd) return bd.setScale(2, RoundingMode.HALF_UP);
        if (value instanceof Number n) return BigDecimal.valueOf(n.doubleValue()).setScale(2, RoundingMode.HALF_UP);
        if (value == null) return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        try { return new BigDecimal(value.toString()).setScale(2, RoundingMode.HALF_UP); }
        catch (Exception e) { return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP); }
    }

    private double toDouble(BigDecimal value) {
        return value == null ? 0.0 : value.setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    private double percent(long numerator, long denominator) {
        if (denominator <= 0) return 0.0;
        return BigDecimal.valueOf(numerator)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(denominator), 2, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private enum Metric { JOBS, MATCHES, APPLICATIONS, VIEWS }

    private static class TrendAccumulator {
        private final String date;
        private long jobs;
        private long matches;
        private long applications;
        private long views;
        private double avgMatchScore;

        private TrendAccumulator(String date) {
            this.date = date;
        }

        private String date() {
            return date;
        }
    }

    public record MarketOverview(
            long activeJobs,
            long totalJobs,
            long newJobsInRange,
            long employers,
            long jobViews,
            long jobSearches,
            long applications,
            long matchings,
            List<SkillDemandItem> topSkills,
            List<SalaryBucket> salaryDistribution
    ) {}

    public record CandidateOverview(
            int profileCompleteness,
            long cvCount,
            long scoringDoneCvCount,
            long totalMatches,
            long highMatches,
            long potentialMatches,
            double averageMatchScore,
            double bestMatchScore,
            long totalApplications,
            Map<String, Long> applicationFunnel,
            List<SkillDemandItem> skillDemand,
            List<ProfileGapItem> profileGaps
    ) {}

    public record RecruiterOverview(
            long totalJobs,
            long activeJobs,
            long totalApplicants,
            long pendingReview,
            long approved,
            long rejected,
            long invited,
            long autoApplied,
            long totalMatchings,
            long highMatchings,
            long potentialMatchings,
            double averageMatchScore,
            long jobViews,
            List<JobPerformanceItem> topJobs
    ) {}

    public record JobFunnel(
            UUID jobId,
            String title,
            String status,
            Map<String, Long> steps,
            Map<String, Double> conversionRates
    ) {}

    public record SkillDemandItem(
            String skill,
            long jobCount,
            boolean candidateHasSkill
    ) {}

    public record ProfileGapItem(
            String skill,
            long marketDemand,
            String reason
    ) {}

    public record SalaryBucket(
            String currency,
            String seniority,
            long jobCount,
            BigDecimal minSalary,
            BigDecimal averageSalary,
            BigDecimal maxSalary
    ) {}

    public record TrendPoint(
            String date,
            long jobs,
            long matches,
            long applications,
            long views,
            double avgMatchScore
    ) {}

    public record JobPerformanceItem(
            UUID jobId,
            String title,
            String status,
            long views,
            long matches,
            long applications,
            double avgMatchScore
    ) {}

    public record JobSkillGapItem(
            String skill,
            long matchedCandidateCount,
            long candidateHasSkill,
            long candidateMissingSkill,
            double coverageRate
    ) {}
}
