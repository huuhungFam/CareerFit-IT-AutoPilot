-- ==========================================
-- V5 Migration: Rich sample data
-- Passwords for all seeded accounts are: password
-- ==========================================

-- BCrypt hash for "password" (cost 10)
-- $2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62

-- Enrich the small V4 seed rows.
UPDATE employer_profile
SET
    summary = 'Global software delivery, cloud migration, data platforms and enterprise product engineering.',
    company_size = '10000+',
    location = 'Ho Chi Minh, Viet Nam',
    cover_url = 'https://images.unsplash.com/photo-1497366754035-f200968a6e72',
    benefits = '["Hybrid work", "13th month salary", "Premium healthcare", "Technical training"]'::jsonb
WHERE slug = 'fpt-software';

UPDATE employer_profile
SET
    summary = 'Consumer internet, gaming, fintech and large-scale messaging platforms.',
    company_size = '1000-5000',
    location = 'Ho Chi Minh, Viet Nam',
    cover_url = 'https://images.unsplash.com/photo-1497366811353-6870744d04b2',
    benefits = '["Performance bonus", "Free gym", "MacBook", "Learning budget"]'::jsonb
WHERE slug = 'vng-corporation';

UPDATE candidate
SET
    phone = '0901000001',
    desired_seniority = 'Mid',
    desired_work_model = 'HYBRID',
    desired_salary_min = 1800,
    desired_salary_max = 2800,
    desired_salary_currency = 'USD',
    about_me = 'Backend engineer focused on Spring Boot, PostgreSQL and reliable APIs.',
    auto_apply_enabled = true,
    auto_apply_threshold = 88.00
WHERE id = '88888888-8888-8888-8888-888888888888';

UPDATE candidate
SET
    phone = '0901000002',
    desired_seniority = 'Mid',
    desired_work_model = 'REMOTE',
    desired_salary_min = 1400,
    desired_salary_max = 2300,
    desired_salary_currency = 'USD',
    about_me = 'Frontend engineer building React, TypeScript and design-system heavy products.',
    auto_apply_enabled = false,
    auto_apply_threshold = 90.00
WHERE id = '99999999-9999-9999-9999-999999999999';

-- More users: recruiters, candidates, inactive and unverified cases.
INSERT INTO user_account (id, email, password_hash, role, full_name, is_active, email_verified, preferred_language, created_at, updated_at)
VALUES
('10000000-0000-0000-0000-000000000003', 'recruiter3@careerfit.dev', '$2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62', 'RECRUITER', 'Northstar HealthTech Recruiter', true, true, 'en', NOW() - INTERVAL '55 days', NOW() - INTERVAL '2 days'),
('10000000-0000-0000-0000-000000000004', 'recruiter4@careerfit.dev', '$2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62', 'RECRUITER', 'Lotus EduTech Recruiter', true, true, 'vi', NOW() - INTERVAL '48 days', NOW() - INTERVAL '3 days'),
('10000000-0000-0000-0000-000000000005', 'recruiter5@careerfit.dev', '$2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62', 'RECRUITER', 'Mekong AI Lab Recruiter', true, true, 'en', NOW() - INTERVAL '42 days', NOW() - INTERVAL '4 days'),
('10000000-0000-0000-0000-000000000006', 'recruiter6@careerfit.dev', '$2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62', 'RECRUITER', 'Saigon Fintech Recruiter', true, false, 'vi', NOW() - INTERVAL '31 days', NOW() - INTERVAL '5 days'),
('10000000-0000-0000-0000-000000000007', 'recruiter7@careerfit.dev', '$2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62', 'RECRUITER', 'RemoteWorks Asia Recruiter', false, true, 'en', NOW() - INTERVAL '25 days', NOW() - INTERVAL '8 days'),
('20000000-0000-0000-0000-000000000003', 'candidate3@careerfit.dev', '$2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62', 'CANDIDATE', 'Le Minh Quan', true, true, 'vi', NOW() - INTERVAL '70 days', NOW() - INTERVAL '1 day'),
('20000000-0000-0000-0000-000000000004', 'candidate4@careerfit.dev', '$2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62', 'CANDIDATE', 'Pham Thu Ha', true, true, 'en', NOW() - INTERVAL '66 days', NOW() - INTERVAL '2 days'),
('20000000-0000-0000-0000-000000000005', 'candidate5@careerfit.dev', '$2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62', 'CANDIDATE', 'Do Anh Khoa', true, true, 'vi', NOW() - INTERVAL '61 days', NOW() - INTERVAL '3 days'),
('20000000-0000-0000-0000-000000000006', 'candidate6@careerfit.dev', '$2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62', 'CANDIDATE', 'Vo Ngoc Linh', true, false, 'vi', NOW() - INTERVAL '58 days', NOW() - INTERVAL '6 days'),
('20000000-0000-0000-0000-000000000007', 'candidate7@careerfit.dev', '$2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62', 'CANDIDATE', 'Bui Duc Huy', true, true, 'en', NOW() - INTERVAL '53 days', NOW() - INTERVAL '3 hours'),
('20000000-0000-0000-0000-000000000008', 'candidate8@careerfit.dev', '$2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62', 'CANDIDATE', 'Nguyen Mai Anh', true, true, 'vi', NOW() - INTERVAL '47 days', NOW() - INTERVAL '12 hours'),
('20000000-0000-0000-0000-000000000009', 'candidate9@careerfit.dev', '$2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62', 'CANDIDATE', 'Tran Quoc Bao', true, true, 'vi', NOW() - INTERVAL '39 days', NOW() - INTERVAL '18 hours'),
('20000000-0000-0000-0000-000000000010', 'candidate10@careerfit.dev', '$2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62', 'CANDIDATE', 'Hoang Yen Nhi', false, true, 'en', NOW() - INTERVAL '28 days', NOW() - INTERVAL '10 days')
ON CONFLICT (email) DO UPDATE
SET full_name = EXCLUDED.full_name,
    is_active = EXCLUDED.is_active,
    email_verified = EXCLUDED.email_verified,
    preferred_language = EXCLUDED.preferred_language,
    updated_at = NOW();

