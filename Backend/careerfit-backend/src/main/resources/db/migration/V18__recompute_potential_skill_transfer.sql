-- Potential classification now uses the versioned skill-transfer model.
-- Existing matchings are recomputed by the scheduler without blocking startup.
UPDATE matching
SET needs_recompute = TRUE;
