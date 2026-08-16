WITH
  violation_duplicate_source AS (SELECT COUNT(*) as c FROM (SELECT source_platform, source_url FROM job WHERE source_url IS NOT NULL GROUP BY source_platform, source_url HAVING COUNT(*) > 1) tmp),
  violation_duplicate_hash AS (SELECT COUNT(*) as c FROM (SELECT external_hash FROM job WHERE external_hash IS NOT NULL GROUP BY external_hash HAVING COUNT(*) > 1) tmp),
  violation_mismatch_count AS (SELECT COUNT(*) as c FROM job j JOIN employer_profile p ON j.recruiter_id = p.recruiter_id WHERE j.company != p.company_name AND j.source_platform IS NOT NULL),
  violation_password AS (SELECT COUNT(*) as c FROM user_account WHERE account_source = 'IMPORTED' AND is_active = TRUE AND password_hash IS DISTINCT FROM '$2a$10$Zq8pkdahfd6.2P/iseYLA.3i43HY5ZVPJmlIWyVY3MwjemD8sgsmi'),
  violation_role AS (SELECT COUNT(*) as c FROM user_account WHERE account_source = 'IMPORTED' AND role IS DISTINCT FROM 'RECRUITER'),
  violation_email AS (SELECT COUNT(*) as c FROM user_account WHERE account_source = 'IMPORTED' AND email_verified IS DISTINCT FROM FALSE),
  violation_lang AS (SELECT COUNT(*) as c FROM user_account WHERE account_source = 'IMPORTED' AND preferred_language IS DISTINCT FROM 'vi'),
  violation_missing_policy AS (SELECT COUNT(*) as c FROM user_account ua LEFT JOIN automation_policy p ON ua.id = p.user_id WHERE ua.account_source = 'IMPORTED' AND ua.is_active = TRUE AND p.id IS NULL),
  violation_toggle AS (SELECT COUNT(*) as c FROM user_account ua JOIN automation_policy p ON ua.id = p.user_id WHERE ua.account_source = 'IMPORTED' AND ua.is_active = TRUE AND (p.email_notifications_enabled IS DISTINCT FROM FALSE OR p.daily_digest_enabled IS DISTINCT FROM FALSE OR p.high_match_email_enabled IS DISTINCT FROM FALSE OR p.email_action_enabled IS DISTINCT FROM FALSE OR p.auto_invite_enabled IS DISTINCT FROM FALSE OR p.job_scan_enabled IS DISTINCT FROM FALSE)),
  violation_active_orphan AS (SELECT COUNT(*) as c FROM user_account ua WHERE ua.account_source = 'IMPORTED' AND ua.is_active = TRUE AND NOT EXISTS (SELECT 1 FROM job j WHERE j.recruiter_id = ua.id)),
  violation_active_no_profile AS (SELECT COUNT(*) as c FROM (SELECT ua.id FROM user_account ua LEFT JOIN employer_profile p ON ua.id = p.recruiter_id WHERE ua.role = 'RECRUITER' AND ua.account_source = 'IMPORTED' AND ua.is_active = true GROUP BY ua.id HAVING COUNT(p.id) != 1) tmp),
  total_violations AS (
    SELECT (
      (SELECT c FROM violation_duplicate_source) +
      (SELECT c FROM violation_duplicate_hash) +
      (SELECT c FROM violation_mismatch_count) +
      (SELECT c FROM violation_password) +
      (SELECT c FROM violation_role) +
      (SELECT c FROM violation_email) +
      (SELECT c FROM violation_lang) +
      (SELECT c FROM violation_missing_policy) +
      (SELECT c FROM violation_toggle) +
      (SELECT c FROM violation_active_orphan) +
      (SELECT c FROM violation_active_no_profile)
    ) as total
  )
SELECT
  'total_jobs=' || (SELECT count(*) FROM job) || E'\n' ||
  'imported_jobs=' || (SELECT count(*) FROM job WHERE source_platform IS NOT NULL) || E'\n' ||
  'active_imported_recruiters=' || (SELECT count(DISTINCT ep.recruiter_id) FROM employer_profile ep JOIN user_account u ON u.id = ep.recruiter_id JOIN job j ON j.recruiter_id = u.id WHERE u.is_active = true AND j.source_platform IS NOT NULL) || E'\n' ||
  'canonical_companies=' || (SELECT count(DISTINCT company_name) FROM employer_profile ep JOIN user_account ua ON ep.recruiter_id = ua.id WHERE ua.account_source = 'IMPORTED' AND ua.is_active = TRUE) || E'\n' ||
  'cv=' || (SELECT count(*) FROM cv) || E'\n' ||
  'application=' || (SELECT count(*) FROM application) || E'\n' ||
  'matching=' || (SELECT count(*) FROM matching) || E'\n' ||
  'bookmark=' || ((SELECT count(*) FROM candidate_saved_job) + (SELECT count(*) FROM recruiter_cv_bookmark)) || E'\n' ||
  'report=' || (SELECT count(*) FROM content_report) || E'\n' ||
  'all named violations=' || (SELECT total FROM total_violations);
