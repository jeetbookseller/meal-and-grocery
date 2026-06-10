# Security Analysis — Meal Planner & Grocery List App

Date: 2026-06-10
Scope: full repo (Vue client, SQL migrations, CI workflow, dependencies) plus the
live Supabase project (`ccywznyiorgryosmhiyr`), inspected via the security/performance
advisors, live `pg_policies`, and `information_schema.role_table_grants`.

---

## Summary

The baseline posture is sound: RLS is enabled on every table with a consistent
household-scoped pattern, SECURITY DEFINER functions pin `search_path` and check
`auth.uid()`, RPC `EXECUTE` is revoked from `anon`/`PUBLIC`, there is no
`service_role` key in the client, the Vue templates contain no `v-html`/`innerHTML`
sinks, and no secrets are committed to the repo or its git history.

However, there is **one real authorization hole (H-1)** that lets any signed-in user
join any household without an invite code, plus a defense-in-depth grant gap and a
set of medium/low items.

| ID  | Severity | Finding |
|-----|----------|---------|
| H-1 | **High** | Any authenticated user can join any household by direct INSERT into `household_members` (bypasses the invite-code flow entirely) |
| M-1 | Medium   | `anon` still holds legacy table-level DML grants on every public table (contradicts migration 007's stated intent; currently saved only by RLS) |
| M-2 | Medium   | Invite codes are low-entropy (8 hex chars ≈ 32 bits), never expire, single-value reuse, and `join_household` has no attempt limiting |
| M-3 | Medium   | Leaked-password protection (HaveIBeenPwned) is disabled in the live project |
| L-1 | Low      | Signup flow deliberately re-enables email enumeration for UX |
| L-2 | Low      | Household members can directly UPDATE `households.invite_code` over PostgREST, bypassing `regenerate_invite_code` |
| L-3 | Low      | 13 npm vulnerabilities (1 critical, 7 high) — all in dev/build tooling, none in the shipped bundle |
| L-4 | Low      | No Content-Security-Policy header on the deployed site |

Performance/hygiene items (from the advisor) are listed at the end.

---

## H-1 (High): Any authenticated user can join any household via direct INSERT

**Verified live** in `pg_policies` and `role_table_grants`.

```sql
-- household_members_insert (from 001_initial_schema.sql)
CREATE POLICY household_members_insert ON household_members FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

The `WITH CHECK` only constrains `user_id` to the caller's own id — it places **no
restriction on `household_id`**. The `authenticated` role holds a direct
`INSERT` grant on the table (confirmed in `role_table_grants`). So any signed-in
user can call the Data API directly:

```
POST /rest/v1/household_members
{ "household_id": "<any-household-uuid>", "user_id": "<own-uid>" }
```

…and become a member of an arbitrary household, gaining full read/write access to
its meals, groceries, pantry, and recipe catalog — the invite code is never checked.
Household UUIDs are not secret (they flow through the client and realtime channels),
so this is a direct broken-access-control path, not just a brute-force risk.

`anon` cannot exploit this: the `WITH CHECK` requires `user_id = auth.uid()`, and
`auth.uid()` is null for anonymous requests, so the insert fails. The exposure is to
any authenticated account.

**Fix (recommended):** membership should only ever be created through the
`create_household` and `join_household` RPCs, both of which are `SECURITY DEFINER`
and therefore run as the function owner — they do **not** need the `authenticated`
role to hold direct DML on `household_members`. Revoke the direct write grants and
keep only `SELECT` (the client reads membership directly in `household.ts`):

```sql
REVOKE INSERT, UPDATE, DELETE ON public.household_members FROM authenticated;
-- SELECT remains so household.ts init() can look up the caller's membership.
```

`join_household` already validates the invite code before inserting, so this closes
the hole without changing the user-facing flow.

---

## M-1 (Medium): `anon` retains legacy table grants on all public tables

`role_table_grants` shows `anon` holding `INSERT, SELECT, UPDATE, DELETE` (plus
`REFERENCES/TRIGGER/TRUNCATE`) on `household_members`, and the same legacy default
applies to the other public tables. Migration `007_data_api_grants.sql` states
"anon is intentionally NOT granted," but it only **added** grants to `authenticated`
and `service_role` — it never **revoked** the pre-existing PUBLIC/`anon` defaults
that older Supabase projects ship with. Today this is masked by RLS (every policy
requires `auth.uid()`, which is null for `anon`), so no rows are actually reachable.
But it contradicts the documented least-privilege intent and removes a layer of
defense-in-depth.

**Fix:** `REVOKE ALL ON public.<table> FROM anon;` across all public tables, matching
the migration's stated design.

---

## M-2 (Medium): Weak, non-expiring invite codes with no rate limiting

`join_household(p_invite_code)` (callable by any authenticated user) matches against
`households.invite_code`, which is `substring(gen_random_uuid()::text, 1, 8)` — 8 hex
chars, ~32 bits. Codes never expire, are reused indefinitely, and there is no attempt
cap or rate limit, so codes are guessable by an automated client over time. This is a
secondary path to H-1; even after H-1 is fixed, the invite mechanism itself should be
hardened.

**Fix:** longer codes (e.g. 16+ chars / `encode(gen_random_bytes(12),'base64')`),
optional expiry, single-use consumption, and rate limiting on the RPC.

---

## M-3 (Medium): Leaked-password protection disabled

The security advisor flags that Supabase Auth is not checking passwords against
HaveIBeenPwned. The app already enforces a strong client-side policy, so enabling
this only closes the known-breached-password gap.

**Fix:** Dashboard → Authentication → Settings → enable leaked-password protection.

---

## L-1 (Low): Signup re-enables email enumeration

`auth.ts` `signup()` detects Supabase's deliberate fake-success response for existing
emails (`data.user.identities.length === 0`) and surfaces "An account with this email
already exists." Supabase returns that fake success specifically to prevent
enumeration; the app undoes that protection for UX. Acceptable tradeoff for a
two-person app, but worth a conscious decision.

## L-2 (Low): Members can directly rewrite `invite_code`

`households_update` is `USING (member of household)` with no `WITH CHECK` and a direct
`UPDATE` grant, so a member can `PATCH /households` and set `invite_code` to any value,
bypassing `regenerate_invite_code`. Low impact within a trusted household; tightening
means column-scoping the update or routing writes through the RPC.

## L-3 (Low): npm dev-dependency vulnerabilities

`npm audit` reports 13 vulnerabilities (1 critical `vitest`, 7 high incl. `vite`,
`lodash`, `serialize-javascript`, `js-cookie`). All resolve only under
`devDependencies` — the shipped runtime deps are just `@supabase/supabase-js`,
`pinia`, `vue`, `vue-router` — so this is dev/CI exposure, not user-facing. Run
`npm audit fix`.

## L-4 (Low): No Content-Security-Policy

The GitHub Pages deploy serves no CSP. Adding one (via a `<meta http-equiv>` tag or
Pages headers) would harden against injected-script classes of attack as defense in
depth.

---

## Performance / hygiene (advisor)

- **`auth_rls_initplan` — 40 warnings.** Every policy calls `auth.uid()` directly;
  wrap as `(select auth.uid())` so it evaluates once per query instead of per row.
- **Unindexed foreign keys — 9**, notably `grocery_item_meals.meal_id`,
  `pantry_item_meals.meal_id`, and `household_members.user_id` (joined through by
  every RLS policy). Add covering indexes.
- **Migration filename collisions.** Three `002_*` and four `003_*` files make apply
  order ambiguous; renumber to a strict/timestamped sequence.

---

## Note on provenance

An earlier, incomplete draft of this file appeared in the working tree during the
analysis session and was not authored by the reviewer. It was replaced with this
version; every finding above was independently verified against the live database
(`pg_policies`, `role_table_grants`, advisors) before being included.
