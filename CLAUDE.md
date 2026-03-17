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

## Current Architecture (Groups 0–5 — COMPLETE)

All foundational work is done: Supabase schema + RLS, Vue scaffold, auth, household management, meal & grocery stores with realtime sync, full UI with design tokens, PWA, GitHub Pages deploy, invite system, and design modernization.

Key files from the existing implementation:
- `supabase/migrations/001_initial_schema.sql` — Schema + RLS policies
- `src/lib/supabase.ts` — Typed Supabase client
- `src/stores/auth.ts` — Session, login/signup/logout
- `src/stores/household.ts` — Household creation/join, `householdId` scoping
- `src/stores/meals.ts` — Meal CRUD + realtime
- `src/stores/grocery.ts` — Section/item CRUD + realtime
- `src/style.css` — Design tokens via `@theme {}` + component classes

---

## App Redesign Plan (Group 7)

### Design Philosophy

**Anylist-style flat lists** with **Notion-style aesthetics** (current color tokens). Both meals and groceries become simple, flat, checkable lists. No date grouping, no meal types, no grocery sections. Tight layout maximizing screen real estate.

### What Changes

| Area | Current | New |
|------|---------|-----|
| Meals UI | Week/day timeline with DayColumn grid, meal_type badges | Single flat list with checkmarks, add input at top |
| Groceries UI | Grouped by collapsible sections (Dairy, Produce, etc.) | Single flat list with checkmarks, add input at top |
| Meal fields | title, date, meal_type, notes, sort_order | title, is_checked, sort_order (date/meal_type/notes unused) |
| Grocery fields | name, quantity, section_id, is_checked, sort_order | name, quantity, is_checked, sort_order (section_id kept for DB but hidden) |
| Cross-linking | Meal ↔ Grocery item linking | **Kept as-is** |
| Auth/sharing | Email/password, invite codes, household | **Kept as-is** |
| Edit/delete | Modal-based editing | **Kept** — simplified modals (fewer fields) |

### What Gets Removed

**Components to delete:**
- `TimelineSelector.vue` — no more week/date selection
- `DayColumn.vue` — no more day columns
- `AddMealInline.vue` — replaced by top-of-list input in MealPlanView
- `GrocerySection.vue` — no more category sections
- `AddSectionButton.vue` — no more section management
- `grocery/AddItemInline.vue` — replaced by top-of-list input in GroceryListView

**Store simplifications:**
- `meals.ts`: remove `selectedRange`, `mealsByDate` computed, `setRange()`. `fetchMeals()` fetches ALL meals for household (no date filter). Add `toggleChecked(id)` and `clearChecked()`.
- `grocery.ts`: remove section CRUD methods (`addSection`, `renameSection`, `deleteSection`, `reorderSections`), `itemsBySection` computed. Keep a single auto-created section internally for DB FK. `fetchItems()` already works. Remove `fetchSections()` from public API (keep internal for FK).

**Design token removals from `style.css`:**
- Remove `badge-breakfast`, `badge-lunch`, `badge-dinner` classes
- Remove `--color-breakfast-*`, `--color-lunch-*`, `--color-dinner-*` tokens

**Test files to delete/rewrite:**
- Delete tests for removed components: `TimelineSelector.test.ts`, `DayColumn.test.ts`, `AddMealInline.test.ts`, `GrocerySection.test.ts`, `AddSectionButton.test.ts`
- Rewrite: `MealCard.test.ts`, `MealPlanView.test.ts`, `GroceryListView.test.ts`, `MealEditModal.test.ts`, `meals.test.ts`, `grocery.test.ts`

---

### New Component Tree

```
App.vue
└── router-view
    ├── LoginView.vue
    │   └── AuthForm.vue
    └── AppLayout.vue
        ├── TopNav.vue                 (tabs + user avatar + logout)
        ├── MealPlanView.vue           (Tab 1: /app/meals)
        │   ├── MealRow.vue            (checkbox + title + edit/delete icons)
        │   ├── MealEditModal.vue      (simplified: title only + linked groceries)
        │   └── ClearCheckedButton.vue (shared)
        └── GroceryListView.vue        (Tab 2: /app/groceries)
            ├── GroceryItem.vue        (checkbox + name + qty + edit/delete icons)
            ├── GroceryItemEditModal.vue (name, qty, linked meals)
            ├── MealLinkPicker.vue     (modal, reused)
            └── ClearCheckedButton.vue (shared)
```

