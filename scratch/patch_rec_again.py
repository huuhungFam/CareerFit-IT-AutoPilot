import sys
import re

with open('Backend/careerfit-backend/src/main/java/com/careerfit/backend/recommendation/service/RecommendationService.java', 'r', encoding='utf-8') as f:
    content = f.read()

new_method = """public record CatalogResponse(
        List<JobRecommendation> jobs,
        String cvStatus,
        String message
    ) {}

    /**
     * Get personalized job recommendations for a candidate.
     * Returns up to {@code limit} ScoredJobRecommendations ordered by final score.
     */
    @Transactional(readOnly = true)
    public CatalogResponse getRecommendations(UUID userId, int limit) {
        Candidate candidate = candidateRepo.findByUserId(userId)
                .orElseThrow(() -> AppException.notFound("Candidate", userId));

        int effectiveLimit = Math.min(limit, 50);

        Optional<CV> defaultCv = cvRepo.findByCandidateIdAndIsDefaultTrue(candidate.getId());

        if (defaultCv.isEmpty()) {
            log.info("No default CV for candidate={}, falling back to profile-based recs", candidate.getId());
            return new CatalogResponse(getProfileBasedRecommendations(candidate, effectiveLimit), "NO_CV", "Vui lòng tải lên CV để nhận gợi ý việc làm chính xác.");
        }

        CV cv = defaultCv.get();
        if (cv.getStatus() != CV.CvStatus.SCORING_DONE && cv.getStatus() != CV.CvStatus.ACTIVE) {
            String msg = cv.getStatus() == CV.CvStatus.FAILED 
                ? "Xử lý CV thất bại: " + (cv.getFailureReason() != null ? cv.getFailureReason() : "Lỗi không xác định") 
                : "Hệ thống đang phân tích CV của bạn để tìm việc làm phù hợp. Vui lòng đợi.";
            return new CatalogResponse(getProfileBasedRecommendations(candidate, effectiveLimit), cv.getStatus().name(), msg);
        }

        List<String> desiredSkills = parseList(candidate.getDesiredSkillsJson());

        // Step 1: Get top matches from matching table
        List<Matching> topMatchings = matchingRepo.findTopMatchesByCvId(
                cv.getId(), PageRequest.of(0, effectiveLimit * 2));
        if (topMatchings.isEmpty() || topMatchings.get(0).getNormalizedScore().doubleValue() < appProperties.getScoreLabelLowMax()) {
            log.info("No usable matches for candidate={}, falling back to profile-based recs", candidate.getId());
            return new CatalogResponse(getProfileBasedRecommendations(candidate, effectiveLimit), "SCORING_DONE", "Đang tính toán mức độ phù hợp...");
        }

        // Step 2: Score with content-based boost
        List<JobRecommendation> jobs = topMatchings.stream()
                .filter(m -> m.getJob().getStatus() == Job.JobStatus.ACTIVE)
                .map(m -> {
                    double baseScore = m.getNormalizedScore().doubleValue();
                    double skillBoost = computeSkillBoost(m.getJob(), desiredSkills);
                    double locationBoost = computeLocationBoost(m.getJob(), candidate.getLocation());
                    double finalScore = Math.min(100.0, baseScore * 0.7 + skillBoost * 0.2 + locationBoost * 0.1);

                    return new JobRecommendation(
                            m.getJob().getId(),
                            m.getJob().getTitle(),
                            m.getJob().getCompany(),
                            m.getJob().getLocation(),
                            m.getJob().getSeniorityLevel(),
                            m.getJob().getEmploymentType(),
                            m.getJob().getSalaryDisplayText(),
                            m.getJob().getLanguage(),
                            baseScore,
                            finalScore,
                            m.getLabel().name(),
                            m.isPotential(),
                            extractSkills(m.getJob().getRequiredSkillsJson()),
                            computeMatchingSkills(m.getJob(), desiredSkills),
                            m.getJob().getCreatedAt()
                    );
                })
                .sorted(Comparator.comparingDouble(JobRecommendation::finalScore).reversed())
                .limit(effectiveLimit)
                .toList();

        return new CatalogResponse(jobs, "SCORING_DONE", "Hoàn tất");
    }"""

old_method_regex = r'/\*\*[\s\S]*?public List<JobRecommendation> getRecommendations[\s\S]*?toList\(\);\n    }'
content = re.sub(old_method_regex, new_method, content)

with open('Backend/careerfit-backend/src/main/java/com/careerfit/backend/recommendation/service/RecommendationService.java', 'w', encoding='utf-8') as f:
    f.write(content)
