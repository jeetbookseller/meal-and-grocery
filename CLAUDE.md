# Meal Planner & Grocery List App — Developer Guide

A shared meal planning and grocery list web app for two users (Jeet + partner). Built with Vue 3 + TypeScript + Supabase, deployed to GitHub Pages.

See `meal-planner-plan.md` for the full product spec, data model, and UI details.

---

## Tech Stack

- **Frontend**: Vue 3 + TypeScript, Vite, Tailwind CSS, Pinia
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

## Component Tree

```
App.vue
└── router-view
    ├── LoginView.vue
    │   └── AuthForm.vue
    └── AppLayout.vue
        ├── TopNav.vue                 (tabs + user avatar + logout)
        ├── MealPlanView.vue           (Tab 1: /app/meals)
        │   ├── TimelineSelector.vue
        │   ├── DayColumn.vue          (one per date in selected range)
        │   │   ├── MealCard.vue
        │   │   └── AddMealInline.vue
        │   └── MealEditModal.vue
        └── GroceryListView.vue        (Tab 2: /app/groceries)
            ├── GrocerySection.vue     (collapsible)
            │   ├── SectionHeader.vue
            │   ├── GroceryItem.vue
            │   └── AddItemInline.vue
            ├── AddSectionButton.vue
            ├── ClearCheckedButton.vue
            └── MealLinkPicker.vue     (modal, reused in add + edit)
```

---

## Pinia Store Structure

```
src/stores/
├── auth.ts       — session, user, login(), signup(), logout()
├── household.ts  — householdId, householdName, ready flag, ensureHousehold()
├── meals.ts      — meals[], selectedRange, CRUD, mealsByDate getter, Realtime
└── grocery.ts    — sections[], items[], CRUD, itemsBySection getter, Realtime
```

Store dependency order: `auth` → `household` → `meals` + `grocery` (meals and grocery are independent once household is ready).

---

## Implementation Tasks

Tasks are grouped by dependency tier. All tasks within a group can be worked in parallel.

---

### Group 0 — Foundation ✅ COMPLETE

Both tasks are independent and can be done in parallel.

#### TASK-01: Supabase schema + RLS + seed function
- Create all 6 tables (`households`, `household_members`, `meals`, `grocery_sections`, `grocery_items`, `grocery_item_meals`) with correct FKs and indexes
- Index `meals(household_id, date)` and `grocery_items(household_id, section_id)`
- Enable RLS on all tables. Policy pattern: `EXISTS (SELECT 1 FROM household_members WHERE household_id = <table>.household_id AND user_id = auth.uid())`
- **Special case**: `grocery_item_meals` has no `household_id` — its RLS must join through `grocery_items → household_members`. Test this explicitly.
- Write `seed_default_sections(p_household_id uuid)` Postgres function inserting 12 default sections (Produce, Dairy, Meat & Seafood, Frozen, Pantry/Dry Goods, Condiments & Sauces, Beverages, Bakery/Bread, Snacks, Home Cleaning, Personal Hygiene, Other)
- Enable Realtime publication on `meals`, `grocery_items`, `grocery_sections`
- **Deliverable**: `supabase/migrations/001_initial_schema.sql`

