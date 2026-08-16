package com.careerfit.backend.skill.service;

import com.careerfit.backend.skill.repository.SkillRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

@Service
public class SkillCatalogService {

    private static final int MIN_KEYWORD_LENGTH = 2;
    private static final int MAX_LIMIT = 10;

    private final SkillRepository skillRepository;

    public SkillCatalogService(SkillRepository skillRepository) {
        this.skillRepository = skillRepository;
    }

    @Transactional(readOnly = true)
    public List<String> suggestions(String keyword, int requestedLimit) {
        String normalizedKeyword = normalize(keyword);
        if (normalizedKeyword.length() < MIN_KEYWORD_LENGTH) {
            return List.of();
        }

        int limit = Math.max(1, Math.min(requestedLimit, MAX_LIMIT));
        return skillRepository.findSuggestions(
                        normalizedKeyword,
                        PageRequest.of(0, limit))
                .stream()
                .map(skill -> skill.getName())
                .toList();
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        return Normalizer.normalize(value, Normalizer.Form.NFKC)
                .toLowerCase(Locale.ROOT)
                .trim()
                .replaceAll("\\s+", " ");
    }
}
