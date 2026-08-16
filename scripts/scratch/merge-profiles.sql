DO $$
DECLARE
    invalid_benefits_count INT;
BEGIN
    SELECT COUNT(*) INTO invalid_benefits_count
    FROM employer_profile
    WHERE benefits IS NOT NULL AND jsonb_typeof(benefits) != 'array';
    
    IF invalid_benefits_count > 0 THEN
        RAISE EXCEPTION 'Found % employer profiles with invalid benefits JSON shape (not an array)', invalid_benefits_count;
    END IF;
END $$;

UPDATE employer_profile canonical
SET
    logo_url = COALESCE(NULLIF(canonical.logo_url, ''), aa.logo_url),
    cover_url = COALESCE(NULLIF(canonical.cover_url, ''), aa.cover_url),
    summary = COALESCE(CASE WHEN canonical.summary LIKE 'Imported from%' THEN NULL ELSE NULLIF(canonical.summary, '') END, aa.summary, canonical.summary),
    description = COALESCE(CASE WHEN canonical.description LIKE 'This employer profile was generated%' THEN NULL ELSE NULLIF(canonical.description, '') END, aa.description, canonical.description),
    industry = COALESCE(CASE WHEN canonical.industry = 'Technology' THEN NULL ELSE NULLIF(canonical.industry, '') END, aa.industry, canonical.industry),
    company_size = COALESCE(CASE WHEN canonical.company_size = 'UNKNOWN' THEN NULL ELSE NULLIF(canonical.company_size, '') END, aa.company_size, canonical.company_size),
    location = COALESCE(CASE WHEN canonical.location = 'Vietnam' THEN NULL ELSE NULLIF(canonical.location, '') END, aa.location, canonical.location),
    website_url = COALESCE(NULLIF(canonical.website_url, ''), aa.website_url),
    benefits = (
        SELECT COALESCE(jsonb_agg(benefit ORDER BY benefit::text), '[]'::jsonb)
        FROM (
            SELECT DISTINCT elem.value AS benefit
            FROM (
                SELECT b.value
                FROM jsonb_array_elements(
                    CASE WHEN canonical.benefits IS NULL THEN '[]'::jsonb ELSE canonical.benefits END
                ) AS b(value)
                UNION ALL
                SELECT b.value
                FROM jsonb_array_elements(COALESCE(aa.merged_benefits, '[]'::jsonb)) AS b(value)
            ) AS combined_elems(value)
        ) AS unique_benefits
    ),
    is_featured = COALESCE(canonical.is_featured, FALSE) OR COALESCE(aa.is_featured, FALSE),
    updated_at = NOW()
FROM (
    WITH ranked_aliases AS (
        SELECT
            o.canonical_recruiter_id,
            a.logo_url,
            a.cover_url,
            a.summary,
            a.description,
            a.industry,
            a.company_size,
            a.location,
            a.website_url,
            a.benefits,
            a.is_featured,
            ROW_NUMBER() OVER (PARTITION BY o.canonical_recruiter_id ORDER BY a.recruiter_id ASC, a.id ASC) as rn
        FROM temp_orphan_aliases o
        JOIN employer_profile a ON a.recruiter_id = o.old_recruiter_id
    )
    SELECT
        canonical_recruiter_id,
        (array_agg(logo_url ORDER BY rn) FILTER (WHERE logo_url IS NOT NULL AND logo_url != ''))[1] AS logo_url,
        (array_agg(cover_url ORDER BY rn) FILTER (WHERE cover_url IS NOT NULL AND cover_url != ''))[1] AS cover_url,
        (array_agg(summary ORDER BY rn) FILTER (WHERE summary IS NOT NULL AND summary != '' AND summary NOT LIKE 'Imported from%'))[1] AS summary,
        (array_agg(description ORDER BY rn) FILTER (WHERE description IS NOT NULL AND description != '' AND description NOT LIKE 'This employer profile was generated%'))[1] AS description,
        (array_agg(industry ORDER BY rn) FILTER (WHERE industry IS NOT NULL AND industry != '' AND industry != 'Technology'))[1] AS industry,
        (array_agg(company_size ORDER BY rn) FILTER (WHERE company_size IS NOT NULL AND company_size != '' AND company_size != 'UNKNOWN'))[1] AS company_size,
        (array_agg(location ORDER BY rn) FILTER (WHERE location IS NOT NULL AND location != '' AND location != 'Vietnam'))[1] AS location,
        (array_agg(website_url ORDER BY rn) FILTER (WHERE website_url IS NOT NULL AND website_url != ''))[1] AS website_url,
        (
            SELECT jsonb_agg(benefit ORDER BY benefit::text) FROM (
                SELECT DISTINCT b.value AS benefit
                FROM ranked_aliases ra2
                CROSS JOIN LATERAL jsonb_array_elements(ra2.benefits) AS b(value)
                WHERE ra2.canonical_recruiter_id = ranked_aliases.canonical_recruiter_id
                  AND ra2.benefits IS NOT NULL
            ) AS distinct_alias_benefits
        ) AS merged_benefits,
        bool_or(COALESCE(is_featured, FALSE)) AS is_featured
    FROM ranked_aliases
    GROUP BY canonical_recruiter_id
) aa
WHERE canonical.recruiter_id = aa.canonical_recruiter_id;
