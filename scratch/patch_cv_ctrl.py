import sys

with open('Backend/careerfit-backend/src/main/java/com/careerfit/backend/cv/controller/CVController.java', 'r', encoding='utf-8') as f:
    content = f.read()

retry_code = """
    @PostMapping("/{cvId}/retry")
    @Operation(summary = "Retry processing a FAILED CV")
    public ResponseEntity<ApiResponse<Void>> retry(
            @PathVariable UUID cvId,
            @RequestAttribute("userId") UUID userId) {
        ingestion.retryFailedCv(cvId, userId);
        return ResponseEntity.ok(ApiResponse.ok());
    }
"""

content = content.replace('    // ─── Set Default', retry_code + '\n    // ─── Set Default')

with open('Backend/careerfit-backend/src/main/java/com/careerfit/backend/cv/controller/CVController.java', 'w', encoding='utf-8') as f:
    f.write(content)
