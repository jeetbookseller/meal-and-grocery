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

### Discover Meals from Pantry

Suggest meals the user can cook based on what's currently available in their Pantry. Adds a "Discover" section/view that matches pantry items against a local recipe-ingredient dataset and ranks meals by ingredient coverage.

#### Concept

The user opens the Discover tab (or a section within the Meals tab). The app looks at all unchecked pantry items (i.e., items currently available at home), matches them against a built-in recipe database, and shows a ranked list of meals they can make — prioritizing meals where they already have most or all ingredients. Users can add a suggested meal directly to their meal plan and auto-generate grocery items for any missing ingredients.

#### Data Model

**No new DB tables for MVP.** Recipes live client-side as a static JSON dataset bundled with the app. This avoids Supabase complexity and keeps it fast.

**`src/data/recipes.json`** (NEW) — Static dataset of recipes:
```typescript
interface Recipe {
  id: string                    // stable slug, e.g. "chicken-stir-fry"
  name: string                  // "Chicken Stir Fry"
  ingredients: RecipeIngredient[]
  meal_type?: string            // optional, e.g. "Dinner", "Breakfast"
  tags?: string[]               // optional, e.g. ["quick", "asian", "vegetarian"]
  source?: string               // optional URL or book reference
}

interface RecipeIngredient {
  name: string                  // normalized ingredient name, e.g. "chicken breast"
  quantity?: string             // e.g. "2 lbs", "1 cup"
  optional?: boolean            // optional ingredients don't count against coverage
}
```

Start with 30–50 common recipes. The dataset can grow over time. Keep ingredient names normalized (lowercase, singular) for matching.

**Future: `recipes` table in Supabase** — If users want to add/edit custom recipes, migrate the dataset to a `recipes` table with `recipe_ingredients` join table, scoped to household. But for MVP, static JSON is simpler and faster.

#### Matching Algorithm — `src/lib/recipeMatch.ts` (NEW)

```typescript
interface RecipeMatch {
  recipe: Recipe
  score: number                 // 0–1, fraction of required ingredients available
  matchedIngredients: string[]  // ingredient names found in pantry
  missingIngredients: string[]  // ingredient names NOT in pantry
}

function matchRecipes(recipes: Recipe[], pantryItems: PantryItem[]): RecipeMatch[]
```

**Matching logic:**
1. Build a set of normalized pantry item names (lowercase, trimmed, singularized via simple rules like stripping trailing "s"/"es")
2. For each recipe, check each non-optional ingredient against the pantry set using fuzzy substring matching (e.g., pantry has "chicken" → matches "chicken breast")
3. Score = `matchedCount / requiredIngredientCount` (skip optional ingredients in denominator)
4. Sort results by score descending, then alphabetically for ties
5. Filter out recipes with score = 0 (no pantry items match at all)

**Normalization helpers** (same file):
- `normalizeIngredient(name: string): string` — lowercase, trim, strip plurals, remove common qualifiers ("fresh", "frozen", "canned", "diced", "sliced")
- `fuzzyMatch(pantryName: string, ingredientName: string): boolean` — returns true if either contains the other after normalization, or if Levenshtein distance ≤ 2 for short names

#### Component Tree (additions)

```
App.vue
└── router-view
    └── AppLayout.vue
        ├── TopNav.vue                     (add Discover tab)
        └── DiscoverView.vue               (Tab 4: /app/discover)
            ├── DiscoverFilters.vue        (meal type filter, min-coverage slider, search box)
            ├── RecipeCard.vue             (recipe name, coverage %, matched/missing lists, action buttons)
            │   ├── IngredientTag.vue      (green = in pantry, red = missing, gray = optional)
            │   └── AddMealButton.vue      (adds to meal plan + generates grocery items for missing)
            └── EmptyState.vue             ("Add items to your Pantry to get meal suggestions")
```

#### Store — `src/stores/discover.ts` (NEW)

- **State**: `recipes` (Recipe[]), `filters` ({ mealType, minCoverage, searchQuery }), `loading`
- **Computed**:
  - `matches` — calls `matchRecipes()` with current pantry items and applies filters
  - `mealTypeOptions` — deduped meal types from recipe dataset
