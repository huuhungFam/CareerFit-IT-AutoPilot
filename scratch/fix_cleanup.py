import sys

with open('Backend/careerfit-backend/src/test/java/com/careerfit/backend/Phase2SettingsCatalogCvIntegrationTest.java', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('import com.careerfit.backend.candidate.repository.ApplicationRepository;', 'import org.springframework.jdbc.core.JdbcTemplate;')
content = content.replace('@Autowired private ApplicationRepository applicationRepo;', '@Autowired private JdbcTemplate jdbcTemplate;')

cleanup = '''        jdbcTemplate.execute("DELETE FROM application; DELETE FROM matching; DELETE FROM cv; DELETE FROM candidate; DELETE FROM job; DELETE FROM employer_profile; DELETE FROM user_settings; DELETE FROM user_account;");'''

content = content.replace('''applicationRepo.deleteAll();
        cvRepo.deleteAll();
        matchingRepo.deleteAll();
        jobRepo.deleteAll();
        employerRepo.deleteAll();
        candidateRepo.deleteAll();
        settingsRepo.deleteAll();
        userRepo.deleteAll();''', cleanup)

with open('Backend/careerfit-backend/src/test/java/com/careerfit/backend/Phase2SettingsCatalogCvIntegrationTest.java', 'w', encoding='utf-8') as f:
    f.write(content)
