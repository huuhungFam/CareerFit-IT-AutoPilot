const { spawnSync } = require('node:child_process');
const DB = 'careerfit';
function runSql(sql) {
  const result = spawnSync('docker', ['compose', 'exec', '-T', 'postgres', 'psql', '-U', 'careerfit', '-d', DB, '-v', 'ON_ERROR_STOP=1', '-t', '-A'], { input: sql, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}
console.log('total jobs:', runSql("SELECT COUNT(*) FROM job"));
console.log('imported jobs:', runSql("SELECT COUNT(*) FROM job j JOIN user_account u ON j.recruiter_id = u.id WHERE u.account_source = 'IMPORTED'"));
console.log('active imported recruiters:', runSql("SELECT COUNT(*) FROM user_account WHERE role = 'RECRUITER' AND account_source = 'IMPORTED' AND is_active = TRUE"));
console.log('canonical companies:', runSql("SELECT COUNT(*) FROM employer_profile p JOIN user_account u ON p.recruiter_id = u.id WHERE u.account_source = 'IMPORTED' AND u.is_active = TRUE"));
console.log('live Candidate exists:', runSql("SELECT COUNT(*) FROM user_account WHERE email = 'hungb2203557@student.ctu.edu.vn'"));
console.log('live Recruiter exists:', runSql("SELECT COUNT(*) FROM user_account WHERE email = 'phamhuuhung216@gmail.com'"));
console.log('ca account:', runSql("SELECT email, password_hash, role FROM user_account WHERE email = 'ca@careerfit.local'"));
console.log('re account:', runSql("SELECT email, password_hash, role FROM user_account WHERE email = 're@careerfit.local'"));
console.log('ad account:', runSql("SELECT email, password_hash, role FROM user_account WHERE email = 'ad@careerfit.local'"));
console.log('user_account:', runSql("SELECT COUNT(*) FROM user_account"));
console.log('employer_profile:', runSql("SELECT COUNT(*) FROM employer_profile"));
console.log('candidate:', runSql("SELECT COUNT(*) FROM candidate"));
console.log('cv:', runSql("SELECT COUNT(*) FROM cv"));
console.log('application:', runSql("SELECT COUNT(*) FROM application"));
console.log('matching:', runSql("SELECT COUNT(*) FROM matching"));
console.log('automation_policy:', runSql("SELECT COUNT(*) FROM automation_policy"));
console.log('content_report:', runSql("SELECT COUNT(*) FROM content_report"));
