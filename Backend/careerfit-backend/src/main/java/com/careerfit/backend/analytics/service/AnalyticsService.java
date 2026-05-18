package com.careerfit.backend.analytics.service;

import com.careerfit.backend.analytics.entity.JobMarketSnapshot;
import com.careerfit.backend.analytics.repository.JobMarketSnapshotRepository;
import com.careerfit.backend.application.repository.ApplicationRepository;
import com.careerfit.backend.employer.repository.EmployerProfileRepository;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsService.class);
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final JobMarketSnapshotRepository snapshotRepo;
    private final JobRepository jobRepo;
    private final ApplicationRepository applicationRepo;
    private final EmployerProfileRepository employerRepo;
    private final ObjectMapper objectMapper;

    public AnalyticsService(JobMarketSnapshotRepository snapshotRepo,
                             JobRepository jobRepo,
                             ApplicationRepository applicationRepo,
                             EmployerProfileRepository employerRepo,
                             ObjectMapper objectMapper) {
        this.snapshotRepo = snapshotRepo;
        this.jobRepo = jobRepo;
        this.applicationRepo = applicationRepo;
        this.employerRepo = employerRepo;
        this.objectMapper = objectMapper;
    }

    // ── Public: Homepage stats ────────────────────────────────────────────

    /**
     * Fast homepage stats — uses today's snapshot if available,
     * otherwise computes from DB directly.
     */
    @Transactional(readOnly = true)
    public MarketStatsResponse getHomepageStats() {
        Optional<JobMarketSnapshot> todaySnapshot = snapshotRepo.findBySnapshotDate(LocalDate.now());

        if (todaySnapshot.isPresent()) {
            var s = todaySnapshot.get();
            return new MarketStatsResponse(
                    s.getActiveJobs(), s.getTotalPostedJobs(),
                    s.getNewJobs(), s.getEmployerCount(),
                    parseMap(s.getDistributionByRoleJson()),
                    null
            );
        }

        // Fallback: compute on the fly
        long activeJobs = jobRepo.findByStatus(Job.JobStatus.ACTIVE).size();
        long employers  = employerRepo.count();

        return new MarketStatsResponse(
                activeJobs, activeJobs, 0L, employers,
                Collections.emptyMap(), null
        );
    }

    /**
     * Trend data for the last N days (for chart components).
     */
    @Transactional(readOnly = true)
    public List<SnapshotPoint> getTrend(int days) {
        LocalDate since = LocalDate.now().minusDays(Math.min(days, 90));
        return snapshotRepo.findSince(since).stream()
                .map(s -> new SnapshotPoint(
                        s.getSnapshotDate().toString(),
                        s.getActiveJobs(),
                        s.getNewJobs()))
                .toList();
    }

    /**
     * Role distribution: top N demanded roles with job counts.
     */
    @Transactional(readOnly = true)
    public Map<String, Long> getRoleDistribution(int topN) {
        Optional<JobMarketSnapshot> latest = snapshotRepo.findLatest(PageRequest.of(0, 1))
                .stream().findFirst();
        if (latest.isEmpty()) return Collections.emptyMap();

        Map<String, Object> raw = parseMap(latest.get().getDistributionByRoleJson());
        return raw.entrySet().stream()
                .sorted(Map.Entry.<String, Object>comparingByValue(
                        Comparator.comparingLong(v -> -toLong(v))))
                .limit(topN)
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> toLong(e.getValue()),
                        (a, b) -> a,
                        LinkedHashMap::new));
    }

    // ── Scheduled: Daily snapshot builder (7:00 AM ICT) ──────────────────

    @Scheduled(cron = "0 0 7 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void buildDailySnapshot() {
        LocalDate today = LocalDate.now();
        if (snapshotRepo.findBySnapshotDate(today).isPresent()) {
            log.info("[ANALYTICS] Snapshot for {} already exists, skipping.", today);
            return;
        }

        log.info("[ANALYTICS] Building daily snapshot for {}", today);

        List<Job> allJobs    = jobRepo.findAll();
        List<Job> activeJobs = allJobs.stream()
                .filter(j -> j.getStatus() == Job.JobStatus.ACTIVE).toList();
        LocalDate yesterday  = today.minusDays(1);
        long newJobs         = allJobs.stream()
                .filter(j -> j.getCreatedAt().isAfter(yesterday.atStartOfDay()
                        .toInstant(java.time.ZoneOffset.UTC)))
                .count();
        long employers       = employerRepo.count();

        JobMarketSnapshot snapshot = new JobMarketSnapshot(
                today, allJobs.size(), activeJobs.size(),
                (int) newJobs, (int) employers);

        // Role distribution — group by seniority_level as proxy
        Map<String, Long> roleDistrib = activeJobs.stream()
                .filter(j -> j.getSeniorityLevel() != null)
                .collect(Collectors.groupingBy(Job::getSeniorityLevel, Collectors.counting()));

        try {
            snapshot.setDistributionByRoleJson(objectMapper.writeValueAsString(roleDistrib));
        } catch (Exception e) {
            log.warn("[ANALYTICS] Failed to serialize role distribution: {}", e.getMessage());
        }

        snapshotRepo.save(snapshot);
        log.info("[ANALYTICS] Snapshot saved: activeJobs={}, newJobs={}, employers={}",
                activeJobs.size(), newJobs, employers);
    }

    // ── Response records ──────────────────────────────────────────────────

    public record MarketStatsResponse(
        long activeJobs,
        long totalJobs,
        long newJobsToday,
        long employers,
        Map<String, Object> distributionByRole,
        Map<String, Object> distributionBySalary
    ) {}

    public record SnapshotPoint(
        String date,
        long activeJobs,
        long newJobs
    ) {}

    // ── Helpers ───────────────────────────────────────────────────────────

    private Map<String, Object> parseMap(String json) {
        if (json == null || json.isBlank()) return Collections.emptyMap();
        try { return objectMapper.readValue(json, MAP_TYPE); }
        catch (Exception e) { return Collections.emptyMap(); }
    }

    private long toLong(Object v) {
        if (v instanceof Number n) return n.longValue();
        try { return Long.parseLong(v.toString()); }
        catch (Exception e) { return 0; }
    }
}
