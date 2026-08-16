import sys

with open('Backend/careerfit-backend/src/test/java/com/careerfit/backend/SettingsServiceTest.java', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import org.junit.jupiter.api.BeforeEach;", "import com.careerfit.backend.automation.service.AutomationPolicyService;\nimport com.careerfit.backend.automation.service.EffectiveAutomationPolicyResolver;\nimport org.junit.jupiter.api.BeforeEach;")
content = content.replace("service = new SettingsService(settingsRepo, userRepo, new ObjectMapper());", "service = new SettingsService(settingsRepo, userRepo, new ObjectMapper(), mock(AutomationPolicyService.class), mock(EffectiveAutomationPolicyResolver.class));")
content = content.replace("new SettingsDtos.UpdateSettingsRequest(Map.of(\"hiringManagerReview\", true))", "new SettingsDtos.UpdateSettingsRequest(Map.of(\"hiringManagerReview\", true), null)")
content = content.replace("new SettingsDtos.UpdateSettingsRequest(Map.of(\"alertThreshold\", 101))", "new SettingsDtos.UpdateSettingsRequest(Map.of(\"alertThreshold\", 101), null)")
content = content.replace("new SettingsDtos.UpdateSettingsRequest(Map.of(\"digestTime\", \"25:99\"))", "new SettingsDtos.UpdateSettingsRequest(Map.of(\"digestTime\", \"25:99\"), null)")
content = content.replace("new SettingsDtos.UpdateSettingsRequest(Map.of(\"dailyDigest\", \"yes\"))", "new SettingsDtos.UpdateSettingsRequest(Map.of(\"dailyDigest\", \"yes\"), null)")

with open('Backend/careerfit-backend/src/test/java/com/careerfit/backend/SettingsServiceTest.java', 'w', encoding='utf-8') as f:
    f.write(content)