### New Pinia Store Structure

```
src/stores/
├── auth.ts       — session, user, login(), signup(), logout()  [unchanged]
├── household.ts  — householdId, householdName, ready flag      [unchanged]
├── meals.ts      — meals[], fetchMeals(), addMeal(), updateMeal(), deleteMeal(),
│                   toggleChecked(), clearChecked(), Realtime
└── grocery.ts    — items[], fetchItems(), addItem(), updateItem(), deleteItem(),
                    toggleChecked(), clearChecked(), linkItemToMeals(), Realtime
```

---

### Implementation Tasks

#### TASK-20: Supabase migration — add `is_checked` to meals

**File**: `supabase/migrations/002_meals_is_checked.sql`

```sql
ALTER TABLE meals ADD COLUMN is_checked boolean NOT NULL DEFAULT false;
```

- No RLS changes needed (existing policies cover all columns)
- **Manual step**: Run this migration in the Supabase SQL editor before deploying the new frontend

---

#### TASK-21: Simplify meals store

**File**: `src/stores/meals.ts`

- Remove `selectedRange` state, `mealsByDate` computed, `setRange()` method
- `fetchMeals()` → query all meals for `household_id`, ordered by `sort_order`
- Add `toggleChecked(id)` — same pattern as grocery store
- Add `clearChecked()` — delete all checked meals from DB
- `addMeal(payload)` — simplified payload: `{ title, household_id, sort_order }`
- Keep realtime subscription as-is (already handles INSERT/UPDATE/DELETE)
- Update `Meal` type in `database.ts`: add `is_checked: boolean`

**Tests**: Rewrite `src/tests/meals.test.ts` — remove date-range tests, add toggleChecked/clearChecked tests

---

#### TASK-22: Simplify grocery store

**File**: `src/stores/grocery.ts`

- Remove `sections` from public state (keep internal for FK)
- Remove `addSection`, `renameSection`, `deleteSection`, `reorderSections`, `itemsBySection`
- Keep `ensureUngroupedSection()` as internal — auto-create a single section on init
- `fetchItems()` — unchanged (already fetches all items for household)
- `addItem(payload)` — auto-assign section_id to the ungrouped section internally
- Keep `linkItemToMeals()`, `toggleChecked()`, `clearChecked()` as-is
- Remove sections realtime channel (keep items channel only)

**Tests**: Rewrite `src/tests/grocery.test.ts` — remove section tests, simplify item tests

---

#### TASK-23: Redesign MealPlanView + MealRow

**Files**: `src/views/MealPlanView.vue`, `src/components/MealRow.vue` (new, replaces MealCard)

**MealPlanView.vue**:
- Top: text input + "Add" button (same pattern as current GroceryListView global add)
- Below: flat list of `MealRow` items, unchecked first then checked (dimmed)
- Bottom: `ClearCheckedButton` to delete checked meals
- Loading/error/empty states using BaseSpinner/BaseErrorBanner
- On mount: `mealsStore.fetchMeals()` + `subscribeRealtime()`

**MealRow.vue** (replaces MealCard):
- Checkbox (44px touch target) + meal title + edit pencil + delete trash
- Checked items: strikethrough + muted text
- Edit opens MealEditModal
- Linked grocery count badge (small chip showing count of linked grocery items)

**MealEditModal.vue** — simplify:
- Remove meal_type select, date field, notes textarea
- Keep: title input + linked grocery items picker
- Add: GroceryLinkPicker (inverse of MealLinkPicker — select grocery items to link to this meal)

**Tests**: New `MealRow.test.ts`, rewrite `MealPlanView.test.ts`, update `MealEditModal.test.ts`

---

#### TASK-24: Redesign GroceryListView + GroceryItem

**Files**: `src/views/GroceryListView.vue`, `src/components/GroceryItem.vue`

