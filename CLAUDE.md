# Meal Planner & Grocery List App — Developer Guide

A shared meal planning and grocery list web app for two users (Jeet + partner). Built with Vue 3 + TypeScript + Supabase, deployed to GitHub Pages.

---

## Tech Stack

- **Frontend**: Vue 3 + TypeScript, Vite, Tailwind CSS v4, Pinia
- **Backend**: Supabase (Postgres + Auth + Realtime)
- **Deploy**: GitHub Pages (hash router — no 404 redirect hack needed)
- **Auth**: Supabase email/password, two accounts sharing one household

---

## Development Workflow (TDD)

For every task: **plan → tests → implement → document**

1. Write or review the task spec below
2. Write failing tests first (Vitest for stores, component tests for UI)
3. Implement until tests pass
4. Update this file if the architecture changes

---

## Current Architecture

**Design**: Anylist-style flat lists with Notion-style aesthetics. Both meals and groceries are simple, flat, checkable lists. No date grouping, no grocery sections. Meals support optional free-form type tags with a toggle to group by type.

### Component Tree

```
App.vue
└── router-view
    ├── LoginView.vue
    │   └── AuthForm.vue
    └── AppLayout.vue
        ├── TopNav.vue                  (tabs + user avatar + logout)
        ├── MealPlanView.vue            (Tab 1: /app/meals)
        │   ├── MealRow.vue             (checkbox + title + meal type badge + linked count + edit/delete)
        │   ├── MealEditModal.vue       (title + meal type input + linked grocery picker)
        │   └── ClearCheckedButton.vue
        └── GroceryListView.vue         (Tab 2: /app/groceries)
            ├── GroceryItem.vue         (checkbox + name + qty + store label + edit/delete + meal badges; hideStore prop)
            ├── GroceryItemEditModal.vue (name, qty, store input w/ datalist autocomplete, linked meals)
            ├── MealLinkPicker.vue      (modal for linking meals)
            └── ClearCheckedButton.vue
```

### Store Structure

```
src/stores/
├── auth.ts       — session, user, login(), signup(), logout(),
│                   signupPendingConfirmation, emailConfirmed
├── household.ts  — householdId, householdName, ready flag
├── meals.ts      — meals[], groupedMeals (computed), mealTypeOptions (computed),
│                   fetchMeals(), addMeal(), updateMeal(), deleteMeal(),
│                   toggleChecked(), clearChecked(), Realtime
└── grocery.ts    — items[], fetchItems(), addItem(), updateItem(), deleteItem(),
                    toggleChecked(), clearChecked(), linkItemToMeals(), Realtime,
                    storeNames (computed: sorted deduped list of store names in use)
```

### Key Behaviors

- **Meals**: flat list, unchecked first then checked (dimmed). `clearChecked()` deletes checked meals from DB.
- **Groceries**: flat list, same order pattern. `section_id` FK kept in DB but never exposed in UI — a single "Ungrouped" section is auto-created internally.
- **Cross-linking**: grocery items can be linked to meals. Meal rows show linked item count badge; grocery items show linked meal badges.
- **Store field**: grocery items have an optional free-text `store` field (e.g. "Trader Joe's"). In default mode the store name is shown as a muted label on the item row. A toggle button in the header switches between "Default" (flat) and "By Store" grouping — in By Store mode items are grouped under bold store headers (alphabetical, "No store" last), and the per-item store label is hidden (redundant with header). Store names autocomplete from previously-used values via an HTML `<datalist>`.
- **Realtime**: both stores subscribe to Supabase Realtime channels on mount, handling INSERT/UPDATE/DELETE.
- **Meal Types**: meals can optionally be tagged with a free-form type (e.g., Breakfast, Brunch, Snack, Dessert). Previously used types appear as autocomplete suggestions via datalist. The UI has a toggle to group meals by type — groups are sorted alphabetically with untyped meals in an "Other" group at the end.
- **Signup flow**: AuthForm shows password requirements indicators (min 15 chars, lowercase, uppercase, digit, symbol) and confirm password field during signup. Client-side validation blocks submit if password doesn't meet all requirements or fields don't match. On successful signup (when email confirmation is required), the form is replaced with a "check your email" success message. When returning from an email confirmation link, a "Email confirmed, please sign in" banner appears above the login form.

---

## Key Design Decisions

1. **Hash router** (`createWebHashHistory`): avoids the `404.html` redirect hack required by GitHub Pages with HTML5 history mode.

2. **Household race condition guard**: `AppLayout.vue` renders `<router-view>` only when `householdStore.ready === true`. This ensures `householdId` is always available before meals/grocery stores make any Supabase queries.

