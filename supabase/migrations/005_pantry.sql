-- ============================================================
-- 005_pantry.sql
-- Pantry tab: track food already at home
-- ============================================================

-- ---- pantry_items ----

CREATE TABLE pantry_items (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  quantity     text,
  is_checked   bool        NOT NULL DEFAULT false,
  sort_order   int         NOT NULL DEFAULT 0,
  created_by   uuid        REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pantry_items_household_idx ON pantry_items(household_id);

ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY pantry_items_select ON pantry_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = pantry_items.household_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY pantry_items_insert ON pantry_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = pantry_items.household_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY pantry_items_update ON pantry_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = pantry_items.household_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY pantry_items_delete ON pantry_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = pantry_items.household_id
        AND user_id = auth.uid()
    )
  );

-- ---- pantry_item_meals ----
-- No household_id column — must join through pantry_items → household_members.

CREATE TABLE pantry_item_meals (
  pantry_item_id uuid REFERENCES pantry_items(id) ON DELETE CASCADE,
  meal_id        uuid REFERENCES meals(id) ON DELETE CASCADE,
  PRIMARY KEY (pantry_item_id, meal_id)
);

ALTER TABLE pantry_item_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY pantry_item_meals_select ON pantry_item_meals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pantry_items pi
      JOIN household_members hm ON hm.household_id = pi.household_id
      WHERE pi.id = pantry_item_meals.pantry_item_id
        AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY pantry_item_meals_insert ON pantry_item_meals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pantry_items pi
      JOIN household_members hm ON hm.household_id = pi.household_id
      WHERE pi.id = pantry_item_meals.pantry_item_id
        AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY pantry_item_meals_delete ON pantry_item_meals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pantry_items pi
      JOIN household_members hm ON hm.household_id = pi.household_id
      WHERE pi.id = pantry_item_meals.pantry_item_id
        AND hm.user_id = auth.uid()
    )
  );

-- Enable realtime for pantry_items
ALTER PUBLICATION supabase_realtime ADD TABLE pantry_items;
