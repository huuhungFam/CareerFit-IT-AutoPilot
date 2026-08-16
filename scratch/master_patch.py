import sys
import re

# 1. RecommendationService.java: Remove `&& cv.getStatus() != CV.CvStatus.ACTIVE`
path = 'Backend/careerfit-backend/src/main/java/com/careerfit/backend/recommendation/service/RecommendationService.java'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('&& cv.getStatus() != CV.CvStatus.ACTIVE', '')
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)


# 2. CvIngestionService.java: Inject retryFailedCv before first async worker
path = 'Backend/careerfit-backend/src/main/java/com/careerfit/backend/cv/service/CvIngestionService.java'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

retry_code = """
    // ─── Retry ────────────────────────────────────────────────────────────

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
            afterCommitExecutor.execute(() -> processDocumentAsync(cv));
        } else {
            afterCommitExecutor.execute(() -> processManualAsync(cv));
        }
    }
"""
# Replace before the 'processDocumentAsync' method or similar
content = re.sub(r'(    // ── Async Workers)', retry_code + r'\n\1', content)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

# 3. ActionMessage in App.tsx
path = 'Frontend/src/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
content = re.sub(r'tone:\s*\'success\'\s*\|\s*\'error\'', "tone: 'success' | 'error' | 'info' | 'warning'", content)
content = re.sub(r'function SettingToggle\(\{[\s\S]*?\}\) \{', r'function SettingToggle({\n  title,\n  detail,\n  checked,\n  onChange,\n  disabled\n}: {\n  title: string;\n  detail: string;\n  checked?: boolean;\n  onChange?: (checked: boolean) => void;\n  disabled?: boolean;\n}) {', content)
content = content.replace('<button\n      type="button"', '<button\n      type="button"\n      disabled={disabled}')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)


# 4. api.ts
path = 'Frontend/src/lib/api.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

methods = """
  async getJobFieldSuggestions(field: JobSuggestionField, keyword: string) {
    const payload = await request<any>(`/jobs/search/suggestions?keyword=${encodeURIComponent(keyword)}`);
    if (field === 'title') return payload.titles || [];
    if (field === 'company') return payload.companies || [];
    return [];
  },
  async getSkillSuggestions(keyword: string) {
    const payload = await request<any>(`/jobs/search/suggestions?keyword=${encodeURIComponent(keyword)}`);
    return payload.skills || [];
  },
"""
if 'getJobFieldSuggestions' not in content:
    content = re.sub(r'  async getSuggestions\(keyword: string\) \{', methods + r'\n  async getSuggestions(keyword: string) {', content)

if 'JobSuggestionField' not in content:
    content = 'export type JobSuggestionField = \'title\' | \'company\' | \'location\';\n' + content

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done patching.")
