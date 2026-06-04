package com.careerfit.backend;

import com.careerfit.backend.common.dto.ValidationDtos;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.common.service.QualityValidationService;
import com.careerfit.backend.cv.dto.CvDtos;
import com.careerfit.backend.job.dto.JobDtos;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class QualityValidationServiceTest {

    private final QualityValidationService validator = new QualityValidationService();

    @Test
    void rejectsInvalidSalaryRange() {
        JobDtos.CreateJobRequest request = jobRequest(
                "Backend Engineer",
                "Java Spring Boot PostgreSQL API role with enough useful detail for matching.",
                "RANGE",
                new BigDecimal("3000"),
                new BigDecimal("1000"),
                "USD",
                "MONTHLY",
                "Mid",
                "Full-time");

        assertThatThrownBy(() -> validator.validateCreateJob(request))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Salary min cannot be greater than salary max");
    }

    @Test
    void warnsWhenFresherJobRequiresTenYearsInVietnameseText() {
        JobDtos.CreateJobRequest request = jobRequest(
                "Fresher Java Developer",
                "Fresher Java Developer làm REST API, Spring Boot, PostgreSQL, Docker và yêu cầu 10 năm kinh nghiệm.",
                "NEGOTIABLE",
                null,
                null,
                "VND",
                "MONTHLY",
                "Fresher",
                "Full-time");

        List<ValidationDtos.QualitySignal> signals = validator.validateCreateJob(request);

        assertThat(signals)
                .anyMatch(signal -> signal.code().equals("JD_SENIORITY_EXPERIENCE_MISMATCH")
                        || signal.code().equals("JD_FRESHER_EXPERIENCE_MISMATCH"));
    }

    @Test
    void warnsOnEntryLevelCvWithTooManyYears() {
        CvDtos.ManualCvRequest request = new CvDtos.ManualCvRequest(
                "CV",
                "Nguyen Van A",
                "a@example.com",
                null,
                "Ho Chi Minh",
                "Backend Developer",
                "Junior",
                8,
                List.of("Java", "Spring Boot"),
                List.of(),
                null,
                "Built APIs",
                null,
                null,
                "English",
                "Backend engineer",
                "en");

        List<ValidationDtos.QualitySignal> signals = validator.validateManualCv(request);

        assertThat(signals)
                .anyMatch(signal -> signal.code().equals("CV_SENIORITY_EXPERIENCE_MISMATCH"));
    }

    private JobDtos.CreateJobRequest jobRequest(String title,
                                                String originalText,
                                                String salaryMode,
                                                BigDecimal salaryMin,
                                                BigDecimal salaryMax,
                                                String salaryCurrency,
                                                String salaryType,
                                                String seniority,
                                                String employmentType) {
        return new JobDtos.CreateJobRequest(
                title,
                "CareerFit Demo Lab",
                originalText,
                List.of("Java", "Spring Boot"),
                List.of("Docker"),
                seniority,
                employmentType,
                "Ho Chi Minh",
                "HYBRID",
                salaryMode,
                salaryMin,
                salaryMax,
                salaryCurrency,
                salaryType,
                true,
                null,
                "Backend",
                "vi");
    }
}
