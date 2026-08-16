import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public class ModifierSummary {
    public static void main(String[] args) throws IOException {
        Path p = Path.of("Backend/careerfit-backend/src/main/java/com/careerfit/backend/automation/entity/AutomationPolicy.java");
        String content = Files.readString(p);
        
        if (!content.contains("boolean demoModeEnabled,")) {
            content = content.replace(
                "public record PolicySummary(\n        boolean autopilotEnabled,",
                "public record PolicySummary(\n        boolean demoModeEnabled,\n        boolean autopilotEnabled,"
            );
            Files.writeString(p, content);
        }
    }
}
