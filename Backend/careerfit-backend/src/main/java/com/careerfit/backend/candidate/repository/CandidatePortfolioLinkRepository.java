package com.careerfit.backend.candidate.repository;

import com.careerfit.backend.candidate.entity.CandidatePortfolioLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CandidatePortfolioLinkRepository extends JpaRepository<CandidatePortfolioLink, UUID> {
    List<CandidatePortfolioLink> findByCandidateIdOrderByCreatedAtDesc(UUID candidateId);
}
