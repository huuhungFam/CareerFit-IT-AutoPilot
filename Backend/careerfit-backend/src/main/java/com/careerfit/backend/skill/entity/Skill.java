package com.careerfit.backend.skill.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "skills")
public class Skill {

    @Id
    private UUID id;

    @Column(name = "canonical_key", nullable = false, length = 100)
    private String canonicalKey;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "normalized_name", nullable = false, length = 100)
    private String normalizedName;

    @Column(name = "search_text", nullable = false, columnDefinition = "text")
    private String searchText;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(nullable = false)
    private int popularity;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    protected Skill() {
    }

    public UUID getId() {
        return id;
    }

    public String getCanonicalKey() {
        return canonicalKey;
    }

    public String getName() {
        return name;
    }

    public String getNormalizedName() {
        return normalizedName;
    }

    public String getSearchText() {
        return searchText;
    }

    public String getCategory() {
        return category;
    }

    public int getPopularity() {
        return popularity;
    }

    public boolean isActive() {
        return active;
    }
}
