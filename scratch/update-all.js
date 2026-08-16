const fs = require('fs');

let ap = fs.readFileSync('Backend/careerfit-backend/src/main/java/com/careerfit/backend/automation/entity/AutomationPolicy.java', 'utf8');
ap = ap.replace(
    'private UserAccount user;\n\n    // ── Auto-apply',
    'private UserAccount user;\n\n    @Column(name = "demo_mode_enabled", nullable = false)\n    private boolean demoModeEnabled = false;\n\n    // ── Auto-apply'
);
ap = ap.replace(
    'public UserAccount getUser()                          { return user; }',
    'public UserAccount getUser()                          { return user; }\n    public boolean isDemoModeEnabled()                    { return demoModeEnabled; }\n    public void setDemoModeEnabled(boolean b)             { this.demoModeEnabled = b; }'
);
ap = ap.replace(
    'public record PolicySummary(\n        boolean autopilotEnabled,',
    'public record PolicySummary(\n        boolean demoModeEnabled,\n        boolean autopilotEnabled,'
);
fs.writeFileSync('Backend/careerfit-backend/src/main/java/com/careerfit/backend/automation/entity/AutomationPolicy.java', ap);

let aps = fs.readFileSync('Backend/careerfit-backend/src/main/java/com/careerfit/backend/automation/service/AutomationPolicyService.java', 'utf8');
aps = aps.replace(
    'var policy = new AutomationPolicy(user);\n            return policyRepo.save(policy);',
    'var policy = new AutomationPolicy(user);\n            if (user.getSource() == com.careerfit.backend.auth.entity.UserAccount.AccountSource.IMPORTED) {\n                policy.setEmailNotificationsEnabled(false);\n                policy.setDailyDigestEnabled(false);\n            } else if (user.getRole() == com.careerfit.backend.auth.entity.UserAccount.Role.CANDIDATE || user.getRole() == com.careerfit.backend.auth.entity.UserAccount.Role.RECRUITER) {\n                policy.setDemoModeEnabled(true);\n            }\n            return policyRepo.save(policy);'
);
aps = aps.replace(
    'if (req.autopilotEnabled()     != null) policy.setAutopilotEnabled(req.autopilotEnabled());',
    'if (req.demoModeEnabled()      != null) policy.setDemoModeEnabled(req.demoModeEnabled());\n    if (req.autopilotEnabled()     != null) policy.setAutopilotEnabled(req.autopilotEnabled());'
);
aps = aps.replace(
    'public record PolicyUpdateRequest(\n        Boolean autopilotEnabled,',
    'public record PolicyUpdateRequest(\n        Boolean demoModeEnabled,\n        Boolean autopilotEnabled,'
);
aps = aps.replace(
    'return new AutomationPolicy.PolicySummary(\n                policy.isAutopilotEnabled(),',
    'return new AutomationPolicy.PolicySummary(\n                policy.isDemoModeEnabled(), policy.isAutopilotEnabled(),'
);
aps = aps.replace(
    'return new AutomationPolicy.PolicySummary(\n            policy.isAutopilotEnabled(),',
    'return new AutomationPolicy.PolicySummary(\n            policy.isDemoModeEnabled(), policy.isAutopilotEnabled(),'
);
fs.writeFileSync('Backend/careerfit-backend/src/main/java/com/careerfit/backend/automation/service/AutomationPolicyService.java', aps);

let ss = fs.readFileSync('Backend/careerfit-backend/src/main/java/com/careerfit/backend/settings/service/SettingsService.java', 'utf8');
ss = ss.replace(
    'new AutomationPolicyService.PolicyUpdateRequest(\n                req.autopilotEnabled(),',
    'new AutomationPolicyService.PolicyUpdateRequest(\n                req.demoModeEnabled(),\n                req.autopilotEnabled(),'
);
ss = ss.replace(
    'public record SettingsUpdateRequest(\n        Boolean autopilotEnabled,',
    'public record SettingsUpdateRequest(\n        Boolean demoModeEnabled,\n        Boolean autopilotEnabled,'
);
fs.writeFileSync('Backend/careerfit-backend/src/main/java/com/careerfit/backend/settings/service/SettingsService.java', ss);