#### TASK-02: Vue project scaffold + routing + Supabase client
- `npm create vue@latest` (TypeScript, Pinia, Vue Router)
- Install: `@supabase/supabase-js`, `tailwindcss`, `vite-plugin-pwa` (stub, activate in TASK-14)
- `src/lib/supabase.ts` — typed Supabase client using `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- `src/types/database.ts` — TypeScript row interfaces for all tables
- Router: `/login` (public), `/app/meals` and `/app/groceries` (auth-guarded via navigation guard)
- Use `createWebHashHistory` (hash URLs — avoids GitHub Pages 404 redirect hack)
- Stub views: `LoginView`, `MealPlanView`, `GroceryListView`, `AppLayout`
- **Deliverable**: project boots, router navigates between stubs

---

### Group 1 — Auth + Household ✅ COMPLETE

#### TASK-03: Auth store + LoginView
- `stores/auth.ts`: call `supabase.auth.getSession()` on app init; subscribe to `onAuthStateChange` for the app lifetime; expose `login(email, password)`, `signup(email, password)`, `logout()`, `user`, `session`, `loading`
- `LoginView.vue` + `AuthForm.vue`: email/password fields, toggle between login and signup modes, inline error display, loading spinner on submit
- On success: `router.push('/app/meals')`

#### TASK-04: Household store + TopNav
- `stores/household.ts`: on `init()`, query `household_members` for `auth.uid()`. If found, load household. If not, show create-household prompt (name input), then insert into `households` + `household_members`, then call `seed_default_sections`
- Expose `householdId`, `householdName`, `ready` (boolean — true once household is resolved)
- `AppLayout.vue`: call `householdStore.init()` on mount; render `<router-view>` only when `householdStore.ready === true` (prevents race conditions with data stores)
- `TopNav.vue`: two tab links (`/app/meals`, `/app/groceries`), user email display, logout button

---

### Group 2 — Data Stores ✅ COMPLETE

Both stores are independent and can be built in parallel.

#### TASK-05: Meals store (data layer only — no components)
- State: `meals: Meal[]`, `selectedRange: { start: string; end: string }`, `loading: boolean`, `error: string | null`
- `setRange(start, end)` — updates range and triggers `fetchMeals()`
- `fetchMeals()` — query `meals` filtered by `household_id` and `date BETWEEN start AND end`, ordered by `date, sort_order`
- `addMeal(payload)`, `updateMeal(id, payload)`, `deleteMeal(id)` — optimistic local update + Supabase call
- `subscribeRealtime()` / `unsubscribeRealtime()` — Supabase channel on `meals` filtered by `household_id`; on INSERT/UPDATE upsert into `meals[]` by id; on DELETE splice out by id
- Computed: `mealsByDate: Record<string, Meal[]>` (ISO date string → sorted meals array)

#### TASK-06: Grocery store (data layer only — no components)
- State: `sections: GrocerySection[]`, `items: GroceryItem[]`, `loading: boolean`, `error: string | null`
- `fetchSections()`, `fetchItems()` — both scoped to `household_id`
- Section CRUD: `addSection(name)`, `renameSection(id, name)`, `deleteSection(id)`, `reorderSections(orderedIds)`
- Item CRUD: `addItem(payload)`, `updateItem(id, payload)`, `deleteItem(id)`, `toggleChecked(id)`, `clearChecked()`
- `linkItemToMeals(itemId, mealIds)` — delete all rows in `grocery_item_meals` for this item, then insert the new set
- `subscribeRealtime()` — two Supabase channels: one for `grocery_sections`, one for `grocery_items`, both filtered by `household_id`
- Computed: `itemsBySection: Record<string, GroceryItem[]>`

---

### Group 3 — Core UI Components ✅ COMPLETE

All five tasks are independent and can be built in parallel.

#### TASK-07: TimelineSelector + MealPlanView skeleton
- `TimelineSelector.vue`: three buttons — "This Week", "Next Week", "Custom Range". This/Next Week compute Mon–Sun ranges from today. Custom Range shows two `<input type="date">` fields. On selection, calls `mealsStore.setRange(start, end)`
- `MealPlanView.vue`: on mount call `setRange` (default: this week) + `subscribeRealtime()`; on unmount call `unsubscribeRealtime()`; render one `DayColumn` per date in range using `mealsStore.mealsByDate`
- Layout: mobile = horizontal scroll of day cards; desktop = 7-column CSS grid

#### TASK-08: MealCard + DayColumn
- `DayColumn.vue`: receives `date: string` and `meals: Meal[]` as props; shows date heading (e.g. "Mon Mar 16"); renders a `MealCard` per meal; renders `AddMealInline` at bottom
- `MealCard.vue`: title, optional meal_type badge (breakfast=yellow, lunch=green, dinner=blue), collapsible notes, edit pencil icon (opens `MealEditModal`), delete trash icon (confirm then `mealsStore.deleteMeal`)

#### TASK-09: AddMealInline + MealEditModal
- `AddMealInline.vue`: title text input (required) + meal_type select (optional: —, breakfast, lunch, dinner); on submit calls `mealsStore.addMeal({ date, title, meal_type, household_id })`; shows inline validation and loading state
- `MealEditModal.vue`: centered modal overlay (`fixed inset-0`); receives meal object as prop, emits `close`; fields: title, meal_type, notes textarea; on submit calls `mealsStore.updateMeal`

#### TASK-10: GrocerySection + GroceryItem + GroceryListView skeleton
- `GroceryListView.vue`: on mount fetch sections + items + `subscribeRealtime()`; on unmount unsubscribe; render one `GrocerySection` per section sorted by `sort_order`; render `AddSectionButton` and `ClearCheckedButton` at bottom
- `GrocerySection.vue`: receives `section: GrocerySection` and `items: GroceryItem[]` as props; `SectionHeader` shows name, item count badge, expand/collapse chevron, rename pencil, delete trash (only if zero items); body is collapsible with CSS transition
- `GroceryItem.vue`: checkbox bound to `is_checked` (calls `groceryStore.toggleChecked` on change), item name and quantity, optional meal link badges (chip per linked meal title), edit icon

#### TASK-11: AddItemInline + MealLinkPicker
- `AddItemInline.vue`: name input + optional quantity input; "Link meals" button opens `MealLinkPicker`; supports both add mode (no `itemId`) and edit mode (with `itemId`); on submit calls `groceryStore.addItem` or `updateItem`, then `linkItemToMeals` if meals were selected
- `MealLinkPicker.vue`: modal listing all meals in `mealsStore.meals` as checkboxes (grouped by date); emits `update:modelValue` with `string[]` of meal IDs; fully reusable in add and edit flows

---

### Group 4 — Cross-Cutting Concerns ✅ COMPLETE

All four tasks are independent and can be built in parallel.

#### TASK-12: Loading / error / empty states
- Create `BaseSpinner.vue` and `BaseErrorBanner.vue` shared components in `src/components/base/`
- `MealPlanView`: spinner while `mealsStore.loading`; error banner on `mealsStore.error`; per-day empty state: "No meals planned — add one below"
- `GroceryListView`: spinner on initial load; error banner; full-page empty state: "Your grocery list is empty"
- Ensure all store actions surface readable error strings (not raw Supabase error objects)

#### TASK-13: GitHub Pages deploy config
- `vite.config.ts`: set `base` to `'/meal-and-grocery/'`
- `.github/workflows/deploy.yml`: trigger on push to `main`; steps: `npm ci` → `npm run build` → deploy `dist/` to `gh-pages` branch (use `peaceiris/actions-gh-pages` or `actions/deploy-pages`)
- `.env.example`: document `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Note: hash router means no `404.html` redirect script is needed

