package com.careerfit.backend.cv.service;

import com.careerfit.backend.config.AppProperties;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Extracts text from PDF files.
 * First tries embedded text via PDFBox, then falls back to OCR for scanned PDFs.
 *
 * Hard validation rules:
 *  - Must be application/pdf or .pdf extension
 *  - Must have enough extractable text after embedded-text extraction or OCR
 *  - File size must be within configured limit
 *
 * OCR uses a configurable Tesseract CLI command. If OCR is disabled or Tesseract
 * is unavailable, scanned PDFs fail with a clear processing error.
 */
@Service
public class PdfExtractionService {

    private static final Logger log = LoggerFactory.getLogger(PdfExtractionService.class);

    private static final int MIN_TEXT_LENGTH = 50;  // chars — below this = suspicious
    private static final int WARN_TEXT_LENGTH = 200; // chars — below this = warn but accept
    private static final long MAX_IMAGE_PIXELS = 25_000_000L;
    private static final List<String> SUPPORTED_EXTENSIONS = List.of("pdf", "png", "jpg", "jpeg", "docx");

    private final AppProperties appProperties;

    public PdfExtractionService(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    /**
     * Extract text from a MultipartFile PDF.
     * @throws PdfExtractionException if file is invalid or unreadable
     */
    public ExtractionResult extractText(MultipartFile file) {
        validateSupportedUpload(file);
        try {
            String extension = extension(file.getOriginalFilename());
            if ("pdf".equals(extension)) return extractFromBytes(file.getBytes(), file.getOriginalFilename());
            if ("docx".equals(extension)) return extractDocx(file.getInputStream(), file.getOriginalFilename());
            return extractImage(ImageIO.read(file.getInputStream()), file.getOriginalFilename());
        } catch (IOException e) {
            throw new PdfExtractionException("Failed to read uploaded file: " + e.getMessage(), e);
        }
    }

    /**
     * Extract text from a file on disk (used by background worker after storage).
     */
    public ExtractionResult extractFromFile(File file) {
        String extension = extension(file.getName());
        try {
            if ("docx".equals(extension)) {
                try (var input = Files.newInputStream(file.toPath())) { return extractDocx(input, file.getName()); }
            }
            if (List.of("png", "jpg", "jpeg").contains(extension)) {
                return extractImage(ImageIO.read(file), file.getName());
            }
            try (PDDocument doc = Loader.loadPDF(file)) { return doExtract(doc, file.getName()); }
        } catch (IOException e) {
            throw new PdfExtractionException("Failed to parse CV document: " + e.getMessage(), e);
        }
    }

    private ExtractionResult extractDocx(java.io.InputStream input, String filename) throws IOException {
        try (XWPFDocument document = new XWPFDocument(input);
             XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
            String text = extractor.getText().trim();
            return validateExtractedText(text, filename, Math.max(1, document.getProperties().getExtendedProperties().getUnderlyingProperties().getPages()));
        } catch (RuntimeException e) {
            throw new PdfExtractionException("DOCX is invalid or unreadable: " + e.getMessage(), e);
        }
    }

    private ExtractionResult extractImage(BufferedImage image, String filename) {
        if (image == null) throw new PdfExtractionException("Image is invalid or unreadable");
        if ((long) image.getWidth() * image.getHeight() > MAX_IMAGE_PIXELS) {
            throw new PdfExtractionException("Image dimensions are too large");
        }
        if (!appProperties.isOcrEnabled()) {
            throw new PdfExtractionException("Image CV requires OCR; enable app.ocr.enabled");
        }
        Path tempDir = null;
        try {
            tempDir = Files.createTempDirectory("careerfit-image-ocr-");
            Path imagePath = tempDir.resolve("cv.png");
            ImageIO.write(image, "png", imagePath.toFile());
            return validateExtractedText(runTesseract(imagePath, 1), filename, 1);
        } catch (IOException e) {
            throw new PdfExtractionException("Image OCR failed: " + e.getMessage(), e);
        } finally {
            deleteTempDir(tempDir);
        }
    }

    private ExtractionResult validateExtractedText(String text, String filename, int pages) {
        String normalized = text == null ? "" : text.trim();
        if (normalized.length() < MIN_TEXT_LENGTH) {
            throw new PdfExtractionException("Document extracted too little text (" + normalized.length() + " chars)");
        }
        boolean sparse = normalized.length() < WARN_TEXT_LENGTH;
        if (sparse) log.warn("CV document '{}' has sparse text ({} chars)", filename, normalized.length());
        return new ExtractionResult(normalized, pages, sparse);
    }

    /**
     * Extract text from raw bytes (e.g. from in-memory upload).
     */
    public ExtractionResult extractFromBytes(byte[] bytes, String filename) {
        try (PDDocument doc = Loader.loadPDF(bytes)) {
            return doExtract(doc, filename);
        } catch (IOException e) {
            throw new PdfExtractionException("Failed to parse PDF bytes: " + e.getMessage(), e);
        }
    }

    private ExtractionResult doExtract(PDDocument doc, String filename) throws IOException {
        if (doc.isEncrypted()) {
            throw new PdfExtractionException("PDF is encrypted and cannot be read");
        }

        int pageCount = doc.getNumberOfPages();
        PDFTextStripper stripper = new PDFTextStripper();
        String rawText = stripper.getText(doc).trim();

        boolean hasText = rawText.length() >= MIN_TEXT_LENGTH;
        if (!hasText) {
            rawText = extractWithOcr(doc, filename).trim();
            hasText = rawText.length() >= MIN_TEXT_LENGTH;
            if (!hasText) {
                throw new PdfExtractionException(
                    "PDF appears to be image-only or empty. OCR extracted too little text (" +
                    rawText.length() + " chars).");
            }
        }

        boolean isSparse = rawText.length() < WARN_TEXT_LENGTH;
        if (isSparse) {
            log.warn("CV PDF '{}' has sparse text ({} chars). Accepted with warning.",
                    filename, rawText.length());
        }

        log.debug("Extracted {} chars from PDF '{}' ({} pages)", rawText.length(), filename, pageCount);

        return new ExtractionResult(rawText, pageCount, isSparse);
    }

    private String extractWithOcr(PDDocument doc, String filename) {
        if (!appProperties.isOcrEnabled()) {
            throw new PdfExtractionException(
                    "PDF appears to be image-only. OCR is disabled; enable app.ocr.enabled to process scanned PDFs.");
        }

        int pageLimit = Math.min(doc.getNumberOfPages(), Math.max(1, appProperties.getOcrMaxPages()));
        Path tempDir = null;
        try {
            tempDir = Files.createTempDirectory("careerfit-ocr-");
            PDFRenderer renderer = new PDFRenderer(doc);
            List<String> pageTexts = new ArrayList<>();

            for (int pageIndex = 0; pageIndex < pageLimit; pageIndex++) {
                BufferedImage image = renderer.renderImageWithDPI(
                        pageIndex,
                        Math.max(120, appProperties.getOcrDpi()),
                        ImageType.RGB);
                Path imagePath = tempDir.resolve("page-" + (pageIndex + 1) + ".png");
                ImageIO.write(image, "png", imagePath.toFile());
                pageTexts.add(runTesseract(imagePath, pageIndex + 1));
            }

            String ocrText = String.join("\n\n", pageTexts).trim();
            log.info("OCR extracted {} chars from PDF '{}' ({} rendered pages)",
                    ocrText.length(), filename, pageLimit);
            return ocrText;
        } catch (IOException e) {
            throw new PdfExtractionException("OCR failed while rendering PDF pages: " + e.getMessage(), e);
        } finally {
            deleteTempDir(tempDir);
        }
    }

    private String runTesseract(Path imagePath, int pageNumber) {
        List<String> command = List.of(
                appProperties.getTesseractCommand(),
                imagePath.toString(),
                imagePath.getParent().resolve("ocr-page-" + pageNumber).toString(),
                "-l",
                appProperties.getOcrLanguages()
        );
        Path outputPath = imagePath.getParent().resolve("ocr-page-" + pageNumber + ".txt");

        try {
            Process process = new ProcessBuilder(command)
                    .redirectErrorStream(true)
                    .start();

            boolean finished = process.waitFor(
                    Math.max(5, appProperties.getOcrTimeoutSeconds()),
                    TimeUnit.SECONDS);
            String processOutput = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);

            if (!finished) {
                process.destroyForcibly();
                throw new PdfExtractionException("OCR timed out on page " + pageNumber);
            }
            if (process.exitValue() != 0) {
                throw new PdfExtractionException("OCR failed on page " + pageNumber + ": " + processOutput.trim());
            }
            if (!Files.exists(outputPath)) {
                throw new PdfExtractionException("OCR did not produce text output for page " + pageNumber);
            }
            return Files.readString(outputPath, StandardCharsets.UTF_8).trim();
        } catch (IOException e) {
            throw new PdfExtractionException(
                    "OCR command is not available. Install Tesseract or set TESSERACT_COMMAND. Error: " +
                    e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new PdfExtractionException("OCR interrupted on page " + pageNumber, e);
        }
    }

    private void deleteTempDir(Path tempDir) {
        if (tempDir == null) return;
        try (var paths = Files.walk(tempDir)) {
            paths.sorted(Comparator.reverseOrder())
                    .forEach(path -> {
                        try {
                            Files.deleteIfExists(path);
                        } catch (IOException ignored) {
                        }
                    });
        } catch (IOException ignored) {
        }
    }

    public void validateSupportedUpload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new PdfExtractionException("File is empty or missing");
        }

