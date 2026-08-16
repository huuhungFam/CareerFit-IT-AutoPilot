const fs = require('fs');
let content = fs.readFileSync('Backend/careerfit-backend/src/main/java/com/careerfit/backend/automation/entity/AutomationPolicy.java', 'utf8');

content = content.replace(
    'private UserAccount user;\n\n    // ── Auto-apply',
    'private UserAccount user;\n\n    @Column(name = "demo_mode_enabled", nullable = false)\n    private boolean demoModeEnabled = false;\n\n    // ── Auto-apply'
);

content = content.replace(
    'public UserAccount getUser()                          { return user; }',
    'public UserAccount getUser()                          { return user; }\n    public boolean isDemoModeEnabled()                    { return demoModeEnabled; }\n    public void setDemoModeEnabled(boolean b)             { this.demoModeEnabled = b; }'
);

content = content.replace(
    'public record PolicySummary(\n            boolean autopilotEnabled,',
    'public record PolicySummary(\n            boolean demoModeEnabled,\n            boolean autopilotEnabled,'
);

fs.writeFileSync('Backend/careerfit-backend/src/main/java/com/careerfit/backend/automation/entity/AutomationPolicy.java', content);
