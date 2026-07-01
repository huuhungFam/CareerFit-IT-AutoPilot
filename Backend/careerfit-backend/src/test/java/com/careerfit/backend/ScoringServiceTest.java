package com.careerfit.backend;

import com.careerfit.backend.common.util.TfIdfService;
import com.careerfit.backend.config.AppProperties;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.matching.service.ScoringService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class ScoringServiceTest {

    private ScoringService scoringService;
    private TfIdfService tfidfService;
    private AppProperties appProperties;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        tfidfService = new TfIdfService();
        appProperties = new AppProperties();
        ReflectionTestUtils.setField(appProperties, "scoreLabelHighMax", 75.0);
        ReflectionTestUtils.setField(appProperties, "scoreLabelMediumMax", 40.0);
        objectMapper = new ObjectMapper();
        scoringService = new ScoringService(tfidfService, appProperties, objectMapper);
    }

    @Test
    void testCosineSymmetryAndBounds() {
        CV cv = createCv("{\"java\": 0.8, \"spring\": 0.2}");
        Job job = createJob("{\"java\": 0.5, \"spring\": 0.5}");

        ScoringService.ScoringResult res1 = scoringService.score(cv, job);
        
        assertTrue(res1.rawScore().doubleValue() >= 0.0);
        assertTrue(res1.rawScore().doubleValue() <= 1.0);
        
        CV cvIdentical = createCv("{\"java\": 0.8, \"spring\": 0.2}");
        Job jobIdentical = createJob("{\"java\": 0.8, \"spring\": 0.2}");
        ScoringService.ScoringResult resIdentical = scoringService.score(cvIdentical, jobIdentical);
        assertEquals(100.0, resIdentical.normalizedScore().doubleValue(), 0.01);
    }

    @Test
    void testUsesLearnedProfileVectorWhenAvailable() {
        CV cv = createCv("{\"java\": 0.9}");
        Job job = createJob("{\"python\": 0.9}");
        when(job.getLearnedProfileVectorJson()).thenReturn("{\"java\": 0.9}");
        
        ScoringService.ScoringResult res = scoringService.score(cv, job);
        assertTrue(res.normalizedScore().doubleValue() > 90.0);
    }

    @Test
    void testPotentialHeuristicSeniority() {
        CV cv = createCv("{\"java\": 0.5, \"spring\": 0.5}");
        when(cv.getRawText()).thenReturn("I am a Junior Java Developer");
        
        Job job = createJob("{\"java\": 0.5, \"spring\": 0.5}");
        when(job.getSeniorityLevel()).thenReturn("MID");
        
        TfIdfService mockTfidf = Mockito.mock(TfIdfService.class);
        when(mockTfidf.cosineSimilarity(any(), any())).thenReturn(0.5);
        ScoringService service = new ScoringService(mockTfidf, appProperties, objectMapper);
        
        ScoringService.ScoringResult res = service.score(cv, job);
        assertTrue(res.isPotential());
        assertEquals(Matching.MatchLabel.MEDIUM, res.label());
        assertNotNull(res.potentialReason());
    }

    @Test
    void testZeroAndInvalidVectors() {
        CV cvZero = createCv("{}");
        Job jobZero = createJob("{}");
        
        ScoringService.ScoringResult res = scoringService.score(cvZero, jobZero);
        assertEquals(0.0, res.rawScore().doubleValue());
        assertEquals(Matching.MatchLabel.LOW, res.label());
    }

    private CV createCv(String json) {
        CV cv = Mockito.mock(CV.class);
        when(cv.getId()).thenReturn(UUID.randomUUID());
        when(cv.getExtractedTermsJson()).thenReturn(json);
        return cv;
    }

    private Job createJob(String json) {
        Job job = Mockito.mock(Job.class);
        when(job.getId()).thenReturn(UUID.randomUUID());
        when(job.getTfidfVectorJson()).thenReturn(json);
        return job;
    }
}
