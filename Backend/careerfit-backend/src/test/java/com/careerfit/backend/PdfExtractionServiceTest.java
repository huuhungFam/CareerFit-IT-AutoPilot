package com.careerfit.backend;

import com.careerfit.backend.config.AppProperties;
import com.careerfit.backend.cv.service.PdfExtractionService;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PdfExtractionServiceTest {

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
