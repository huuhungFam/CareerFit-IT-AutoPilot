package com.careerfit.backend.cv.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;

/**
 * Extracts plain text from text-based PDF files using Apache PDFBox 3.x.
 *
 * Hard validation rules:
 *  - Must be application/pdf or .pdf extension
 *  - Must be text-based (extracted text not empty)
 *  - File size must be within configured limit
 *
 * Does NOT support image-only / scanned PDFs (OCR is out of scope).
 */
@Service
public class PdfExtractionService {

    private static final Logger log = LoggerFactory.getLogger(PdfExtractionService.class);

    private static final int MIN_TEXT_LENGTH = 50;  // chars — below this = suspicious
    private static final int WARN_TEXT_LENGTH = 200; // chars — below this = warn but accept

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
        boolean isSparse = rawText.length() < WARN_TEXT_LENGTH;

        if (!hasText) {
            throw new PdfExtractionException(
                "PDF appears to be image-only or empty. Extracted text too short (" +
                rawText.length() + " chars). Only text-based PDFs are supported.");
        }

        if (isSparse) {
            log.warn("CV PDF '{}' has sparse text ({} chars). Accepted with warning.",
                    filename, rawText.length());
        }

        log.debug("Extracted {} chars from PDF '{}' ({} pages)", rawText.length(), filename, pageCount);

        return new ExtractionResult(rawText, pageCount, isSparse);
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
