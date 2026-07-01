package com.careerfit.backend.automation.repository;

import com.careerfit.backend.automation.entity.AutomationPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AutomationPolicyRepository extends JpaRepository<AutomationPolicy, UUID> {

    Optional<AutomationPolicy> findByUserId(UUID userId);

    /** All policies with autopilot active (daily digest scheduler). */
    @Query("SELECT p FROM AutomationPolicy p WHERE p.dailyDigestEnabled = true AND p.highMatchEmailEnabled = true")
    List<AutomationPolicy> findByDigestEnabledTrueAndAutopilotEnabledTrue();

    /** All policies with high-match notification enabled. */
    @Query("SELECT p FROM AutomationPolicy p WHERE p.highMatchEmailEnabled = true")
    List<AutomationPolicy> findByAutopilotEnabledTrue();

    /** All policies with candidate auto-apply enabled. */
    @Query("SELECT p FROM AutomationPolicy p WHERE p.autoApplyEnabled = true")
    List<AutomationPolicy> findByAutoApplyEnabledTrue();
}
