package com.careerfit.backend;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

public class ApplicationContextTest extends BaseIntegrationTest {

    @Test
    void contextLoads() {
        // Context loads successfully if we reach here
        assertThat(true).isTrue();
    }
}
