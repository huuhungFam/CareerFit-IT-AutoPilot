-- ==========================================
-- V4 Migration: Seed Data
-- Passwords for email accounts are: password
-- Short demo accounts use: ca / 1 and re / 1
-- ==========================================

-- BCrypt hash for "password" (cost 10)
-- $2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62

-- 1. Seed Users
INSERT INTO user_account (id, email, password_hash, full_name, role, email_verified, is_active, created_at, updated_at)
VALUES 
-- Admin
('55555555-5555-5555-5555-555555555555', 'admin@careerfit.dev', '$2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62', 'System Administrator', 'ADMIN', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Recruiters
('11111111-1111-1111-1111-111111111111', 'recruiter1@careerfit.dev', '$2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62', 'FPT Recruiter', 'RECRUITER', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('22222222-2222-2222-2222-222222222222', 'recruiter2@careerfit.dev', '$2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62', 'VNG Recruiter', 'RECRUITER', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Candidates
('33333333-3333-3333-3333-333333333333', 'candidate1@careerfit.dev', '$2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62', 'Nguyen Van A', 'CANDIDATE', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('44444444-4444-4444-4444-444444444444', 'candidate2@careerfit.dev', '$2a$10$wK1k6i/3GMyh/U/2D0QWQuI4U.6L.4q6G4KzN.Z9X5V9L9T9x9u62', 'Tran Thi B', 'CANDIDATE', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Short demo login accounts: ca / 1, re / 1
('12121212-1212-1212-1212-121212121212', 'ca', '$2a$10$Zq8pkdahfd6.2P/iseYLA.3i43HY5ZVPJmlIWyVY3MwjemD8sgsmi', 'Demo Candidate', 'CANDIDATE', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('23232323-2323-2323-2323-232323232323', 're', '$2a$10$Zq8pkdahfd6.2P/iseYLA.3i43HY5ZVPJmlIWyVY3MwjemD8sgsmi', 'Demo Recruiter', 'RECRUITER', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);


-- 2. Seed Employer Profiles
INSERT INTO employer_profile (id, recruiter_id, company_name, slug, industry, website_url, logo_url, description, is_featured, created_at, updated_at)
VALUES 
('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'FPT Software', 'fpt-software', 'IT Services', 'https://fptsoftware.com', 'https://logo.clearbit.com/fptsoftware.com', 'FPT Software is a global technology and IT services provider.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', 'VNG Corporation', 'vng-corporation', 'Internet & Gaming', 'https://vng.com.vn', 'https://logo.clearbit.com/vng.com.vn', 'VNG is a leading Vietnamese technology company.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('24242424-2424-2424-2424-242424242424', '23232323-2323-2323-2323-232323232323', 'CareerFit Demo Lab', 'careerfit-demo-lab', 'HR Tech', 'https://careerfit.dev', 'https://ui-avatars.com/api/?name=CareerFit+Demo&background=006a62&color=fff', 'Demo recruiter workspace for frontend integration testing.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);


-- 3. Seed Candidate Profiles
INSERT INTO candidate (id, user_id, desired_title, desired_skills, location, years_of_experience, avatar_url, created_at, updated_at)
VALUES 
('88888888-8888-8888-8888-888888888888', '33333333-3333-3333-3333-333333333333', 'Java Backend Developer', '["Java", "Spring Boot", "PostgreSQL", "Docker"]', 'Ho Chi Minh', 3, 'https://ui-avatars.com/api/?name=Nguyen+Van+A&background=random', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('99999999-9999-9999-9999-999999999999', '44444444-4444-4444-4444-444444444444', 'Frontend React Engineer', '["React", "TypeScript", "Next.js", "TailwindCSS"]', 'Ha Noi', 2, 'https://ui-avatars.com/api/?name=Tran+Thi+B&background=random', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('34343434-3434-3434-3434-343434343434', '12121212-1212-1212-1212-121212121212', 'Fullstack Engineer', '["React", "TypeScript", "Spring Boot", "PostgreSQL"]', 'Ho Chi Minh', 4, 'https://ui-avatars.com/api/?name=Demo+Candidate&background=00446e&color=fff', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);


-- 4. Seed Jobs
INSERT INTO job (
    id, recruiter_id, title, company, location, employment_type, seniority_level,
    salary_mode, salary_min, salary_max, salary_currency, salary_type,
    salary_is_visible, salary_display_text, language, required_skills,
    original_text, status, view_count, applicant_count, deadline, created_at, updated_at
)
VALUES 
-- Job 1 (FPT)
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111',
'Senior Java Developer', 'FPT Software', 'Ho Chi Minh, District 9', 'Full-time', 'Senior',
'RANGE', 2000, 3500, 'USD', 'MONTHLY', true, '2,000 - 3,500 USD', 'en',
'["Java", "Spring Boot", "Microservices", "AWS"]', 
'Senior Java Developer at FPT Software. We are looking for a Senior Java Developer to join our Cloud team. Requires Java, Spring Boot, Microservices, AWS. 5+ years of experience with Java and Spring Boot. Premium healthcare, 13th-month salary, 15 days annual leave.',
'ACTIVE', 120, 0, CURRENT_DATE + 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Job 2 (FPT)
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111',
'React Frontend Developer', 'FPT Software', 'Ha Noi, Cau Giay', 'Full-time', 'Mid',
'RANGE', 1000, 2000, 'USD', 'MONTHLY', true, '1,000 - 2,000 USD', 'vi',
'["React", "Redux", "TypeScript", "CSS"]', 
'React Frontend Developer at FPT Software. Join our modern UI/UX team building enterprise web applications. Requires React, Redux, TypeScript and CSS. 2+ years of ReactJS. Free lunch, dynamic environment, training programs.',
'ACTIVE', 85, 0, CURRENT_DATE + 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Job 3 (VNG)
('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222',
'Golang Backend Engineer (Zalo)', 'VNG Corporation', 'Ho Chi Minh, District 7', 'Full-time', 'Mid',
'UP_TO', null, 3000, 'USD', 'MONTHLY', true, 'Up to 3,000 USD', 'vi',
'["Golang", "Redis", "Kafka", "PostgreSQL"]', 
'Golang Backend Engineer at VNG. Build high-performance backend systems serving millions of Zalo users. Requires Golang, Redis, Kafka, PostgreSQL, concurrency and distributed systems. MacBook Pro provided, free gym, ZaloPay allowance.',
'ACTIVE', 200, 0, CURRENT_DATE + 45, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Job 4 (VNG)
('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222',
'Data Engineer', 'VNG Corporation', 'Ho Chi Minh, District 7', 'Full-time', 'Senior',
'NEGOTIABLE', null, null, 'USD', 'MONTHLY', true, 'Negotiable', 'en',
'["Python", "Spark", "Hadoop", "Airflow"]', 
'Data Engineer at VNG. Design and implement big data pipelines for our gaming division. Requires Python, Spark, Hadoop and Airflow. 4+ years in Data Engineering. Performance bonus, flexible hours, team building.',
'ACTIVE', 45, 0, CURRENT_DATE + 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Demo recruiter job
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '23232323-2323-2323-2323-232323232323',
'Demo Fullstack Engineer', 'CareerFit Demo Lab', 'Ho Chi Minh, Remote', 'Full-time', 'Mid',
'RANGE', 1500, 2500, 'USD', 'MONTHLY', true, '1,500 - 2,500 USD', 'en',
'["React", "TypeScript", "Spring Boot", "PostgreSQL"]',
'Demo Fullstack Engineer at CareerFit Demo Lab. Build candidate-facing workflows with React, TypeScript, Spring Boot and PostgreSQL. This posting is seeded for frontend integration testing.',
'ACTIVE', 30, 0, CURRENT_DATE + 25, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
