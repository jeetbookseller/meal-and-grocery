-- ============================================================
-- 002_fix_households_rls.sql
-- Fix households INSERT policy to explicitly target authenticated role.
-- The original WITH CHECK (true) without TO authenticated can fail in
-- Supabase because the policy must be scoped to the authenticated role.
-- ============================================================

DROP POLICY IF EXISTS households_insert ON households;

CREATE POLICY households_insert ON households FOR INSERT TO authenticated
  WITH CHECK (true);
