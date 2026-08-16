ALTER TABLE cv DROP CONSTRAINT IF EXISTS cv_status_check;

ALTER TABLE cv
    ADD CONSTRAINT cv_status_check
        CHECK (status IN (
            'UPLOADED',
            'VALIDATING',
            'REVIEW_REQUIRED',
            'DRAFT',
            'PROCESSING',
            'SCORING_DONE',
            'FAILED'
        ));
