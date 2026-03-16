-- ============================================================
-- 002_fix_security_warnings.sql
-- Fixes Supabase security advisor warnings:
-- 1. Mutable search_path on set_updated_at and seed_default_sections
-- 2. RLS policy always-true on households INSERT
-- Note: Leaked password protection must be enabled via Supabase Auth dashboard.
-- ============================================================

-- Fix 1: Lock search_path on set_updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix 2: Lock search_path on seed_default_sections (SECURITY DEFINER)
-- Use fully-qualified table name since search_path is empty
CREATE OR REPLACE FUNCTION seed_default_sections(p_household_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.grocery_sections (household_id, name, sort_order, is_default) VALUES
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

-- Fix 3: Replace always-true households INSERT policy with auth check
-- Any authenticated user may create a household; but anonymous access is blocked.
DROP POLICY households_insert ON public.households;
CREATE POLICY households_insert ON public.households FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
