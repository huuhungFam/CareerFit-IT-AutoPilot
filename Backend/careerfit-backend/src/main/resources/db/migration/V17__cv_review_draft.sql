ALTER TABLE cv
    ADD COLUMN IF NOT EXISTS original_raw_text TEXT,
    ADD COLUMN IF NOT EXISTS review_sections JSONB,
    ADD COLUMN IF NOT EXISTS review_issues JSONB;

ALTER TABLE cv DROP CONSTRAINT IF EXISTS cv_status_check;

ALTER TABLE cv
    ADD CONSTRAINT cv_status_check
        CHECK (status IN (
            'UPLOADED',
            'VALIDATING',
            'REVIEW_REQUIRED',
            'PROCESSING',
            'SCORING_DONE',
            'FAILED'
        ));
