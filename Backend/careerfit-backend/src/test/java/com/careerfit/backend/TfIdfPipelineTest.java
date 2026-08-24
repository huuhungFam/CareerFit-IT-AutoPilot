package com.careerfit.backend;

import com.careerfit.backend.common.util.TextNormalizationService;
import com.careerfit.backend.common.util.TfIdfService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for TF-IDF pipeline.
 * No Spring context required — pure logic tests.
 */
class TfIdfPipelineTest {

    private TfIdfService tfidf;
    private TextNormalizationService normalizer;

    @BeforeEach
    void setUp() {
        tfidf = new TfIdfService();
        tfidf.buildIdf();  // @PostConstruct equivalent
        normalizer = new TextNormalizationService();
    }

    @Test
    @DisplayName("IDF map should be populated with IT terms after init")
    void idfMapShouldBeNonEmpty() {
        assertThat(tfidf.getIdfMap()).isNotEmpty();
        assertThat(tfidf.getIdfMap()).containsKey("java");
        assertThat(tfidf.getIdfMap()).containsKey("react");
        assertThat(tfidf.getIdfMap()).containsKey("postgresql");
    }

    @Test
    @DisplayName("Known terms should have lower IDF than unknown terms")
    void knownTermsShouldHaveLowerIdfThanUnknown() {
        double javaIdf = tfidf.getIdfMap().get("java");
        Map<String, Double> vec = tfidf.buildVector(List.of("unknownxyz123"));
        double unknownWeight = vec.getOrDefault("unknownxyz123", 0.0);
        // unknown terms get high IDF and thus high weight
        assertThat(unknownWeight).isGreaterThan(javaIdf);
    }

    @Test
    @DisplayName("Cosine similarity of identical vectors should be 1.0")
    void identicalVectorsShouldHaveMaxSimilarity() {
        List<String> tokens = List.of("java", "spring", "postgresql", "rest", "api");
        Map<String, Double> vec = tfidf.buildVector(tokens);
        double sim = tfidf.cosineSimilarity(vec, vec);
        assertThat(sim).isCloseTo(1.0, within(0.0001));
    }

    @Test
    @DisplayName("Cosine similarity of completely different vectors should be close to 0")
    void differentVectorsShouldHaveZeroSimilarity() {
        Map<String, Double> vecA = tfidf.buildVector(List.of("java", "spring", "hibernate"));
        Map<String, Double> vecB = tfidf.buildVector(List.of("figma", "photoshop", "illustrator"));
        double sim = tfidf.cosineSimilarity(vecA, vecB);
        assertThat(sim).isLessThan(0.15);
    }

    @Test
    @DisplayName("Similar tech stacks should have moderate-high similarity")
    void similarStacksShouldHaveModerateScore() {
        // CV: Java/Spring candidate
        List<String> cvTokens = normalizer.normalize(
            "Java Spring Boot REST API PostgreSQL Maven JUnit microservice", "en");
        // JD: Spring Boot role
        List<String> jdTokens = normalizer.normalize(
            "We need a Java Spring Boot developer with PostgreSQL and REST API experience", "en");

        Map<String, Double> cvVec = tfidf.buildVector(cvTokens);
        Map<String, Double> jdVec = tfidf.buildVector(jdTokens);

        double sim = tfidf.cosineSimilarity(cvVec, jdVec);
        System.out.println("Java-to-Java similarity: " + (sim * 100) + "%");
        assertThat(sim * 100).isGreaterThan(30.0); // at least 30%
    }

    @Test
    @DisplayName("Cross-domain mismatch should produce low similarity")
    void crossDomainShouldProduceLowScore() {
        List<String> backendCv = normalizer.normalize(
            "Java Spring Boot PostgreSQL REST API microservice", "en");
        List<String> mobileJd = normalizer.normalize(
            "Flutter Dart iOS Android mobile application development bloc riverpod", "en");

        Map<String, Double> cvVec = tfidf.buildVector(backendCv);
        Map<String, Double> jdVec = tfidf.buildVector(mobileJd);

        double sim = tfidf.cosineSimilarity(cvVec, jdVec);
        System.out.println("Backend-to-Mobile similarity: " + (sim * 100) + "%");
        assertThat(sim * 100).isLessThan(20.0);
    }

    @Test
    @DisplayName("Language detection: Vietnamese text should be detected as vi")
    void vietnameseTextShouldBeDetectedAsVi() {
        String viText = "Tôi có kinh nghiệm lập trình phần mềm với Java và Spring Boot. " +
                        "Tôi đã làm việc với các cơ sở dữ liệu như PostgreSQL và MySQL.";
        assertThat(normalizer.detectLanguage(viText)).isEqualTo("vi");
    }

    @Test
    @DisplayName("Language detection: English text should be detected as en")
    void englishTextShouldBeDetectedAsEn() {
        String enText = "Experienced Java developer with strong knowledge of Spring Boot, " +
                        "PostgreSQL, and REST API design. Proficient in microservice architecture.";
        assertThat(normalizer.detectLanguage(enText)).isEqualTo("en");
    }

    @Test
    @DisplayName("Normalization should remove stopwords and return meaningful tokens")
    void normalizationShouldRemoveStopwords() {
        List<String> tokens = normalizer.normalize(
            "I am a senior Java developer with 5 years of experience in Spring Boot", "en");
        assertThat(tokens).doesNotContain("i", "am", "a", "with", "of", "in");
        assertThat(tokens).contains("senior", "java", "developer", "spring", "boot");
    }

    @Test
    @DisplayName("Empty text should produce empty vector")
    void emptyTextShouldProduceEmptyVector() {
        List<String> tokens = normalizer.normalize("", "en");
        Map<String, Double> vec = tfidf.buildVector(tokens);
        assertThat(vec).isEmpty();
        assertThat(tfidf.cosineSimilarity(vec, vec)).isZero();
    }
}