**GroceryListView.vue**:
- Top: text input + "Add" button (keep existing global add pattern, simplify)
- Below: flat list of `GroceryItem` items, unchecked first then checked (dimmed)
- Bottom: `ClearCheckedButton`
- Remove all section rendering, AddSectionButton
- On mount: ensure ungrouped section exists, `fetchItems()` + `subscribeRealtime()`

**GroceryItem.vue** — simplify:
- Keep: checkbox + name + quantity + edit button + meal link badges
- Add: delete button (trash icon, inline — no need to open modal to delete)
- Tight row layout matching Anylist style

**GroceryItemEditModal.vue** — simplify:
- Remove section dropdown (section is always "Ungrouped")
- Keep: name, quantity, linked meals (MealLinkPicker)

**Tests**: Rewrite `GroceryListView.test.ts`, update `GroceryItem.test.ts`, update `GroceryItemEditModal.test.ts`

---

#### TASK-25: Clean up design tokens + remove dead code

**Files**: `src/style.css`, delete unused component files, delete unused test files

- Remove meal-type badge tokens and classes from `style.css`
- Delete: `TimelineSelector.vue`, `DayColumn.vue`, `AddMealInline.vue`, `GrocerySection.vue`, `AddSectionButton.vue`, `grocery/AddItemInline.vue`, `MealCard.vue`
- Delete corresponding test files
- Remove unused imports from router, views, etc.
- Verify no dead imports remain: `npm run build` must pass cleanly

---

#### TASK-26: Update tests + final verification

- Run full test suite: `npm test`
- Run build: `npm run build`
- Fix any failures
- Verify all touch targets remain ≥ 44px
- Verify modal patterns (backdrop-blur, modal-panel) still work

---

### Parallel Execution Map

```
TASK-20 (migration SQL — no code deps)
  ↓
TASK-21 + TASK-22 (in parallel — independent store changes)
  ↓
TASK-23 + TASK-24 (in parallel — independent view/component changes)
  ↓
TASK-25 (dead code cleanup — depends on 23+24 being done)
  ↓
TASK-26 (final test + build verification)
```

**Agent split for TASK-23 + TASK-24**:
- Agent A: MealPlanView, MealRow, MealEditModal + tests
- Agent B: GroceryListView, GroceryItem, GroceryItemEditModal + tests

---

### Supabase Steps (manual, before deploying new frontend)

1. **Run migration**: Execute `supabase/migrations/002_meals_is_checked.sql` in Supabase SQL editor
2. **Verify**: Confirm `meals` table now has `is_checked` column with default `false`
3. **No RLS changes needed** — existing household-scoped policies cover all columns

### Deploy Steps

1. Complete all TASK-20 through TASK-26
2. Run the Supabase migration (step above)
3. Push to `main` — GitHub Actions will auto-deploy to GitHub Pages
4. Smoke test: add meals, check them off, clear checked, add grocery items, link to meals, verify realtime sync between two tabs

---

## Key Design Decisions

1. **Hash router** (`createWebHashHistory`): avoids the `404.html` redirect hack required by GitHub Pages with HTML5 history mode.

2. **Household race condition guard**: `AppLayout.vue` renders `<router-view>` only when `householdStore.ready === true`. This ensures `householdId` is always available before meals/grocery stores make any Supabase queries.

3. **Realtime deduplication**: all three event types (INSERT, UPDATE, DELETE) must be handled in stores. UPDATE events replace the local record by ID regardless of whether the current user triggered it.

4. **RLS on the join table**: `grocery_item_meals` has no `household_id` column. Its RLS policy joins through `grocery_items → household_members`.

5. **Single internal grocery section**: The DB requires `section_id` on grocery items. We keep a single "Ungrouped" section auto-created on init, but the UI never exposes section management to users.

6. **Meals `is_checked`**: Added via migration 002. Checked meals are deleted on "Clear checked" (same behavior as groceries).

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
| `supabase/migrations/002_meals_is_checked.sql` | Adds is_checked to meals (NEW) |
| `src/lib/supabase.ts` | Imported by every store |
| `src/stores/auth.ts` | Gates the entire app |
| `src/stores/household.ts` | Provides `householdId` for all queries |
| `src/stores/meals.ts` | Meal CRUD + realtime |
| `src/stores/grocery.ts` | Grocery CRUD + realtime |
| `src/style.css` | Design tokens + component classes |
