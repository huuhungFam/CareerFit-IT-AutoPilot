package com.careerfit.backend.cv.service;

import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.stream.Collectors;

/** Cleans OCR-only artifacts while preserving technology punctuation. */
@Service
public class OcrTextCleanupService {

    public String clean(String text) {
        if (text == null || text.isBlank()) return "";

        String cleaned = Normalizer.normalize(text, Normalizer.Form.NFKC)
                .replace("\u00ad", "")
                .replaceAll("[\\p{Cc}&&[^\\r\\n\\t]]", "")
                .replaceAll("(?<=\\p{L})-\\R(?=\\p{Ll})", "");

        cleaned = Arrays.stream(cleaned.split("\\R", -1))
                .map(line -> line.replaceAll("[\\t\\x0B\\f ]+", " ").trim())
                .collect(Collectors.joining("\n"));

        return cleaned.replaceAll("\\n{3,}", "\n\n").trim();
    }
}
