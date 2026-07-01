package com.careerfit.backend;

import com.careerfit.backend.common.util.TextNormalizationService;
import com.careerfit.backend.common.util.TfIdfService;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.feedback.entity.Feedback;
import com.careerfit.backend.feedback.service.FeedbackService;
import com.careerfit.backend.feedback.service.RocchioService;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.matching.repository.MatchingRepository;
import com.careerfit.backend.matching.service.MatchingBatchService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import org.awaitility.Awaitility;
import java.time.Duration;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;
import java.security.MessageDigest;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

class AlgorithmEvaluatorTest extends BaseIntegrationTest {

    @Autowired
    private CVRepository cvRepo;
    @Autowired
    private JobRepository jobRepo;
    @Autowired
    private MatchingRepository matchingRepo;
    @Autowired
    private MatchingBatchService matchingBatchService;
    @Autowired
    private FeedbackService feedbackService;
    @Autowired
    private RocchioService rocchioService;
    @Autowired
    private com.careerfit.backend.auth.repository.UserAccountRepository userRepo;
    @Autowired
    private com.careerfit.backend.candidate.repository.CandidateRepository candidateRepo;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private JdbcTemplate jdbcTemplate;
    @Autowired
    private TextNormalizationService textNormalizationService;
    @Autowired
    private TfIdfService tfIdfService;

    @BeforeEach
    void clearDb() {
        jdbcTemplate.execute("TRUNCATE TABLE application, feedback, matching, cv, job CASCADE");
    }

    private String getDatasetHash(String content) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(content.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        StringBuilder hexString = new StringBuilder(2 * hash.length);
        for (int i = 0; i < hash.length; i++) {
            String hex = Integer.toHexString(0xff & hash[i]);
            if(hex.length() == 1) {
                hexString.append('0');
            }
            hexString.append(hex);
        }
        return hexString.toString();
    }

