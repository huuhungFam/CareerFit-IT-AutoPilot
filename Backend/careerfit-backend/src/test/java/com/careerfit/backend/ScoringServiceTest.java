package com.careerfit.backend;

import com.careerfit.backend.common.util.TfIdfService;
import com.careerfit.backend.config.AppProperties;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.matching.service.ScoringService;
import com.careerfit.backend.matching.service.SkillTransferService;
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
        SkillTransferService skillTransferService = new SkillTransferService(objectMapper);
        skillTransferService.loadModel();
        scoringService = new ScoringService(tfidfService, appProperties, objectMapper, skillTransferService);
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
        SkillTransferService skillTransferService = new SkillTransferService(objectMapper);
        skillTransferService.loadModel();
        ScoringService service = new ScoringService(mockTfidf, appProperties, objectMapper, skillTransferService);
        
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

    @Test
    void structuredRequirementsImproveNoisyButQualifiedMatch() {
        CV cv = createCv("{\"react\": 0.5, \"typescript\": 0.5}");
        when(cv.getRawText()).thenReturn("Frontend Engineer with 4 years React, TypeScript and TanStack Query experience");
        when(cv.getTopSkillsJson()).thenReturn("[\"React\",\"TypeScript\"]");

        Job job = createJob("{\"react\": 0.2, \"typescript\": 0.2, \"benefits\": 0.3}");
        when(job.getRequiredSkillsJson()).thenReturn("[\"React\",\"TypeScript\",\"TanStack Query\"]");
        when(job.getSeniorityLevel()).thenReturn("MID");

        ScoringService.ScoringResult result = scoringService.score(cv, job);

        assertEquals(Matching.MatchLabel.HIGH, result.label());
        assertTrue(result.normalizedScore().doubleValue() >= 90.0);
        assertTrue(result.matchReasons().contains("react"));
        assertTrue(result.matchReasons().contains("typescript"));
        assertTrue(result.matchReasons().contains("tanstack query"));
    }

    @Test
    void missingRequiredSkillsCannotBecomeHighFromBoilerplateSimilarity() {
        CV cv = createCv("{\"react\": 0.9, \"teamwork\": 0.1}");
        when(cv.getRawText()).thenReturn("React frontend engineer with 4 years experience");
        when(cv.getTopSkillsJson()).thenReturn("[\"React\"]");

        Job job = createJob("{\"react\": 0.9, \"teamwork\": 0.1}");
        when(job.getRequiredSkillsJson()).thenReturn("[\"Kubernetes\",\"Terraform\",\"AWS\"]");
        when(job.getSeniorityLevel()).thenReturn("MID");

        ScoringService.ScoringResult result = scoringService.score(cv, job);

        assertNotEquals(Matching.MatchLabel.HIGH, result.label());
        assertTrue(result.normalizedScore().doubleValue() <= 59.0);
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