#### TASK-14: PWA setup
- Configure `vite-plugin-pwa` in `vite.config.ts` with app manifest (name, short_name, icons, theme_color, `display: standalone`)
- Service worker caches app shell and static assets; data fetches stay network-first (no offline data sync)
- `OfflineIndicator.vue` in `TopNav`: shows a banner when `navigator.onLine` is false

#### TASK-15: Mobile responsiveness audit
- Review all components at 375px viewport width
- `MealPlanView`: switch to horizontal scroll of day cards on mobile (single-row, swipeable)
- All checkboxes, icons, and tap targets must be ≥ 44px
- Fix any Tailwind overflow/truncation issues found during audit
- `TopNav`: ensure tabs don't overflow on small screens

---

### Group 5 — Polish & Onboarding *(after Group 4, MVP must be stable first)*

Both tasks are independent and can be built in parallel.

#### TASK-16: Household invite / second user onboarding
- Add `invite_code` (short random string) column to `households` table
- After household creation, display the invite code to the first user
- Second user: on first login with no household, show "Join existing household" option with a code input field → `householdStore.joinHousehold(code)`

#### TASK-17: Design modernization
- Audit the full app UI and establish a consistent visual design system (color palette, typography scale, spacing, border radii, shadows)
- Replace ad-hoc Tailwind classes with a coherent design token set (via `tailwind.config.ts` theme extension)
- Modernize component styling: cards with subtle shadows and rounded corners, smooth transitions on interactive elements, consistent focus rings for accessibility
- Improve `TopNav`: refined tab design with active indicator, polished user avatar/logout area
- Improve `MealCard`: cleaner layout, better meal-type badge styling, hover/active states
- Improve `GroceryItem` + `GrocerySection`: refined checkbox, better spacing, section header polish
- Improve modals (`MealEditModal`, `MealLinkPicker`): backdrop blur, entrance animation, consistent button styles
- Ensure design is cohesive across both light and dark system color schemes (or explicitly commit to light-only with a comment)
- **Deliverable**: visually polished app that feels intentional and modern, not a default Tailwind skeleton