3. **Realtime deduplication**: all three event types (INSERT, UPDATE, DELETE) must be handled in stores. UPDATE events replace the local record by ID regardless of whether the current user triggered it.

4. **RLS on the join table**: `grocery_item_meals` has no `household_id` column. Its RLS policy joins through `grocery_items → household_members`.

5. **Single internal grocery section**: The DB requires `section_id` on grocery items. A single "Ungrouped" section is auto-created on init via `_ensureUngroupedSection()`, but the UI never exposes section management.

6. **Meals `is_checked`**: Added via migration `002_meals_is_checked.sql`. Checked meals are deleted on "Clear checked" (same behavior as groceries).

7. **Free-text store field + datalist autocomplete**: Grocery items have an optional `store text` column instead of a separate stores table. This keeps it simple — no CRUD UI for stores, no FK constraints, and unused store names naturally disappear when items are cleared. Autocomplete is provided via HTML `<datalist>` wired to the `storeNames` computed (sorted, deduplicated list of store names currently in use).

8. **Free-form meal types**: `meal_type` is an unconstrained text column (CHECK constraint dropped in migration `003_meals_free_form_meal_type.sql`). Grouping is a client-side computed (`groupedMeals`). Autocomplete suggestions come from `mealTypeOptions` computed (deduped case-insensitively, sorted, from current store data). No separate lookup table — keeps it simple.

9. **Email confirmation detection with hash router**: After email confirmation, Supabase redirects with `#access_token=...&type=signup` in the URL hash. `authStore.init()` captures `window.location.hash` **before** Supabase's `getSession()` parses and cleans it, checks for `type=signup` or `type=email_change`, sets `emailConfirmed = true`, then signs the user out so they see the login form with the confirmation banner. The `onAuthStateChange` listener is guarded to skip updates while `emailConfirmed` is true (prevents the sign-out event from resetting state).

10. **Client-side password validation**: Password requirements (min 15 chars, lowercase, uppercase, digit, symbol) are enforced both client-side (AuthForm blocks submit) and server-side (Supabase rejects weak passwords). The client-side check is a UX convenience — Supabase remains the source of truth. Requirements are configurable in Supabase Dashboard > Authentication > Settings.

---

## Design System

**Tailwind v4** — no `tailwind.config.js`. All tokens in `src/style.css` via `@theme {}`.

**Color palette** (Notion-inspired, light-only):
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-background` | `#F7F7F5` | Page / app background |
| `--color-surface` | `#FFFFFF` | Cards, modals, nav |
| `--color-border` | `#E8E8E5` | All borders |
| `--color-text-primary` | `#1F1F1E` | Headings, labels |
| `--color-text-secondary` | `#787774` | Sub-labels, user email |
| `--color-text-muted` | `#AFAFAC` | Placeholder, empty states |
| `--color-accent` | `#2383E2` | Primary CTAs, focus rings |
| `--color-accent-hover` | `#1A6FCC` | Hover state |
| `--color-danger` | `#E03E3E` | Delete, errors |
| `--color-hover-bg` | `#F4F4F2` | Row hover |

**Typography**: Inter font, 14px base, antialiased.

**Reusable classes**: `.btn-primary`, `.btn-ghost`, `.card`, `.input`, `.modal-panel`, `.nav-tab-active`

**Constraints**:
- All interactive elements: `min-w-[44px] min-h-[44px]` touch targets
- Modals: `fixed inset-0` wrapper, `backdrop-blur-sm` on overlay, `.modal-panel` on inner panel
- TopNav: `hidden sm:inline` on user email

---

## Critical Files

| File | Why it matters |
|------|----------------|
| `supabase/migrations/001_initial_schema.sql` | Original schema + RLS |
| `supabase/migrations/002_meals_is_checked.sql` | Adds `is_checked` to meals |
| `supabase/migrations/003_grocery_store_field.sql` | Adds nullable `store` text column to grocery_items |
| `supabase/migrations/003_meals_free_form_meal_type.sql` | Drops CHECK constraint on `meal_type` to allow free-form values |
| `src/lib/supabase.ts` | Typed Supabase client, imported by every store |
| `src/types/database.ts` | TypeScript interfaces for all DB tables |
| `src/stores/auth.ts` | Gates the entire app |
| `src/stores/household.ts` | Provides `householdId` for all queries |
| `src/stores/meals.ts` | Meal CRUD + realtime |
| `src/stores/grocery.ts` | Grocery CRUD + realtime |
| `src/style.css` | Design tokens + component classes |

---

## Pantry Tab — Implementation Plan (MVP)

