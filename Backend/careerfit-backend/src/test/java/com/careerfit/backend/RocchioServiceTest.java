package com.careerfit.backend;

import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.feedback.entity.Feedback;
import com.careerfit.backend.feedback.repository.FeedbackRepository;
import com.careerfit.backend.feedback.service.RocchioService;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.matching.repository.MatchingRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class RocchioServiceTest {

    private JobRepository jobRepo;
    private FeedbackRepository feedbackRepo;
    private CVRepository cvRepo;
    private MatchingRepository matchingRepo;
    private ObjectMapper objectMapper;
    private RocchioService rocchioService;

    @BeforeEach
    void setUp() {
        jobRepo = mock(JobRepository.class);
        feedbackRepo = mock(FeedbackRepository.class);
        cvRepo = mock(CVRepository.class);
        matchingRepo = mock(MatchingRepository.class);
        objectMapper = new ObjectMapper();

        rocchioService = new RocchioService(jobRepo, feedbackRepo, cvRepo, matchingRepo, objectMapper);
    }

    @Test
    void testUpdateJobVector_PositiveAndNegativeFeedback() throws Exception {
        UUID jobId = UUID.randomUUID();
        Job job = mock(Job.class);
        when(job.getId()).thenReturn(jobId);
        when(job.getTfidfVectorJson()).thenReturn("{\"java\": 1.0, \"spring\": 0.5}");
        
        when(jobRepo.findByIdForUpdate(jobId)).thenReturn(Optional.of(job));

        CV posCv = mock(CV.class);
        when(posCv.getExtractedTermsJson()).thenReturn("{\"java\": 1.0, \"docker\": 0.8}");
        Matching posMatching = mock(Matching.class);
        when(posMatching.getCv()).thenReturn(posCv);
        Feedback posFb = mock(Feedback.class);
        when(posFb.getMatching()).thenReturn(posMatching);
        when(feedbackRepo.findPositiveByJobId(jobId)).thenReturn(List.of(posFb));

        CV negCv = mock(CV.class);
        when(negCv.getExtractedTermsJson()).thenReturn("{\"spring\": 1.0, \"react\": 0.9}");
        Matching negMatching = mock(Matching.class);
        when(negMatching.getCv()).thenReturn(negCv);
        Feedback negFb = mock(Feedback.class);
        when(negFb.getMatching()).thenReturn(negMatching);
        when(feedbackRepo.findNegativeByJobId(jobId)).thenReturn(List.of(negFb));

        Matching m1 = mock(Matching.class);
        when(matchingRepo.findByJobId(jobId)).thenReturn(List.of(m1));

        rocchioService.updateJobVector(jobId);

        ArgumentCaptor<String> vectorCaptor = ArgumentCaptor.forClass(String.class);
        verify(job).setLearnedProfileVectorJson(vectorCaptor.capture());
        verify(jobRepo).save(job);
        
        Map<String, Double> newVec = objectMapper.readValue(vectorCaptor.getValue(), new TypeReference<>() {});
        
        assertEquals(1.75, newVec.getOrDefault("java", 0.0), 0.001);
        assertEquals(0.35, newVec.getOrDefault("spring", 0.0), 0.001);
        assertEquals(0.60, newVec.getOrDefault("docker", 0.0), 0.001);
        assertFalse(newVec.containsKey("react"));

        verify(m1).setNeedsRecompute(true);
        verify(matchingRepo).saveAll(any());
    }

    @Test
    void testUpdateJobVector_ClampsNegativeWeights() throws Exception {
        UUID jobId = UUID.randomUUID();
        Job job = mock(Job.class);
        when(job.getId()).thenReturn(jobId);
        when(job.getTfidfVectorJson()).thenReturn("{\"old_tech\": 0.1}");
        when(jobRepo.findByIdForUpdate(jobId)).thenReturn(Optional.of(job));
        
        CV negCv = mock(CV.class);
        when(negCv.getExtractedTermsJson()).thenReturn("{\"old_tech\": 1.0}");
        Matching negMatching = mock(Matching.class);
        when(negMatching.getCv()).thenReturn(negCv);
        Feedback negFb = mock(Feedback.class);
        when(negFb.getMatching()).thenReturn(negMatching);
        
        when(feedbackRepo.findPositiveByJobId(jobId)).thenReturn(Collections.emptyList());
        when(feedbackRepo.findNegativeByJobId(jobId)).thenReturn(List.of(negFb));

        rocchioService.updateJobVector(jobId);

        ArgumentCaptor<String> vectorCaptor = ArgumentCaptor.forClass(String.class);
        verify(job).setLearnedProfileVectorJson(vectorCaptor.capture());
        verify(jobRepo).save(job);
        
        Map<String, Double> newVec = objectMapper.readValue(vectorCaptor.getValue(), new TypeReference<>() {});
        assertFalse(newVec.containsKey("old_tech"));
    }

    @Test
    void testUpdateJobVector_Idempotency() throws Exception {
        UUID jobId = UUID.randomUUID();
        Job job = mock(Job.class);
        when(job.getId()).thenReturn(jobId);
        when(job.getTfidfVectorJson()).thenReturn("{\"java\": 1.0}");
        
        when(jobRepo.findByIdForUpdate(jobId)).thenReturn(Optional.of(job));

        CV posCv = mock(CV.class);
        when(posCv.getExtractedTermsJson()).thenReturn("{\"java\": 1.0, \"spring\": 1.0}");
        Matching posMatching = mock(Matching.class);
        when(posMatching.getCv()).thenReturn(posCv);
        Feedback posFb = mock(Feedback.class);
        when(posFb.getMatching()).thenReturn(posMatching);
        when(feedbackRepo.findPositiveByJobId(jobId)).thenReturn(List.of(posFb));
        when(feedbackRepo.findNegativeByJobId(jobId)).thenReturn(Collections.emptyList());

        Matching m1 = mock(Matching.class);
        when(matchingRepo.findByJobId(jobId)).thenReturn(List.of(m1));

        // First run
        rocchioService.updateJobVector(jobId);
        ArgumentCaptor<String> vectorCaptor1 = ArgumentCaptor.forClass(String.class);
        verify(job, times(1)).setLearnedProfileVectorJson(vectorCaptor1.capture());
        
        // Second run
        rocchioService.updateJobVector(jobId);
        ArgumentCaptor<String> vectorCaptor2 = ArgumentCaptor.forClass(String.class);
        verify(job, times(2)).setLearnedProfileVectorJson(vectorCaptor2.capture());
        
        // Assert idempotency (vectors should be exactly the same string because they are deterministic)
        // Note: the second capture contains the last call's argument
        assertEquals(vectorCaptor1.getAllValues().get(0), vectorCaptor2.getAllValues().get(1), "Rocchio recomputation should be idempotent given the same feedback");
        
        // Assert causality
        Map<String, Double> vec = objectMapper.readValue(vectorCaptor1.getAllValues().get(0), new TypeReference<>() {});
        assertTrue(vec.get("spring") > 0, "GOOD_MATCH should increase latent terms");
    }
}
