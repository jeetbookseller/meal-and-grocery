-- 003_meals_date_default.sql
-- The UI treats meals as a flat list with no date grouping,
-- but the column is NOT NULL. Add a default so inserts without
-- an explicit date succeed.

ALTER TABLE meals ALTER COLUMN date SET DEFAULT CURRENT_DATE;