Track what food is already at home. Third tab alongside Meals and Groceries. Simpler than Groceries — no store field, no sections, no grouping. Just a flat checkable list with meal linking.

### Step 1: Database Migration — `supabase/migrations/005_pantry.sql`

**`pantry_items` table** (modeled after `grocery_items`, no `section_id` or `store`):
- `id` uuid PK default `gen_random_uuid()`
- `household_id` uuid NOT NULL FK → `households(id) ON DELETE CASCADE`
- `name` text NOT NULL
- `quantity` text (nullable)
- `is_checked` bool NOT NULL DEFAULT false
- `sort_order` int NOT NULL DEFAULT 0
- `created_by` uuid FK → `auth.users(id)`
- `created_at` timestamptz NOT NULL DEFAULT `now()`
- Index on `household_id`

**`pantry_item_meals` junction table** (modeled after `grocery_item_meals`):
- `pantry_item_id` uuid FK → `pantry_items(id) ON DELETE CASCADE`
- `meal_id` uuid FK → `meals(id) ON DELETE CASCADE`
- Composite PK `(pantry_item_id, meal_id)`

**RLS**: Same policy patterns as `grocery_items` and `grocery_item_meals` in `001_initial_schema.sql` (lines 214–281). 4 policies on `pantry_items` checking `household_members`, 3 policies on `pantry_item_meals` joining through `pantry_items`.

**Realtime**: `ALTER PUBLICATION supabase_realtime ADD TABLE pantry_items;`

### Step 2: TypeScript Types — `src/types/database.ts`

Add after `GroceryItemMeal`:
```typescript
export interface PantryItem {
  id: string
  household_id: string
  name: string
  quantity: string | null
  is_checked: boolean
  sort_order: number
  created_by: string
  created_at: string
}

export interface PantryItemMeal {
  pantry_item_id: string
  meal_id: string
}
```
Add `pantry_items` and `pantry_item_meals` entries to `Database['Tables']`.

### Step 3: Pinia Store — `src/stores/pantry.ts` (NEW)

Simplified copy of `src/stores/grocery.ts`. Strip out: sections, `store` field, `storeNames` computed, `_ensureUngroupedSection`.

- **State**: `items` (PantryItem[]), `itemLinks`, `loading`, `error`
- **Computed**: `itemMealLinks`, `mealPantryCounts`, `mealItemIds` — same logic as grocery store equivalents
- **Methods**: `fetchItems()`, `fetchItemMealLinks()`, `addItem()`, `updateItem()`, `deleteItem()`, `toggleChecked()`, `clearChecked()`, `linkItemToMeals()`, `linkMealToItems()`, `subscribeRealtime()`, `unsubscribeRealtime()`
- Realtime channels: `pantry-items-changes`, `pantry-item-meals-changes`

### Step 4: Components

#### 4a. `src/components/PantryItem.vue` (NEW)
Simplified copy of `src/components/GroceryItem.vue`. No store badge, no `hideStore` prop. Uses `usePantryStore`.

#### 4b. `src/components/pantry/PantryItemEditModal.vue` (NEW)
Simplified copy of `src/components/grocery/GroceryItemEditModal.vue`. Only Name + Quantity fields (no Store). Reuses `MealLinkPicker.vue` as-is for meal linking.

#### 4c. `src/components/pantry/PantryLinkPicker.vue` (NEW)
Copy of `src/components/grocery/GroceryLinkPicker.vue` adapted for pantry items. Title: "Link to Pantry Items". Used by MealEditModal.

### Step 5: View — `src/views/PantryListView.vue` (NEW)

Simplified copy of `src/views/GroceryListView.vue`. No grouping toggle, no store-based grouping. Quick-add form (name only), flat sorted list, ClearCheckedButton at bottom. Empty state: "Your pantry is empty."

### Step 6: Router — `src/router/index.ts`

Add child route under `/app`:
```typescript
{ path: 'pantry', name: 'pantry', component: () => import('@/views/PantryListView.vue') }
```

### Step 7: TopNav — `src/components/TopNav.vue`

Add third `RouterLink` to `/app/pantry` with text "Pantry", same styling as existing tabs.

### Step 8: Meal Integration

#### `src/components/MealRow.vue`
- Add props: `linkedPantryCount?: number`, `linkedPantryItemIds?: string[]`
- Add a second badge (green/teal tone) showing pantry count when > 0

#### `src/components/MealEditModal.vue`
- Add prop `linkedPantryItemIds?: string[]`
- Add second link picker button → `PantryLinkPicker`
- In `handleSubmit`, also call `pantryStore.linkMealToItems()`

