package com.careerfit.backend;

import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.common.util.TextNormalizationService;
import com.careerfit.backend.common.util.TfIdfService;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.careerfit.backend.matching.service.MatchingBatchService;
import com.careerfit.backend.matching.service.MatchingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MatchingBatchServiceTest {
    private JobRepository jobRepo;
    private CVRepository cvRepo;
    private MatchingService matchingService;
    private TextNormalizationService normalizer;
    private TfIdfService tfidf;
    private MatchingBatchService service;

    @BeforeEach
    void setUp() {
        jobRepo = mock(JobRepository.class);
        cvRepo = mock(CVRepository.class);
        matchingService = mock(MatchingService.class);
        normalizer = mock(TextNormalizationService.class);
        tfidf = mock(TfIdfService.class);
        service = new MatchingBatchService(jobRepo, cvRepo, matchingService, normalizer, tfidf, new ObjectMapper());
    }

    @Test
    void clampsPaginationAndUsesStableTotalOrder() {
        Job job = job("{}");
        CV cv1 = mock(CV.class);
        CV cv2 = mock(CV.class);
        when(jobRepo.findByStatus(eq(Job.JobStatus.ACTIVE), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(job)));
        when(cvRepo.findByStatus(CV.CvStatus.SCORING_DONE)).thenReturn(List.of(cv1, cv2));
        when(normalizer.detectLanguage(anyString())).thenReturn("en");
        when(normalizer.normalize(anyString(), eq("en"))).thenReturn(List.of("java", "spring"));
        when(tfidf.buildVector(anyList())).thenReturn(Map.of("java", 1.0));

        var result = service.rebuild(-3, 999);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(jobRepo).findByStatus(eq(Job.JobStatus.ACTIVE), pageable.capture());
        assertThat(pageable.getValue().getPageNumber()).isZero();
        assertThat(pageable.getValue().getPageSize()).isEqualTo(200);
        assertThat(pageable.getValue().getSort().getOrderFor("createdAt").getDirection().isDescending()).isTrue();
        assertThat(pageable.getValue().getSort().getOrderFor("id").getDirection().isAscending()).isTrue();
        assertThat(result.jobsVectorized()).isEqualTo(1);
        assertThat(result.matchingsScored()).isEqualTo(2);
        assertThat(result.failures()).isZero();
        verify(matchingService).recomputeMatching(cv1, job);
        verify(matchingService).recomputeMatching(cv2, job);
    }

    @Test
    void oneBrokenJobDoesNotStopRemainingBatch() {
        Job broken = job("{broken-json");
        Job healthy = job("{\"java\":1.0}");
        CV cv = mock(CV.class);
        when(jobRepo.findByStatus(eq(Job.JobStatus.ACTIVE), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(broken, healthy)));
        when(cvRepo.findByStatus(CV.CvStatus.SCORING_DONE)).thenReturn(List.of(cv));
        doThrow(new IllegalStateException("scoring failed")).when(matchingService).recomputeMatching(cv, broken);

        var result = service.rebuild(0, 10);

        assertThat(result.jobsProcessed()).isEqualTo(2);
        assertThat(result.failures()).isEqualTo(1);
        assertThat(result.matchingsScored()).isEqualTo(1);
        verify(matchingService).recomputeMatching(cv, healthy);
    }

    private Job job(String vector) {
        UserAccount recruiter = new UserAccount("re@test.local", "hash", UserAccount.Role.RECRUITER, "Recruiter");
        Job job = new Job(recruiter, "Backend Engineer", "CareerFit", "Java Spring Boot PostgreSQL", Job.SalaryMode.NEGOTIABLE);
        job.setTfidfVectorJson(vector);
        job.setLanguage("en");
        return job;
    }
}