        String extension = extension(file.getOriginalFilename());
        if (!SUPPORTED_EXTENSIONS.contains(extension)) {
            throw new PdfExtractionException("Unsupported CV file type. Use PDF, PNG, JPG, JPEG or DOCX.");
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        boolean mimeMatches = switch (extension) {
            case "pdf" -> contentType.isBlank() || contentType.equals("application/pdf");
            case "png" -> contentType.isBlank() || contentType.equals("image/png");
            case "jpg", "jpeg" -> contentType.isBlank() || contentType.equals("image/jpeg");
            case "docx" -> contentType.isBlank() || contentType.equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                    || contentType.equals("application/octet-stream");
            default -> false;
        };
        if (!mimeMatches) throw new PdfExtractionException("File extension does not match content type: " + contentType);

        // Magic bytes validation
        try {
            byte[] header = new byte[8];
            int read = file.getInputStream().read(header);
            if (read >= 4) {
                boolean magicValid = switch (extension) {
                    case "pdf" -> header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46; // %PDF
                    case "png" -> header[0] == (byte) 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47; // \x89PNG
                    case "jpg", "jpeg" -> header[0] == (byte) 0xFF && header[1] == (byte) 0xD8 && header[2] == (byte) 0xFF; // \xFF\xD8\xFF
                    case "docx" -> header[0] == 0x50 && header[1] == 0x4B && header[2] == 0x03 && header[3] == 0x04; // PK\x03\x04
                    default -> false;
                };
                if (!magicValid) {
                    throw new PdfExtractionException("File content does not match its extension (invalid magic bytes)");
                }
            }
        } catch (IOException e) {
            throw new PdfExtractionException("Failed to read file header for validation", e);
        }
    }

    private String extension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(java.util.Locale.ROOT);
    }

    // ── Result & Exception ─────────────────────────────────────────────────

    public record ExtractionResult(
        String rawText,
        int pageCount,
        boolean isSparse      // warning: text looks thin
    ) {}

    public static class PdfExtractionException extends RuntimeException {
        public PdfExtractionException(String message) { super(message); }
        public PdfExtractionException(String message, Throwable cause) { super(message, cause); }
    }
}
