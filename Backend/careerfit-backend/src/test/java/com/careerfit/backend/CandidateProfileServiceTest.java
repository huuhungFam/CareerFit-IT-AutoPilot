package com.careerfit.backend;

import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.candidate.dto.CandidateDtos;
import com.careerfit.backend.candidate.entity.Candidate;
import com.careerfit.backend.candidate.entity.CandidatePortfolioLink;
import com.careerfit.backend.candidate.entity.CandidatePortfolioProject;
import com.careerfit.backend.candidate.repository.CandidatePortfolioLinkRepository;
import com.careerfit.backend.candidate.repository.CandidatePortfolioProjectRepository;
import com.careerfit.backend.candidate.repository.CandidateRepository;
import com.careerfit.backend.candidate.service.CandidateProfileService;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.cv.repository.CVRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CandidateProfileServiceTest {

    @Mock CandidateRepository candidateRepo;
    @Mock CandidatePortfolioLinkRepository linkRepo;
    @Mock CandidatePortfolioProjectRepository projectRepo;
    @Mock UserAccountRepository userRepo;
    @Mock CVRepository cvRepo;

    private CandidateProfileService service;
    private UUID userId;
    private Candidate candidate;

    @BeforeEach
    void setUp() {
        service = new CandidateProfileService(candidateRepo, linkRepo, projectRepo, userRepo, cvRepo,
                new ObjectMapper());
        userId = UUID.randomUUID();
        UserAccount user = new UserAccount("candidate@example.com", "hash", UserAccount.Role.CANDIDATE,
                "Candidate");
        ReflectionTestUtils.setField(user, "id", userId);
        candidate = new Candidate(user);
        ReflectionTestUtils.setField(candidate, "id", UUID.randomUUID());
        when(candidateRepo.findByUserId(userId)).thenReturn(Optional.of(candidate));
    }

    @Test
    void createsLinkWithNormalizedTypeAndUrl() {
        when(linkRepo.save(any(CandidatePortfolioLink.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.addPortfolioLink(userId,
                new CandidateDtos.PortfolioLinkRequest(" github ", " https://github.com/careerfit "));

        ArgumentCaptor<CandidatePortfolioLink> captor = ArgumentCaptor.forClass(CandidatePortfolioLink.class);
        verify(linkRepo).save(captor.capture());
        assertThat(captor.getValue().getType()).isEqualTo("GITHUB");
        assertThat(captor.getValue().getUrl()).isEqualTo("https://github.com/careerfit");
    }

    @Test
    void rejectsUnsafeOrUnsupportedPortfolioLinks() {
        assertThatThrownBy(() -> service.addPortfolioLink(userId,
                new CandidateDtos.PortfolioLinkRequest("GITHUB", "javascript:alert(1)")))
                .isInstanceOfSatisfying(AppException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        assertThatThrownBy(() -> service.addPortfolioLink(userId,
                new CandidateDtos.PortfolioLinkRequest("SOCIAL", "https://example.com")))
                .isInstanceOfSatisfying(AppException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(linkRepo, never()).save(any());
    }

    @Test
    void normalizesProjectFieldsAndDeduplicatesTechStack() {
        when(projectRepo.save(any(CandidatePortfolioProject.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.addPortfolioProject(userId, new CandidateDtos.PortfolioProjectRequest(
                " CareerFit ", " Backend Engineer ", " API project ",
                List.of("Java", " java ", "Spring Boot", " "), " ", " 20 endpoints "));

        ArgumentCaptor<CandidatePortfolioProject> captor = ArgumentCaptor.forClass(CandidatePortfolioProject.class);
        verify(projectRepo).save(captor.capture());
        CandidatePortfolioProject project = captor.getValue();
        assertThat(project.getName()).isEqualTo("CareerFit");
        assertThat(project.getRole()).isEqualTo("Backend Engineer");
        assertThat(project.getTechStackJson()).isEqualTo("[\"Java\",\"Spring Boot\"]");
        assertThat(project.getProjectUrl()).isNull();
        assertThat(project.getImpact()).isEqualTo("20 endpoints");
    }

    @Test
    void blocksUpdatingAnotherCandidatesLink() {
        Candidate otherCandidate = new Candidate(new UserAccount(
                "other@example.com", "hash", UserAccount.Role.CANDIDATE, "Other"));
        ReflectionTestUtils.setField(otherCandidate, "id", UUID.randomUUID());
        CandidatePortfolioLink link = new CandidatePortfolioLink(otherCandidate, "GITHUB", "https://github.com/other");
        UUID linkId = UUID.randomUUID();
        ReflectionTestUtils.setField(link, "id", linkId);
        when(linkRepo.findById(linkId)).thenReturn(Optional.of(link));

        assertThatThrownBy(() -> service.updatePortfolioLink(userId, linkId,
                new CandidateDtos.PortfolioLinkRequest("GITHUB", "https://github.com/changed")))
                .isInstanceOfSatisfying(AppException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(linkRepo, never()).save(any());
    }
}
