package com.careerfit.backend.job.service;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class JobDescriptionSanitizer {

    private static final Pattern LEADING_DESCRIPTION = Pattern.compile(
            "(?iu)(?:mô\\s+tả\\s+công\\s+việc|job\\s+description)\\s*:?\\s*");
    private static final Pattern BULLET = Pattern.compile("\\s*[•●▪◦]\\s*");
    private static final Pattern RESPONSIBILITIES = Pattern.compile(
            "(?iu)(?:bạn\\s+sẽ\\s+làm\\s+gì\\?|trách\\s+nhiệm\\s+công\\s+việc|"
                    + "nhiệm\\s+vụ\\s+chính|what\\s+you(?:'ll|\\s+will)\\s+do|"
                    + "key\\s+responsibilities)\\s*:?\\s*");
    private static final Pattern REQUIREMENTS = Pattern.compile(
            "(?iu)(?:yêu\\s+cầu\\s+công\\s+việc|yêu\\s+cầu\\s+ứng\\s+viên|"
                    + "chúng\\s+tôi\\s+tìm\\s+kiếm\\s+ai\\?|job\\s+requirements?|"
                    + "required\\s+qualifications?|who\\s+you\\s+are)\\s*:?\\s*");
    private static final Pattern BENEFITS = Pattern.compile(
            "(?iu)(?:quyền\\s+lợi(?:\\s+được\\s+hưởng)?|"
                    + "phúc\\s+lợi(?:\\s+dành\\s+cho\\s+bạn)?|chế\\s+độ\\s+đãi\\s+ngộ|"
                    + "employee\\s+benefits?|what\\s+we\\s+offer)\\s*:?\\s*(?=[•●▪◦])");

    private JobDescriptionSanitizer() {
    }

    static String clean(String value) {
        if (value == null) return null;
        String normalized = value
                .replace("\u0000", "")
                .replace("\r\n", "\n")
                .replace('\r', '\n')
                .replaceAll("[\\t\\f\\x0B ]+", " ")
                .replaceAll(" *\\n *", "\n")
                .replaceAll("\\n{3,}", "\n\n")
                .trim();
        if (normalized.isEmpty()) return normalized;

        Matcher heading = LEADING_DESCRIPTION.matcher(normalized);
        if (heading.find() && heading.start() <= Math.min(1_200, (int) (normalized.length() * 0.6))) {
            normalized = normalized.substring(heading.end()).trim();
        }

        normalized = markHeading(normalized, RESPONSIBILITIES);
        normalized = markHeading(normalized, REQUIREMENTS);
        normalized = markHeading(normalized, BENEFITS);
        return BULLET.matcher(normalized)
                .replaceAll("\n• ")
                .replaceAll("\\n{3,}", "\n\n")
                .trim();
    }

    private static String markHeading(String value, Pattern pattern) {
        return pattern.matcher(value).replaceAll(match -> "\n\n" + match.group().trim() + "\n");
    }
}