- **Methods**:
  - `loadRecipes()` — imports static JSON (lazy-loaded)
  - `addToMealPlan(recipe: Recipe)` — creates a meal via `mealStore.addMeal()` with recipe name and meal_type, returns the new meal ID
  - `addMissingToGrocery(match: RecipeMatch, mealId?: string)` — for each missing ingredient, calls `groceryStore.addItem()` with ingredient name/quantity, optionally links to the meal via `groceryStore.linkItemToMeals()`
  - `addToPlanWithGroceries(match: RecipeMatch)` — combines both: adds meal, then adds missing ingredients as grocery items linked to that meal

#### Components

**`src/views/DiscoverView.vue`** (NEW):
- On mount: load recipes, read pantry items from `usePantryStore()`
- Show total pantry item count and number of matching recipes as a summary bar
- List `RecipeCard` components sorted by coverage score
- If pantry is empty, show empty state prompting user to add pantry items first

**`src/components/discover/DiscoverFilters.vue`** (NEW):
- Meal type dropdown (All / Breakfast / Lunch / Dinner / etc.) — options from recipe dataset
- Minimum coverage slider (0%–100%, default 50%) — hide recipes below threshold
- Search box — filters by recipe name substring
- All filters are reactive and update the `matches` computed instantly

**`src/components/discover/RecipeCard.vue`** (NEW):
- Recipe name as heading
- Coverage bar: colored progress bar (green ≥80%, yellow 50–79%, orange <50%)
- Ingredient list with color-coded tags:
  - Green tag: ingredient available in pantry
  - Red tag: ingredient missing (needs to be bought)
  - Gray tag: optional ingredient (not counted in score)
- Action buttons:
  - "Add to Meals" — adds recipe as a meal to the meal plan
  - "Add Missing to Grocery List" — creates grocery items for all missing ingredients
  - "Add to Meals + Grocery" — does both, linking the grocery items to the new meal
- After adding, buttons change to "Added ✓" (disabled) to prevent duplicates in same session

**`src/components/discover/IngredientTag.vue`** (NEW):
- Small pill/badge component: icon + ingredient name + optional quantity
- Color variants: green (available), red (missing), gray (optional)

#### Router — `src/router/index.ts`

Add child route under `/app`:
```typescript
{ path: 'discover', name: 'discover', component: () => import('@/views/DiscoverView.vue') }
```

#### TopNav — `src/components/TopNav.vue`

Add fourth `RouterLink` to `/app/discover` with text "Discover", same styling as existing tabs.

#### Code Changes Summary

| File | Change |
|------|--------|
| `src/data/recipes.json` | NEW — Static recipe dataset (30–50 recipes with normalized ingredients) |
| `src/lib/recipeMatch.ts` | NEW — `matchRecipes()`, `normalizeIngredient()`, `fuzzyMatch()` functions |
| `src/stores/discover.ts` | NEW — Pinia store: loads recipes, computes matches against pantry, filters, add-to-plan actions |
| `src/views/DiscoverView.vue` | NEW — Discover tab view with filters and recipe cards |
| `src/components/discover/DiscoverFilters.vue` | NEW — Meal type, coverage slider, search filters |
| `src/components/discover/RecipeCard.vue` | NEW — Recipe card with coverage bar, ingredient tags, action buttons |
| `src/components/discover/IngredientTag.vue` | NEW — Color-coded ingredient pill component |
| `src/components/TopNav.vue` | Add "Discover" tab link |
| `src/router/index.ts` | Add `/app/discover` route |

#### Tests

- `src/tests/lib/recipeMatch.test.ts` — unit tests for matching algorithm: exact match, fuzzy match, normalization, scoring, sorting, optional ingredients, empty pantry
- `src/tests/stores/discover.test.ts` — store tests: loading recipes, computing matches, filtering, `addToMealPlan`, `addMissingToGrocery`
- `src/tests/components/DiscoverView.test.ts` — component tests: renders recipe cards, empty state, filter interactions
- `src/tests/components/RecipeCard.test.ts` — component tests: coverage bar, ingredient tags, action button clicks

