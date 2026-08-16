package com.careerfit.backend.matching.service;

import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.job.entity.Job;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.text.Normalizer;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Versioned, explainable skill-transfer knowledge base used only for Potential.
 * It does not change TF-IDF/cosine matching scores.
 */
@Service
public class SkillTransferService {

    private static final String MODEL_PATH = "matching/skill-transfer-model.json";
    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {};
    private static final double MIN_TRANSFER_EDGE = 0.45;
    private static final double MIN_SKILL_COMPATIBILITY = 0.50;
    private static final double MIN_FAMILY_COMPATIBILITY = 0.55;
    private static final double MIN_POTENTIAL_SCORE = 62.0;

    private final ObjectMapper objectMapper;
    private SkillTransferModel model;
    private Map<String, String> aliasIndex = Map.of();
    private Map<String, Map<String, Double>> transferIndex = Map.of();
    private Map<String, Map<String, Double>> familyTransferIndex = Map.of();

    public SkillTransferService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void loadModel() {
        try (var input = new ClassPathResource(MODEL_PATH).getInputStream()) {
            model = objectMapper.readValue(input, SkillTransferModel.class);
            if (model.skills() == null || model.skills().isEmpty()) {
                throw new IllegalStateException("Skill-transfer model has no skills");
            }
            aliasIndex = buildAliasIndex(model);
            transferIndex = buildTransferIndex(model.transfers());
            familyTransferIndex = buildFamilyTransferIndex(model.familyTransfers());
        } catch (IOException e) {
            throw new IllegalStateException("Cannot load " + MODEL_PATH, e);
        }
    }

    public PotentialAssessment assess(
            CV cv,
            Job job,
            Map<String, Double> cvVector,
            Map<String, Double> jobVector,
            double matchingScore
    ) {
        ensureLoaded();

        Set<String> candidateSkills = extractCandidateSkills(cv, cvVector);
        Set<String> targetSkills = extractTargetSkills(job, jobVector);
        if (candidateSkills.size() < 2 || targetSkills.isEmpty()) {
            return PotentialAssessment.notPotential();
        }

        List<TargetCompatibility> compatibility = targetSkills.stream()
                .map(target -> bestCompatibility(candidateSkills, target))
                .toList();

        double weightedTotal = compatibility.stream()
                .mapToDouble(item -> skillWeight(item.target()))
                .sum();
        if (weightedTotal == 0.0) {
            return PotentialAssessment.notPotential();
        }

        double skillCompatibility = compatibility.stream()
                .mapToDouble(item -> item.score() * skillWeight(item.target()))
                .sum() / weightedTotal;
        double familyCompatibility = familyCompatibility(candidateSkills, targetSkills);
        double foundationCompatibility = foundationCompatibility(compatibility);
        SeniorityAssessment seniority = assessSeniority(cv.getRawText(), job.getSeniorityLevel());

        double potentialScore = 100.0 * (
                0.50 * skillCompatibility
                        + 0.20 * familyCompatibility
                        + 0.15 * foundationCompatibility
                        + 0.15 * seniority.score()
        );

        boolean hasCoreTarget = targetSkills.stream().anyMatch(this::isCore);
        boolean hasCareerEvidence = compatibility.stream()
                .filter(item -> !isFoundation(item.target()))
                .anyMatch(item -> item.score() >= MIN_TRANSFER_EDGE);
        boolean lowScoreNeedsStrongerEvidence = matchingScore < 20.0 && skillCompatibility < 0.70;
        boolean potential = matchingScore < 90.0
                && potentialScore >= MIN_POTENTIAL_SCORE
                && skillCompatibility >= MIN_SKILL_COMPATIBILITY
                && familyCompatibility >= MIN_FAMILY_COMPATIBILITY
                && !seniority.severeGap()
                && hasCoreTarget
                && hasCareerEvidence
                && !lowScoreNeedsStrongerEvidence;

        if (!potential) {
            return new PotentialAssessment(false, round(potentialScore), null);
        }

        return new PotentialAssessment(
                true,
                round(potentialScore),
                buildReason(potentialScore, compatibility)
        );
    }

