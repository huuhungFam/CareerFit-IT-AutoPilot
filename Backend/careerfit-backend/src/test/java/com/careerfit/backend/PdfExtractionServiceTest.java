package com.careerfit.backend;

import com.careerfit.backend.config.AppProperties;
import com.careerfit.backend.cv.service.PdfExtractionService;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PdfExtractionServiceTest {

    @Test
    void extractsDocxCvText() throws Exception {
        byte[] bytes;
        try (XWPFDocument document = new XWPFDocument();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            document.createParagraph().createRun().setText(
                    "Nguyen Van A is a Java Spring Boot backend engineer with PostgreSQL, Docker, REST API and testing experience.");
            document.write(output);
            bytes = output.toByteArray();
        }
        var file = Files.createTempFile("careerfit-cv-", ".docx");
        Files.write(file, bytes);
        try {
            var result = new PdfExtractionService(new AppProperties()).extractFromFile(file.toFile());
            assertThat(result.rawText()).contains("Spring Boot", "PostgreSQL");
        } finally {
            Files.deleteIfExists(file);
        }
    }

    @Test
    void rejectsExtensionAndMimeMismatch() {
        var upload = new MockMultipartFile("file", "cv.png", "application/pdf", new byte[] {1, 2, 3});
        var service = new PdfExtractionService(new AppProperties());

        assertThatThrownBy(() -> service.validateSupportedUpload(upload))
                .isInstanceOf(PdfExtractionService.PdfExtractionException.class)
                .hasMessageContaining("does not match");
    }

    @Test
    void rejectsUnsupportedAndEmptyUploads() {
        var service = new PdfExtractionService(new AppProperties());
        var unsupported = new MockMultipartFile("file", "cv.txt", "text/plain", "plain text".getBytes());
        var empty = new MockMultipartFile("file", "cv.pdf", "application/pdf", new byte[0]);

        assertThatThrownBy(() -> service.validateSupportedUpload(unsupported))
                .isInstanceOf(PdfExtractionService.PdfExtractionException.class)
                .hasMessageContaining("Unsupported CV file type");
        assertThatThrownBy(() -> service.validateSupportedUpload(empty))
                .isInstanceOf(PdfExtractionService.PdfExtractionException.class)
                .hasMessageContaining("empty or missing");
    }

    @Test
    void imageCvFailsClearlyWhenOcrIsDisabled() throws IOException {
        AppProperties properties = new AppProperties();
        ReflectionTestUtils.setField(properties, "ocrEnabled", false);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(200, 100, BufferedImage.TYPE_INT_RGB), "png", output);
        var upload = new MockMultipartFile("file", "cv.png", "image/png", output.toByteArray());

        assertThatThrownBy(() -> new PdfExtractionService(properties).extractText(upload))
                .isInstanceOf(PdfExtractionService.PdfExtractionException.class)
                .hasMessageContaining("requires OCR");
    }

    @Test
    void extractsTextFromTextBasedPdfWithoutOcr() throws IOException {
        PdfExtractionService service = new PdfExtractionService(new AppProperties());

        PdfExtractionService.ExtractionResult result = service.extractFromBytes(
                textPdf("""
                        Nguyen Van A
                        Backend Developer with Java, Spring Boot, PostgreSQL, Docker, REST API,
                        authentication, deployment, and production debugging experience.
                        Built candidate matching APIs, background CV ingestion workers, secure login,
                        database migrations, monitoring dashboards, and recruiter workflow automation.
                        """),
                "text-cv.pdf");

        assertThat(result.rawText()).contains("Backend Developer");
        assertThat(result.pageCount()).isEqualTo(1);
        assertThat(result.isSparse()).isFalse();
    }

    @Test
    void failsClearlyWhenPdfNeedsOcrButOcrIsDisabled() throws IOException {
        AppProperties properties = new AppProperties();
        ReflectionTestUtils.setField(properties, "ocrEnabled", false);
        PdfExtractionService service = new PdfExtractionService(properties);

        assertThatThrownBy(() -> service.extractFromBytes(blankPdf(), "scan-cv.pdf"))
                .isInstanceOf(PdfExtractionService.PdfExtractionException.class)
                .hasMessageContaining("OCR is disabled");
    }

    private byte[] textPdf(String text) throws IOException {
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            document.addPage(page);

            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                content.newLineAtOffset(72, 720);
                for (String line : text.lines().toList()) {
                    content.showText(line);
                    content.newLineAtOffset(0, -16);
                }
                content.endText();
            }

            document.save(output);
            return output.toByteArray();
        }
    }

    private byte[] blankPdf() throws IOException {
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            document.addPage(new PDPage());
            document.save(output);
            return output.toByteArray();
        }
    }
}