#### Design Decisions

1. **Static JSON over Supabase table**: No DB migration, no RLS policies, no realtime needed. Recipes are read-only reference data. Can migrate to Supabase later if users want custom recipes.
2. **Fuzzy matching over exact**: Pantry items are free-text ("Chicken", "chicken breasts", "Chicken Breast"). Fuzzy substring matching with normalization handles this without requiring users to enter exact ingredient names.
3. **Coverage score as primary sort**: Users care most about "what can I make right now?" — recipes with highest ingredient availability surface first.
4. **One-click add to plan + grocery**: The key value prop is reducing friction. User sees a recipe, taps one button, and both the meal is planned and missing ingredients are added to the grocery list with links.
5. **No external API for MVP**: Recipe data is bundled, not fetched from Spoonacular/Edamam/etc. Avoids API keys, rate limits, costs, and privacy concerns. The dataset is curated and small enough to ship with the app.

### Custom Recipes

Let users create, edit, and share their own recipes within their household. Migrates the static recipe dataset to Supabase so recipes persist across devices and both household members can contribute.

#### Database Migration — `supabase/migrations/006_custom_recipes.sql`

**`recipes` table**:
- `id` uuid PK default `gen_random_uuid()`
- `household_id` uuid NOT NULL FK → `households(id) ON DELETE CASCADE`
- `name` text NOT NULL
- `meal_type` text (nullable) — e.g. "Dinner", "Breakfast"
- `tags` text[] (nullable) — e.g. `{"quick", "vegetarian"}`
- `source` text (nullable) — URL or book reference
- `notes` text (nullable) — free-form cooking instructions or tips
- `is_builtin` bool NOT NULL DEFAULT false — true for seeded recipes from static JSON
- `created_by` uuid FK → `auth.users(id)`
- `created_at` timestamptz NOT NULL DEFAULT `now()`
- Index on `household_id`

**`recipe_ingredients` table**:
- `id` uuid PK default `gen_random_uuid()`
- `recipe_id` uuid NOT NULL FK → `recipes(id) ON DELETE CASCADE`
- `name` text NOT NULL — normalized ingredient name
- `quantity` text (nullable) — e.g. "2 lbs", "1 cup"
- `is_optional` bool NOT NULL DEFAULT false
- `sort_order` int NOT NULL DEFAULT 0

**RLS**: Same household-based policy pattern as `pantry_items`. 4 policies on `recipes` checking `household_members`. 3 policies on `recipe_ingredients` joining through `recipes → household_members`.

**Seed migration**: Insert the static `recipes.json` data into `recipes` + `recipe_ingredients` with `is_builtin = true` for each household on first load (or via a one-time store action).

#### Data Flow

- On first use, `discoverStore.init()` checks if the household has any `is_builtin` recipes. If not, seeds them from the static JSON dataset via bulk insert.
- After seeding, all recipe reads come from Supabase, not static JSON.
- Custom recipes (`is_builtin = false`) are fully editable. Built-in recipes can be edited (creates a household-specific copy) or hidden.

#### Components

**`src/components/discover/RecipeEditModal.vue`** (NEW):
- Name, meal type (with datalist autocomplete from existing types), tags (comma-separated input), source URL, notes textarea
- Dynamic ingredient list: add/remove/reorder rows, each with name + quantity + optional checkbox
- Save calls `discoverStore.saveRecipe()` which upserts to Supabase

**`src/views/DiscoverView.vue`** (MODIFY):
- Add "New Recipe" button in header → opens `RecipeEditModal`
- Add edit icon on `RecipeCard` for custom recipes → opens `RecipeEditModal` pre-filled
- Add delete action for custom recipes (with confirmation dialog)

#### Store Changes — `src/stores/discover.ts`

- **State**: Add `customRecipes` array (or merge into existing `recipes`)
- **Methods**: Add `saveRecipe()`, `deleteRecipe()`, `seedBuiltinRecipes()`, `fetchRecipes()`
- **Realtime**: Subscribe to `recipes` and `recipe_ingredients` changes so both household members see new recipes instantly
- Remove static JSON import once migration is run; keep JSON as fallback for offline/seeding

