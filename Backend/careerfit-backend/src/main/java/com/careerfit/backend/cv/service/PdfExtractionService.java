package com.careerfit.backend.cv.service;

import com.careerfit.backend.config.AppProperties;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
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

    private final AppProperties appProperties;

    public PdfExtractionService(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    /**
     * Extract text from a MultipartFile PDF.
     * @throws PdfExtractionException if file is invalid or unreadable
     */
    public ExtractionResult extractText(MultipartFile file) {
        validateFile(file);
        try {
            byte[] bytes = file.getBytes();
            return extractFromBytes(bytes, file.getOriginalFilename());
        } catch (IOException e) {
            throw new PdfExtractionException("Failed to read uploaded file: " + e.getMessage(), e);
        }
    }

    /**
     * Extract text from a file on disk (used by background worker after storage).
     */
    public ExtractionResult extractFromFile(File file) {
        try (PDDocument doc = Loader.loadPDF(file)) {
            return doExtract(doc, file.getName());
        } catch (IOException e) {
            throw new PdfExtractionException("Failed to parse PDF: " + e.getMessage(), e);
        }
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

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new PdfExtractionException("File is empty or missing");
        }

        String contentType = file.getContentType();
        String originalName = file.getOriginalFilename();
        boolean isPdf = "application/pdf".equals(contentType) ||
                (originalName != null && originalName.toLowerCase().endsWith(".pdf"));

        if (!isPdf) {
            throw new PdfExtractionException(
                "Invalid file type: " + contentType + ". Only PDF files are accepted.");
        }
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