    public String modelVersion() {
        ensureLoaded();
        return model.version();
    }

    private Set<String> extractCandidateSkills(CV cv, Map<String, Double> vector) {
        LinkedHashSet<String> skills = new LinkedHashSet<>();
        addJsonSkills(skills, cv.getTopSkillsJson(), false);
        addKnownVectorTerms(skills, vector, 40);
        addKnownTextSkills(skills, cv.getRawText());
        return skills;
    }

    private Set<String> extractTargetSkills(Job job, Map<String, Double> vector) {
        LinkedHashSet<String> skills = new LinkedHashSet<>();
        boolean hasStructuredSkills = addJsonSkills(skills, job.getRequiredSkillsJson(), true);
        if (!hasStructuredSkills) {
            addKnownVectorTerms(skills, vector, 15);
            addKnownTextSkills(skills, String.join(" ",
                    nullToEmpty(job.getTitle()),
                    nullToEmpty(job.getDomain()),
                    nullToEmpty(job.getOriginalText())));
        }
        return skills;
    }

    private boolean addJsonSkills(Set<String> destination, String json, boolean keepUnknown) {
        if (json == null || json.isBlank() || "[]".equals(json)) return false;
        try {
            List<String> values = objectMapper.readValue(json, STRING_LIST);
            for (String value : values) {
                Set<String> known = knownSkillsInText(value);
                if (!known.isEmpty()) {
                    destination.addAll(known);
                } else if (keepUnknown) {
                    String normalized = normalize(value);
                    if (!normalized.isBlank()) destination.add(normalized);
                }
            }
            return !values.isEmpty();
        } catch (Exception ignored) {
            return false;
        }
    }

    private void addKnownVectorTerms(
            Set<String> destination,
            Map<String, Double> vector,
            int limit
    ) {
        if (vector == null || vector.isEmpty()) return;
        vector.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .limit(limit)
                .map(Map.Entry::getKey)
                .map(this::canonicalSkill)
                .filter(Objects::nonNull)
                .forEach(destination::add);
    }

    private void addKnownTextSkills(Set<String> destination, String text) {
        destination.addAll(knownSkillsInText(text));
    }

    private Set<String> knownSkillsInText(String text) {
        if (text == null || text.isBlank()) return Set.of();
        String normalizedText = " " + normalize(text) + " ";
        LinkedHashSet<String> result = new LinkedHashSet<>();
        aliasIndex.entrySet().stream()
                .sorted(Map.Entry.<String, String>comparingByKey(
                        Comparator.comparingInt(String::length).reversed()))
                .forEach(entry -> {
                    if (normalizedText.contains(" " + entry.getKey() + " ")) {
                        result.add(entry.getValue());
                    }
                });
        return result;
    }

    private TargetCompatibility bestCompatibility(Set<String> candidateSkills, String target) {
        if (candidateSkills.contains(target)) {
            return new TargetCompatibility(target, target, 1.0);
        }

        String bestSource = null;
        double bestScore = 0.0;
        for (String source : candidateSkills) {
            double score = transferIndex.getOrDefault(source, Map.of())
                    .getOrDefault(target, 0.0);
            if (score > bestScore) {
                bestScore = score;
                bestSource = source;
            }
        }
        return new TargetCompatibility(target, bestSource, bestScore);
    }

    private double familyCompatibility(Set<String> candidateSkills, Set<String> targetSkills) {
        Set<String> candidateFamilies = familiesOf(candidateSkills);
        Set<String> targetFamilies = familiesOf(targetSkills);
        if (candidateFamilies.isEmpty() || targetFamilies.isEmpty()) return 0.40;

        double best = 0.0;
        for (String source : candidateFamilies) {
            for (String target : targetFamilies) {
                if (source.equals(target)) return 1.0;
                best = Math.max(best, familyTransferIndex.getOrDefault(source, Map.of())
                        .getOrDefault(target, 0.0));
            }
        }
        return best;
    }

