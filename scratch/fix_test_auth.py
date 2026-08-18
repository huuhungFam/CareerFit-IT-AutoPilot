import sys
import re

with open('Backend/careerfit-backend/src/test/java/com/careerfit/backend/Phase2SettingsCatalogCvIntegrationTest.java', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('import org.springframework.test.web.servlet.MockMvc;', 'import org.springframework.test.web.servlet.MockMvc;\nimport com.careerfit.backend.config.security.JwtService;\nimport org.springframework.http.HttpHeaders;')
content = content.replace('@Autowired private MockMvc mockMvc;', '@Autowired private MockMvc mockMvc;\n    @Autowired private JwtService jwtService;\n\n    private String getToken(UserAccount user) {\n        return "Bearer " + jwtService.generateToken(user.getId().toString(), user.getRole().name());\n    }')
content = re.sub(r'\.requestAttr\("userId", ([a-zA-Z0-9_]+)\.getId\(\)\)', r'.header(HttpHeaders.AUTHORIZATION, getToken(\1))', content)

with open('Backend/careerfit-backend/src/test/java/com/careerfit/backend/Phase2SettingsCatalogCvIntegrationTest.java', 'w', encoding='utf-8') as f:
    f.write(content)
