package com.careerfit.backend.config.security;

import com.careerfit.backend.auth.repository.UserAccountRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationListener;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Ensures demo accounts are disabled in production to prevent unauthorized access.
 * Can be bypassed for demonstration environments by setting DEMO_MODE=true.
 */
@Component
@Profile("prod")
public class DemoAccountGuard implements ApplicationListener<ContextRefreshedEvent> {

    private static final Logger log = LoggerFactory.getLogger(DemoAccountGuard.class);
    private static final List<String> DEMO_EMAILS = List.of("ca", "re", "ad");

    private final UserAccountRepository userAccountRepository;
    private final Environment env;

    public DemoAccountGuard(UserAccountRepository userAccountRepository, Environment env) {
        this.userAccountRepository = userAccountRepository;
        this.env = env;
    }

    @Override
    @Transactional
    public void onApplicationEvent(ContextRefreshedEvent event) {
        boolean demoMode = Boolean.parseBoolean(env.getProperty("DEMO_MODE", "false"));
        if (demoMode) {
            log.warn("DEMO_MODE is true. Demo accounts will remain active. DO NOT use this in real production!");
            return;
        }

        log.info("Disabling demo accounts for production safety...");
        int disabledCount = 0;
        for (String email : DEMO_EMAILS) {
            var userOpt = userAccountRepository.findByEmail(email);
            if (userOpt.isPresent()) {
                var user = userOpt.get();
                if (user.isActive()) {
                    user.setActive(false);
                    userAccountRepository.save(user);
                    disabledCount++;
                    log.info("Disabled demo account: {}", email);
                }
            }
        }
        log.info("Demo accounts guard complete. Disabled {} accounts.", disabledCount);
    }
}
