package com.careerfit.backend.analytics.repository;

import com.careerfit.backend.analytics.entity.JobMarketSnapshot;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JobMarketSnapshotRepository extends JpaRepository<JobMarketSnapshot, UUID> {

    Optional<JobMarketSnapshot> findBySnapshotDate(LocalDate date);

    /** Latest N snapshots for trend chart. */
    @Query("SELECT s FROM JobMarketSnapshot s ORDER BY s.snapshotDate DESC")
    List<JobMarketSnapshot> findLatest(Pageable pageable);

    /** Trend: last 30 days. */
    @Query("SELECT s FROM JobMarketSnapshot s WHERE s.snapshotDate >= :since ORDER BY s.snapshotDate ASC")
    List<JobMarketSnapshot> findSince(@org.springframework.data.repository.query.Param("since") LocalDate since);
}
