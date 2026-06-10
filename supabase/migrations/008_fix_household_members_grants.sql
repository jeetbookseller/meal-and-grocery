-- ============================================================
-- 008_fix_household_members_grants.sql
-- Security fix: prevent any authenticated user from joining an
-- arbitrary household by direct INSERT into household_members.
--
-- The household_members_insert RLS policy only constrains user_id
-- (WITH CHECK user_id = auth.uid()); it does NOT restrict household_id.
-- Combined with the direct INSERT grant the authenticated role held, any
-- signed-in user could POST {household_id: <any>, user_id: <self>} to
-- /rest/v1/household_members and join any household, bypassing the
-- invite-code flow entirely (full read/write to that household's data).
--
-- Membership is only ever meant to be created through the create_household
-- and join_household RPCs, which are SECURITY DEFINER and run as the function
-- owner, so they bypass these table grants. The authenticated role therefore
-- does not need direct write access. SELECT is retained because the client
-- reads the caller's own membership directly in household.ts (still row-scoped
-- by the household_members_select policy). anon is also revoked for defense in
-- depth (it was already blocked by RLS since every policy requires auth.uid()).
-- ============================================================

REVOKE INSERT, UPDATE, DELETE ON public.household_members FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.household_members FROM anon;
