package com.careerfit.backend.candidate.repository;

import com.careerfit.backend.candidate.entity.CandidatePortfolioProject;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CandidatePortfolioProjectRepository extends JpaRepository<CandidatePortfolioProject, UUID> {
    List<CandidatePortfolioProject> findByCandidateIdOrderByCreatedAtDesc(UUID candidateId);
}
