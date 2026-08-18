import sys

with open('Backend/careerfit-backend/src/test/java/com/careerfit/backend/Phase2SettingsCatalogCvIntegrationTest.java', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('storageService.resolve(any())).thenReturn(Path.of("path/to/cv.pdf"));', 'storageService.resolve(any())).thenReturn(new java.io.File("path/to/cv.pdf"));')

content = content.replace('PdfExtractionService.ExtractedContent', 'PdfExtractionService.ExtractionResult')

content = content.replace('ExtractionResult("Valid Java Spring Boot Developer", 1)', 'ExtractionResult("Valid Java Spring Boot Developer", 1, false)')
content = content.replace('ExtractionResult("Recovered text", 1)', 'ExtractionResult("Recovered text", 1, false)')

# store takes 2 arguments not 3: store(MultipartFile, UUID)
content = content.replace('storageService.store(any(), any(), any())', 'storageService.store(any(), any())')

with open('Backend/careerfit-backend/src/test/java/com/careerfit/backend/Phase2SettingsCatalogCvIntegrationTest.java', 'w', encoding='utf-8') as f:
    f.write(content)
