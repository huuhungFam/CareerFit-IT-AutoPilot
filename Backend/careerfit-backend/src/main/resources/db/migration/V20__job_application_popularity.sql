ALTER TABLE job
    ADD COLUMN IF NOT EXISTS application_count INTEGER NOT NULL DEFAULT 0;

UPDATE job j
SET application_count = counts.total
FROM (
    SELECT job_id, COUNT(*)::INTEGER AS total
    FROM application
    WHERE status <> 'INVITED'
    GROUP BY job_id
) counts
WHERE j.id = counts.job_id;

CREATE INDEX IF NOT EXISTS idx_job_application_count
    ON job (application_count DESC, created_at DESC, id ASC);

CREATE OR REPLACE FUNCTION sync_job_application_count()
RETURNS TRIGGER AS $$
DECLARE
    old_counted BOOLEAN;
    new_counted BOOLEAN;
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status <> 'INVITED' THEN
            UPDATE job
            SET application_count = application_count + 1
            WHERE id = NEW.job_id;
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        IF OLD.status <> 'INVITED' THEN
            UPDATE job
            SET application_count = GREATEST(0, application_count - 1)
            WHERE id = OLD.job_id;
        END IF;
        RETURN OLD;
    END IF;

    old_counted := OLD.status <> 'INVITED';
    new_counted := NEW.status <> 'INVITED';

    IF OLD.job_id <> NEW.job_id THEN
        IF old_counted THEN
            UPDATE job
            SET application_count = GREATEST(0, application_count - 1)
            WHERE id = OLD.job_id;
        END IF;
        IF new_counted THEN
            UPDATE job
            SET application_count = application_count + 1
            WHERE id = NEW.job_id;
        END IF;
    ELSIF old_counted <> new_counted THEN
        UPDATE job
        SET application_count = GREATEST(
            0,
            application_count + CASE WHEN new_counted THEN 1 ELSE -1 END
        )
        WHERE id = NEW.job_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_job_application_count ON application;

CREATE TRIGGER trg_sync_job_application_count
AFTER INSERT OR UPDATE OF job_id, status OR DELETE ON application
FOR EACH ROW
EXECUTE FUNCTION sync_job_application_count();