    @Test
    void runAlgorithmEvaluation() throws Exception {
        com.careerfit.backend.auth.entity.UserAccount recruiter = userRepo.findAll().stream().filter(u -> u.getRole().name().equals("RECRUITER")).findFirst().orElse(null);
        com.careerfit.backend.candidate.entity.Candidate candidate = candidateRepo.findAll().get(0);

        Path datasetPath = Paths.get("../../evaluation/controlled-dataset.json");
        if (!Files.exists(datasetPath)) {
            fail("Dataset not found at " + datasetPath.toAbsolutePath() + ". Run generate_dataset.mjs first.");
        }
        
        String jsonContent = Files.readString(datasetPath);
        String datasetHash = getDatasetHash(jsonContent);
        
        Map<String, Object> dataset = objectMapper.readValue(jsonContent, new TypeReference<>() {});
        
        List<Map<String, Object>> jobsData = (List<Map<String, Object>>) dataset.get("jobs");
        List<Map<String, Object>> cvsData = (List<Map<String, Object>>) dataset.get("cvs");
        List<Map<String, Object>> groundTruthData = (List<Map<String, Object>>) dataset.get("groundTruth");

        if (jobsData == null || jobsData.isEmpty() || groundTruthData == null || groundTruthData.isEmpty()) {
            fail("Dataset is empty or malformed.");
        }

        Map<String, UUID> jobIdMap = new HashMap<>();
        Map<String, UUID> cvIdMap = new HashMap<>();

        for (Map<String, Object> jd : jobsData) {
            Job job = (Job) org.springframework.objenesis.ObjenesisHelper.newInstance(Job.class);
            ReflectionTestUtils.setField(job, "title", jd.get("title"));
            ReflectionTestUtils.setField(job, "company", "Tech Corp");
            ReflectionTestUtils.setField(job, "originalText", jd.get("originalText"));
            ReflectionTestUtils.setField(job, "domain", jd.get("domain"));
            ReflectionTestUtils.setField(job, "seniorityLevel", jd.get("seniorityLevel"));
            ReflectionTestUtils.setField(job, "language", jd.get("language"));
            ReflectionTestUtils.setField(job, "status", Job.JobStatus.ACTIVE);
            ReflectionTestUtils.setField(job, "recruiter", recruiter);
            ReflectionTestUtils.setField(job, "salaryMode", Job.SalaryMode.NEGOTIABLE);
            
            String language = (String) jd.getOrDefault("language", "en");
            String originalText = (String) jd.get("originalText");
            List<String> tokens = textNormalizationService.normalize(originalText, language);
            Map<String, Double> vec = tfIdfService.buildVector(tokens);
            
            if (jd.get("domain") != null) vec.put(((String) jd.get("domain")).toLowerCase(), 0.5);
            ReflectionTestUtils.setField(job, "tfidfVectorJson", objectMapper.writeValueAsString(vec));
            
            job = jobRepo.save(job);
            jobIdMap.put((String) jd.get("id"), job.getId());
        }

        for (Map<String, Object> cvData : cvsData) {
            CV cv = (CV) org.springframework.objenesis.ObjenesisHelper.newInstance(CV.class);
            String rawText = (String) cvData.get("rawText");
            ReflectionTestUtils.setField(cv, "rawText", rawText);
            ReflectionTestUtils.setField(cv, "displayName", "CV_" + cvData.get("id"));
            ReflectionTestUtils.setField(cv, "source", CV.CvSource.MANUAL);
            ReflectionTestUtils.setField(cv, "isDefault", false);
            ReflectionTestUtils.setField(cv, "candidate", candidate);
            ReflectionTestUtils.setField(cv, "status", CV.CvStatus.SCORING_DONE);
            ReflectionTestUtils.setField(cv, "language", cvData.get("language"));
            
            String language = (String) cvData.getOrDefault("language", "en");
            List<String> tokens = textNormalizationService.normalize(rawText, language);
            Map<String, Double> vec = tfIdfService.buildVector(tokens);
            
            ReflectionTestUtils.setField(cv, "extractedTermsJson", objectMapper.writeValueAsString(vec));
            
            cv = cvRepo.save(cv);
            cvIdMap.put((String) cvData.get("id"), cv.getId());
        }

        matchingBatchService.rebuild(0, 10000);

        List<Map<String, Object>> trainData = groundTruthData.stream()
                .filter(gt -> "train".equals(gt.get("purpose"))).toList();
        List<Map<String, Object>> holdoutData = groundTruthData.stream()
                .filter(gt -> "holdout".equals(gt.get("purpose"))).toList();

        Map<String, Map<String, Integer>> holdoutGroundTruth = buildGroundTruth(holdoutData, cvIdMap, jobIdMap);

        EvaluationResult baselineResult = evaluateMetrics(jobIdMap, holdoutGroundTruth, cvsData.size());

        int expectedFeedbacks = trainData.size();

        for (Map<String, Object> gt : trainData) {
            int relevance = (int) gt.get("relevance");
            UUID jId = jobIdMap.get((String) gt.get("jobId"));
            UUID cId = cvIdMap.get((String) gt.get("cvId"));
            if (jId == null || cId == null) continue;
            
            if (relevance >= 2) {
                addFeedback(jId, cId, Feedback.FeedbackType.GOOD_MATCH, recruiter.getId());
            } else if (relevance == 0) {
                addFeedback(jId, cId, Feedback.FeedbackType.BAD_MATCH, recruiter.getId());
            }
        }

        // With TestAsyncConfig, Rocchio updates run synchronously!
        // No wait loop needed.

        matchingBatchService.rebuild(0, 10000);

        EvaluationResult rocchioResult = evaluateMetrics(jobIdMap, holdoutGroundTruth, cvsData.size());

        Files.createDirectories(Paths.get("../../evaluation"));
        
        Map<String, Object> report = new LinkedHashMap<>();
        report.put("schemaVersion", "1.2");
        report.put("timestamp", new Date().toString());
        report.put("dataset", Map.of(
            "jobs", jobsData.size(),
            "cvs", cvsData.size(),
            "trainPairs", trainData.size(),
            "holdoutPairs", holdoutData.size(),
            "hash", datasetHash
        ));
        report.put("rocchioParams", Map.of(
            "alpha", 1.0,
            "beta", 0.75,
            "gamma", 0.15
        ));
        report.put("scoringThreshold", "Similarity > 0.0 before feedback");
        report.put("limitations", Arrays.asList(
            "Only evaluate tf-idf representation, not advanced semantic vectors yet.",
            "Simulated data lacks organic recruiter feedback randomness.",
            "This is a synthetic causal benchmark. It demonstrates mathematical correctness of the Rocchio algorithm, but does not claim real-world production superiority without UAT."
        ));
        report.put("baseline", baselineResult);
        report.put("rocchio", rocchioResult);
        
        // Calculate Delta
        Map<String, Double> delta = new LinkedHashMap<>();
        delta.put("avgPAt5", rocchioResult.avgPAt5 - baselineResult.avgPAt5);
        delta.put("avgNdcgAt3", rocchioResult.avgNdcgAt3 - baselineResult.avgNdcgAt3);
        delta.put("avgNdcgAt5", rocchioResult.avgNdcgAt5 - baselineResult.avgNdcgAt5);
        delta.put("avgNdcgAt10", rocchioResult.avgNdcgAt10 - baselineResult.avgNdcgAt10);
        delta.put("avgRecallAt5", rocchioResult.avgRecallAt5 - baselineResult.avgRecallAt5);
        delta.put("avgMrr", rocchioResult.avgMrr - baselineResult.avgMrr);
        delta.put("avgHitRate5", rocchioResult.avgHitRate5 - baselineResult.avgHitRate5);
        report.put("delta", delta);

        Files.writeString(Paths.get("../../evaluation/result.json"), objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(report));

        // In a synthetic benchmark with latent skills, Rocchio MUST improve or maintain metrics.
        // We assert that the HitRate@5 (or NDCG) improves due to learning the latent skill.
        assertTrue(rocchioResult.avgNdcgAt5 >= baselineResult.avgNdcgAt5, "Rocchio degraded NDCG@5 in causal test");
        assertTrue(rocchioResult.avgHitRate5 >= baselineResult.avgHitRate5, "Rocchio degraded HitRate@5 in causal test");
        // For our specific synthetic dataset, delta should be > 0
        assertTrue(rocchioResult.avgNdcgAt5 > baselineResult.avgNdcgAt5 || rocchioResult.avgHitRate5 > baselineResult.avgHitRate5, 
            "Rocchio failed to improve ranking in controlled causal scenario (Delta was 0)");
    }

