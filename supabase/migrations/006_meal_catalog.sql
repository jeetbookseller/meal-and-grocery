-- ============================================================
-- 006_meal_catalog.sql
-- Discover tab: household recipe catalog with effort/protein metadata
-- ============================================================

CREATE TABLE meal_catalog (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    uuid        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  category        text        NOT NULL CHECK (category IN ('low', 'medium', 'high', 'onepot')),
  protein         text        NOT NULL CHECK (protein IN ('high', 'medium', 'low')),
  cook_time       text        NOT NULL,
  emoji           text        NOT NULL DEFAULT '🥗',
  description     text,
  key_ingredients text[]      NOT NULL DEFAULT '{}',
  tags            text[]      NOT NULL DEFAULT '{dinner}',
  created_by      uuid        REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX meal_catalog_household_idx ON meal_catalog(household_id);

ALTER TABLE meal_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY meal_catalog_select ON meal_catalog FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = meal_catalog.household_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY meal_catalog_insert ON meal_catalog FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = meal_catalog.household_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY meal_catalog_update ON meal_catalog FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = meal_catalog.household_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY meal_catalog_delete ON meal_catalog FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = meal_catalog.household_id
        AND user_id = auth.uid()
    )
  );
