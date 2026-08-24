ALTER TABLE job
    ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN NOT NULL DEFAULT FALSE;

-- Preserve explicit recruiter choices while classifying existing imported JDs
-- that clearly advertise immediate hiring.
UPDATE job
SET is_urgent = TRUE
WHERE is_urgent = FALSE
  AND (
      LOWER(COALESCE(title, '')) LIKE ANY (ARRAY[
          '%cần tuyển gấp%',
          '%can tuyen gap%',
          '%tuyển gấp%',
          '%tuyen gap%',
          '%urgent hiring%',
          '%urgently hiring%',
          '%immediate start%',
          '%join immediately%'
      ])
      OR LOWER(COALESCE(original_text, '')) LIKE ANY (ARRAY[
          '%cần tuyển gấp%',
          '%can tuyen gap%',
          '%tuyển gấp%',
          '%tuyen gap%',
          '%đi làm ngay%',
          '%di lam ngay%',
          '%nhận việc ngay%',
          '%nhan viec ngay%',
          '%urgent hiring%',
          '%urgently hiring%',
          '%immediate start%',
          '%join immediately%'
      ])
  );

CREATE INDEX IF NOT EXISTS idx_job_active_urgent_created
    ON job (created_at DESC, id ASC)
    WHERE status = 'ACTIVE' AND is_urgent = TRUE;
