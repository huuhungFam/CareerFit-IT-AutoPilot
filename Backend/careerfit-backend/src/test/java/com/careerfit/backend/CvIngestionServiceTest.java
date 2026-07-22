package com.careerfit.backend;

import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.candidate.entity.Candidate;
import com.careerfit.backend.candidate.repository.CandidateRepository;
import com.careerfit.backend.common.service.QualityValidationService;
import com.careerfit.backend.common.util.AfterCommitExecutor;
import com.careerfit.backend.common.util.StorageService;
import com.careerfit.backend.common.util.TextNormalizationService;
import com.careerfit.backend.common.util.TfIdfService;
import com.careerfit.backend.cv.dto.CvDtos;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.cv.service.CvIngestionService;
import com.careerfit.backend.cv.service.PdfExtractionService;
import com.careerfit.backend.matching.service.MatchingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CvIngestionServiceTest {

    @Test
    void manualCvSchedulesProcessingInsteadOfRunningInsideRequest() {
        UUID userId = UUID.randomUUID();
        Candidate candidate = mock(Candidate.class);
        CandidateRepository candidateRepo = mock(CandidateRepository.class);
        when(candidateRepo.findByUserId(userId)).thenReturn(Optional.of(candidate));
        when(candidate.getId()).thenReturn(UUID.randomUUID());

        CVRepository cvRepo = mock(CVRepository.class);
        when(cvRepo.existsByCandidateIdAndIsDefaultTrue(any())).thenReturn(true);
        when(cvRepo.save(any(CV.class))).thenAnswer(invocation -> {
            CV cv = invocation.getArgument(0);
            if (cv.getId() == null) ReflectionTestUtils.setField(cv, "id", UUID.randomUUID());
            return cv;
        });
        QualityValidationService qualityValidation = mock(QualityValidationService.class);
        when(qualityValidation.validateManualCv(any())).thenReturn(List.of());
        AfterCommitExecutor afterCommitExecutor = mock(AfterCommitExecutor.class);

        CvIngestionService service = new CvIngestionService(
                cvRepo,
                candidateRepo,
                mock(PdfExtractionService.class),
                mock(TextNormalizationService.class),
                mock(TfIdfService.class),
                mock(MatchingService.class),
                mock(StorageService.class),
                mock(AuditLogRepository.class),
                new ObjectMapper(),
                qualityValidation,
                afterCommitExecutor);

        var request = new CvDtos.ManualCvRequest(
                "Backend CV", "Candidate", "candidate@example.com", null, "Can Tho",
                "Backend Engineer", "JUNIOR", 1, List.of("Java"), List.of("Docker"),
                null, "Built Spring APIs", null, null, "Vietnamese", "Backend developer", "en");

        service.acceptManualCv(request, userId);

        verify(afterCommitExecutor).execute(any(Runnable.class));
    }
}
