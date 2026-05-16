package com.careerfit.backend.matching.service;

import com.careerfit.backend.common.util.TfIdfService;
import com.careerfit.backend.config.AppProperties;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.matching.entity.Matching;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * Core scoring engine: computes CV-JD match score and assigns label.
 *
 * Algorithm:
 *  1. Load TF-IDF vectors from CV.extractedTermsJson and Job.tfidfVectorJson (JSONB).
 *  2. Compute cosine similarity.
 *  3. Normalize to 0–100.
 *  4. Assign label (LOW / MEDIUM / HIGH / POTENTIAL).
 *  5. Run potential heuristic.
 *  6. Build match reason chips.
 */
@Service
public class ScoringService {

    private static final Logger log = LoggerFactory.getLogger(ScoringService.class);
    private static final TypeReference<Map<String, Double>> VEC_TYPE = new TypeReference<>() {};
    private static final TypeReference<List<String>> LIST_TYPE = new TypeReference<>() {};

    private final TfIdfService tfidf;
    private final AppProperties props;
    private final ObjectMapper objectMapper;

    public ScoringService(TfIdfService tfidf, AppProperties props, ObjectMapper objectMapper) {
        this.tfidf = tfidf;
        this.props = props;
        this.objectMapper = objectMapper;
    }

    /**
     * Score a CV against a Job.
     * Both vectors must have been persisted as JSONB in the database.
     */
    public ScoringResult score(CV cv, Job job) {
        Map<String, Double> cvVec  = parseVector(cv.getExtractedTermsJson(), "CV", cv.getId().toString());
        Map<String, Double> jobVec = parseVector(job.getTfidfVectorJson(), "Job", job.getId().toString());

        double rawScore = tfidf.cosineSimilarity(cvVec, jobVec);
        BigDecimal normalized = BigDecimal.valueOf(rawScore * 100.0)
                .setScale(2, RoundingMode.HALF_UP);

        double score = normalized.doubleValue();
        Matching.MatchLabel label = assignLabel(score);
        boolean isPotential = detectPotential(cv, job, cvVec, jobVec, score);

        List<String> matchReasons = buildMatchReasons(cvVec, jobVec, job);
        String potentialReason = isPotential ? buildPotentialReason(cv, job) : null;

        log.debug("Score CV={} vs Job={}: raw={:.4f} normalized={} label={} potential={}",
                cv.getId(), job.getId(), rawScore, normalized, label, isPotential);

        return new ScoringResult(
                BigDecimal.valueOf(rawScore).setScale(6, RoundingMode.HALF_UP),
                normalized,
                label,
                isPotential,
                matchReasons,
                potentialReason
        );
    }

    // ── Label Assignment ──────────────────────────────────────────────────

    private Matching.MatchLabel assignLabel(double score) {
        if (score >= props.getScoreLabelHighMax()) return Matching.MatchLabel.HIGH;
        if (score >= props.getScoreLabelMediumMax()) return Matching.MatchLabel.HIGH;
        if (score >= props.getScoreLabelLowMax()) return Matching.MatchLabel.MEDIUM;
        return Matching.MatchLabel.LOW;
    }

    // ── Potential Heuristic ───────────────────────────────────────────────

    /**
     * Potential = score is not HIGH, but there are strong transfer signals:
     *  - Shared domain terms (language family, technology stack overlap)
     *  - Similar seniority level
     *  - High overlap on a subset of required skills (even if overall score is medium)
     */
    private boolean detectPotential(CV cv, Job job, Map<String, Double> cvVec,
                                    Map<String, Double> jobVec, double score) {
        // Only flag potential if score is in medium range (40–75)
        if (score < 35.0 || score >= 75.0) return false;

        // Count shared high-weight terms
        int sharedTerms = 0;
        for (var entry : jobVec.entrySet()) {
            if (entry.getValue() > 0.01 && cvVec.containsKey(entry.getKey())) {
                sharedTerms++;
            }
        }

        // If at least 3 key job terms are present in the CV → potential
        if (sharedTerms >= 3) return true;

        // Check seniority alignment
        String cvSeniority  = extractSeniority(cv.getRawText());
        String jobSeniority = job.getSeniorityLevel();
        if (cvSeniority != null && jobSeniority != null &&
                areSeniorityCompatible(cvSeniority, jobSeniority)) {
            return sharedTerms >= 2;
        }

        return false;
    }

    private String extractSeniority(String rawText) {
        if (rawText == null) return null;
        String lower = rawText.toLowerCase();
        if (lower.contains("senior") || lower.contains("sr.")) return "SENIOR";
        if (lower.contains("junior") || lower.contains("jr.") || lower.contains("fresher")) return "JUNIOR";
        if (lower.contains("lead") || lower.contains("principal")) return "LEAD";
        if (lower.contains("mid-level") || lower.contains("middle")) return "MID";
        return null;
    }

    private boolean areSeniorityCompatible(String cvLevel, String jobLevel) {
        if (cvLevel == null || jobLevel == null) return false;
        String cv  = cvLevel.toUpperCase();
        String job = jobLevel.toUpperCase();
        // Adjacent levels are compatible for potential
        if (cv.equals(job)) return true;
        if (cv.equals("JUNIOR") && job.equals("MID")) return true;
        if (cv.equals("MID") && (job.equals("SENIOR") || job.equals("JUNIOR"))) return true;
        if (cv.equals("SENIOR") && job.equals("MID")) return true;
        return false;
    }

    // ── Match Reasons ─────────────────────────────────────────────────────

    /**
     * Build human-readable reason chips for UI/email display.
     * Returns top 5 shared high-weight terms from the job vector.
     */
    private List<String> buildMatchReasons(Map<String, Double> cvVec,
                                           Map<String, Double> jobVec,
                                           Job job) {
        List<Map.Entry<String, Double>> jobTerms = new ArrayList<>(jobVec.entrySet());
        jobTerms.sort(Map.Entry.<String, Double>comparingByValue().reversed());

        List<String> reasons = new ArrayList<>();
        for (var entry : jobTerms) {
            if (cvVec.containsKey(entry.getKey())) {
                reasons.add(entry.getKey());
                if (reasons.size() >= 5) break;
            }
        }

        // Append domain if job has one
        if (job.getDomain() != null && !reasons.contains(job.getDomain())) {
            reasons.add(0, job.getDomain());
        }

        return reasons;
    }

    private String buildPotentialReason(CV cv, Job job) {
        return "Transferable skills detected. Career progression toward " +
               (job.getSeniorityLevel() != null ? job.getSeniorityLevel() : "target") +
               " role is feasible.";
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private Map<String, Double> parseVector(String json, String type, String id) {
        if (json == null || json.isBlank() || json.equals("{}")) {
            log.warn("{} id={} has no TF-IDF vector. Using empty vector.", type, id);
            return Collections.emptyMap();
        }
        try {
            return objectMapper.readValue(json, VEC_TYPE);
        } catch (Exception e) {
            log.error("Failed to parse {} vector for id={}: {}", type, id, e.getMessage());
            return Collections.emptyMap();
        }
    }

    // ── Result record ─────────────────────────────────────────────────────

    public record ScoringResult(
        BigDecimal rawScore,
        BigDecimal normalizedScore,
        Matching.MatchLabel label,
        boolean isPotential,
        List<String> matchReasons,
        String potentialReason
    ) {}
}
