package com.careerfit.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.careerfit.backend.matching.service.MatchingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.*;
import org.springframework.http.client.JdkClientHttpRequestFactory;

import java.net.http.HttpClient;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ApiContractIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate rest;

    @MockBean
    private MatchingService matchingService;

    @BeforeEach
    void supportPatchRequests() {
        rest.getRestTemplate().setRequestFactory(
                new JdkClientHttpRequestFactory(HttpClient.newHttpClient()));
    }

    @Test
    void settingsPersistAndRejectKeysFromAnotherRole() {
        String candidateToken = login("ca", "12345678");

        ResponseEntity<JsonNode> before = rest.exchange(
                "/api/settings/me", HttpMethod.GET, entity(candidateToken, null), JsonNode.class);
        assertThat(before.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(before.getBody().path("data").path("role").asText()).isEqualTo("CANDIDATE");

        ResponseEntity<JsonNode> updated = rest.exchange(
                "/api/settings/me", HttpMethod.PATCH,
                entity(candidateToken, Map.of("values", Map.of("alertThreshold", 83, "dailyDigest", false))),
                JsonNode.class);
        assertThat(updated.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(updated.getBody().path("data").path("values").path("alertThreshold").asInt()).isEqualTo(83);

        ResponseEntity<JsonNode> reloaded = rest.exchange(
                "/api/settings/me", HttpMethod.GET, entity(candidateToken, null), JsonNode.class);
        assertThat(reloaded.getBody().path("data").path("values").path("dailyDigest").asBoolean()).isFalse();

        ResponseEntity<JsonNode> wrongRoleKey = rest.exchange(
                "/api/settings/me", HttpMethod.PATCH,
                entity(candidateToken, Map.of("values", Map.of("hiringManagerReview", true))),
                JsonNode.class);
        assertError(wrongRoleKey, HttpStatus.BAD_REQUEST, "BAD_REQUEST");
    }

    @Test
    void candidateCannotUseRecruiterJobWriteOrExportEndpoints() {
        String candidateToken = login("ca", "12345678");

        ResponseEntity<JsonNode> create = rest.exchange(
                "/api/jobs", HttpMethod.POST, entity(candidateToken, validJobPayload()), JsonNode.class);
        assertThat(create.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        ResponseEntity<byte[]> export = rest.exchange(
                "/api/jobs/export", HttpMethod.GET, entity(candidateToken, null), byte[].class);
        assertThat(export.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void validationErrorsUseStandardEnvelopeWithFieldErrors() {
        String recruiterToken = login("re", "12345678");
        Map<String, Object> invalid = Map.of(
                "title", "",
                "company", "CareerFit",
                "originalText", "",
                "salaryMode", "NEGOTIABLE");

        ResponseEntity<JsonNode> response = rest.exchange(
                "/api/jobs", HttpMethod.POST, entity(recruiterToken, invalid), JsonNode.class);

        assertError(response, HttpStatus.BAD_REQUEST, "VALIDATION_ERROR");
        JsonNode fields = response.getBody().path("error").path("fieldErrors").path("fields");
        assertThat(hasField(fields, "title")).isTrue();
        assertThat(hasField(fields, "originalText")).isTrue();
    }

    @Test
    void recruiterCanCompleteJobLifecycleAndExportUtf8Csv() {
        String recruiterToken = login("re", "12345678");
        Map<String, Object> payload = validJobPayload();

        ResponseEntity<JsonNode> created = rest.exchange(
                "/api/jobs", HttpMethod.POST, entity(recruiterToken, payload), JsonNode.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String jobId = created.getBody().path("data").path("id").asText();
        assertThat(jobId).isNotBlank();

        ResponseEntity<JsonNode> updated = rest.exchange(
                "/api/jobs/" + jobId, HttpMethod.PATCH,
                entity(recruiterToken, Map.of("title", "Updated \"Platform\", Engineer", "remoteType", "REMOTE")),
                JsonNode.class);
        assertThat(updated.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(updated.getBody().path("data").path("remoteType").asText()).isEqualTo("REMOTE");

        ResponseEntity<JsonNode> hidden = rest.exchange(
                "/api/jobs/" + jobId + "/status?status=HIDDEN_BY_ADMIN", HttpMethod.PATCH,
                entity(recruiterToken, null), JsonNode.class);
        assertError(hidden, HttpStatus.BAD_REQUEST, "BAD_REQUEST");

        ResponseEntity<JsonNode> status = rest.exchange(
                "/api/jobs/" + jobId + "/status?status=DRAFT", HttpMethod.PATCH,
                entity(recruiterToken, null), JsonNode.class);
        assertThat(status.getBody().path("data").path("status").asText()).isEqualTo("DRAFT");

        ResponseEntity<byte[]> exported = rest.exchange(
                "/api/jobs/export", HttpMethod.GET, entity(recruiterToken, null), byte[].class);
        assertThat(exported.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(exported.getHeaders().getContentType().toString()).startsWith("text/csv");
        assertThat(exported.getBody()).startsWith((byte) 0xEF, (byte) 0xBB, (byte) 0xBF);
        assertThat(new String(exported.getBody(), java.nio.charset.StandardCharsets.UTF_8))
                .contains("Updated \"\"Platform\"\", Engineer");

        ResponseEntity<JsonNode> deleted = rest.exchange(
                "/api/jobs/" + jobId, HttpMethod.DELETE, entity(recruiterToken, null), JsonNode.class);
        assertThat(deleted.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<JsonNode> missing = rest.getForEntity("/api/jobs/" + jobId, JsonNode.class);
        assertError(missing, HttpStatus.NOT_FOUND, "NOT_FOUND");
    }

    private String login(String email, String password) {
        ResponseEntity<JsonNode> response = rest.postForEntity(
                "/api/auth/login", Map.of("email", email, "password", password), JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        String token = response.getBody().path("data").path("accessToken").asText();
        assertThat(token).isNotBlank();
        return token;
    }

    private HttpEntity<?> entity(String token, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        if (body != null) headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(body, headers);
    }

    private Map<String, Object> validJobPayload() {
        return Map.ofEntries(
                Map.entry("title", "Automated Test Backend Engineer " + UUID.randomUUID()),
                Map.entry("company", "CareerFit Test"),
                Map.entry("originalText", "Java Spring Boot PostgreSQL Docker REST API security automated testing and deployment experience."),
                Map.entry("requiredSkills", List.of("Java", "Spring Boot")),
                Map.entry("niceToHaveSkills", List.of("Docker")),
                Map.entry("seniorityLevel", "MID"),
                Map.entry("employmentType", "FULL_TIME"),
                Map.entry("location", "Can Tho"),
                Map.entry("remoteType", "HYBRID"),
                Map.entry("salaryMode", "NEGOTIABLE"),
                Map.entry("salaryCurrency", "VND"),
                Map.entry("salaryType", "MONTHLY"),
                Map.entry("salaryIsVisible", true),
                Map.entry("domain", "BACKEND"),
                Map.entry("language", "en"));
    }

    private void assertError(ResponseEntity<JsonNode> response, HttpStatus status, String code) {
        assertThat(response.getStatusCode()).isEqualTo(status);
        assertThat(response.getBody().path("success").asBoolean()).isFalse();
        assertThat(response.getBody().path("error").path("code").asText()).isEqualTo(code);
        assertThat(response.getBody().path("meta").path("requestId").asText()).isNotBlank();
    }

    private boolean hasField(JsonNode fields, String name) {
        for (JsonNode field : fields) {
            if (name.equals(field.path("field").asText())) return true;
        }
        return false;
    }
}