#### `src/views/MealPlanView.vue`
- Import `usePantryStore`, fetch pantry items + links in `onMounted`
- Pass `linkedPantryCount` and `linkedPantryItemIds` to every `MealRow`

### Step 9: Tests

- `src/tests/stores/pantry.test.ts` — mirror grocery store tests
- `src/tests/components/PantryItem.test.ts`
- `src/tests/components/PantryListView.test.ts`

### Step 10: Update CLAUDE.md

After implementation, update these sections:

**Component Tree** — add under AppLayout:
```
├── PantryListView.vue          (Tab 3: /app/pantry)
│   ├── PantryItem.vue          (checkbox + name + qty + meal badges + edit/delete)
│   ├── PantryItemEditModal.vue (name, qty, linked meals)
│   └── ClearCheckedButton.vue
```

**Store Structure** — add:
```
├── pantry.ts    — items[], fetchItems(), addItem(), updateItem(), deleteItem(),
                   toggleChecked(), clearChecked(), linkItemToMeals(), Realtime
```

**Key Behaviors** — add: Pantry is a flat list of items at home. Same check/clear pattern as groceries. Items link to meals via `pantry_item_meals` junction table. No store field, no grouping.

**Design Decisions** — add: Pantry tab is intentionally simpler than Groceries — no store field, no sections, no grouping. Just a flat checkable list with meal linking.

**Critical Files** — add: `supabase/migrations/005_pantry.sql` and `src/stores/pantry.ts`.

### Key Files to Reference (Templates)

| New file | Copy/simplify from |
|----------|-------------------|
| `src/stores/pantry.ts` | `src/stores/grocery.ts` |
| `src/components/PantryItem.vue` | `src/components/GroceryItem.vue` |
| `src/components/pantry/PantryItemEditModal.vue` | `src/components/grocery/GroceryItemEditModal.vue` |
| `src/components/pantry/PantryLinkPicker.vue` | `src/components/grocery/GroceryLinkPicker.vue` |
| `src/views/PantryListView.vue` | `src/views/GroceryListView.vue` |

### Verification

1. Run `npm run test` — all existing + new tests pass
2. Run `npm run dev` — verify 3 tabs render correctly
3. Add pantry items, check/uncheck, clear checked
4. Link pantry items to meals from both directions (PantryItemEditModal and MealEditModal)
5. Verify MealRow shows both grocery and pantry count badges
6. Open two tabs — verify Realtime sync for pantry items
7. Run the migration SQL in Supabase dashboard before deploying

---

## Future Improvements

### Grocery ↔ Pantry Transfer Flow

Seamless movement of items between Grocery and Pantry tabs, keeping meal links intact.

#### Behaviors

1. **Grocery → Pantry** (item bought): When a grocery item is checked off, prompt "Add to Pantry?" If yes, create a pantry item with the same name/quantity, copy all meal links from `grocery_item_meals` to `pantry_item_meals`, then proceed with normal check behavior.

2. **Pantry → Grocery** (item used up): When a pantry item is checked off, prompt "Add to Grocery list?" If yes, create a grocery item with the same name/quantity, copy all meal links from `pantry_item_meals` to `grocery_item_meals`, then proceed with normal check behavior.

3. **Meal link transfer**: When transferring between tabs, all entries in the source junction table for that item are replicated to the destination junction table. The source item's links remain until it is cleared.

4. **Meal view enhancement**: Under each linked meal, show item availability status:
   - Items linked via `pantry_item_meals` show as "available" (green indicator)
   - Items linked via `grocery_item_meals` show as "to buy" (blue/orange indicator)
   - This appears in MealRow's expanded detail or in MealEditModal

#### Code Changes

| File | Change |
|------|--------|
| `src/stores/grocery.ts` | Add `transferToPantry(itemId)` — creates pantry item, copies meal links |
| `src/stores/pantry.ts` | Add `transferToGrocery(itemId)` — creates grocery item, copies meal links |
| `src/components/GroceryItem.vue` | After `toggleChecked`, show confirmation dialog for pantry transfer |
| `src/components/PantryItem.vue` | After `toggleChecked`, show confirmation dialog for grocery transfer |
| `src/components/TransferConfirmDialog.vue` | New reusable "Add to [Tab]?" dialog component |
| `src/components/MealRow.vue` | Show "available" vs "to buy" indicators for linked items |
| `src/components/MealEditModal.vue` | Display availability status next to linked items |

### Social Login (Google, Apple, GitHub)

Add OAuth sign-in buttons to the login page alongside email/password. Supabase has built-in OAuth provider support — no DB migrations needed. The existing household onboarding flow already handles new users from any auth method.

#### Code Changes

