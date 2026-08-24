package com.careerfit.backend.matching.service;

import com.careerfit.backend.common.util.TextNormalizationService;
import com.careerfit.backend.common.util.TfIdfService;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class MatchingBatchService {

    private static final Logger log = LoggerFactory.getLogger(MatchingBatchService.class);
    private final JobRepository jobRepo;
    private final CVRepository cvRepo;
    private final MatchingService matchingService;
    private final TextNormalizationService normalizer;
    private final TfIdfService tfidf;
    private final ObjectMapper objectMapper;

    public MatchingBatchService(JobRepository jobRepo, CVRepository cvRepo, MatchingService matchingService,
                                TextNormalizationService normalizer, TfIdfService tfidf, ObjectMapper objectMapper) {
        this.jobRepo = jobRepo; this.cvRepo = cvRepo; this.matchingService = matchingService;
        this.normalizer = normalizer; this.tfidf = tfidf; this.objectMapper = objectMapper;
    }

    public BatchResult rebuild(int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(200, Math.max(1, size));
        Sort stableOrder = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id"));
        var jobs = jobRepo.findByStatus(Job.JobStatus.ACTIVE,
                PageRequest.of(safePage, safeSize, stableOrder));
        List<CV> cvs = cvRepo.findByStatus(CV.CvStatus.SCORING_DONE);
        int vectorized = 0;
        int scored = 0;
        int failed = 0;
        for (Job job : jobs.getContent()) {
            try {
                if (job.getTfidfVectorJson() == null || job.getTfidfVectorJson().isBlank()
                        || "{}".equals(job.getTfidfVectorJson())) {
                    String language = job.getLanguage() == null ? normalizer.detectLanguage(job.getOriginalText()) : job.getLanguage();
                    Map<String, Double> vector = tfidf.buildVector(normalizer.normalize(job.getOriginalText(), language));
                    job.setLanguage(language);
                    job.setTfidfVectorJson(objectMapper.writeValueAsString(vector));
                    jobRepo.save(job);
                    vectorized++;
                }
                for (CV cv : cvs) {
                    matchingService.recomputeMatching(cv, job);
                    scored++;
                }
            } catch (Exception e) {
                log.error("Failed to rebuild matching for Job={}: {}",
                        job.getId(), e.getMessage(), e);
                failed++;
            }
        }
        return new BatchResult(safePage, safeSize, jobs.getTotalPages(), jobs.getNumberOfElements(),
                cvs.size(), vectorized, scored, failed, jobs.isLast());
    }

    public record BatchResult(int page, int size, int totalPages, int jobsProcessed, int cvsConsidered,
                              int jobsVectorized, int matchingsScored, int failures, boolean lastPage) {}
}
