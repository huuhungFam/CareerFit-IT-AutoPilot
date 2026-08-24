package com.careerfit.backend;

import com.careerfit.backend.config.AppProperties;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class AppPropertiesTest {

    @Test
    void emailActionUrlFallsBackToConfiguredApplicationBaseUrl() {
        AppProperties properties = new AppProperties();
        ReflectionTestUtils.setField(properties, "baseUrl", "https://careerfit.example/");
        ReflectionTestUtils.setField(properties, "emailActionBaseUrl", "");

        assertThat(properties.getEmailActionBaseUrl())
                .isEqualTo("https://careerfit.example/api/email-action/redeem");
    }

    @Test
    void emailActionUrlCanBeOverridden() {
        AppProperties properties = new AppProperties();
        ReflectionTestUtils.setField(properties, "baseUrl", "https://careerfit.example");
        ReflectionTestUtils.setField(properties, "emailActionBaseUrl", "https://actions.example/redeem");

        assertThat(properties.getEmailActionBaseUrl())
                .isEqualTo("https://actions.example/redeem");
    }
}
