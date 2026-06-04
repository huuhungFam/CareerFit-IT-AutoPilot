package com.careerfit.backend.employer.repository;

import com.careerfit.backend.employer.entity.EmployerProfile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.Collection;
import java.util.UUID;

public interface EmployerProfileRepository extends JpaRepository<EmployerProfile, UUID> {
    Optional<EmployerProfile> findByRecruiterId(UUID recruiterId);
    List<EmployerProfile> findByRecruiterIdIn(Collection<UUID> recruiterIds);
    Optional<EmployerProfile> findBySlug(String slug);
    boolean existsBySlug(String slug);
    boolean existsByRecruiterId(UUID recruiterId);
    List<EmployerProfile> findByIsFeaturedTrue();
    Page<EmployerProfile> findAllByOrderByCompanyNameAsc(Pageable pageable);
}
