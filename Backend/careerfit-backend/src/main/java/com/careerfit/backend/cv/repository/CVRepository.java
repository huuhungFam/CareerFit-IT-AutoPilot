package com.careerfit.backend.cv.repository;

import com.careerfit.backend.cv.entity.CV;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CVRepository extends JpaRepository<CV, UUID> {

    List<CV> findByCandidateIdOrderByCreatedAtDesc(UUID candidateId);

    Optional<CV> findByCandidateIdAndIsDefaultTrue(UUID candidateId);

    /** Clears isDefault for all CVs belonging to a candidate. Called before setting a new default. */
    @Modifying
    @Query("UPDATE CV c SET c.isDefault = false WHERE c.candidate.id = :candidateId")
    void clearDefaultByCandidateId(@Param("candidateId") UUID candidateId);

    List<CV> findByCandidateIdAndStatus(UUID candidateId, CV.CvStatus status);

    boolean existsByCandidateIdAndIsDefaultTrue(UUID candidateId);
}
