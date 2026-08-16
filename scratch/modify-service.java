import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public class ModifierService {
    public static void main(String[] args) throws IOException {
        Path p = Path.of("Backend/careerfit-backend/src/main/java/com/careerfit/backend/automation/service/AutomationPolicyService.java");
        String content = Files.readString(p);
        
        // Change getOrCreate
        if (!content.contains("setDemoModeEnabled(true)")) {
            String oldGetOrCreate = 
                "    public AutomationPolicy getOrCreate(UUID userId) {\n" +
                "        return policyRepo.findByUserId(userId).orElseGet(() -> {\n" +
                "            UserAccount user = userRepo.findById(userId)\n" +
                "                    .orElseThrow(() -> AppException.notFound(\"User\", userId));\n" +
                "            var policy = new AutomationPolicy(user);\n" +
                "            return policyRepo.save(policy);\n" +
                "        });\n" +
                "    }";
                
            String newGetOrCreate = 
                "    public AutomationPolicy getOrCreate(UUID userId) {\n" +
                "        return policyRepo.findByUserId(userId).orElseGet(() -> {\n" +
                "            UserAccount user = userRepo.findById(userId)\n" +
                "                    .orElseThrow(() -> AppException.notFound(\"User\", userId));\n" +
                "            var policy = new AutomationPolicy(user);\n" +
                "            if (user.getSource() == com.careerfit.backend.auth.entity.UserAccount.AccountSource.IMPORTED) {\n" +
                "                policy.setEmailNotificationsEnabled(false);\n" +
                "                policy.setDailyDigestEnabled(false);\n" +
                "            } else if (user.getRole() == com.careerfit.backend.auth.entity.UserAccount.Role.CANDIDATE || user.getRole() == com.careerfit.backend.auth.entity.UserAccount.Role.RECRUITER) {\n" +
                "                policy.setDemoModeEnabled(true);\n" +
                "            }\n" +
                "            return policyRepo.save(policy);\n" +
                "        });\n" +
                "    }";
            content = content.replace(oldGetOrCreate, newGetOrCreate);
            
            // Add demoModeEnabled to update logic
            content = content.replace(
                "if (req.autopilotEnabled()     != null) policy.setAutopilotEnabled(req.autopilotEnabled());",
                "if (req.demoModeEnabled()      != null) policy.setDemoModeEnabled(req.demoModeEnabled());\n        if (req.autopilotEnabled()     != null) policy.setAutopilotEnabled(req.autopilotEnabled());"
            );
            
            // Add demoModeEnabled to PolicySummary
            content = content.replace(
                "public record PolicySummary(\n            boolean autopilotEnabled,",
                "public record PolicySummary(\n            boolean demoModeEnabled,\n            boolean autopilotEnabled,"
            );
            
            // Add demoModeEnabled to summary method
            content = content.replace(
                "return new AutomationPolicy.PolicySummary(\n                    policy.isAutopilotEnabled(),",
                "return new AutomationPolicy.PolicySummary(\n                    policy.isDemoModeEnabled(),\n                    policy.isAutopilotEnabled(),"
            );
            
            // Add demoModeEnabled to update request
            content = content.replace(
                "public record PolicyUpdateRequest(\n            Boolean autopilotEnabled,",
                "public record PolicyUpdateRequest(\n            Boolean demoModeEnabled,\n            Boolean autopilotEnabled,"
            );
            
        }
        Files.writeString(p, content);
    }
}