#### Code Changes Summary

| File | Change |
|------|--------|
| `supabase/migrations/006_custom_recipes.sql` | NEW — `recipes` + `recipe_ingredients` tables with RLS |
| `src/types/database.ts` | Add `Recipe`, `RecipeIngredient` DB interfaces |
| `src/stores/discover.ts` | Switch from static JSON to Supabase queries, add CRUD methods + realtime |
| `src/components/discover/RecipeEditModal.vue` | NEW — Form for creating/editing recipes with dynamic ingredient list |
| `src/views/DiscoverView.vue` | Add "New Recipe" button, edit/delete actions on cards |
| `src/data/recipes.json` | Keep as seed data source, no longer primary data store |

#### Tests

- `src/tests/stores/discover.test.ts` — Add tests for `saveRecipe`, `deleteRecipe`, `seedBuiltinRecipes`, `fetchRecipes`, realtime handling
- `src/tests/components/RecipeEditModal.test.ts` — Form validation, dynamic ingredient rows, save/cancel behavior

#### Design Decisions

1. **`is_builtin` flag**: Lets the app seed common recipes for new households without mixing them with user content. Users can edit built-in recipes (creating a household copy) or hide them.
2. **Household-scoped recipes**: Both household members see and can edit all recipes. No per-user recipe ownership — keeps it simple for a 2-person household.
3. **Dynamic ingredient rows**: Ingredients are stored as separate rows (not JSON blob) so the matching algorithm can query them efficiently and they can be individually linked to pantry/grocery items in the future.

### Recipe API Integration

Pull recipes from an external API (Spoonacular or Edamam) to offer a much larger recipe catalog beyond the built-in dataset. Results are cached locally to minimize API calls.

#### API Selection

**Spoonacular** (recommended for MVP):
- `GET /recipes/findByIngredients` — accepts a list of ingredients, returns recipes ranked by match. Directly maps to the Discover use case.
- `GET /recipes/{id}/information` — full recipe details including ingredients with amounts.
- Free tier: 150 requests/day. Sufficient for a 2-person household.
- Returns structured ingredient data with normalized names — simplifies matching.

**Edamam** (alternative):
- `GET /api/recipes/v2?q={ingredients}` — search by ingredient keywords.
- Free tier: 10,000 requests/month.
- Better for dietary filter support (vegan, gluten-free, etc.).

#### Architecture

```
User clicks "Search Online" in DiscoverView
  → discoverStore.searchExternal(pantryIngredients)
    → src/lib/recipeApi.ts → fetch Spoonacular API
      → transform response → RecipeMatch[] format
        → cache results in localStorage (TTL: 24h)
          → display in DiscoverView alongside local matches
```

#### Implementation — `src/lib/recipeApi.ts` (NEW)

```typescript
interface ExternalRecipeResult {
  id: number                      // Spoonacular recipe ID
  name: string
  imageUrl?: string
  ingredients: RecipeIngredient[]
  matchedIngredients: string[]
  missingIngredients: string[]
  score: number
  sourceUrl?: string              // link to original recipe
}

function searchByIngredients(ingredients: string[]): Promise<ExternalRecipeResult[]>
function getRecipeDetails(recipeId: number): Promise<ExternalRecipeResult>
```

**Caching** — `src/lib/recipeCache.ts` (NEW):
- Cache key: sorted ingredient list hash (so same pantry → same cache hit)
- Storage: `localStorage` with 24-hour TTL
- Max entries: 50 (LRU eviction)
- Cache is per-household (include `householdId` in key)

#### Environment Variable

- `VITE_SPOONACULAR_API_KEY` — API key stored in `.env` (not committed). For production, use a Supabase Edge Function as a proxy to keep the key server-side.

#### Supabase Edge Function (production) — `supabase/functions/recipe-search/index.ts`

To avoid exposing the API key in client-side code:
- Edge Function receives ingredient list from client
- Makes the Spoonacular API call server-side
- Returns transformed results
- Rate-limits per household (max 50 requests/day)

#### Store Changes — `src/stores/discover.ts`