    private void addFeedback(UUID jobId, UUID cvId, Feedback.FeedbackType type, UUID userId) {
        Matching m = matchingRepo.findByCvIdAndJobId(cvId, jobId).orElse(null);
        if (m == null) return;
        feedbackService.submitFeedback(m.getId(), userId, Feedback.ActorRole.RECRUITER, type, Feedback.SourceChannel.WEB);
    }

    private Map<String, Map<String, Integer>> buildGroundTruth(List<Map<String, Object>> groundTruthData, Map<String, UUID> cvIdMap, Map<String, UUID> jobIdMap) {
        Map<String, Map<String, Integer>> map = new HashMap<>();
        for (Map<String, Object> gt : groundTruthData) {
            String jobIdStr = jobIdMap.get((String) gt.get("jobId")).toString();
            String cvIdStr = cvIdMap.get((String) gt.get("cvId")).toString();
            int rel = (int) gt.get("relevance");
            map.computeIfAbsent(jobIdStr, k -> new HashMap<>()).put(cvIdStr, rel);
        }
        return map;
    }

    private EvaluationResult evaluateMetrics(Map<String, UUID> jobIdMap, Map<String, Map<String, Integer>> groundTruth, int totalCVs) {
        double sumP5 = 0, sumR5 = 0, sumNdcg3 = 0, sumNdcg5 = 0, sumNdcg10 = 0, sumMrr = 0, sumHitRate5 = 0;
        int count = 0;
        int recallCount = 0;
        int totalRankedItems = 0;

        for (Map.Entry<String, UUID> entry : jobIdMap.entrySet()) {
            String jobIdStr = entry.getValue().toString();
            Map<String, Integer> jobGt = groundTruth.get(jobIdStr);
            if (jobGt == null || jobGt.isEmpty()) continue;

            List<Matching> matches = matchingRepo.findRankingListByJobId(entry.getValue());
            // Do not filter out non-labeled candidates to avoid inflating metrics
            List<String> rankedIds = matches.stream().map(m -> m.getCv().getId().toString()).toList();
            
            totalRankedItems += rankedIds.size();

            sumP5 += computePrecisionAtK(rankedIds, jobGt, 5);
            sumNdcg3 += computeNdcgAtK(rankedIds, jobGt, 3);
            sumNdcg5 += computeNdcgAtK(rankedIds, jobGt, 5);
            sumNdcg10 += computeNdcgAtK(rankedIds, jobGt, 10);
            sumMrr += computeMrr(rankedIds, jobGt);
            sumHitRate5 += computeHitRateAtK(rankedIds, jobGt, 5);
            
            double r5 = computeRecallAtK(rankedIds, jobGt, 5);
            if (r5 >= 0) { // If < 0, it means there are no relevant items to recall, skip it
                sumR5 += r5;
                recallCount++;
            }
            count++;
        }

        if (count == 0) return new EvaluationResult(0,0,0,0,0,0,0,0);
        double avgCoverage = (totalCVs == 0 || count == 0) ? 0 : (double) totalRankedItems / (count * totalCVs);
        double avgRecall = recallCount == 0 ? 0 : sumR5 / recallCount;
        
        return new EvaluationResult(
            sumP5 / count, 
            avgRecall,
            sumNdcg3 / count, 
            sumNdcg5 / count, 
            sumNdcg10 / count,
            sumMrr / count, 
            sumHitRate5 / count,
            avgCoverage
        );
    }

