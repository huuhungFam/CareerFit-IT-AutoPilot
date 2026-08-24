package com.careerfit.backend.cv.repository;

import com.careerfit.backend.cv.entity.CV;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CVRepository extends JpaRepository<CV, UUID> {

    List<CV> findByCandidateIdOrderByCreatedAtDesc(UUID candidateId);

    Optional<CV> findByCandidateIdAndIsDefaultTrue(UUID candidateId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT cv FROM CV cv WHERE cv.id = :id")
    Optional<CV> findByIdForUpdate(@Param("id") UUID id);

    /** Clears isDefault for all CVs belonging to a candidate. Called before setting a new default. */
    @Modifying
    @Query("UPDATE CV c SET c.isDefault = false WHERE c.candidate.id = :candidateId AND c.isDefault = true")
    void clearDefaultByCandidateId(@Param("candidateId") UUID candidateId);

    List<CV> findByCandidateIdAndStatus(UUID candidateId, CV.CvStatus status);

    List<CV> findByStatus(CV.CvStatus status);

    boolean existsByCandidateIdAndIsDefaultTrue(UUID candidateId);

    long countByCandidateId(UUID candidateId);

    long countByCandidateIdAndStatus(UUID candidateId, CV.CvStatus status);
}