- **State**: Add `externalResults` (ExternalRecipeResult[]), `externalLoading`, `externalError`
- **Computed**: `allMatches` — merges local `matches` and `externalResults`, deduped by name similarity, sorted by score
- **Methods**: Add `searchExternal()`, `clearExternalResults()`
- **UI toggle**: "Local Only" vs "Include Online" toggle in DiscoverFilters

#### Component Changes

| File | Change |
|------|--------|
| `src/lib/recipeApi.ts` | NEW — Spoonacular API client with response transformation |
| `src/lib/recipeCache.ts` | NEW — localStorage cache with TTL and LRU eviction |
| `src/stores/discover.ts` | Add external search state, methods, merged computed |
| `src/components/discover/DiscoverFilters.vue` | Add "Include Online Recipes" toggle |
| `src/components/discover/RecipeCard.vue` | Add recipe image thumbnail, "Source" link, "External" badge |
| `src/views/DiscoverView.vue` | Show external results section with loading spinner |
| `supabase/functions/recipe-search/index.ts` | NEW — Edge Function proxy for API key security |
| `.env.example` | Add `VITE_SPOONACULAR_API_KEY` placeholder |

#### Tests

- `src/tests/lib/recipeApi.test.ts` — Mock fetch, test response transformation, error handling, empty results
- `src/tests/lib/recipeCache.test.ts` — Cache hit/miss, TTL expiry, LRU eviction
- `src/tests/stores/discover.test.ts` — Add tests for `searchExternal`, merged results, loading/error states

#### Design Decisions

1. **Client-side caching before server-side**: localStorage cache reduces API calls significantly for a 2-user app. The pantry doesn't change frequently, so the same search results stay valid for hours.
2. **Edge Function proxy for production**: API key in client code is acceptable for dev but not production. The Edge Function adds security without a full backend.
3. **Merge, don't replace**: External results supplement local recipes, not replace them. Users see their custom/built-in recipes first, with online suggestions below.
4. **No recipe saving by default**: External recipes are displayed but not persisted. Users can "Save to My Recipes" to copy into the `recipes` table (requires Custom Recipes feature).

### Recipe Favorites

Save frequently-used recipes to a favorites list for quick access without scrolling through the full Discover catalog.

#### Database Migration — `supabase/migrations/007_recipe_favorites.sql`

**`recipe_favorites` table**:
- `user_id` uuid NOT NULL FK → `auth.users(id) ON DELETE CASCADE`
- `recipe_id` uuid NOT NULL FK → `recipes(id) ON DELETE CASCADE`
- `created_at` timestamptz NOT NULL DEFAULT `now()`
- Composite PK `(user_id, recipe_id)`

**RLS**: User can only read/write their own favorites. SELECT/INSERT/DELETE policies where `auth.uid() = user_id`.

Note: Favorites are per-user (not per-household) — each person has their own favorites.

#### Store Changes — `src/stores/discover.ts`

- **State**: Add `favorites` (Set<string> of recipe IDs)
- **Computed**: Add `favoriteRecipes` — filters `recipes` to only those in favorites set, with match scores
- **Methods**: Add `toggleFavorite(recipeId)`, `fetchFavorites()`, `isFavorite(recipeId)` computed helper

#### Component Changes

| File | Change |
|------|--------|
| `supabase/migrations/007_recipe_favorites.sql` | NEW — `recipe_favorites` table with per-user RLS |
| `src/types/database.ts` | Add `RecipeFavorite` interface |
| `src/stores/discover.ts` | Add favorites state, toggle/fetch methods |
| `src/components/discover/RecipeCard.vue` | Add heart/star icon button (toggle favorite), filled when favorited |
| `src/components/discover/DiscoverFilters.vue` | Add "Favorites Only" filter toggle |
| `src/views/DiscoverView.vue` | Add "Favorites" section at top when favorites exist, collapsible |

#### Design Decisions

1. **Per-user, not per-household**: Favorites are personal preference. Each household member curates their own list.
2. **Requires Custom Recipes migration**: Favorites FK to `recipes` table, so this depends on the Custom Recipes feature being implemented first.
3. **No separate Favorites view**: Favorites are a filter within Discover, not a separate tab. Keeps navigation simple.