INSERT INTO employer_profile (id, recruiter_id, company_name, slug, logo_url, cover_url, summary, description, industry, company_size, location, website_url, benefits, is_featured, created_at, updated_at)
VALUES
('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'Northstar HealthTech', 'northstar-healthtech', 'https://logo.clearbit.com/healthcareitnews.com', 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528', 'Healthcare SaaS for clinics and hospitals.', 'Northstar builds scheduling, patient engagement and medical analytics tools for regional healthcare networks.', 'HealthTech', '201-500', 'Da Nang, Viet Nam', 'https://northstar-health.example', '["Remote days", "Healthcare plan", "Conference budget", "Wellness allowance"]'::jsonb, true, NOW() - INTERVAL '55 days', NOW() - INTERVAL '2 days'),
('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'Lotus EduTech', 'lotus-edutech', 'https://logo.clearbit.com/coursera.org', 'https://images.unsplash.com/photo-1509062522246-3755977927d7', 'Learning platforms for schools and enterprise training.', 'Lotus EduTech ships assessment, LMS and classroom analytics products for Viet Nam and Southeast Asia.', 'EdTech', '51-200', 'Ha Noi, Viet Nam', 'https://lotus-edutech.example', '["Flexible hours", "Course stipend", "Hybrid work", "Childcare support"]'::jsonb, false, NOW() - INTERVAL '48 days', NOW() - INTERVAL '3 days'),
('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', 'Mekong AI Lab', 'mekong-ai-lab', 'https://logo.clearbit.com/openai.com', 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4', 'Applied AI studio for search, recommendation and document intelligence.', 'Mekong AI Lab builds retrieval, ranking, LLM workflow and MLOps products for enterprise teams.', 'AI Research', '11-50', 'Ho Chi Minh, Viet Nam', 'https://mekong-ai.example', '["Research time", "GPU credits", "Stock options", "Remote first"]'::jsonb, true, NOW() - INTERVAL '42 days', NOW() - INTERVAL '4 days'),
('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000006', 'Saigon Fintech', 'saigon-fintech', 'https://logo.clearbit.com/stripe.com', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f', 'Payments, lending and risk tooling for SMEs.', 'Saigon Fintech develops transaction monitoring, merchant onboarding and credit scoring services.', 'Fintech', '501-1000', 'Ho Chi Minh, Viet Nam', 'https://saigon-fintech.example', '["Quarterly bonus", "Private insurance", "Gym membership", "Hybrid work"]'::jsonb, false, NOW() - INTERVAL '31 days', NOW() - INTERVAL '5 days'),
('30000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000007', 'RemoteWorks Asia', 'remoteworks-asia', 'https://logo.clearbit.com/github.com', 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d', 'Remote-first product teams for global SaaS companies.', 'RemoteWorks Asia hires distributed engineers for collaboration tools, analytics and developer platforms.', 'SaaS', '51-200', 'Remote', 'https://remoteworks.example', '["Remote first", "Home office budget", "Async culture", "Unlimited PTO policy"]'::jsonb, true, NOW() - INTERVAL '25 days', NOW() - INTERVAL '8 days')
ON CONFLICT (slug) DO UPDATE
SET summary = EXCLUDED.summary,
    description = EXCLUDED.description,
    benefits = EXCLUDED.benefits,
    is_featured = EXCLUDED.is_featured,
    updated_at = NOW();

INSERT INTO candidate (id, user_id, phone, location, desired_title, desired_seniority, desired_skills, desired_work_model, desired_salary_min, desired_salary_max, desired_salary_currency, years_of_experience, about_me, auto_apply_enabled, auto_apply_threshold, preferred_language, avatar_url, created_at, updated_at)
VALUES
('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '0902000003', 'Ho Chi Minh', 'DevOps Engineer', 'Senior', '["AWS", "Kubernetes", "Terraform", "CI/CD"]'::jsonb, 'REMOTE', 2500, 4200, 'USD', 6, 'Infrastructure engineer who likes observability and reliable deployment pipelines.', true, 86.00, 'vi', 'https://ui-avatars.com/api/?name=Le+Minh+Quan&background=random', NOW() - INTERVAL '70 days', NOW() - INTERVAL '1 day'),
('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '0902000004', 'Da Nang', 'Data Analyst', 'Junior', '["SQL", "Power BI", "Python", "Statistics"]'::jsonb, 'HYBRID', 700, 1200, 'USD', 1, 'Analyst with strong reporting discipline and product curiosity.', false, 90.00, 'en', 'https://ui-avatars.com/api/?name=Pham+Thu+Ha&background=random', NOW() - INTERVAL '66 days', NOW() - INTERVAL '2 days'),
('40000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', '0902000005', 'Ha Noi', 'Mobile Engineer', 'Mid', '["Flutter", "Dart", "Firebase", "REST"]'::jsonb, 'ONSITE', 1200, 2200, 'USD', 3, 'Mobile engineer shipping consumer apps with clean state management.', true, 82.00, 'vi', 'https://ui-avatars.com/api/?name=Do+Anh+Khoa&background=random', NOW() - INTERVAL '61 days', NOW() - INTERVAL '3 days'),
('40000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006', '0902000006', 'Ho Chi Minh', 'QA Automation Engineer', 'Mid', '["Selenium", "Playwright", "Java", "API Testing"]'::jsonb, 'HYBRID', 1000, 1800, 'USD', 4, 'QA automation specialist focused on regression reliability and release confidence.', false, 90.00, 'vi', 'https://ui-avatars.com/api/?name=Vo+Ngoc+Linh&background=random', NOW() - INTERVAL '58 days', NOW() - INTERVAL '6 days'),
('40000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000007', '0902000007', 'Remote', 'Machine Learning Engineer', 'Senior', '["Python", "PyTorch", "MLOps", "Vector Search"]'::jsonb, 'REMOTE', 3000, 5500, 'USD', 7, 'ML engineer building retrieval, recommendation and model serving systems.', true, 91.00, 'en', 'https://ui-avatars.com/api/?name=Bui+Duc+Huy&background=random', NOW() - INTERVAL '53 days', NOW() - INTERVAL '3 hours'),
('40000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000008', '0902000008', 'Can Tho', 'Business Analyst', 'Junior', '["User Stories", "BPMN", "SQL", "UAT"]'::jsonb, 'HYBRID', 600, 1000, 'USD', 1, 'Business analyst comfortable with discovery, process modeling and UAT.', false, 90.00, 'vi', 'https://ui-avatars.com/api/?name=Nguyen+Mai+Anh&background=random', NOW() - INTERVAL '47 days', NOW() - INTERVAL '12 hours'),
('40000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000009', '0902000009', 'Ho Chi Minh', 'Security Engineer', 'Senior', '["AppSec", "Pentest", "OWASP", "Cloud Security"]'::jsonb, 'HYBRID', 2800, 4800, 'USD', 8, 'Security engineer with application security and cloud threat modeling background.', true, 89.00, 'vi', 'https://ui-avatars.com/api/?name=Tran+Quoc+Bao&background=random', NOW() - INTERVAL '39 days', NOW() - INTERVAL '18 hours'),
('40000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000010', '0902000010', 'Ha Noi', 'Product Manager', 'Mid', '["Roadmap", "Analytics", "A/B Testing", "SaaS"]'::jsonb, 'REMOTE', 1800, 3200, 'USD', 5, 'Product manager with B2B SaaS and analytics experience.', false, 90.00, 'en', 'https://ui-avatars.com/api/?name=Hoang+Yen+Nhi&background=random', NOW() - INTERVAL '28 days', NOW() - INTERVAL '10 days')
ON CONFLICT (user_id) DO UPDATE
SET desired_title = EXCLUDED.desired_title,
    desired_skills = EXCLUDED.desired_skills,
    about_me = EXCLUDED.about_me,
    updated_at = NOW();

INSERT INTO cv (id, candidate_id, display_name, source, is_default, raw_text, parsed_summary, top_skills, extracted_terms, language, status, file_path, file_original_name, failure_reason, last_scored_at, created_at, updated_at)
VALUES
('50000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888', 'Nguyen Van A - Backend CV', 'UPLOAD', true, 'Java Spring Boot PostgreSQL Docker AWS microservices REST API', 'Backend engineer with Spring Boot and PostgreSQL experience.', '["Java", "Spring Boot", "PostgreSQL", "Docker", "AWS"]'::jsonb, '{"java":0.91,"spring":0.88,"postgresql":0.72,"docker":0.64}'::jsonb, 'en', 'SCORING_DONE', './storage/cv/nguyen-van-a-backend.pdf', 'nguyen-van-a-backend.pdf', null, NOW() - INTERVAL '2 days', NOW() - INTERVAL '40 days', NOW() - INTERVAL '2 days'),
('50000000-0000-0000-0000-000000000002', '99999999-9999-9999-9999-999999999999', 'Tran Thi B - Frontend CV', 'MANUAL', true, 'React TypeScript Redux accessibility design systems CSS testing', 'Frontend engineer focused on React and TypeScript product UIs.', '["React", "TypeScript", "Redux", "CSS", "Accessibility"]'::jsonb, '{"react":0.92,"typescript":0.86,"redux":0.62,"css":0.55}'::jsonb, 'en', 'SCORING_DONE', null, null, null, NOW() - INTERVAL '1 day', NOW() - INTERVAL '35 days', NOW() - INTERVAL '1 day'),
('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000003', 'DevOps Main Resume', 'UPLOAD', true, 'AWS Kubernetes Terraform GitHub Actions Prometheus Grafana Linux', 'Senior DevOps engineer with cloud, Kubernetes and IaC experience.', '["AWS", "Kubernetes", "Terraform", "Prometheus", "Linux"]'::jsonb, '{"kubernetes":0.9,"terraform":0.8,"aws":0.78,"prometheus":0.45}'::jsonb, 'en', 'SCORING_DONE', './storage/cv/devops-main.pdf', 'devops-main.pdf', null, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '28 days', NOW() - INTERVAL '5 hours'),
('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004', 'Data Analyst Junior CV', 'UPLOAD', true, 'SQL Power BI Python pandas dashboard cohort retention funnel', 'Junior data analyst with dashboard and reporting experience.', '["SQL", "Power BI", "Python", "Pandas"]'::jsonb, '{"sql":0.82,"powerbi":0.74,"python":0.56,"dashboard":0.52}'::jsonb, 'en', 'SCORING_DONE', './storage/cv/data-analyst.pdf', 'data-analyst.pdf', null, NOW() - INTERVAL '3 days', NOW() - INTERVAL '26 days', NOW() - INTERVAL '3 days'),
('50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000005', 'Mobile Flutter CV', 'MANUAL', true, 'Flutter Dart Firebase REST Bloc mobile release Play Store App Store', 'Mobile engineer with Flutter and release pipeline experience.', '["Flutter", "Dart", "Firebase", "REST"]'::jsonb, '{"flutter":0.88,"dart":0.72,"firebase":0.66,"mobile":0.5}'::jsonb, 'en', 'SCORING_DONE', null, null, null, NOW() - INTERVAL '4 days', NOW() - INTERVAL '22 days', NOW() - INTERVAL '4 days'),
('50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000006', 'QA Automation CV', 'UPLOAD', true, 'Playwright Selenium Java Postman API testing test strategy CI', 'QA engineer with UI and API automation coverage.', '["Playwright", "Selenium", "Java", "API Testing"]'::jsonb, '{"playwright":0.83,"selenium":0.7,"java":0.5,"api":0.61}'::jsonb, 'en', 'SCORING_DONE', './storage/cv/qa-automation.pdf', 'qa-automation.pdf', null, NOW() - INTERVAL '1 day', NOW() - INTERVAL '21 days', NOW() - INTERVAL '1 day'),
('50000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000007', 'ML Engineer Portfolio CV', 'UPLOAD', true, 'Python PyTorch TensorFlow vector search embeddings MLOps FastAPI Kubernetes', 'Senior ML engineer with recommendation and model serving experience.', '["Python", "PyTorch", "Vector Search", "MLOps", "FastAPI"]'::jsonb, '{"python":0.8,"pytorch":0.78,"mlops":0.73,"vector":0.69}'::jsonb, 'en', 'SCORING_DONE', './storage/cv/ml-engineer.pdf', 'ml-engineer.pdf', null, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '19 days', NOW() - INTERVAL '2 hours'),
('50000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000008', 'Business Analyst CV', 'MANUAL', true, 'BPMN user stories wireframes SQL UAT stakeholder workshop', 'Junior BA with requirements, BPMN and UAT practice.', '["BPMN", "User Stories", "SQL", "UAT"]'::jsonb, '{"bpmn":0.75,"uat":0.7,"sql":0.55,"workshop":0.5}'::jsonb, 'en', 'SCORING_DONE', null, null, null, NOW() - INTERVAL '6 days', NOW() - INTERVAL '17 days', NOW() - INTERVAL '6 days'),
('50000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000009', 'Security Engineer CV', 'UPLOAD', true, 'OWASP AppSec pentest threat modeling cloud security SAST DAST', 'Senior security engineer with AppSec and cloud security background.', '["AppSec", "OWASP", "Cloud Security", "Pentest"]'::jsonb, '{"appsec":0.86,"owasp":0.78,"cloud":0.61,"pentest":0.72}'::jsonb, 'en', 'SCORING_DONE', './storage/cv/security-engineer.pdf', 'security-engineer.pdf', null, NOW() - INTERVAL '9 hours', NOW() - INTERVAL '14 days', NOW() - INTERVAL '9 hours'),
('50000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000010', 'Product Manager CV', 'UPLOAD', true, 'Roadmap analytics SQL discovery A/B testing SaaS pricing activation retention', 'Product manager with analytics and B2B SaaS experience.', '["Roadmap", "Analytics", "A/B Testing", "SaaS"]'::jsonb, '{"roadmap":0.73,"analytics":0.82,"saas":0.68,"abtest":0.52}'::jsonb, 'en', 'SCORING_DONE', './storage/cv/product-manager.pdf', 'product-manager.pdf', null, NOW() - INTERVAL '8 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '8 days'),
('50000000-0000-0000-0000-000000000011', '88888888-8888-8888-8888-888888888888', 'Old CV - parse failed', 'UPLOAD', false, null, null, null, null, null, 'FAILED', './storage/cv/corrupt-file.pdf', 'corrupt-file.pdf', 'PDF text extraction failed because file is encrypted.', null, NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),
('50000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000004', 'Processing CV draft', 'UPLOAD', false, 'SQL dashboard analytics', null, '["SQL"]'::jsonb, null, 'en', 'PROCESSING', './storage/cv/processing-data-cv.pdf', 'processing-data-cv.pdf', null, null, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '30 minutes'),
('50000000-0000-0000-0000-000000000013', '40000000-0000-0000-0000-000000000006', 'Validating CV upload', 'UPLOAD', false, null, null, null, null, null, 'VALIDATING', './storage/cv/validating-qa-cv.pdf', 'validating-qa-cv.pdf', null, null, NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '20 minutes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO candidate_portfolio_link (id, candidate_id, type, url, created_at, updated_at)
VALUES
('51000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888', 'GITHUB', 'https://github.com/nguyenvana', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
('51000000-0000-0000-0000-000000000002', '99999999-9999-9999-9999-999999999999', 'PORTFOLIO', 'https://tranthib.design', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),
('51000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000003', 'LINKEDIN', 'https://linkedin.com/in/leminhquan', NOW() - INTERVAL '16 days', NOW() - INTERVAL '16 days'),
('51000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000007', 'GITHUB', 'https://github.com/duchuy-ml', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),
('51000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000009', 'BLOG', 'https://security-notes.example/bao', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO candidate_portfolio_project (id, candidate_id, name, role, summary, tech_stack, project_url, impact, created_at, updated_at)
VALUES
('52000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888', 'Order Processing API', 'Backend Engineer', 'Built resilient order APIs with async workers and PostgreSQL locking.', '["Java", "Spring Boot", "PostgreSQL", "RabbitMQ"]'::jsonb, 'https://github.com/nguyenvana/order-api', 'Reduced duplicate order incidents by 80%.', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
('52000000-0000-0000-0000-000000000002', '99999999-9999-9999-9999-999999999999', 'Recruiter Dashboard UI', 'Frontend Engineer', 'Implemented dashboard filters, charts and bulk action flows.', '["React", "TypeScript", "Vite", "Recharts"]'::jsonb, 'https://tranthib.design/recruiter-dashboard', 'Cut task completion time in usability tests by 35%.', NOW() - INTERVAL '24 days', NOW() - INTERVAL '24 days'),
('52000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000003', 'Kubernetes Deployment Platform', 'DevOps Lead', 'Standardized Helm charts, observability and deployment approvals.', '["Kubernetes", "Terraform", "Prometheus", "GitHub Actions"]'::jsonb, 'https://github.com/leminhquan/platform', 'Improved deployment frequency from weekly to daily.', NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days'),
('52000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000007', 'Vector Job Recommender', 'ML Engineer', 'Built embeddings, approximate nearest neighbor search and online evaluation.', '["Python", "PyTorch", "FastAPI", "pgvector"]'::jsonb, 'https://github.com/duchuy-ml/job-recommender', 'Lifted recommendation CTR by 18%.', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),
('52000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000009', 'AppSec Baseline Program', 'Security Engineer', 'Introduced secure SDLC gates, dependency checks and threat modeling.', '["OWASP", "SAST", "DAST", "Threat Modeling"]'::jsonb, 'https://security-notes.example/bao/appsec-baseline', 'Resolved 120 critical findings in two quarters.', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO job (id, recruiter_id, title, company, original_text, required_skills, nice_to_have_skills, seniority_level, employment_type, location, remote_type, domain, salary_mode, salary_min, salary_max, salary_currency, salary_type, salary_is_visible, salary_display_text, learned_profile_vector, tfidf_vector, language, status, deadline, applicant_count, view_count, created_at, updated_at)
VALUES
('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Healthcare Backend Engineer', 'Northstar HealthTech', 'Build secure scheduling and clinical workflow APIs with Java, Spring Boot, PostgreSQL and integrations.', '["Java", "Spring Boot", "PostgreSQL", "REST", "Security"]'::jsonb, '["FHIR", "AWS", "Docker"]'::jsonb, 'Mid', 'Full-time', 'Da Nang', 'HYBRID', 'HealthTech', 'RANGE', 1600, 2600, 'USD', 'MONTHLY', true, '1,600 - 2,600 USD', '{"java":0.6,"spring":0.5,"healthcare":0.4}'::jsonb, '{"java":0.86,"spring":0.78,"postgresql":0.62}'::jsonb, 'en', 'ACTIVE', CURRENT_DATE + 28, 3, 148, NOW() - INTERVAL '20 days', NOW() - INTERVAL '1 day'),
('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'Product Designer for Patient Portal', 'Northstar HealthTech', 'Design mobile and web patient portal experiences with research, prototyping and accessibility.', '["Figma", "UX Research", "Accessibility", "Design Systems"]'::jsonb, '["Healthcare", "React"]'::jsonb, 'Mid', 'Full-time', 'Remote', 'REMOTE', 'HealthTech', 'UP_TO', null, 2200, 'USD', 'MONTHLY', true, 'Up to 2,200 USD', '{"figma":0.5,"ux":0.5}'::jsonb, '{"figma":0.8,"accessibility":0.68}'::jsonb, 'en', 'ACTIVE', CURRENT_DATE + 22, 1, 96, NOW() - INTERVAL '18 days', NOW() - INTERVAL '2 days'),
('60000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', 'Learning Platform Frontend Engineer', 'Lotus EduTech', 'Build teacher and learner interfaces using React, TypeScript and a shared design system.', '["React", "TypeScript", "Redux", "Testing Library"]'::jsonb, '["Next.js", "Accessibility"]'::jsonb, 'Mid', 'Full-time', 'Ha Noi', 'HYBRID', 'EdTech', 'RANGE', 1200, 2100, 'USD', 'MONTHLY', true, '1,200 - 2,100 USD', '{"react":0.6,"typescript":0.5,"edtech":0.3}'::jsonb, '{"react":0.86,"typescript":0.72}'::jsonb, 'en', 'ACTIVE', CURRENT_DATE + 17, 4, 211, NOW() - INTERVAL '15 days', NOW() - INTERVAL '6 hours'),
('60000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'Junior Data Analyst', 'Lotus EduTech', 'Analyze learning funnel, retention and assessment data with SQL, Python and BI dashboards.', '["SQL", "Python", "Power BI", "Statistics"]'::jsonb, '["dbt", "Product Analytics"]'::jsonb, 'Junior', 'Full-time', 'Da Nang', 'HYBRID', 'Analytics', 'FROM', 700, null, 'USD', 'MONTHLY', true, 'From 700 USD', '{"sql":0.5,"analytics":0.5}'::jsonb, '{"sql":0.82,"python":0.6,"powerbi":0.58}'::jsonb, 'en', 'ACTIVE', CURRENT_DATE + 35, 2, 87, NOW() - INTERVAL '13 days', NOW() - INTERVAL '3 days'),
('60000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', 'Machine Learning Engineer - Retrieval', 'Mekong AI Lab', 'Build embedding pipelines, vector search, ranking models and evaluation tooling for enterprise search.', '["Python", "PyTorch", "Vector Search", "MLOps", "FastAPI"]'::jsonb, '["Kubernetes", "LLM", "Airflow"]'::jsonb, 'Senior', 'Full-time', 'Remote', 'REMOTE', 'AI', 'RANGE', 3500, 6500, 'USD', 'MONTHLY', true, '3,500 - 6,500 USD', '{"python":0.7,"mlops":0.6,"vector":0.6}'::jsonb, '{"python":0.8,"pytorch":0.74,"vector":0.72}'::jsonb, 'en', 'ACTIVE', CURRENT_DATE + 40, 5, 334, NOW() - INTERVAL '12 days', NOW() - INTERVAL '1 hour'),
('60000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000005', 'MLOps Platform Engineer', 'Mekong AI Lab', 'Own model deployment, feature stores, monitoring and reproducible training workflows.', '["Kubernetes", "Python", "Docker", "Prometheus", "CI/CD"]'::jsonb, '["Ray", "MLflow", "Terraform"]'::jsonb, 'Senior', 'Contract', 'Remote', 'REMOTE', 'AI', 'NEGOTIABLE', null, null, 'USD', 'MONTHLY', true, 'Negotiable', '{"kubernetes":0.5,"mlops":0.7}'::jsonb, '{"kubernetes":0.72,"python":0.6,"prometheus":0.4}'::jsonb, 'en', 'PAUSED', CURRENT_DATE + 50, 1, 52, NOW() - INTERVAL '11 days', NOW() - INTERVAL '2 days'),
('60000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000006', 'Senior Security Engineer', 'Saigon Fintech', 'Lead application security reviews, threat modeling, pentest coordination and cloud security controls.', '["AppSec", "OWASP", "Cloud Security", "Threat Modeling"]'::jsonb, '["Kubernetes Security", "PCI DSS"]'::jsonb, 'Senior', 'Full-time', 'Ho Chi Minh', 'HYBRID', 'Security', 'RANGE', 3000, 5200, 'USD', 'MONTHLY', true, '3,000 - 5,200 USD', '{"appsec":0.7,"cloud":0.5}'::jsonb, '{"appsec":0.82,"owasp":0.74,"cloud":0.66}'::jsonb, 'en', 'ACTIVE', CURRENT_DATE + 21, 2, 165, NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 hours'),
('60000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000006', 'Payment Backend Engineer', 'Saigon Fintech', 'Develop payment APIs, ledger workflows and event-driven transaction processing.', '["Java", "Kafka", "PostgreSQL", "Distributed Systems"]'::jsonb, '["Kotlin", "PCI DSS", "Redis"]'::jsonb, 'Senior', 'Full-time', 'Ho Chi Minh', 'ONSITE', 'Fintech', 'HIDDEN', null, null, 'USD', 'MONTHLY', false, 'Hidden salary', '{"java":0.5,"kafka":0.5,"fintech":0.4}'::jsonb, '{"java":0.7,"kafka":0.74,"postgresql":0.55}'::jsonb, 'en', 'ACTIVE', CURRENT_DATE + 25, 6, 280, NOW() - INTERVAL '9 days', NOW() - INTERVAL '2 hours'),
('60000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000007', 'Remote React Engineer', 'RemoteWorks Asia', 'Build global SaaS collaboration features using React, TypeScript and GraphQL.', '["React", "TypeScript", "GraphQL", "CSS"]'::jsonb, '["Playwright", "Design Systems"]'::jsonb, 'Senior', 'Full-time', 'Remote', 'REMOTE', 'SaaS', 'RANGE', 2800, 5000, 'USD', 'MONTHLY', true, '2,800 - 5,000 USD', '{"react":0.7,"typescript":0.5}'::jsonb, '{"react":0.88,"typescript":0.82,"graphql":0.48}'::jsonb, 'en', 'ACTIVE', CURRENT_DATE + 32, 7, 412, NOW() - INTERVAL '8 days', NOW() - INTERVAL '30 minutes'),
('60000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000007', 'Product Manager - Collaboration SaaS', 'RemoteWorks Asia', 'Own roadmap, discovery and analytics for remote collaboration workflows.', '["Roadmap", "Discovery", "Analytics", "A/B Testing"]'::jsonb, '["B2B SaaS", "Pricing"]'::jsonb, 'Mid', 'Full-time', 'Remote', 'REMOTE', 'Product', 'RANGE', 2200, 3800, 'USD', 'MONTHLY', true, '2,200 - 3,800 USD', '{"product":0.7,"analytics":0.4}'::jsonb, '{"roadmap":0.8,"analytics":0.7,"discovery":0.54}'::jsonb, 'en', 'DRAFT', CURRENT_DATE + 45, 0, 0, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
('60000000-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', 'QA Automation Engineer', 'FPT Software', 'Build automated UI, API and regression tests using Playwright, Selenium and Java.', '["Playwright", "Selenium", "Java", "API Testing"]'::jsonb, '["Performance Testing", "Docker"]'::jsonb, 'Mid', 'Full-time', 'Ho Chi Minh', 'HYBRID', 'Quality Engineering', 'RANGE', 1200, 2000, 'USD', 'MONTHLY', true, '1,200 - 2,000 USD', '{"qa":0.6,"automation":0.5}'::jsonb, '{"playwright":0.78,"selenium":0.66,"java":0.45}'::jsonb, 'en', 'ACTIVE', CURRENT_DATE + 14, 4, 132, NOW() - INTERVAL '6 days', NOW() - INTERVAL '4 hours'),
('60000000-0000-0000-0000-000000000012', '22222222-2222-2222-2222-222222222222', 'Flutter Mobile Engineer', 'VNG Corporation', 'Ship mobile features using Flutter, Dart, Firebase and native integrations.', '["Flutter", "Dart", "Firebase", "REST"]'::jsonb, '["iOS", "Android", "Bloc"]'::jsonb, 'Mid', 'Full-time', 'Ho Chi Minh', 'HYBRID', 'Mobile', 'UP_TO', null, 2600, 'USD', 'MONTHLY', true, 'Up to 2,600 USD', '{"flutter":0.6,"mobile":0.5}'::jsonb, '{"flutter":0.84,"dart":0.7,"firebase":0.58}'::jsonb, 'en', 'ACTIVE', CURRENT_DATE + 19, 3, 119, NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day'),
('60000000-0000-0000-0000-000000000013', '22222222-2222-2222-2222-222222222222', 'Legacy PHP Maintainer', 'VNG Corporation', 'Maintain legacy PHP services during migration. Short-term contract.', '["PHP", "MySQL", "Linux"]'::jsonb, '["Laravel", "Docker"]'::jsonb, 'Mid', 'Contract', 'Ho Chi Minh', 'ONSITE', 'Backend', 'FROM', 900, null, 'USD', 'MONTHLY', true, 'From 900 USD', '{"php":0.5}'::jsonb, '{"php":0.8,"mysql":0.55}'::jsonb, 'en', 'CLOSED', CURRENT_DATE - 2, 8, 240, NOW() - INTERVAL '45 days', NOW() - INTERVAL '2 days'),
('60000000-0000-0000-0000-000000000014', '11111111-1111-1111-1111-111111111111', 'Intern Backend Developer', 'FPT Software', 'Learn backend development with Java, SQL, Git and clean API practices.', '["Java", "SQL", "Git"]'::jsonb, '["Spring Boot", "Docker"]'::jsonb, 'Intern', 'Internship', 'Ha Noi', 'ONSITE', 'Backend', 'RANGE', 300, 500, 'USD', 'MONTHLY', true, '300 - 500 USD', '{"java":0.4,"sql":0.3}'::jsonb, '{"java":0.5,"sql":0.45}'::jsonb, 'en', 'ACTIVE', CURRENT_DATE + 60, 11, 420, NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO matching (id, cv_id, job_id, raw_score, normalized_score, label, is_potential, match_reasons, potential_reason, needs_recompute, recruiter_label, created_at, updated_at)
VALUES
('70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 0.930000, 93.00, 'HIGH', false, '["Strong Java and Spring Boot overlap", "PostgreSQL and Docker match", "Backend experience fits senior track"]'::jsonb, null, false, 'APPROVED', NOW() - INTERVAL '10 days', NOW() - INTERVAL '2 days'),
('70000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 0.910000, 91.00, 'HIGH', false, '["React and TypeScript are core skills", "UI dashboard experience is relevant"]'::jsonb, null, false, 'APPROVED', NOW() - INTERVAL '9 days', NOW() - INTERVAL '1 day'),
('70000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000006', 0.880000, 88.00, 'POTENTIAL', true, '["Kubernetes and monitoring overlap"]'::jsonb, '{"reason":"Candidate has platform strength but less explicit MLflow experience."}'::jsonb, false, 'POTENTIAL', NOW() - INTERVAL '8 days', NOW() - INTERVAL '3 hours'),
('70000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000004', 0.860000, 86.00, 'HIGH', false, '["SQL, Python and Power BI align well", "Junior role matches experience"]'::jsonb, null, false, 'APPROVED', NOW() - INTERVAL '8 days', NOW() - INTERVAL '2 days'),
('70000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000012', 0.890000, 89.00, 'HIGH', false, '["Flutter, Dart and Firebase match", "Mobile release experience is useful"]'::jsonb, null, false, 'PENDING', NOW() - INTERVAL '7 days', NOW() - INTERVAL '2 hours'),
('70000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000011', 0.900000, 90.00, 'HIGH', false, '["Playwright, Selenium, Java and API testing all match"]'::jsonb, null, false, 'APPROVED', NOW() - INTERVAL '7 days', NOW() - INTERVAL '4 hours'),
('70000000-0000-0000-0000-000000000007', '50000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000005', 0.950000, 95.00, 'HIGH', false, '["Python, PyTorch, vector search and MLOps match", "Senior level fits"]'::jsonb, null, false, 'APPROVED', NOW() - INTERVAL '6 days', NOW() - INTERVAL '30 minutes'),
('70000000-0000-0000-0000-000000000008', '50000000-0000-0000-0000-000000000008', '60000000-0000-0000-0000-000000000004', 0.570000, 57.00, 'MEDIUM', false, '["SQL and analytics overlap", "Role is data-oriented but not BA-focused"]'::jsonb, null, true, 'PENDING', NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day'),
('70000000-0000-0000-0000-000000000009', '50000000-0000-0000-0000-000000000009', '60000000-0000-0000-0000-000000000007', 0.920000, 92.00, 'HIGH', false, '["AppSec, OWASP and cloud security match", "Senior role fits experience"]'::jsonb, null, false, 'APPROVED', NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 hours'),
('70000000-0000-0000-0000-000000000010', '50000000-0000-0000-0000-000000000010', '60000000-0000-0000-0000-000000000010', 0.870000, 87.00, 'POTENTIAL', true, '["Roadmap and analytics are strong"]'::jsonb, '{"reason":"Job is still draft but candidate profile is a strong future fit."}'::jsonb, false, 'POTENTIAL', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
('70000000-0000-0000-0000-000000000011', '50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000008', 0.740000, 74.00, 'MEDIUM', false, '["Java and PostgreSQL match", "Kafka and fintech experience are weaker"]'::jsonb, null, false, 'PENDING', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
('70000000-0000-0000-0000-000000000012', '50000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000009', 0.850000, 85.00, 'POTENTIAL', true, '["React and TypeScript match", "Remote SaaS fit is plausible"]'::jsonb, '{"reason":"Candidate is mid-level while job is senior."}'::jsonb, false, 'POTENTIAL', NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 hour'),
('70000000-0000-0000-0000-000000000013', '50000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000005', 0.280000, 28.00, 'LOW', false, '["Analytics background is not close to ML engineering requirements"]'::jsonb, null, false, 'REJECTED', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),
('70000000-0000-0000-0000-000000000014', '50000000-0000-0000-0000-000000000009', '60000000-0000-0000-0000-000000000008', 0.620000, 62.00, 'MEDIUM', false, '["Security and fintech controls align", "Backend API skills are not primary"]'::jsonb, null, false, 'PENDING', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
('70000000-0000-0000-0000-000000000015', '50000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000001', 0.510000, 51.00, 'MEDIUM', false, '["Cloud and Docker help", "Healthcare Java backend is not the main profile"]'::jsonb, null, false, 'PENDING', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days')
ON CONFLICT (cv_id, job_id) DO NOTHING;

INSERT INTO application (id, candidate_id, job_id, matching_id, cv_id, status, is_auto_applied, cover_letter, recruiter_notes, applied_at, updated_at)
VALUES
('80000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'APPROVED', false, 'I have shipped similar Spring Boot APIs and can join within two weeks.', 'Strong backend candidate. Move to technical interview.', NOW() - INTERVAL '9 days', NOW() - INTERVAL '2 days'),
('80000000-0000-0000-0000-000000000002', '99999999-9999-9999-9999-999999999999', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '70000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 'PENDING', false, 'I enjoy building accessible React dashboards.', null, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
('80000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000006', '70000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', 'AUTO_APPLIED', true, 'Auto-applied because score exceeded threshold and remote work matched preferences.', 'Review MLOps depth.', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
('80000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000004', 'INVITED', false, 'Recruiter invited candidate after profile review.', 'Good junior analyst profile.', NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day'),
('80000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000012', '70000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000005', 'PENDING', false, 'Flutter role looks aligned with my recent mobile projects.', null, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
('80000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000011', '70000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000006', 'REJECTED', false, 'Interested in QA automation and API coverage.', 'Rejected after screening due to notice period.', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'),
('80000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000007', '50000000-0000-0000-0000-000000000007', 'AUTO_APPLIED', true, 'Auto-applied by CareerFit because score was very high.', 'Priority candidate for ML round.', NOW() - INTERVAL '2 days', NOW() - INTERVAL '30 minutes'),
('80000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000008', '60000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000008', '50000000-0000-0000-0000-000000000008', 'NOT_INTERESTED', false, 'Candidate declined because the role is more data analyst than BA.', null, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),
('80000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000009', '60000000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000009', '50000000-0000-0000-0000-000000000009', 'APPROVED', false, 'I can lead AppSec programs and cloud threat modeling.', 'Approved for final interview.', NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 hours'),
('80000000-0000-0000-0000-000000000010', '88888888-8888-8888-8888-888888888888', '60000000-0000-0000-0000-000000000008', '70000000-0000-0000-0000-000000000011', '50000000-0000-0000-0000-000000000001', 'PENDING', false, 'Interested in payment backend systems.', null, NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours')
ON CONFLICT (candidate_id, job_id) DO NOTHING;

INSERT INTO feedback (id, matching_id, actor_id, actor_role, feedback_type, source_channel, metadata, created_at)
VALUES
('90000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'CANDIDATE', 'GOOD_MATCH', 'WEB', '{"note":"Strong backend fit"}'::jsonb, NOW() - INTERVAL '8 days'),
('90000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'RECRUITER', 'GOOD_MATCH', 'WEB', '{"stage":"technical_screen"}'::jsonb, NOW() - INTERVAL '7 days'),
('90000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'CANDIDATE', 'POTENTIAL', 'EMAIL', '{"email_action":"clicked_potential"}'::jsonb, NOW() - INTERVAL '6 days'),
('90000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'RECRUITER', 'GOOD_MATCH', 'WEB', '{"reason":"junior role fit"}'::jsonb, NOW() - INTERVAL '5 days'),
('90000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000008', 'CANDIDATE', 'NOT_INTERESTED', 'WEB', '{"reason":"prefers BA role"}'::jsonb, NOW() - INTERVAL '4 days'),
('90000000-0000-0000-0000-000000000006', '70000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000005', 'RECRUITER', 'BAD_MATCH', 'WEB', '{"reason":"not ML profile"}'::jsonb, NOW() - INTERVAL '3 days'),
('90000000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000009', 'CANDIDATE', 'GOOD_MATCH', 'DIGEST', '{"digest_rank":1}'::jsonb, NOW() - INTERVAL '2 days'),
('90000000-0000-0000-0000-000000000008', '70000000-0000-0000-0000-000000000012', '44444444-4444-4444-4444-444444444444', 'CANDIDATE', 'POTENTIAL', 'AUTOPILOT', '{"reason":"seniority stretch"}'::jsonb, NOW() - INTERVAL '1 day')
ON CONFLICT (matching_id, actor_id) DO NOTHING;

INSERT INTO recommendation_interaction (id, candidate_id, job_id, action, source, metadata, created_at)
VALUES
('91000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'APPLIED', 'WEB', '{"rank":1}'::jsonb, NOW() - INTERVAL '9 days'),
('91000000-0000-0000-0000-000000000002', '99999999-9999-9999-9999-999999999999', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'SAVED', 'WEB', '{"rank":2}'::jsonb, NOW() - INTERVAL '8 days'),
('91000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000006', 'APPLIED', 'AUTOPILOT', '{"threshold":86}'::jsonb, NOW() - INTERVAL '5 days'),
('91000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000004', 'VIEWED', 'DIGEST', '{"rank":3}'::jsonb, NOW() - INTERVAL '4 days'),
('91000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000012', 'SAVED', 'WEB', '{"rank":1}'::jsonb, NOW() - INTERVAL '3 days'),
('91000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000011', 'APPLIED', 'WEB', '{"rank":1}'::jsonb, NOW() - INTERVAL '3 days'),
('91000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000005', 'APPLIED', 'AUTOPILOT', '{"threshold":91}'::jsonb, NOW() - INTERVAL '2 days'),
('91000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000008', '60000000-0000-0000-0000-000000000004', 'NOT_INTERESTED', 'WEB', '{"reason":"wrong track"}'::jsonb, NOW() - INTERVAL '2 days'),
('91000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000009', '60000000-0000-0000-0000-000000000007', 'APPLIED', 'WEB', '{"rank":1}'::jsonb, NOW() - INTERVAL '1 day'),
('91000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000010', '60000000-0000-0000-0000-000000000010', 'SHOW_SIMILAR', 'WEB', '{"draft_job":true}'::jsonb, NOW() - INTERVAL '10 hours'),
('91000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000005', 'SKIPPED', 'WEB', '{"reason":"too senior"}'::jsonb, NOW() - INTERVAL '8 hours'),
('91000000-0000-0000-0000-000000000012', '99999999-9999-9999-9999-999999999999', '60000000-0000-0000-0000-000000000009', 'VIEWED', 'EMAIL', '{"campaign":"weekly_digest"}'::jsonb, NOW() - INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO automation_policy (id, user_id, auto_apply_enabled, auto_apply_threshold, auto_invite_enabled, daily_digest_enabled, daily_digest_time, user_timezone, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, job_scan_enabled, job_scan_frequency_hours, high_match_email_enabled, high_match_threshold, max_email_per_day, notification_cooldown_hours, replacement_after_skip_enabled, replacement_delay_minutes, email_action_enabled, passwordless_enabled, created_at, updated_at)
SELECT gen_random_uuid(), u.id,
       (u.role = 'CANDIDATE' AND u.email IN ('candidate1@careerfit.dev','candidate3@careerfit.dev','candidate7@careerfit.dev','candidate9@careerfit.dev')),
       CASE WHEN u.email = 'candidate7@careerfit.dev' THEN 91.00 ELSE 88.00 END,
       (u.role = 'RECRUITER' AND u.email IN ('recruiter1@careerfit.dev','recruiter3@careerfit.dev','recruiter5@careerfit.dev')),
       true,
       CASE WHEN u.preferred_language = 'en' THEN '09:00:00'::time ELSE '08:00:00'::time END,
       'Asia/Ho_Chi_Minh',
       true,
       '22:00:00'::time,
       '07:00:00'::time,
       (u.role = 'RECRUITER'),
       CASE WHEN u.role = 'RECRUITER' THEN 2 ELSE 6 END,
       true,
       CASE WHEN u.role = 'RECRUITER' THEN 85.00 ELSE 90.00 END,
       CASE WHEN u.role = 'RECRUITER' THEN 8 ELSE 4 END,
       12,
       (u.role = 'CANDIDATE'),
       45,
       true,
       true,
       NOW() - INTERVAL '20 days',
       NOW() - INTERVAL '1 day'
FROM user_account u
WHERE u.email IN (
    'candidate1@careerfit.dev','candidate2@careerfit.dev','candidate3@careerfit.dev','candidate4@careerfit.dev','candidate5@careerfit.dev',
    'candidate6@careerfit.dev','candidate7@careerfit.dev','candidate8@careerfit.dev','candidate9@careerfit.dev','candidate10@careerfit.dev',
    'recruiter1@careerfit.dev','recruiter2@careerfit.dev','recruiter3@careerfit.dev','recruiter4@careerfit.dev','recruiter5@careerfit.dev','recruiter6@careerfit.dev'
)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO email_action_token (id, token, recipient_id, matching_id, action_type, status, expires_at, redeemed_at, created_at)
VALUES
('a0000000-0000-0000-0000-000000000001', 'sample-good-match-token-0001', '33333333-3333-3333-3333-333333333333', '70000000-0000-0000-0000-000000000001', 'GOOD_MATCH', 'REDEEMED', NOW() + INTERVAL '3 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '9 days'),
('a0000000-0000-0000-0000-000000000002', 'sample-potential-token-0002', '20000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000003', 'POTENTIAL', 'PENDING', NOW() + INTERVAL '5 days', null, NOW() - INTERVAL '4 days'),
('a0000000-0000-0000-0000-000000000003', 'sample-bad-match-token-0003', '20000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000013', 'BAD_MATCH', 'PENDING', NOW() + INTERVAL '2 days', null, NOW() - INTERVAL '3 days'),
('a0000000-0000-0000-0000-000000000004', 'sample-view-job-token-0004', '44444444-4444-4444-4444-444444444444', '70000000-0000-0000-0000-000000000012', 'VIEW_JOB', 'EXPIRED', NOW() - INTERVAL '1 day', null, NOW() - INTERVAL '10 days'),
('a0000000-0000-0000-0000-000000000005', 'sample-unsubscribe-token-05', '20000000-0000-0000-0000-000000000008', null, 'UNSUBSCRIBE_DIGEST', 'PENDING', NOW() + INTERVAL '14 days', null, NOW() - INTERVAL '1 day')
ON CONFLICT (token) DO NOTHING;

INSERT INTO email_action (id, recipient_user_id, action_type, target_type, target_id, subject, template_name, status, created_at, sent_at, opened_at, executed_at)
VALUES
('b0000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'HIGH_MATCH_DIGEST', 'MATCHING', '70000000-0000-0000-0000-000000000001', 'Your top CareerFit matches today', 'candidate-high-match', 'OPENED', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days', null),
('b0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000007', 'AUTO_APPLY_CONFIRMATION', 'APPLICATION', '80000000-0000-0000-0000-000000000007', 'CareerFit auto-applied to Mekong AI Lab', 'auto-apply-confirmation', 'CONFIRMED', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
('b0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', 'RECRUITER_DAILY_SUMMARY', 'JOB', '60000000-0000-0000-0000-000000000004', 'New junior analyst applicants', 'recruiter-daily-summary', 'SENT', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', null, null),
('b0000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000008', 'DIGEST_UNSUBSCRIBE', 'USER', '20000000-0000-0000-0000-000000000008', 'Manage CareerFit email preferences', 'preference-action', 'CREATED', NOW() - INTERVAL '4 hours', null, null, null)
ON CONFLICT (id) DO NOTHING;

INSERT INTO email_token (id, token_hash, purpose, user_id, action_id, target_type, target_id, expires_at, used_at, revoked_at, created_at)
VALUES
('c0000000-0000-0000-0000-000000000001', '1111111111111111111111111111111111111111111111111111111111111111', 'PASSWORDLESS_LOGIN', '33333333-3333-3333-3333-333333333333', null, 'USER', '33333333-3333-3333-3333-333333333333', NOW() + INTERVAL '15 minutes', null, null, NOW() - INTERVAL '5 minutes'),
('c0000000-0000-0000-0000-000000000002', '2222222222222222222222222222222222222222222222222222222222222222', 'APPLY_JOB', '20000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'JOB', '60000000-0000-0000-0000-000000000006', NOW() + INTERVAL '2 days', NOW() - INTERVAL '2 days', null, NOW() - INTERVAL '3 days'),
('c0000000-0000-0000-0000-000000000003', '3333333333333333333333333333333333333333333333333333333333333333', 'REJECT_MATCH', '20000000-0000-0000-0000-000000000004', null, 'MATCHING', '70000000-0000-0000-0000-000000000013', NOW() - INTERVAL '1 day', null, null, NOW() - INTERVAL '8 days'),
('c0000000-0000-0000-0000-000000000004', '4444444444444444444444444444444444444444444444444444444444444444', 'CHANGE_THRESHOLD', '20000000-0000-0000-0000-000000000007', null, 'AUTOMATION_POLICY', null, NOW() + INTERVAL '1 day', null, null, NOW() - INTERVAL '2 hours')
ON CONFLICT (token_hash) DO NOTHING;

INSERT INTO notification_job (id, job_type, payload, status, retry_count, next_retry_at, created_at, updated_at)
VALUES
('d0000000-0000-0000-0000-000000000001', 'DAILY_DIGEST', '{"userEmail":"candidate1@careerfit.dev","matchCount":3}'::jsonb, 'DONE', 0, null, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
('d0000000-0000-0000-0000-000000000002', 'HIGH_MATCH_EMAIL', '{"matchingId":"70000000-0000-0000-0000-000000000007"}'::jsonb, 'PENDING', 0, NOW() + INTERVAL '10 minutes', NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '5 minutes'),
('d0000000-0000-0000-0000-000000000003', 'EMAIL_ACTION_CLEANUP', '{"olderThanDays":30}'::jsonb, 'PROCESSING', 1, NOW() + INTERVAL '5 minutes', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '2 minutes'),
('d0000000-0000-0000-0000-000000000004', 'MARKET_SNAPSHOT', '{"date":"today"}'::jsonb, 'FAILED', 3, NOW() + INTERVAL '1 hour', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '20 minutes'),
('d0000000-0000-0000-0000-000000000005', 'REPLACEMENT_AFTER_SKIP', '{"candidateId":"40000000-0000-0000-0000-000000000008","skippedJobId":"60000000-0000-0000-0000-000000000004"}'::jsonb, 'CANCELLED', 0, null, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_log (id, actor_type, actor_id, action_type, target_type, target_id, result, source_channel, ip_address, user_agent, metadata, created_at)
VALUES
('e0000000-0000-0000-0000-000000000001', 'USER', '33333333-3333-3333-3333-333333333333', 'AUTH_LOGIN', 'USER', '33333333-3333-3333-3333-333333333333', 'SUCCESS', 'WEB', '127.0.0.1', 'Mozilla/5.0 seed', '{"method":"password"}'::jsonb, NOW() - INTERVAL '10 days'),
('e0000000-0000-0000-0000-000000000002', 'USER', '44444444-4444-4444-4444-444444444444', 'JOB_VIEW', 'JOB', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'SUCCESS', 'WEB', '127.0.0.1', 'Mozilla/5.0 seed', '{"source":"recommendation"}'::jsonb, NOW() - INTERVAL '8 days'),
('e0000000-0000-0000-0000-000000000003', 'SYSTEM', null, 'AUTO_APPLY_CREATED', 'APPLICATION', '80000000-0000-0000-0000-000000000007', 'SUCCESS', 'AUTOPILOT', null, null, '{"score":95.0}'::jsonb, NOW() - INTERVAL '2 days'),
('e0000000-0000-0000-0000-000000000004', 'USER', '10000000-0000-0000-0000-000000000005', 'JOB_PAUSED', 'JOB', '60000000-0000-0000-0000-000000000006', 'SUCCESS', 'WEB', '127.0.0.1', 'Mozilla/5.0 seed', '{"reason":"pipeline full"}'::jsonb, NOW() - INTERVAL '2 days'),
('e0000000-0000-0000-0000-000000000005', 'USER', '20000000-0000-0000-0000-000000000006', 'AUTH_LOGIN', 'USER', '20000000-0000-0000-0000-000000000006', 'DENIED', 'WEB', '127.0.0.1', 'Mozilla/5.0 seed', '{"reason":"email_not_verified"}'::jsonb, NOW() - INTERVAL '1 day'),
('e0000000-0000-0000-0000-000000000006', 'SYSTEM', null, 'MARKET_SNAPSHOT_FAILED', 'JOB_MARKET_SNAPSHOT', null, 'FAILURE', 'SYSTEM', null, null, '{"job":"d0000000-0000-0000-0000-000000000004"}'::jsonb, NOW() - INTERVAL '20 minutes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO job_trend_snapshot (id, job_id, snapshot_date, view_count, application_count, created_at)
SELECT gen_random_uuid(), j.id, CURRENT_DATE - (g.day_offset || ' days')::interval,
       (j.view_count / 7 + g.day_offset * 3)::integer,
       GREATEST(0, (j.applicant_count / 7 + (6 - g.day_offset) / 3))::integer,
       NOW() - (g.day_offset || ' days')::interval
FROM job j
CROSS JOIN generate_series(0, 6) AS g(day_offset)
WHERE j.id IN (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '60000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000003',
    '60000000-0000-0000-0000-000000000005',
    '60000000-0000-0000-0000-000000000007',
    '60000000-0000-0000-0000-000000000009',
    '60000000-0000-0000-0000-000000000011',
    '60000000-0000-0000-0000-000000000012',
    '60000000-0000-0000-0000-000000000014'
)
ON CONFLICT (job_id, snapshot_date) DO UPDATE
SET view_count = EXCLUDED.view_count,
    application_count = EXCLUDED.application_count;

INSERT INTO job_market_snapshot (id, snapshot_date, total_posted_jobs, active_jobs, new_jobs, employer_count, distribution_by_role, distribution_by_salary, created_at)
SELECT gen_random_uuid(), CURRENT_DATE - (g.day_offset || ' days')::interval,
       18 + (6 - g.day_offset),
       13 + (6 - g.day_offset) / 2,
       GREATEST(0, 4 - g.day_offset / 2),
       7,
       jsonb_build_object('Backend', 7, 'Frontend', 4, 'Data', 3, 'AI', 2, 'Security', 2, 'Product', 1, 'QA', 1),
       jsonb_build_object('under1000', 3, '1000to2000', 6, '2000to4000', 7, 'above4000', 3, 'hidden', 1),
       NOW() - (g.day_offset || ' days')::interval
FROM generate_series(0, 13) AS g(day_offset)
ON CONFLICT (snapshot_date) DO UPDATE
SET total_posted_jobs = EXCLUDED.total_posted_jobs,
    active_jobs = EXCLUDED.active_jobs,
    new_jobs = EXCLUDED.new_jobs,
    employer_count = EXCLUDED.employer_count,
    distribution_by_role = EXCLUDED.distribution_by_role,
    distribution_by_salary = EXCLUDED.distribution_by_salary;

UPDATE job j
SET applicant_count = counts.application_count,
    updated_at = NOW()
FROM (
    SELECT job_id, COUNT(*)::integer AS application_count
    FROM application
    GROUP BY job_id
) counts
WHERE j.id = counts.job_id;