    private Set<String> familiesOf(Set<String> skills) {
        return skills.stream()
                .map(model.skills()::get)
                .filter(Objects::nonNull)
                .flatMap(definition -> safeList(definition.families()).stream())
                .filter(family -> !"foundation".equals(family))
                .collect(Collectors.toSet());
    }

    private double foundationCompatibility(List<TargetCompatibility> compatibility) {
        List<TargetCompatibility> foundations = compatibility.stream()
                .filter(item -> isFoundation(item.target()))
                .toList();
        if (foundations.isEmpty()) return 0.60;
        return foundations.stream().mapToDouble(TargetCompatibility::score).average().orElse(0.0);
    }

    private SeniorityAssessment assessSeniority(String cvText, String jobLevel) {
        int candidate = seniorityRank(extractSeniority(cvText));
        int target = seniorityRank(jobLevel);
        if (candidate < 0 || target < 0) return new SeniorityAssessment(0.65, false);

        int gap = target - candidate;
        if (gap <= 0) return new SeniorityAssessment(1.0, false);
        if (gap == 1) return new SeniorityAssessment(0.78, false);
        return new SeniorityAssessment(0.20, true);
    }

    private String extractSeniority(String text) {
        if (text == null) return null;
        String value = normalize(text);
        if (containsWord(value, "lead") || containsWord(value, "principal")
                || containsWord(value, "staff") || containsWord(value, "architect")) return "LEAD";
        if (containsWord(value, "senior") || containsWord(value, "sr")) return "SENIOR";
        if (containsWord(value, "middle") || containsWord(value, "mid")
                || containsWord(value, "mid level")
                || containsWord(value, "midlevel")) return "MID";
        if (containsWord(value, "junior") || containsWord(value, "jr")
                || containsWord(value, "fresher")) return "JUNIOR";
        if (containsWord(value, "intern") || containsWord(value, "trainee")) return "INTERN";
        return null;
    }

    private int seniorityRank(String value) {
        String normalized = extractSeniority(value);
        if (normalized == null) return -1;
        return switch (normalized) {
            case "INTERN" -> 0;
            case "JUNIOR" -> 1;
            case "MID" -> 2;
            case "SENIOR" -> 3;
            case "LEAD" -> 4;
            default -> -1;
        };
    }

    private String buildReason(
            double potentialScore,
            List<TargetCompatibility> compatibility
    ) {
        List<String> transfers = compatibility.stream()
                .filter(item -> item.source() != null
                        && !item.source().equals(item.target())
                        && item.score() >= MIN_TRANSFER_EDGE)
                .sorted(Comparator.comparingDouble(TargetCompatibility::score).reversed())
                .limit(3)
                .map(item -> item.source() + " -> " + item.target()
                        + " (" + Math.round(item.score() * 100) + "%)")
                .toList();
        List<String> aligned = compatibility.stream()
                .filter(item -> item.source() != null && item.source().equals(item.target()))
                .filter(item -> !isFoundation(item.target()))
                .limit(3)
                .map(TargetCompatibility::target)
                .toList();
        List<String> foundations = compatibility.stream()
                .filter(item -> item.score() >= MIN_TRANSFER_EDGE && isFoundation(item.target()))
                .limit(3)
                .map(TargetCompatibility::target)
                .toList();
        List<String> gaps = compatibility.stream()
                .filter(item -> item.source() == null || !item.source().equals(item.target()))
                .filter(item -> !isFoundation(item.target()))
                .limit(3)
                .map(TargetCompatibility::target)
                .toList();

        List<String> parts = new ArrayList<>();
        parts.add("Potential " + Math.round(potentialScore) + "/100.");
        if (!transfers.isEmpty()) parts.add("Transferable: " + String.join(", ", transfers) + ".");
        if (!aligned.isEmpty()) parts.add("Aligned: " + String.join(", ", aligned) + ".");
        if (!foundations.isEmpty()) parts.add("Shared foundation: " + String.join(", ", foundations) + ".");
        if (!gaps.isEmpty()) parts.add("Gaps to close: " + String.join(", ", gaps) + ".");
        return String.join(" ", parts);
    }

    private String canonicalSkill(String value) {
        if (value == null || value.isBlank()) return null;
        return aliasIndex.get(normalize(value));
    }