| File | Change |
|------|--------|
| `src/stores/auth.ts` | Add `loginWithProvider(provider: 'google' \| 'apple' \| 'github')` using `supabase.auth.signInWithOAuth()` with `redirectTo: window.location.origin + window.location.pathname`. Don't set `loading = false` on success since the page navigates away. Export in return statement. |
| `src/components/AuthForm.vue` | Add Google (white bg, "G" logo), Apple (black bg, Apple logo), GitHub (dark gray `#24292e` bg, octocat logo) buttons above the existing form, separated by an "or" divider. All buttons: full width, `min-h-[44px]`, disabled when loading. |
| `src/lib/supabase.ts` | Add `auth: { detectSessionInUrl: true, flowType: 'implicit' }` to `createClient` options for hash router OAuth compatibility. |
| `src/tests/stores/auth.test.ts` | Add `mockSignInWithOAuth` to mocks. Test `loginWithProvider()` for each provider, error handling, and loading state. |

#### Hash Router + OAuth Redirect

OAuth redirect returns `#access_token=...` which could collide with the hash router's `#/path` format. The Supabase client intercepts tokens from the hash before Vue Router runs (since `authStore.init()` completes before `app.mount()` in `main.ts`). If this causes issues, switch to `flowType: 'pkce'` which uses query params (`?code=xxx`) instead of hash fragments.

#### OAuth Provider Setup (manual — Supabase Dashboard)

Social login requires OAuth credentials configured in external dashboards and Supabase. These cannot be automated via MCP or CLI.

**Google:**
1. Google Cloud Console > APIs & Services > Credentials > Create OAuth 2.0 Client ID (Web application)
2. Add authorized redirect URI: `https://<supabase-project-ref>.supabase.co/auth/v1/callback`
3. Supabase Dashboard > Authentication > Providers > Google > Enable, paste Client ID + Secret

**Apple:**
1. Apple Developer Portal > Certificates, Identifiers & Profiles > Register Services ID with "Sign in with Apple"
2. Set return URL: `https://<supabase-project-ref>.supabase.co/auth/v1/callback`
3. Create private key for Sign in with Apple
4. Supabase Dashboard > Authentication > Providers > Apple > Enable, paste Service ID, Team ID, Key ID, private key

**GitHub:**
1. GitHub > Settings > Developer settings > OAuth Apps > New OAuth App
2. Set Authorization callback URL: `https://<supabase-project-ref>.supabase.co/auth/v1/callback`
3. Supabase Dashboard > Authentication > Providers > GitHub > Enable, paste Client ID + Client Secret

**Supabase Auth Settings:**
1. Authentication > URL Configuration > Add redirect URLs: `https://jeetbookseller.github.io/meal-and-grocery/` and `http://localhost:5173`
2. Authentication > Settings > Enable "Automatically link accounts with the same email"

---

## Next Steps (Supabase Dashboard Configuration)

The enhanced signup flow requires these manual Supabase Dashboard settings to work end-to-end:

### Email Confirmation (required)

1. **Supabase Dashboard > Authentication > Settings**:
   - Ensure "Enable email confirmations" is **ON** (enabled by default)
   - Set minimum password length if you want something other than the default 6 characters

2. **Supabase Dashboard > Authentication > URL Configuration**:
   - Add site URL: `https://jeetbookseller.github.io/meal-and-grocery/`
   - Add redirect URLs: `https://jeetbookseller.github.io/meal-and-grocery/` and `http://localhost:5173`
   - These URLs are where Supabase redirects after the user clicks the email confirmation link

3. **Supabase Dashboard > Authentication > Email Templates** (optional):
   - Customize the "Confirm signup" email template (subject, body, branding)
   - The default template works fine but can be personalized

### Verification Checklist

After configuring the dashboard:
- [ ] Sign up with a new email — see "check your email" success message (not a redirect)
- [ ] Receive confirmation email with a clickable link
- [ ] Click the link — land on login page with "Email confirmed!" banner
- [ ] Sign in with the confirmed email — redirect to `/app/meals`
- [ ] Try signing up with a weak password (missing length/lowercase/uppercase/digit/symbol) — see inline requirement indicators and submit blocked
- [ ] Try mismatched confirm password — see "Passwords do not match" error

---

## Deploy Steps

1. Run pending Supabase migrations in the SQL editor (check `supabase/migrations/`)
2. Configure Supabase Dashboard settings (see "Next Steps" above)
3. Push to `main` — GitHub Actions will auto-deploy to GitHub Pages
4. Smoke test: add meals, check them off, clear checked, add grocery items, link to meals, verify realtime sync between two tabs
5. Smoke test signup: create account, confirm email, verify login flow
