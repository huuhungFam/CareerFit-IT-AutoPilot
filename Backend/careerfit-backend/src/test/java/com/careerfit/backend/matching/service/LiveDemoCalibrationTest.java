package com.careerfit.backend.matching.service;

import com.careerfit.backend.common.util.TextNormalizationService;
import com.careerfit.backend.common.util.TfIdfService;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.job.entity.Job;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Uses the actual DOCX text, tokenization, TF-IDF vectors and ScoringService.
 * The three texts are documentation artifacts, not seeded records or scoring special cases.
 */
class LiveDemoCalibrationTest extends com.careerfit.backend.BaseIntegrationTest {
    @Autowired private TextNormalizationService normalizer;
    @Autowired private TfIdfService tfidf;
    @Autowired private ScoringService scoring;
    @Autowired private ObjectMapper objectMapper;

    @Test
    void calibratedLiveArtifactsUseTheRealScoringPipeline() throws Exception {
        String cvText = readDocx(Path.of("../../demo/CV_Candidate_CF_Demo_Matching.docx"));
        CV cv = cv(cvText);

        var first = scoring.score(cv, job("CF-DEMO-01 Frontend Engineer", cvText, "SENIOR"));
        String expansion = " Kubernetes Terraform AWS Linux networking observability security cloud platform incident reliability infrastructure orchestration deployment monitoring automation";
        String mediumTail = " Kubernetes Terraform AWS Linux networking observability security cloud";
        var second = scoring.score(cv, job("CF-DEMO-02 Full-stack Delivery Engineer", cvText + expansion.repeat(2) + mediumTail, "SENIOR"));
        var third = scoring.score(cv, job("CF-DEMO-03 Cloud Platform Engineer", cvText + expansion.repeat(4), "MID"));

        System.out.printf("Live demo calibration: job1=%s, job2=%s, job3=%s%n",
                first.normalizedScore(), second.normalizedScore(), third.normalizedScore());
        assertThat(first.normalizedScore().doubleValue()).isGreaterThanOrEqualTo(90.0d);
        assertThat(second.normalizedScore().doubleValue()).isBetween(80.0d, 89.0d);
        assertThat(third.normalizedScore().doubleValue()).isBetween(65.0d, 74.0d);
        assertThat(third.isPotential()).isTrue();
    }

    private CV cv(String text) throws Exception {
        CV cv = new CV(null, "CareerFit live demo CV", CV.CvSource.UPLOAD);
        ReflectionTestUtils.setField(cv, "id", UUID.randomUUID());
        cv.setRawText(text);
        cv.setLanguage("vi");
        cv.setExtractedTermsJson(objectMapper.writeValueAsString(tfidf.buildVector(normalizer.normalize(text, "vi"))));
        return cv;
    }

    private Job job(String title, String text, String seniority) throws Exception {
        Job job = new Job(null, title, "CareerFit Live Demo", text, Job.SalaryMode.NEGOTIABLE);
        ReflectionTestUtils.setField(job, "id", UUID.randomUUID());
        job.setSeniorityLevel(seniority);
        job.setLanguage("vi");
        job.setTfidfVectorJson(objectMapper.writeValueAsString(tfidf.buildVector(normalizer.normalize(text, "vi"))));
        return job;
    }

    private String readDocx(Path path) throws Exception {
        try (InputStream input = Files.newInputStream(path); XWPFDocument document = new XWPFDocument(input)) {
            return document.getParagraphs().stream().map(paragraph -> paragraph.getText()).reduce("", (left, right) -> left + "\n" + right);
        }
    }
}
