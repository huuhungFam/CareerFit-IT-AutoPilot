package com.careerfit.backend.common.util;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Text normalization service supporting Vietnamese and English.
 *
 * Responsibilities:
 *  - remove HTML/special chars
 *  - lowercase
 *  - remove stopwords per language
 *  - tokenize
 *  - return cleaned token list
 */
@Service
public class TextNormalizationService {

    private static final Pattern NON_ALPHA = Pattern.compile("[^a-zA-Z0-9àáảãạăắặẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđÀÁẢÃẠĂẮẶẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ\\s]");

    // ── Vietnamese stopwords ──────────────────────────────────────────────
    private static final Set<String> VI_STOPWORDS = new HashSet<>(Arrays.asList(
        "và","là","của","có","cho","với","trong","được","về","này",
        "đó","theo","như","khi","từ","bởi","vì","nên","hay","hoặc",
        "thì","mà","ra","vào","lên","xuống","đến","tới","tại","trên",
        "dưới","sau","trước","để","cũng","đã","đang","sẽ","không","chưa",
        "rất","nhiều","các","những","một","hai","ba","bốn","năm","sáu",
        "bảy","tám","chín","mười","người","thời","gian","công","ty","việc",
        "làm","yêu","cầu","cần","thể","nhóm"
    ));

    // ── English stopwords ──────────────────────────────────────────────────
    private static final Set<String> EN_STOPWORDS = new HashSet<>(Arrays.asList(
        "a","an","the","and","or","but","in","on","at","to","for","of",
        "with","by","from","as","is","was","are","were","be","been","being",
        "have","has","had","do","does","did","will","would","could","should",
        "may","might","shall","can","not","no","nor","so","yet","both",
        "either","neither","each","every","all","any","few","more","most",
        "other","some","such","than","then","there","these","they","this",
        "those","through","under","until","up","very","while","who","whom",
        "which","that","it","its","we","our","you","your","he","she","his",
        "her","their","us","i","me","my","am","about","above","after",
        "before","between","into","over","same","too","when","where"
    ));

    /**
     * Full normalize pipeline: strip noise → lowercase → tokenize → remove stopwords.
     *
     * @param text     raw text
     * @param language "vi" or "en" (default: "en" if unknown)
     * @return list of meaningful tokens
     */
    public List<String> normalize(String text, String language) {
        if (text == null || text.isBlank()) return Collections.emptyList();

        // 1. Remove HTML tags
        String cleaned = text.replaceAll("<[^>]+>", " ");

        // 2. Remove non-alphanumeric (keep Vietnamese diacritics)
        cleaned = NON_ALPHA.matcher(cleaned).replaceAll(" ");

        // 3. Lowercase
        cleaned = cleaned.toLowerCase();

        // 4. Tokenize on whitespace
        String[] tokens = cleaned.split("\\s+");

        // 5. Remove stopwords and very short tokens
        Set<String> stopwords = "vi".equals(language) ? VI_STOPWORDS : EN_STOPWORDS;

        return Arrays.stream(tokens)
                .map(String::trim)
                .filter(t -> t.length() >= 2)
                .filter(t -> !stopwords.contains(t))
                .collect(Collectors.toList());
    }

    /**
     * Detect language of text (simple heuristic: check for Vietnamese diacritics).
     */
    public String detectLanguage(String text) {
        if (text == null) return "en";
        long viCharCount = text.chars()
                .filter(c -> "àáảãạăắặẳẵâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ"
                        .indexOf(c) >= 0)
                .count();
        return viCharCount > 5 ? "vi" : "en";
    }

    /**
     * Join token list back to a string (for display/summary).
     */
    public String joinTokens(List<String> tokens) {
        return String.join(" ", tokens);
    }
}