    private boolean isCore(String skill) {
        SkillDefinition definition = model.skills().get(skill);
        return definition != null && "core".equals(definition.kind());
    }

    private boolean isFoundation(String skill) {
        SkillDefinition definition = model.skills().get(skill);
        return definition != null && "foundation".equals(definition.kind());
    }

    private double skillWeight(String skill) {
        SkillDefinition definition = model.skills().get(skill);
        if (definition == null) return 1.5;
        return switch (definition.kind()) {
            case "core" -> 2.0;
            case "platform" -> 1.3;
            case "foundation" -> 0.8;
            default -> 1.0;
        };
    }

    private Map<String, String> buildAliasIndex(SkillTransferModel loaded) {
        Map<String, String> index = new LinkedHashMap<>();
        loaded.skills().forEach((canonical, definition) -> {
            index.put(normalize(canonical), canonical);
            safeList(definition.aliases()).forEach(alias -> index.put(normalize(alias), canonical));
        });
        return Collections.unmodifiableMap(index);
    }

    private Map<String, Map<String, Double>> buildTransferIndex(List<TransferRule> rules) {
        Map<String, Map<String, Double>> index = new HashMap<>();
        for (TransferRule rule : safeList(rules)) {
            putWeight(index, rule.from(), rule.to(), rule.weight());
            if (rule.bidirectional()) putWeight(index, rule.to(), rule.from(), rule.weight());
        }
        return immutableNestedMap(index);
    }

    private Map<String, Map<String, Double>> buildFamilyTransferIndex(List<FamilyTransferRule> rules) {
        Map<String, Map<String, Double>> index = new HashMap<>();
        for (FamilyTransferRule rule : safeList(rules)) {
            putWeight(index, rule.from(), rule.to(), rule.weight());
            if (rule.bidirectional()) putWeight(index, rule.to(), rule.from(), rule.weight());
        }
        return immutableNestedMap(index);
    }

    private void putWeight(
            Map<String, Map<String, Double>> index,
            String source,
            String target,
            double weight
    ) {
        if (weight < 0.0 || weight > 1.0) {
            throw new IllegalStateException("Transfer weight must be between 0 and 1");
        }
        index.computeIfAbsent(source, ignored -> new HashMap<>()).put(target, weight);
    }

    private Map<String, Map<String, Double>> immutableNestedMap(
            Map<String, Map<String, Double>> source
    ) {
        Map<String, Map<String, Double>> immutable = new HashMap<>();
        source.forEach((key, value) -> immutable.put(key, Map.copyOf(value)));
        return Map.copyOf(immutable);
    }

    private void ensureLoaded() {
        if (model == null) loadModel();
    }

    private String normalize(String value) {
        if (value == null) return "";
        String normalized = Normalizer.normalize(value.toLowerCase(Locale.ROOT), Normalizer.Form.NFKC)
                .replace("c++", " cpp ")
                .replace("c#", " csharp ")
                .replace(".net", " dotnet ")
                .replaceAll("[^\\p{L}\\p{N}]+", " ")
                .trim()
                .replaceAll("\\s+", " ");
        return normalized;
    }

    private boolean containsWord(String text, String phrase) {
        return (" " + text + " ").contains(" " + phrase + " ");
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private <T> List<T> safeList(List<T> values) {
        return values == null ? List.of() : values;
    }

    public record PotentialAssessment(boolean potential, double score, String reason) {
        static PotentialAssessment notPotential() {
            return new PotentialAssessment(false, 0.0, null);
        }
    }

    private record TargetCompatibility(String target, String source, double score) {}
    private record SeniorityAssessment(double score, boolean severeGap) {}
    private record SkillTransferModel(
            String version,
            Map<String, SkillDefinition> skills,
            List<TransferRule> transfers,
            List<FamilyTransferRule> familyTransfers
    ) {}
    private record SkillDefinition(List<String> aliases, List<String> families, String kind) {}
    private record TransferRule(String from, String to, double weight, boolean bidirectional) {}
    private record FamilyTransferRule(String from, String to, double weight, boolean bidirectional) {}
}
