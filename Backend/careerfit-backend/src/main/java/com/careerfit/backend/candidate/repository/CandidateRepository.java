package com.careerfit.backend.candidate.repository;

import com.careerfit.backend.candidate.entity.Candidate;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface CandidateRepository extends JpaRepository<Candidate, UUID> {
    @EntityGraph(attributePaths = {"user"})
    Optional<Candidate> findByUserId(UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Candidate c WHERE c.user.id = :userId")
    Optional<Candidate> findByUserIdForUpdate(@Param("userId") UUID userId);

    boolean existsByUserId(UUID userId);
}
