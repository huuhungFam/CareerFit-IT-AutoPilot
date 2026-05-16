package com.careerfit.backend.candidate.repository;

import com.careerfit.backend.candidate.entity.Candidate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CandidateRepository extends JpaRepository<Candidate, UUID> {
    Optional<Candidate> findByUserId(UUID userId);
    boolean existsByUserId(UUID userId);
}
