package com.careerfit.backend.analytics;

import com.careerfit.backend.analytics.entity.JobMarketSnapshot;
import com.careerfit.backend.analytics.repository.JobMarketSnapshotRepository;
import com.careerfit.backend.analytics.service.AnalyticsService;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock private JobMarketSnapshotRepository snapshotRepo;
    @Mock private JobRepository jobRepo;

    private AnalyticsService service;

    @BeforeEach
    void setUp() {
        service = new AnalyticsService(snapshotRepo, jobRepo, new ObjectMapper());
        when(jobRepo.count()).thenReturn(993L);
        when(jobRepo.countByStatus(Job.JobStatus.ACTIVE)).thenReturn(990L);
        when(jobRepo.countByCreatedAtGreaterThanEqual(any())).thenReturn(979L);
        when(jobRepo.countDistinctCompaniesByStatus(Job.JobStatus.ACTIVE)).thenReturn(440L);
        when(jobRepo.countByStatusGroupedByDomain(Job.JobStatus.ACTIVE)).thenReturn(List.of(
                new Object[] {"BACKEND", 172L},
                new Object[] {"AI_ML", 362L},
                new Object[] {null, 5L}
        ));
    }

    @Test
    void homepageStatsUseCurrentCatalogInsteadOfStaleSnapshot() {
        var result = service.getHomepageStats();

        assertThat(result.activeJobs()).isEqualTo(990);
        assertThat(result.totalJobs()).isEqualTo(993);
        assertThat(result.newJobsToday()).isEqualTo(979);
        assertThat(result.employers()).isEqualTo(440);
        assertThat(result.distributionByRole()).containsEntry("AI_ML", 362L);
        verifyNoInteractions(snapshotRepo);
    }

    @Test
    void trendOverlaysTodayWithCurrentCatalogMetrics() {
        LocalDate today = LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        JobMarketSnapshot yesterday = new JobMarketSnapshot(today.minusDays(1), 20, 14, 2, 7);
        JobMarketSnapshot staleToday = new JobMarketSnapshot(today, 24, 16, 4, 7);
        when(snapshotRepo.findSince(any())).thenReturn(List.of(yesterday, staleToday));

        var trend = service.getTrend(7);

        assertThat(trend).hasSize(2);
        assertThat(trend.getLast())
                .extracting(AnalyticsService.SnapshotPoint::date,
                        AnalyticsService.SnapshotPoint::activeJobs,
                        AnalyticsService.SnapshotPoint::newJobs)
                .containsExactly(today.toString(), 990L, 979L);
    }
}