---

### Group 6 — Drag-to-Reorder *(after Group 5)*

Both tasks are independent and can be built in parallel.

#### TASK-18: Drag-to-reorder meals within a day
- Integrate `vue-draggable-plus`
- On drop: recompute `sort_order` for affected meals; batch-call `mealsStore.updateMeal`

#### TASK-19: Grocery section drag-to-reorder
- Same drag approach as TASK-18 for the `GrocerySection` list
- Calls `groceryStore.reorderSections(orderedIds)` which batch-updates `sort_order`

---

## Next Steps (after Group 4)

The MVP is feature-complete. Before starting Group 5, do the following:

### Supabase Setup (required before the app works)

1. **Create a Supabase project** at supabase.com (free tier is sufficient for two users)
2. **Apply the migration** — run `supabase/migrations/001_initial_schema.sql` via the Supabase SQL editor or `supabase db push` with the CLI
3. **Configure local credentials** — copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your project's **Settings → API** page
4. **Add GitHub repository secrets** — add the same two env vars as secrets in GitHub repo settings so the CI deploy workflow can build correctly

### Verification & QA

5. **End-to-end smoke test** — log in as both users, create a household, add meals for the week, build a grocery list, link items to meals, check items off. Verify Realtime sync works across two browser tabs.
6. **Fix any critical bugs** found during the smoke test before moving on.
7. **Confirm GitHub Pages deployment** is live and accessible at the expected URL with correct hash routing.
8. **Review PWA install prompt** on mobile (iOS Safari + Android Chrome) — ensure the manifest and service worker are registered correctly.
9. **Accessibility pass** — keyboard navigation through all interactive elements, screen reader labels on icon-only buttons.

---

## Parallel Execution Map

```
Group 0 (both in parallel):        TASK-01, TASK-02  ✅
  ↓
Group 1 (both in parallel):        TASK-03, TASK-04  ✅
  ↓
Group 2 (both in parallel):        TASK-05, TASK-06  ✅
  ↓
Group 3 (all 5 in parallel):       TASK-07, TASK-08, TASK-09, TASK-10, TASK-11  ✅
  ↓
Group 4 (all 4 in parallel):       TASK-12, TASK-13, TASK-14, TASK-15  ✅
  ↓
Group 5 (both in parallel):        TASK-16, TASK-17
  ↓
Group 6 (both in parallel):        TASK-18, TASK-19
```

---

## Key Design Decisions

1. **Hash router** (`createWebHashHistory`): avoids the `404.html` redirect hack required by GitHub Pages with HTML5 history mode. Acceptable trade-off for a two-user private app.

2. **Household race condition guard**: `AppLayout.vue` renders `<router-view>` only when `householdStore.ready === true`. This ensures `householdId` is always available before meals/grocery stores make any Supabase queries.

3. **Realtime deduplication**: all three event types (INSERT, UPDATE, DELETE) must be handled in stores. UPDATE events replace the local record by ID regardless of whether the current user triggered it — avoids races between optimistic updates and incoming Realtime events.

4. **RLS on the join table**: `grocery_item_meals` has no `household_id` column. Its RLS policy joins through `grocery_items → household_members`. This is the most complex policy — test it explicitly in TASK-01 before writing any frontend code.

---

## Critical Files

| File | Why it matters |
|------|----------------|
| `meal-planner-plan.md` | Source of truth for data model, RLS policy details, and UI spec |
| `supabase/migrations/001_initial_schema.sql` | Security boundary — RLS errors here cannot be patched on the frontend |
| `src/lib/supabase.ts` | Imported by every store and component; must be stable before Group 1 |
| `src/stores/auth.ts` | Gates the entire app — all other stores depend on `auth.uid()` being available |
| `src/stores/household.ts` | Provides `householdId` that scopes every single Supabase query |
