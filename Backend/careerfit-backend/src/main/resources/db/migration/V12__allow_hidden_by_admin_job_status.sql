-- Drop existing check constraint for job status and recreate it to include HIDDEN_BY_ADMIN
DO $$
DECLARE
    const_name text;
BEGIN
    SELECT conname INTO const_name
    FROM pg_constraint
    WHERE conrelid = 'job'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%';

    IF const_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE job DROP CONSTRAINT ' || const_name;
    END IF;
END $$;

ALTER TABLE job ADD CONSTRAINT job_status_check 
CHECK (status IN ('ACTIVE','CLOSED','DRAFT','PAUSED','HIDDEN_BY_ADMIN'));
