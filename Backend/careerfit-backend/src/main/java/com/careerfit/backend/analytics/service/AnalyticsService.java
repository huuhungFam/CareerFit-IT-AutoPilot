package com.careerfit.backend.analytics.service;

import com.careerfit.backend.analytics.entity.JobMarketSnapshot;
import com.careerfit.backend.analytics.repository.JobMarketSnapshotRepository;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsService.class);
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final JobMarketSnapshotRepository snapshotRepo;
    private final JobRepository jobRepo;
    private final ObjectMapper objectMapper;

    public AnalyticsService(JobMarketSnapshotRepository snapshotRepo,
                             JobRepository jobRepo,
                             ObjectMapper objectMapper) {
        this.snapshotRepo = snapshotRepo;
        this.jobRepo = jobRepo;
        this.objectMapper = objectMapper;
    }

    // ── Public: Homepage stats ────────────────────────────────────────────

    /**
     * Homepage stats must reflect the current catalog. Snapshots are historical
     * evidence only and can be stale after a crawler/import batch finishes.
     */
    @Transactional(readOnly = true)
    public MarketStatsResponse getHomepageStats() {
        LiveMarketMetrics metrics = currentMetrics();
        Map<String, Object> roles = new LinkedHashMap<>();
        metrics.roleDistribution().forEach(roles::put);
        return new MarketStatsResponse(metrics.activeJobs(), metrics.totalJobs(),
                metrics.newJobsToday(), metrics.activeCompanies(),
                roles, null);
    }

    /**
     * Trend data for the last N days (for chart components).
     */
    @Transactional(readOnly = true)
    public List<SnapshotPoint> getTrend(int days) {
        LocalDate today = LocalDate.now(VIETNAM_ZONE);
        LocalDate since = today.minusDays(Math.min(days, 90));
        Map<LocalDate, SnapshotPoint> points = new TreeMap<>();
        snapshotRepo.findSince(since).forEach(snapshot -> points.put(snapshot.getSnapshotDate(),
                new SnapshotPoint(snapshot.getSnapshotDate().toString(), snapshot.getTotalPostedJobs(),
                        snapshot.getActiveJobs(), snapshot.getNewJobs())));

        LiveMarketMetrics metrics = currentMetrics();
        points.put(today, new SnapshotPoint(today.toString(), metrics.totalJobs(), metrics.activeJobs(), metrics.newJobsToday()));
        return List.copyOf(points.values());
    }

    /**
     * Role distribution: top N demanded roles with job counts.
     */
    @Transactional(readOnly = true)
    public Map<String, Long> getRoleDistribution(int topN) {
        int safeTop = Math.min(50, Math.max(1, topN));
        return currentMetrics().roleDistribution().entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(safeTop)
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (a, b) -> a,
                        LinkedHashMap::new));
    }

    // ── Scheduled: Daily snapshot builder (7:00 AM ICT) ──────────────────

    @Scheduled(cron = "0 0 7 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void buildDailySnapshot() {
        LocalDate today = LocalDate.now(VIETNAM_ZONE);
        if (snapshotRepo.findBySnapshotDate(today).isPresent()) {
            log.info("[ANALYTICS] Snapshot for {} already exists, skipping.", today);
            return;
        }

        log.info("[ANALYTICS] Building daily snapshot for {}", today);

        LiveMarketMetrics metrics = currentMetrics();

        JobMarketSnapshot snapshot = new JobMarketSnapshot(
                today, Math.toIntExact(metrics.totalJobs()), Math.toIntExact(metrics.activeJobs()),
                Math.toIntExact(metrics.newJobsToday()), Math.toIntExact(metrics.activeCompanies()));

        Map<String, Long> roleDistrib = metrics.roleDistribution();

        try {
            snapshot.setDistributionByRoleJson(objectMapper.writeValueAsString(roleDistrib));
        } catch (Exception e) {
            log.warn("[ANALYTICS] Failed to serialize role distribution: {}", e.getMessage());
        }

        snapshotRepo.save(snapshot);
        log.info("[ANALYTICS] Snapshot saved: activeJobs={}, newJobs={}, employers={}",
                metrics.activeJobs(), metrics.newJobsToday(), metrics.activeCompanies());
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
        long totalJobs,
        long activeJobs,
        long newJobs
    ) {}

    // ── Helpers ───────────────────────────────────────────────────────────

    private LiveMarketMetrics currentMetrics() {
        long totalJobs = jobRepo.count();
        long activeJobs = jobRepo.countByStatus(Job.JobStatus.ACTIVE);
        long newJobsToday = jobRepo.countByCreatedAtGreaterThanEqual(
                LocalDate.now(VIETNAM_ZONE).atStartOfDay(VIETNAM_ZONE).toInstant());
        long activeCompanies = jobRepo.countDistinctCompaniesByStatus(Job.JobStatus.ACTIVE);
        Map<String, Long> roles = jobRepo.countByStatusGroupedByDomain(Job.JobStatus.ACTIVE).stream()
                .collect(Collectors.toMap(
                        row -> normalizeDomain((String) row[0]),
                        row -> ((Number) row[1]).longValue(),
                        Long::sum,
                        LinkedHashMap::new));
        return new LiveMarketMetrics(totalJobs, activeJobs, newJobsToday, activeCompanies, roles);
    }

    private String normalizeDomain(String domain) {
        return domain == null || domain.isBlank() ? "OTHER" : domain;
    }

    private record LiveMarketMetrics(long totalJobs, long activeJobs, long newJobsToday,
                                     long activeCompanies, Map<String, Long> roleDistribution) {}
}
