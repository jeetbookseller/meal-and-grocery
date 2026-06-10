-- ============================================================
-- 007_data_api_grants.sql
-- Explicit Data API grants for all public tables and RPC functions
--
-- Supabase no longer grants Data API roles access to tables in the
-- "public" schema by default (new projects from 2026-05-30, all
-- existing projects from 2026-10-30). Without an explicit GRANT,
-- supabase-js / PostgREST return a 42501 permission error.
--
-- anon is intentionally NOT granted: every RLS policy in this app
-- requires auth.uid(), so anonymous requests can never see rows.
-- Granting only authenticated + service_role keeps least privilege.
-- GRANT is idempotent, so this is safe to re-run on projects where
-- the old default privileges already applied.
-- ============================================================

-- Tables: full CRUD for logged-in users (RLS still scopes rows to
-- household membership) and for service_role (Supabase tooling).
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.households,
  public.household_members,
  public.meals,
  public.grocery_sections,
  public.grocery_items,
  public.grocery_item_meals,
  public.pantry_items,
  public.pantry_item_meals,
  public.meal_catalog
TO authenticated, service_role;

-- RPC functions invoked from the client via supabase.rpc().
GRANT EXECUTE ON FUNCTION
  public.create_household(text),
  public.join_household(text),
  public.regenerate_invite_code(uuid)
TO authenticated, service_role;

-- Postgres grants EXECUTE to PUBLIC by default, which exposes
-- SECURITY DEFINER functions to anonymous /rest/v1/rpc/ calls
-- (flagged by the Supabase security advisor). Revoke it; the explicit
-- grants above keep the client RPCs working for logged-in users.
REVOKE EXECUTE ON FUNCTION
  public.create_household(text),
  public.join_household(text),
  public.regenerate_invite_code(uuid),
  public.seed_default_sections(uuid),
  public.set_updated_at()
FROM PUBLIC, anon;

-- Internal-only functions must not be client-callable at all.
-- seed_default_sections has no auth check (it is only safe when called
-- inside create_household), and set_updated_at is a trigger function.
-- Triggers and SECURITY DEFINER callers are unaffected: trigger EXECUTE
-- is checked at CREATE TRIGGER time, and create_household runs as the
-- function owner.
REVOKE EXECUTE ON FUNCTION
  public.seed_default_sections(uuid),
  public.set_updated_at()
FROM authenticated;
