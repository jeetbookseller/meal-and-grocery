-- ============================================================
-- 001_initial_schema.sql
-- Meal Planner & Grocery List App — Initial Schema
-- ============================================================

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE households (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE household_members (
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (household_id, user_id)
);

CREATE TABLE meals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  date         date NOT NULL,
  meal_type    text CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  title        text NOT NULL,
  notes        text,
  sort_order   int NOT NULL DEFAULT 0,
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX meals_household_date_idx ON meals (household_id, date);

CREATE TABLE grocery_sections (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         text NOT NULL,
  sort_order   int NOT NULL DEFAULT 0,
  is_default   bool NOT NULL DEFAULT false
);

CREATE TABLE grocery_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  section_id   uuid REFERENCES grocery_sections(id) ON DELETE SET NULL,
  name         text NOT NULL,
  quantity     text,
  is_checked   bool NOT NULL DEFAULT false,
  sort_order   int NOT NULL DEFAULT 0,
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX grocery_items_household_section_idx ON grocery_items (household_id, section_id);

CREATE TABLE grocery_item_meals (
  grocery_item_id uuid NOT NULL REFERENCES grocery_items(id) ON DELETE CASCADE,
  meal_id         uuid NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  PRIMARY KEY (grocery_item_id, meal_id)
);

-- ============================================================
-- updated_at TRIGGER for meals
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER meals_set_updated_at
  BEFORE UPDATE ON meals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE households        ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_sections  ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_item_meals ENABLE ROW LEVEL SECURITY;

-- ---- households ----
-- Users can view/modify a household only if they are a member of it.

CREATE POLICY households_select ON households FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = households.id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY households_insert ON households FOR INSERT
  WITH CHECK (true); -- anyone authenticated can create a household; membership inserted separately

CREATE POLICY households_update ON households FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = households.id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY households_delete ON households FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = households.id
        AND user_id = auth.uid()
    )
  );

-- ---- household_members ----

CREATE POLICY household_members_select ON household_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY household_members_insert ON household_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY household_members_delete ON household_members FOR DELETE
  USING (user_id = auth.uid());

-- ---- meals ----

CREATE POLICY meals_select ON meals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = meals.household_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY meals_insert ON meals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = meals.household_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY meals_update ON meals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = meals.household_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY meals_delete ON meals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = meals.household_id
        AND user_id = auth.uid()
    )
  );

-- ---- grocery_sections ----

CREATE POLICY grocery_sections_select ON grocery_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = grocery_sections.household_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY grocery_sections_insert ON grocery_sections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = grocery_sections.household_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY grocery_sections_update ON grocery_sections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = grocery_sections.household_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY grocery_sections_delete ON grocery_sections FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = grocery_sections.household_id
        AND user_id = auth.uid()
    )
  );

-- ---- grocery_items ----

CREATE POLICY grocery_items_select ON grocery_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = grocery_items.household_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY grocery_items_insert ON grocery_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = grocery_items.household_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY grocery_items_update ON grocery_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = grocery_items.household_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY grocery_items_delete ON grocery_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = grocery_items.household_id
        AND user_id = auth.uid()
    )
  );

-- ---- grocery_item_meals ----
-- No household_id column — must join through grocery_items → household_members.

CREATE POLICY grocery_item_meals_select ON grocery_item_meals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM grocery_items gi
      JOIN household_members hm ON hm.household_id = gi.household_id
      WHERE gi.id = grocery_item_meals.grocery_item_id
        AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY grocery_item_meals_insert ON grocery_item_meals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM grocery_items gi
      JOIN household_members hm ON hm.household_id = gi.household_id
      WHERE gi.id = grocery_item_meals.grocery_item_id
        AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY grocery_item_meals_delete ON grocery_item_meals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM grocery_items gi
      JOIN household_members hm ON hm.household_id = gi.household_id
      WHERE gi.id = grocery_item_meals.grocery_item_id
        AND hm.user_id = auth.uid()
    )
  );

-- ============================================================
-- SEED FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION seed_default_sections(p_household_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO grocery_sections (household_id, name, sort_order, is_default) VALUES
    (p_household_id, 'Produce',              1,  true),
    (p_household_id, 'Dairy',                2,  true),
    (p_household_id, 'Meat & Seafood',       3,  true),
    (p_household_id, 'Frozen',               4,  true),
    (p_household_id, 'Pantry/Dry Goods',     5,  true),
    (p_household_id, 'Condiments & Sauces',  6,  true),
    (p_household_id, 'Beverages',            7,  true),
    (p_household_id, 'Bakery/Bread',         8,  true),
    (p_household_id, 'Snacks',               9,  true),
    (p_household_id, 'Home Cleaning',        10, true),
    (p_household_id, 'Personal Hygiene',     11, true),
    (p_household_id, 'Other',                12, true);
END;
$$;

-- ============================================================
-- REALTIME PUBLICATIONS
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE meals;
ALTER PUBLICATION supabase_realtime ADD TABLE grocery_items;
ALTER PUBLICATION supabase_realtime ADD TABLE grocery_sections;