### Cooking History

Track which recipes have been cooked (via the meal plan) and use that data to surface suggestions based on frequency and recency.

#### Database Migration — `supabase/migrations/008_cooking_history.sql`

**`cooking_history` table**:
- `id` uuid PK default `gen_random_uuid()`
- `household_id` uuid NOT NULL FK → `households(id) ON DELETE CASCADE`
- `recipe_id` uuid FK → `recipes(id) ON DELETE SET NULL` (nullable — keeps history even if recipe is deleted)
- `meal_id` uuid FK → `meals(id) ON DELETE SET NULL` (nullable — keeps history even if meal is cleared)
- `recipe_name` text NOT NULL — denormalized, so history survives recipe deletion
- `cooked_at` timestamptz NOT NULL DEFAULT `now()`
- `created_by` uuid FK → `auth.users(id)`
- Index on `(household_id, cooked_at DESC)`

**RLS**: Same household-based pattern as other tables.

#### Automatic Tracking

When a meal that was added from Discover (linked to a recipe) is checked off, automatically log a `cooking_history` entry. This happens in `mealStore.toggleChecked()` or `mealStore.clearChecked()`.

**Linking meals to recipes**: Add `recipe_id` nullable column to `meals` table (new migration or part of `008`). When `discoverStore.addToMealPlan()` creates a meal, it sets `recipe_id`. When that meal is checked off, the store logs the cook event.

#### Store — `src/stores/cookingHistory.ts` (NEW)

- **State**: `history` (CookingHistoryEntry[]), `loading`
- **Computed**:
  - `recipeFrequency` — Map<recipeId, count> of how often each recipe was cooked
  - `lastCooked` — Map<recipeId, Date> of when each recipe was last cooked
  - `topRecipes` — top 10 most frequently cooked recipes
  - `recentRecipes` — last 10 cooked recipes (deduped)
- **Methods**: `fetchHistory()`, `logCook(recipeId, mealId, recipeName)`, `subscribeRealtime()`

#### Integration with Discover

`discoverStore` gains a new computed `suggestedRecipes`:
- Boosts score for recipes cooked frequently (familiarity signal)
- Boosts score for recipes NOT cooked recently (variety signal)
- Combined: `finalScore = coverageScore * 0.6 + frequencyBoost * 0.2 + varietyBoost * 0.2`
- Tuning weights are constants in `recipeMatch.ts`, easy to adjust

#### Component Changes

| File | Change |
|------|--------|
| `supabase/migrations/008_cooking_history.sql` | NEW — `cooking_history` table + `recipe_id` column on `meals` |
| `src/types/database.ts` | Add `CookingHistoryEntry` interface, update `Meal` with optional `recipe_id` |
| `src/stores/cookingHistory.ts` | NEW — History tracking store with frequency/recency computeds |
| `src/stores/meals.ts` | In `toggleChecked`/`clearChecked`, log cook event if meal has `recipe_id` |
| `src/stores/discover.ts` | Add `suggestedRecipes` computed using history data, update `addToMealPlan` to set `recipe_id` |
| `src/views/DiscoverView.vue` | Add "Recently Cooked" and "Frequently Cooked" sections |
| `src/components/discover/RecipeCard.vue` | Show "Cooked X times" and "Last cooked: date" metadata |

#### Tests

- `src/tests/stores/cookingHistory.test.ts` — Log events, frequency/recency computeds, realtime
- `src/tests/stores/discover.test.ts` — Add tests for `suggestedRecipes` scoring with history data
- `src/tests/stores/meals.test.ts` — Add tests for cook event logging on check-off

#### Design Decisions

1. **Denormalized `recipe_name`**: History entries keep the recipe name so they remain readable even if the recipe is deleted.
2. **Automatic logging on meal check-off**: No manual "I cooked this" button. If a meal came from Discover (has `recipe_id`), checking it off = cooked it.
3. **`recipe_id` on meals table**: Lightweight link between meals and recipes. Nullable so existing meals aren't affected.

