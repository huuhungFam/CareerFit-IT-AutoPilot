package com.careerfit.backend.common.service;

import com.careerfit.backend.common.dto.ValidationDtos;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.cv.dto.CvDtos;
import com.careerfit.backend.job.dto.JobDtos;
import com.careerfit.backend.job.entity.Job;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class QualityValidationService {

    private static final Pattern YEARS_PATTERN = Pattern.compile(
            "(\\d{1,2})\\s*\\+?\\s*(?:years?|yrs?|năm)",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final BigDecimal INTERN_MONTHLY_VND_WARNING = new BigDecimal("20000000");
    private static final BigDecimal INTERN_MONTHLY_USD_WARNING = new BigDecimal("800");

    public List<ValidationDtos.QualitySignal> validateCreateJob(JobDtos.CreateJobRequest req) {
        List<ValidationDtos.QualitySignal> signals = new ArrayList<>();
        validateSalary(req.salaryMode(), req.salaryMin(), req.salaryMax(), signals);
        validateJobContent(
                req.originalText(),
                req.requiredSkills(),
                req.seniorityLevel(),
                req.employmentType(),
                req.salaryMax() != null ? req.salaryMax() : req.salaryMin(),
                req.salaryCurrency(),
                req.salaryType(),
                signals);
        failOnErrors(signals);
        return signals;
    }

    public List<ValidationDtos.QualitySignal> validateJob(Job job) {
        List<ValidationDtos.QualitySignal> signals = new ArrayList<>();
        validateSalary(
                job.getSalaryMode() != null ? job.getSalaryMode().name() : null,
                job.getSalaryMin(),
                job.getSalaryMax(),
                signals);
                validateJobContent(
                job.getOriginalText(),
                null,
                job.getSeniorityLevel(),
                job.getEmploymentType(),
                job.getSalaryMax() != null ? job.getSalaryMax() : job.getSalaryMin(),
                job.getSalaryCurrency(),
                job.getSalaryType(),
                signals);
        failOnErrors(signals);
        return signals;
    }

    public List<ValidationDtos.QualitySignal> validateManualCv(CvDtos.ManualCvRequest req) {
        List<ValidationDtos.QualitySignal> signals = new ArrayList<>();
        String seniority = normalize(req.seniorityLevel());
        int years = req.yearsOfExperience() != null ? req.yearsOfExperience() : 0;

        if ((containsAny(seniority, "intern", "fresher", "junior") && years > 3)) {
            warning(signals, "CV_SENIORITY_EXPERIENCE_MISMATCH", "yearsOfExperience",
                    "Seniority is entry-level but years of experience is above 3.");
        }
        if (containsAny(seniority, "senior") && years < 3) {
            warning(signals, "CV_SENIORITY_EXPERIENCE_MISMATCH", "yearsOfExperience",
                    "Senior CV usually needs at least 3 years of experience.");
        }
        if (containsAny(seniority, "lead", "principal") && years < 5) {
            warning(signals, "CV_SENIORITY_EXPERIENCE_MISMATCH", "yearsOfExperience",
                    "Lead or principal CV usually needs at least 5 years of experience.");
        }
        if (req.skills() != null && req.skills().size() > 40) {
            flag(signals, "CV_TOO_MANY_SKILLS", "skills",
                    "CV lists many skills; ranking quality may improve if skills are curated.");
        }
        if (req.summary() != null && !req.summary().isBlank() && req.summary().trim().length() < 40) {
            flag(signals, "CV_SUMMARY_TOO_SHORT", "summary",
                    "Summary is very short and may reduce matching explanation quality.");
        }
        return signals;
    }

    public List<ValidationDtos.QualitySignal> analyzeJob(Job job) {
        List<ValidationDtos.QualitySignal> signals = new ArrayList<>();
        validateJobContent(
                job.getOriginalText(),
                null,
                job.getSeniorityLevel(),
                job.getEmploymentType(),
                job.getSalaryMax() != null ? job.getSalaryMax() : job.getSalaryMin(),
                job.getSalaryCurrency(),
                job.getSalaryType(),
                signals);
        return signals.stream()
                .filter(signal -> signal.severity() != ValidationDtos.Severity.ERROR)
                .toList();
    }

    private void validateSalary(String salaryMode,
                                BigDecimal salaryMin,
                                BigDecimal salaryMax,
                                List<ValidationDtos.QualitySignal> signals) {
        String mode = normalize(salaryMode);
        if (mode == null || mode.isBlank()) {
            error(signals, "SALARY_MODE_REQUIRED", "salaryMode", "Salary mode is required.");
            return;
        }

        if ((salaryMin != null && salaryMin.compareTo(ZERO) < 0)
                || (salaryMax != null && salaryMax.compareTo(ZERO) < 0)) {
            error(signals, "SALARY_NEGATIVE", "salary", "Salary values cannot be negative.");
        }
        if (salaryMin != null && salaryMax != null && salaryMin.compareTo(salaryMax) > 0) {
            error(signals, "SALARY_RANGE_INVALID", "salaryMin", "Salary min cannot be greater than salary max.");
        }
        if ("RANGE".equals(mode) && (salaryMin == null || salaryMax == null)) {
            error(signals, "SALARY_RANGE_REQUIRED", "salary", "RANGE salary requires both min and max.");
        }
        if ("FROM".equals(mode) && salaryMin == null) {
            error(signals, "SALARY_MIN_REQUIRED", "salaryMin", "FROM salary requires min salary.");
        }
        if ("UP_TO".equals(mode) && salaryMax == null) {
            error(signals, "SALARY_MAX_REQUIRED", "salaryMax", "UP_TO salary requires max salary.");
        }
    }

    private void validateJobContent(String originalText,
                                    List<String> requiredSkills,
                                    String seniorityLevel,
                                    String employmentType,
                                    BigDecimal upperSalary,
                                    String salaryCurrency,
                                    String salaryType,
                                    List<ValidationDtos.QualitySignal> signals) {
        String text = normalize(originalText);
        String level = normalize(seniorityLevel);
        String employment = normalize(employmentType);
        int years = maxYearsMentioned(text);

        if (text != null && text.length() < 80) {
            flag(signals, "JD_TOO_SHORT", "originalText",
                    "Job description is short; matching quality may be weak.");
        }
        if (requiredSkills != null && requiredSkills.isEmpty()) {
            flag(signals, "JD_REQUIRED_SKILLS_EMPTY", "requiredSkills",
                    "Required skills are empty; suggestions and skill matching will rely mostly on JD text.");
        }
        if ((containsAny(level, "intern", "fresher", "junior") || containsAny(employment, "intern"))
                && years >= 5) {
            warning(signals, "JD_SENIORITY_EXPERIENCE_MISMATCH", "originalText",
                    "Entry-level job description appears to require 5+ years of experience.");
        }
        if (containsAny(level, "fresher") && years >= 3) {
            warning(signals, "JD_FRESHER_EXPERIENCE_MISMATCH", "originalText",
                    "Fresher job description appears to require 3+ years of experience.");
        }
        if ((containsAny(level, "senior", "lead", "principal")) && years > 0 && years < 3) {
            warning(signals, "JD_SENIORITY_EXPERIENCE_MISMATCH", "originalText",
                    "Senior-level job description appears to require under 3 years of experience.");
        }
        if ((containsAny(level, "intern") || containsAny(employment, "intern"))
                && isMonthlySalary(salaryType)
                && isHighInternSalary(upperSalary, salaryCurrency)) {
            warning(signals, "JD_INTERN_SALARY_HIGH", "salaryMax",
                    "Intern salary is unusually high; verify the salary unit and currency.");
        }
    }

    private boolean isHighInternSalary(BigDecimal salary, String currency) {
        if (salary == null) return false;
        String normalizedCurrency = normalize(currency);
        if ("USD".equals(normalizedCurrency)) return salary.compareTo(INTERN_MONTHLY_USD_WARNING) >= 0;
        return salary.compareTo(INTERN_MONTHLY_VND_WARNING) >= 0;
    }

    private boolean isMonthlySalary(String salaryType) {
        String normalized = normalize(salaryType);
        return normalized == null || normalized.isBlank() || "MONTHLY".equals(normalized);
    }

    private int maxYearsMentioned(String text) {
        if (text == null || text.isBlank()) return 0;
        Matcher matcher = YEARS_PATTERN.matcher(text);
        int max = 0;
        while (matcher.find()) {
            try {
                max = Math.max(max, Integer.parseInt(matcher.group(1)));
            } catch (NumberFormatException ignored) {
            }
        }
        return max;
    }

    private void failOnErrors(List<ValidationDtos.QualitySignal> signals) {
        List<ValidationDtos.QualitySignal> errors = signals.stream()
                .filter(signal -> signal.severity() == ValidationDtos.Severity.ERROR)
                .toList();
        if (!errors.isEmpty()) {
            throw AppException.badRequest(errors.get(0).message());
        }
    }

    private void error(List<ValidationDtos.QualitySignal> signals, String code, String field, String message) {
        signals.add(new ValidationDtos.QualitySignal(ValidationDtos.Severity.ERROR, code, field, message));
    }

    private void warning(List<ValidationDtos.QualitySignal> signals, String code, String field, String message) {
        signals.add(new ValidationDtos.QualitySignal(ValidationDtos.Severity.WARNING, code, field, message));
    }

    private void flag(List<ValidationDtos.QualitySignal> signals, String code, String field, String message) {
        signals.add(new ValidationDtos.QualitySignal(ValidationDtos.Severity.QUALITY_FLAG, code, field, message));
    }

    private boolean containsAny(String value, String... needles) {
        if (value == null || value.isBlank()) return false;
        for (String needle : needles) {
            if (value.contains(needle.toUpperCase(Locale.ROOT))) return true;
        }
        return false;
    }

    private String normalize(String value) {
        return value == null ? null : value.trim().toUpperCase(Locale.ROOT);
    }
}
