import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

public class Modifier {
    public static void main(String[] args) throws IOException {
        Path p = Path.of("Backend/careerfit-backend/src/main/java/com/careerfit/backend/automation/entity/AutomationPolicy.java");
        String content = Files.readString(p);
        
        // Add demoModeEnabled field
        if (!content.contains("demoModeEnabled")) {
            content = content.replace(
                "    @JoinColumn(name = \"user_id\", nullable = false, unique = true)\n    private UserAccount user;\n",
                "    @JoinColumn(name = \"user_id\", nullable = false, unique = true)\n    private UserAccount user;\n\n" +
                "    @Column(name = \"demo_mode_enabled\", nullable = false)\n    private boolean demoModeEnabled = false;\n"
            );
            content = content.replace(
                "    public UserAccount getUser()                          { return user; }\n",
                "    public UserAccount getUser()                          { return user; }\n" +
                "    public boolean isDemoModeEnabled()                    { return demoModeEnabled; }\n" +
                "    public void setDemoModeEnabled(boolean b)             { this.demoModeEnabled = b; }\n"
            );
        }
        Files.writeString(p, content);
    }
}