### Smart Suggestions

Learn from the household's meal history and pantry patterns to surface personalized recipe recommendations. Combines cooking history, pantry frequency, seasonal patterns, and dietary preferences.

#### Algorithm — `src/lib/smartSuggest.ts` (NEW)

```typescript
interface SuggestionContext {
  pantryItems: PantryItem[]
  cookingHistory: CookingHistoryEntry[]
  currentMeals: Meal[]           // what's already on the meal plan
  dayOfWeek: number              // 0=Sun, 6=Sat
  favorites: Set<string>
}

interface ScoredSuggestion {
  recipe: Recipe
  score: number
  reasons: string[]              // e.g. ["You have 4/5 ingredients", "Haven't made this in 3 weeks"]
}

function smartSuggest(recipes: Recipe[], context: SuggestionContext): ScoredSuggestion[]
```

**Scoring factors** (weighted, tunable):

| Factor | Weight | Logic |
|--------|--------|-------|
| Ingredient coverage | 0.30 | Fraction of required ingredients in pantry (existing `matchRecipes` score) |
| Freshness variety | 0.20 | Bonus for recipes not cooked in the last 2 weeks, penalty for cooked in last 3 days |
| Frequency affinity | 0.15 | Slight boost for recipes cooked 2–5 times (proven favorites), no boost for >10 (overplayed) |
| Favorite bonus | 0.10 | Flat boost if recipe is in user's favorites |
| Meal plan diversity | 0.10 | Penalty if a recipe's `meal_type` is already on the current meal plan (avoid 3 dinners in a row) |
| Day-of-week pattern | 0.10 | Learn from history: if user tends to cook "Pancakes" on Saturdays, boost on Saturday |
| Tag matching | 0.05 | Boost "quick" recipes on weekdays, "elaborate" on weekends |

**Reason strings**: Each factor that contributed significantly to the score generates a human-readable reason shown on the card (e.g., "You have 4 of 5 ingredients", "You haven't made this in 3 weeks", "Popular on Saturdays").

#### Component Changes

| File | Change |
|------|--------|
| `src/lib/smartSuggest.ts` | NEW — Multi-factor scoring algorithm with reason generation |
| `src/stores/discover.ts` | Replace simple `matches` computed with `smartSuggest` output as the primary sort, keep basic coverage sort as a fallback/toggle |
| `src/components/discover/RecipeCard.vue` | Show `reasons` as small text chips below the recipe name (e.g., "🥬 4/5 ingredients", "📅 New this week") |
| `src/components/discover/DiscoverFilters.vue` | Add "Sort by: Smart / Coverage / Recent" dropdown |
| `src/views/DiscoverView.vue` | Add "Suggested for You" hero section at top with top 3 smart suggestions |

#### Tests

- `src/tests/lib/smartSuggest.test.ts` — Unit tests for each scoring factor in isolation, combined scoring, reason generation, edge cases (empty history, no pantry, all recipes cooked recently)

#### Design Decisions

1. **All client-side**: No ML model, no server-side computation. The scoring is a weighted formula over simple signals. Fast enough for hundreds of recipes on any device.
2. **Transparent reasons**: Users see *why* a recipe was suggested. Builds trust and helps them understand the system. No black-box recommendations.
3. **Tunable weights as constants**: Weights are exported constants in `smartSuggest.ts`, easy to adjust based on user feedback without architectural changes.
4. **Graceful degradation**: With no cooking history, falls back to coverage-only scoring (same as base Discover). Each signal is additive — the system gets smarter as more data accumulates but works fine from day one.
5. **Day-of-week patterns**: Simple frequency count per recipe per day-of-week from `cooking_history`. No complex time-series analysis. If "Pancakes" was cooked on 3 out of 4 Saturdays, it gets a boost on Saturdays.

#### Dependency Chain

Smart Suggestions depends on all prior Discover features:
1. **Discover Meals from Pantry** (base) → ingredient coverage scoring
2. **Custom Recipes** → Supabase-backed recipe data
3. **Recipe Favorites** → favorite signal
4. **Cooking History** → frequency, recency, day-of-week signals

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
