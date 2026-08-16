package com.careerfit.backend.skill.repository;

import com.careerfit.backend.skill.entity.Skill;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface SkillRepository extends JpaRepository<Skill, UUID> {

    @Query("""
            SELECT s
            FROM Skill s
            WHERE s.active = true
              AND LOCATE(:keyword, s.searchText) > 0
            ORDER BY
              CASE WHEN LOCATE(:keyword, s.normalizedName) = 1 THEN 0 ELSE 1 END,
              s.popularity DESC,
              LENGTH(s.name) ASC,
              s.name ASC
            """)
    List<Skill> findSuggestions(@Param("keyword") String keyword, Pageable pageable);
}
