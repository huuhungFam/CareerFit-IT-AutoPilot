package com.careerfit.backend.cv.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OcrTextCleanupServiceTest {

    private final OcrTextCleanupService service = new OcrTextCleanupService();

    @Test
    void removesOcrWhitespaceAndJoinsHyphenatedLineBreaks() {
        String result = service.clean("  Full-\nstack   Engineer\t\n\n\n Java  Spring  ");

        assertThat(result).isEqualTo("Fullstack Engineer\n\nJava Spring");
    }

    @Test
    void preservesTechnologyPunctuationAndVietnameseDiacritics() {
        String result = service.clean("C++  C#  .NET  Node.js\nKỹ sư phần mềm");

        assertThat(result).contains("C++", "C#", ".NET", "Node.js", "Kỹ sư phần mềm");
    }
}
