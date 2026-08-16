import sys
import re

with open('Backend/careerfit-backend/src/main/java/com/careerfit/backend/cv/service/CvIngestionService.java', 'r', encoding='utf-8') as f:
    content = f.read()

retry_code = """
    @Transactional
    public void retryFailedCv(UUID cvId, UUID userId) {
        Candidate candidate = candidateRepo.findByUserId(userId)
                .orElseThrow(() -> AppException.notFound("Candidate", userId));
        CV cv = cvRepo.findById(cvId)
                .orElseThrow(() -> AppException.notFound("CV", cvId));
        if (!cv.getCandidate().getId().equals(candidate.getId())) {
            throw AppException.forbidden("Cannot retry another user's CV");
        }
        if (cv.getStatus() != CV.CvStatus.FAILED) {
            throw AppException.badRequest("Only FAILED CVs can be retried");
        }
        
        cv.setStatus(CV.CvStatus.UPLOADED);
        cv.setFailureReason(null);
        cvRepo.save(cv);

        if (cv.getSource() == CV.CvSource.UPLOAD) {
            afterCommitExecutor.execute(() -> processDocumentAsync(cv.getId()));
        } else {
            afterCommitExecutor.execute(() -> processManualAsync(cv.getId()));
        }
    }
"""

content = content.replace('    private void processDocumentAsync(UUID cvId) {', retry_code + '\n    private void processDocumentAsync(UUID cvId) {')

with open('Backend/careerfit-backend/src/main/java/com/careerfit/backend/cv/service/CvIngestionService.java', 'w', encoding='utf-8') as f:
    f.write(content)
