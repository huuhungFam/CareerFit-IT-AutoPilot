-- V30__deduplicate_employer_profiles_and_deactivate_aliases.sql
-- Finding 1: Deduplicate employer_profile per recruiter_id
-- Finding 2: Support alias account deactivation (not deletion)

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 1: Deduplicate employer_profile — keep the profile with the best data
-- ═══════════════════════════════════════════════════════════════════════════════

-- For each recruiter that has multiple profiles, we keep the one with the most
-- non-null meaningful fields. If tied, we keep the oldest (earliest created_at).
-- Before deleting the loser, we merge any non-null fields into the winner.

DO $$
DECLARE
    rec RECORD;
    winner_id UUID;
    loser_id UUID;
BEGIN
    FOR rec IN
        SELECT recruiter_id
        FROM employer_profile
        GROUP BY recruiter_id
        HAVING COUNT(*) > 1
    LOOP
        -- Pick winner: the profile with more non-null fields; tie-break by earliest created_at
        SELECT id INTO winner_id
        FROM employer_profile
        WHERE recruiter_id = rec.recruiter_id
        ORDER BY
            (CASE WHEN logo_url IS NOT NULL THEN 1 ELSE 0 END
             + CASE WHEN cover_url IS NOT NULL THEN 1 ELSE 0 END
             + CASE WHEN summary IS NOT NULL AND summary NOT LIKE 'Imported from%' THEN 1 ELSE 0 END
             + CASE WHEN description IS NOT NULL AND description NOT LIKE 'This employer profile was generated%' THEN 1 ELSE 0 END
             + CASE WHEN industry IS NOT NULL AND industry <> 'Technology' THEN 1 ELSE 0 END
             + CASE WHEN company_size IS NOT NULL AND company_size <> 'UNKNOWN' THEN 1 ELSE 0 END
             + CASE WHEN website_url IS NOT NULL THEN 1 ELSE 0 END
             + CASE WHEN benefits IS NOT NULL AND benefits::text <> '[]' THEN 1 ELSE 0 END
             + CASE WHEN is_featured THEN 1 ELSE 0 END
            ) DESC,
            created_at ASC
        LIMIT 1;

        -- For each loser profile, merge non-null fields into winner, then delete
        FOR loser_id IN
            SELECT id FROM employer_profile
            WHERE recruiter_id = rec.recruiter_id AND id <> winner_id
        LOOP
            UPDATE employer_profile w
            SET
                logo_url     = COALESCE(w.logo_url,     l.logo_url),
                cover_url    = COALESCE(w.cover_url,     l.cover_url),
                summary      = CASE WHEN w.summary IS NULL OR w.summary LIKE 'Imported from%'
                                    THEN COALESCE(l.summary, w.summary) ELSE w.summary END,
                description  = CASE WHEN w.description IS NULL OR w.description LIKE 'This employer profile was generated%'
                                    THEN COALESCE(l.description, w.description) ELSE w.description END,
                industry     = CASE WHEN w.industry IS NULL OR w.industry = 'Technology'
                                    THEN COALESCE(l.industry, w.industry) ELSE w.industry END,
                company_size = CASE WHEN w.company_size IS NULL OR w.company_size = 'UNKNOWN'
                                    THEN COALESCE(l.company_size, w.company_size) ELSE w.company_size END,
                location     = COALESCE(w.location,     l.location),
                website_url  = COALESCE(w.website_url,  l.website_url),
                benefits     = CASE WHEN w.benefits IS NULL OR w.benefits::text = '[]'
                                    THEN COALESCE(l.benefits, w.benefits) ELSE w.benefits END,
                is_featured  = w.is_featured OR l.is_featured,
                updated_at   = NOW()
            FROM employer_profile l
            WHERE w.id = winner_id AND l.id = loser_id;

            DELETE FROM employer_profile WHERE id = loser_id;
        END LOOP;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 2: Add UNIQUE constraint on employer_profile(recruiter_id)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE employer_profile
ADD CONSTRAINT uq_employer_recruiter_id UNIQUE (recruiter_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 3: Done. Importer changes (alias deactivation) are handled in JS code.
-- ═══════════════════════════════════════════════════════════════════════════════
