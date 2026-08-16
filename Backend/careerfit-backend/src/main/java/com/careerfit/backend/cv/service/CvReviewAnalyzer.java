package com.careerfit.backend.cv.service;

import com.careerfit.backend.common.dto.ValidationDtos;
import com.careerfit.backend.cv.dto.CvDtos;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CvReviewAnalyzer {

    private static final Pattern DUPLICATE_WORD = Pattern.compile(
            "(?iu)(?<![\\p{L}\\p{N}])([\\p{L}]{2,})\\s+\\1(?![\\p{L}\\p{N}])");

    private static final Map<String, String> COMMON_CORRECTIONS = Map.ofEntries(
            Map.entry("phát triễn", "phát triển"),
            Map.entry("kinh nghiêm", "kinh nghiệm"),
            Map.entry("kỷ năng", "kỹ năng"),
            Map.entry("quãn lý", "quản lý"),
            Map.entry("trách nhiêm", "trách nhiệm"),
            Map.entry("công nghê", "công nghệ"),
            Map.entry("javascript", "JavaScript"),
            Map.entry("typescript", "TypeScript"),
            Map.entry("postgresql", "PostgreSQL"),
            Map.entry("nodejs", "Node.js")
    );

    public LinkedHashMap<String, String> fromManual(CvDtos.ManualCvRequest request) {
        LinkedHashMap<String, String> sections = new LinkedHashMap<>();
        put(sections, "fullName", request.fullName());
        put(sections, "headline", joinLines(
                request.desiredTitle(),
                request.seniorityLevel(),
                request.yearsOfExperience() == null ? null : request.yearsOfExperience() + " years"));
        put(sections, "contact", joinLines(request.email(), request.phone(), request.location()));
        put(sections, "summary", request.summary());
        put(sections, "skills", joinComma(request.skills()));
        put(sections, "additionalSkills", joinComma(request.niceToHaveSkills()));
        put(sections, "experience", request.workExperience());
        put(sections, "education", request.education());
        put(sections, "projects", request.projects());
        put(sections, "certifications", request.certifications());
        put(sections, "languages", request.languages());
        return sections;
    }

    public LinkedHashMap<String, String> fromManualDraft(CvDtos.ManualCvDraftRequest request) {
        LinkedHashMap<String, String> sections = new LinkedHashMap<>();
        sections.put("fullName", clean(request.fullName()));
        sections.put("headline", clean(joinLines(
                request.desiredTitle(),
                request.seniorityLevel(),
                request.yearsOfExperience() == null ? null : request.yearsOfExperience() + " years")));
        sections.put("contact", clean(joinLines(request.email(), request.phone(), request.location())));
        sections.put("summary", clean(request.summary()));
        sections.put("skills", clean(joinComma(request.skills())));
        sections.put("additionalSkills", clean(joinComma(request.niceToHaveSkills())));
        sections.put("experience", clean(request.workExperience()));
        sections.put("education", clean(request.education()));
        sections.put("projects", clean(request.projects()));
        sections.put("certifications", clean(request.certifications()));
        sections.put("languages", clean(request.languages()));
        return sections;
    }

    public LinkedHashMap<String, String> fromExtractedText(String rawText) {
        LinkedHashMap<String, StringBuilder> grouped = new LinkedHashMap<>();
        String current = "profile";
        grouped.put(current, new StringBuilder());

        for (String line : rawText.replace("\r", "").split("\n")) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) continue;
            String detected = sectionForHeading(trimmed);
            if (detected != null) {
                current = detected;
                grouped.computeIfAbsent(current, ignored -> new StringBuilder());
                continue;
            }
            StringBuilder target = grouped.computeIfAbsent(current, ignored -> new StringBuilder());
            if (!target.isEmpty()) target.append('\n');
            target.append(trimmed);
        }

        LinkedHashMap<String, String> sections = new LinkedHashMap<>();
        grouped.forEach((key, value) -> put(sections, key, value.toString()));
        if (sections.isEmpty()) put(sections, "profile", rawText);
        return sections;
    }

    public List<CvDtos.CvReviewIssue> analyze(
            Map<String, String> sections,
            List<ValidationDtos.QualitySignal> qualitySignals
    ) {
        List<CvDtos.CvReviewIssue> issues = new ArrayList<>();
        sections.forEach((sectionKey, content) -> {
            if (content == null || content.isBlank()) return;
            COMMON_CORRECTIONS.forEach((incorrect, correction) ->
                    findCorrectionIssues(issues, sectionKey, content, incorrect, correction));
            findDuplicateWords(issues, sectionKey, content);
        });

        String summary = sections.get("summary");
        if (summary != null && !summary.isBlank() && summary.length() < 40
                && !hasSignal(qualitySignals, "CV_SUMMARY_TOO_SHORT")) {
            addQualityIssue(
                    issues,
                    "CV_SUMMARY_TOO_SHORT",
                    "summary",
                    "Phần giới thiệu còn ngắn; hãy bổ sung chuyên môn, kinh nghiệm và giá trị nổi bật.",
                    "The summary is short. Add your expertise, experience, and strongest contribution.");
        }
        String skills = sections.get("skills");
        if (skills != null && skills.split(",").length > 40
                && !hasSignal(qualitySignals, "CV_TOO_MANY_SKILLS")) {
            addQualityIssue(
                    issues,
                    "CV_TOO_MANY_SKILLS",
                    "skills",
                    "Danh sách kỹ năng khá dài; nên giữ lại những kỹ năng liên quan nhất.",
                    "The skills list is long. Keep the most relevant skills.");
        }

        if (qualitySignals != null) {
            for (ValidationDtos.QualitySignal signal : qualitySignals) {
                String sectionKey = mapQualityField(signal.field());
                issues.add(new CvDtos.CvReviewIssue(
                        stableId(signal.code(), sectionKey, -1, signal.message()),
                        sectionKey,
                        "QUALITY",
                        signal.severity().name(),
                        null,
                        null,
                        qualityMessageVi(signal.code()),
                        signal.message(),
                        -1,
                        -1
                ));
            }
        }
        return List.copyOf(issues);
    }

    public String toRawText(Map<String, String> sections) {
        StringBuilder result = new StringBuilder();
        sections.forEach((key, content) -> {
            if (content == null || content.isBlank()) return;
            if (!result.isEmpty()) result.append("\n\n");
            result.append(rawLabel(key)).append(":\n").append(content.trim());
        });
        return result.toString();
    }

    private void findCorrectionIssues(
            List<CvDtos.CvReviewIssue> issues,
            String sectionKey,
            String content,
            String incorrect,
            String correction
    ) {
        Pattern pattern = Pattern.compile(
                "(?iu)(?<![\\p{L}\\p{N}])" + Pattern.quote(incorrect) + "(?![\\p{L}\\p{N}])");
        Matcher matcher = pattern.matcher(content);
        while (matcher.find()) {
            String original = matcher.group();
            if (original.equals(correction)) continue;
            issues.add(new CvDtos.CvReviewIssue(
                    stableId("SPELLING", sectionKey, matcher.start(), original),
                    sectionKey,
                    "SPELLING",
                    "ERROR",
                    original,
                    correction,
                    "Có thể đây là lỗi chính tả. Hãy kiểm tra trước khi lưu CV.",
                    "This may be a spelling or capitalization issue. Review it before saving.",
                    matcher.start(),
                    matcher.end()
            ));
        }
    }

    private void findDuplicateWords(
            List<CvDtos.CvReviewIssue> issues,
            String sectionKey,
            String content
    ) {
        Matcher matcher = DUPLICATE_WORD.matcher(content);
        while (matcher.find()) {
            issues.add(new CvDtos.CvReviewIssue(
                    stableId("DUPLICATE_WORD", sectionKey, matcher.start(), matcher.group()),
                    sectionKey,
                    "DUPLICATE_WORD",
                    "ERROR",
                    matcher.group(),
                    matcher.group(1),
                    "Từ này đang bị lặp. Bạn có thể giữ lại một từ.",
                    "This word is repeated. Keep a single occurrence.",
                    matcher.start(),
                    matcher.end()
            ));
        }
    }

    private String sectionForHeading(String line) {
        String normalized = Normalizer.normalize(line, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^\\p{L} ]", "")
                .trim()
                .toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "tom tat", "gioi thieu", "muc tieu nghe nghiep", "summary", "profile", "objective" -> "summary";
            case "kinh nghiem", "kinh nghiem lam viec", "work experience", "experience", "employment history" -> "experience";
            case "hoc van", "education", "academic background" -> "education";
            case "ky nang", "skills", "technical skills" -> "skills";
            case "du an", "projects", "project experience" -> "projects";
            case "chung chi", "certifications", "certificates" -> "certifications";
            case "ngoai ngu", "languages" -> "languages";
            default -> null;
        };
    }

    private String mapQualityField(String field) {
        if (field == null) return "profile";
        return switch (field) {
            case "summary" -> "summary";
            case "skills" -> "skills";
            case "yearsOfExperience" -> "headline";
            default -> field;
        };
    }

    private String qualityMessageVi(String code) {
        return switch (code) {
            case "CV_SUMMARY_TOO_SHORT" -> "Phần giới thiệu còn ngắn; hãy bổ sung chuyên môn, kinh nghiệm và giá trị nổi bật.";
            case "CV_TOO_MANY_SKILLS" -> "Danh sách kỹ năng khá dài; nên giữ lại những kỹ năng liên quan nhất.";
            case "CV_SENIORITY_EXPERIENCE_MISMATCH" -> "Cấp bậc và số năm kinh nghiệm có thể chưa nhất quán.";
            default -> "Hãy kiểm tra lại nội dung này để CV rõ ràng hơn.";
        };
    }

    private boolean hasSignal(List<ValidationDtos.QualitySignal> signals, String code) {
        return signals != null && signals.stream().anyMatch(signal -> code.equals(signal.code()));
    }

    private void addQualityIssue(
            List<CvDtos.CvReviewIssue> issues,
            String code,
            String sectionKey,
            String messageVi,
            String messageEn
    ) {
        issues.add(new CvDtos.CvReviewIssue(
                stableId(code, sectionKey, -1, messageEn),
                sectionKey,
                "QUALITY",
                "QUALITY_FLAG",
                null,
                null,
                messageVi,
                messageEn,
                -1,
                -1
        ));
    }

    private String rawLabel(String key) {
        return switch (key) {
            case "fullName" -> "Name";
            case "headline" -> "Headline";
            case "contact" -> "Contact";
            case "summary" -> "Summary";
            case "skills" -> "Skills";
            case "additionalSkills" -> "Additional Skills";
            case "experience" -> "Experience";
            case "education" -> "Education";
            case "projects" -> "Projects";
            case "certifications" -> "Certifications";
            case "languages" -> "Languages";
            default -> "Profile";
        };
    }

    private String stableId(String type, String section, int start, String value) {
        return type + "-" + section + "-" + start + "-" + Integer.toUnsignedString(value.hashCode(), 36);
    }

    private String joinLines(Object... values) {
        List<String> parts = new ArrayList<>();
        for (Object value : values) {
            if (value != null && !value.toString().isBlank()) parts.add(value.toString().trim());
        }
        return String.join("\n", parts);
    }

    private String joinComma(List<String> values) {
        return values == null ? null : String.join(", ", values);
    }

    private void put(Map<String, String> sections, String key, String value) {
        if (value != null && !value.isBlank()) sections.put(key, value.trim());
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }
}
