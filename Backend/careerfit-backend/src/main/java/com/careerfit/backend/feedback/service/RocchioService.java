package com.careerfit.backend.feedback.service;

import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.feedback.entity.Feedback;
import com.careerfit.backend.feedback.repository.FeedbackRepository;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.matching.repository.MatchingRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Rocchio Algorithm for Job Profile Learning.
 *
 * Adapted from IR Rocchio feedback for recommendation:
 *
 *   new_q = α·q + β·(1/|R⁺|)·Σ(d ∈ R⁺) - γ·(1/|R⁻|)·Σ(d ∈ R⁻)
 *
 * Where:
 *   q   = current job learned_profile_vector (starts as tfidf_vector)
 *   R⁺  = set of CV vectors from GOOD_MATCH / POTENTIAL feedback
 *   R⁻  = set of CV vectors from BAD_MATCH feedback
 *   α = 1.0  (retain current profile)
 *   β = 0.75 (positive learning rate)
 *   γ = 0.15 (negative learning rate — gentle push away)
 *
 * The result is stored in Job.learnedProfileVectorJson.
 * After update, all matchings for this job are flagged needsRecompute.
 */
@Service
public class RocchioService {

    private static final Logger log = LoggerFactory.getLogger(RocchioService.class);

    private static final double ALPHA = 1.0;
    private static final double BETA  = 0.75;
    private static final double GAMMA = 0.15;

    private static final TypeReference<Map<String, Double>> VEC_TYPE = new TypeReference<>() {};

    private final JobRepository jobRepo;
    private final FeedbackRepository feedbackRepo;
    private final CVRepository cvRepo;
    private final MatchingRepository matchingRepo;
    private final ObjectMapper objectMapper;

    public RocchioService(JobRepository jobRepo,
                          FeedbackRepository feedbackRepo,
                          CVRepository cvRepo,
                          MatchingRepository matchingRepo,
                          ObjectMapper objectMapper) {
        this.jobRepo = jobRepo;
        this.feedbackRepo = feedbackRepo;
        this.cvRepo = cvRepo;
        this.matchingRepo = matchingRepo;
        this.objectMapper = objectMapper;
    }

    /**
     * Trigger Rocchio update asynchronously after a feedback event.
     * @param jobId the job whose learned vector needs updating
     */
    @Async
    @Transactional
    public void updateJobVector(UUID jobId) {
        Job job = jobRepo.findByIdForUpdate(jobId).orElse(null);
        if (job == null) {
            log.error("Rocchio update: Job not found: {}", jobId);
            return;
        }

        log.info("Running Rocchio update for job id={}", jobId);

        // Step 1: Load BASE query vector for idempotent Rocchio calculation
        Map<String, Double> q = parseVector(job.getTfidfVectorJson());

        if (q.isEmpty()) {
            log.warn("Rocchio skipped — job id={} has no base vector", jobId);
            return;
        }

        // Step 2: Get positive CVs (GOOD_MATCH / POTENTIAL feedbacks)
        List<Feedback> positiveFeedbacks = feedbackRepo.findPositiveByJobId(jobId);
        List<Map<String, Double>> positiveVecs = extractCvVectors(positiveFeedbacks);

        // Step 3: Get negative CVs (BAD_MATCH feedbacks)
        List<Feedback> negativeFeedbacks = feedbackRepo.findNegativeByJobId(jobId);
        List<Map<String, Double>> negativeVecs = extractCvVectors(negativeFeedbacks);

        if (positiveVecs.isEmpty() && negativeVecs.isEmpty()) {
            log.info("Rocchio skipped — no feedback vectors for job id={}", jobId);
            return;
        }

        // Step 4: Compute centroid vectors
        Map<String, Double> positiveCentroid = centroid(positiveVecs);
        Map<String, Double> negativeCentroid = centroid(negativeVecs);

        // Step 5: Apply Rocchio formula
        Map<String, Double> newVector = rocchio(q, positiveCentroid, negativeCentroid);

        // Step 6: Persist updated vector
        try {
            job.setLearnedProfileVectorJson(objectMapper.writeValueAsString(newVector));
            jobRepo.save(job);
            log.info("Rocchio update done for job id={}. Vector size: {}", jobId, newVector.size());
        } catch (Exception e) {
            log.error("Failed to serialize Rocchio vector for job id={}: {}", jobId, e.getMessage());
            return;
        }

        // Step 7: Flag all matchings for this job as needsRecompute
        List<Matching> matchings = matchingRepo.findByJobId(jobId);
        matchings.forEach(m -> m.setNeedsRecompute(true));
        matchingRepo.saveAll(matchings);
        log.info("Flagged {} matchings for recompute after Rocchio update (job={})",
                matchings.size(), jobId);
    }

    // ── Algorithm ─────────────────────────────────────────────────────────

    /**
     * Rocchio formula: new_q = α·q + β·pos_centroid - γ·neg_centroid
     */
    private Map<String, Double> rocchio(Map<String, Double> q,
                                         Map<String, Double> pos,
                                         Map<String, Double> neg) {
        // Collect all terms across all vectors
        Set<String> allTerms = new HashSet<>();
        allTerms.addAll(q.keySet());
        allTerms.addAll(pos.keySet());
        allTerms.addAll(neg.keySet());

        Map<String, Double> newQ = new HashMap<>();
        for (String term : allTerms) {
            double qVal   = q.getOrDefault(term, 0.0);
            double posVal = pos.getOrDefault(term, 0.0);
            double negVal = neg.getOrDefault(term, 0.0);

            double newVal = ALPHA * qVal + BETA * posVal - GAMMA * negVal;

            // Clamp: never let weights go negative
            if (newVal > 0.0) {
                newQ.put(term, newVal);
            }
        }
        return newQ;
    }

    /**
     * Compute centroid: average of all vectors term-by-term.
     * Returns empty map if no vectors.
     */
    private Map<String, Double> centroid(List<Map<String, Double>> vectors) {
        if (vectors.isEmpty()) return Collections.emptyMap();

        Map<String, Double> sum = new HashMap<>();
        for (Map<String, Double> vec : vectors) {
            vec.forEach((term, weight) -> sum.merge(term, weight, Double::sum));
        }
        double n = vectors.size();
        sum.replaceAll((term, total) -> total / n);
        return sum;
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private List<Map<String, Double>> extractCvVectors(List<Feedback> feedbacks) {
        List<Map<String, Double>> vecs = new ArrayList<>();
        for (Feedback fb : feedbacks) {
            CV cv = fb.getMatching().getCv();
            Map<String, Double> vec = parseVector(cv.getExtractedTermsJson());
            if (!vec.isEmpty()) {
                vecs.add(vec);
            }
        }
        return vecs;
    }

    private Map<String, Double> parseVector(String json) {
        if (json == null || json.isBlank()) return Collections.emptyMap();
        try {
            return objectMapper.readValue(json, VEC_TYPE);
        } catch (Exception e) {
            log.warn("Failed to parse vector: {}", e.getMessage());
            return Collections.emptyMap();
        }
    }
}
