const { spawnSync } = require('child_process');
const sql = `
\\set ON_ERROR_STOP on
BEGIN;
INSERT INTO job (id, recruiter_id, title, company, original_text, salary_mode, language, status) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Test', 'Test', 'Test', 'NEGOTIABLE', 'vi', 'ACTIVE');
DO $$ BEGIN RAISE EXCEPTION 'FAIL'; END $$;
COMMIT;
`;
const res = spawnSync('docker', ['compose', 'exec', '-T', 'postgres', 'psql', '-U', 'careerfit', '-d', 'careerfit_test_disposable'], { input: sql });
console.log('Status:', res.status);
console.log('STDOUT:', res.stdout.toString());
console.log('STDERR:', res.stderr.toString());