    private double computePrecisionAtK(List<String> rankedIds, Map<String, Integer> gt, int k) {
        int hits = 0;
        int limit = Math.min(k, rankedIds.size());
        if (limit == 0) return 0;
        for (int i = 0; i < limit; i++) {
            if (gt.getOrDefault(rankedIds.get(i), 0) >= 2) {
                hits++;
            }
        }
        return (double) hits / limit;
    }

    private double computeRecallAtK(List<String> rankedIds, Map<String, Integer> gt, int k) {
        int limit = Math.min(k, rankedIds.size());
        if (limit == 0) return 0;
        long relevantCount = gt.values().stream().filter(v -> v >= 2).count();
        if (relevantCount == 0) return -1.0; // special flag to ignore in average
        
        int hits = 0;
        for (int i = 0; i < limit; i++) {
            if (gt.getOrDefault(rankedIds.get(i), 0) >= 2) {
                hits++;
            }
        }
        return (double) hits / relevantCount;
    }

    private double computeHitRateAtK(List<String> rankedIds, Map<String, Integer> gt, int k) {
        int limit = Math.min(k, rankedIds.size());
        for (int i = 0; i < limit; i++) {
            if (gt.getOrDefault(rankedIds.get(i), 0) >= 2) {
                return 1.0;
            }
        }
        return 0.0;
    }

    private double computeNdcgAtK(List<String> rankedIds, Map<String, Integer> gt, int k) {
        double dcg = 0;
        int limit = Math.min(k, rankedIds.size());
        for (int i = 0; i < limit; i++) {
            int rel = gt.getOrDefault(rankedIds.get(i), 0);
            dcg += (Math.pow(2, rel) - 1) / (Math.log(i + 2) / Math.log(2));
        }

        List<Integer> idealRels = new ArrayList<>(gt.values());
        idealRels.sort(Collections.reverseOrder());
        double idcg = 0;
        int idealLimit = Math.min(k, idealRels.size());
        for (int i = 0; i < idealLimit; i++) {
            idcg += (Math.pow(2, idealRels.get(i)) - 1) / (Math.log(i + 2) / Math.log(2));
        }

        return idcg == 0 ? 0 : dcg / idcg;
    }

    private double computeMrr(List<String> rankedIds, Map<String, Integer> gt) {
        for (int i = 0; i < rankedIds.size(); i++) {
            if (gt.getOrDefault(rankedIds.get(i), 0) >= 2) {
                return 1.0 / (i + 1);
            }
        }
        return 0.0;
    }

    public static class EvaluationResult {
        public double avgPAt5;
        public double avgRecallAt5;
        public double avgNdcgAt3;
        public double avgNdcgAt5;
        public double avgNdcgAt10;
        public double avgMrr;
        public double avgHitRate5;
        public double coverage;
        
        public EvaluationResult(double p5, double r5, double ndcg3, double ndcg5, double ndcg10, double mrr, double hr5, double cov) {
            this.avgPAt5 = p5;
            this.avgRecallAt5 = r5;
            this.avgNdcgAt3 = ndcg3;
            this.avgNdcgAt5 = ndcg5;
            this.avgNdcgAt10 = ndcg10;
            this.avgMrr = mrr;
            this.avgHitRate5 = hr5;
            this.coverage = cov;
        }
    }
}
