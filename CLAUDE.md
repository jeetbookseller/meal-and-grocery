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

**Design**: Anylist-style flat lists with Notion-style aesthetics. Both meals and groceries are simple, flat, checkable lists. No date grouping, no meal types, no grocery sections.

### Component Tree

```
App.vue
└── router-view
    ├── LoginView.vue
    │   └── AuthForm.vue
    └── AppLayout.vue
        ├── TopNav.vue                  (tabs + user avatar + logout)
        ├── MealPlanView.vue            (Tab 1: /app/meals)
        │   ├── MealRow.vue             (checkbox + title + linked count + edit/delete)
        │   ├── MealEditModal.vue       (title + linked grocery picker)
        │   └── ClearCheckedButton.vue
        └── GroceryListView.vue         (Tab 2: /app/groceries)
            ├── GroceryItem.vue         (checkbox + name + qty + edit/delete + meal badges)
            ├── GroceryItemEditModal.vue (name, qty, linked meals)
            ├── MealLinkPicker.vue      (modal for linking meals)
            └── ClearCheckedButton.vue
```

### Store Structure

```
src/stores/
├── auth.ts       — session, user, login(), signup(), logout()
├── household.ts  — householdId, householdName, ready flag
├── meals.ts      — meals[], fetchMeals(), addMeal(), updateMeal(), deleteMeal(),
│                   toggleChecked(), clearChecked(), Realtime
└── grocery.ts    — items[], fetchItems(), addItem(), updateItem(), deleteItem(),
                    toggleChecked(), clearChecked(), linkItemToMeals(), Realtime
```

### Key Behaviors

- **Meals**: flat list, unchecked first then checked (dimmed). `clearChecked()` deletes checked meals from DB.
- **Groceries**: flat list, same order pattern. `section_id` FK kept in DB but never exposed in UI — a single "Ungrouped" section is auto-created internally.
- **Cross-linking**: grocery items can be linked to meals. Meal rows show linked item count badge; grocery items show linked meal badges.
- **Realtime**: both stores subscribe to Supabase Realtime channels on mount, handling INSERT/UPDATE/DELETE.

---

## Key Design Decisions

1. **Hash router** (`createWebHashHistory`): avoids the `404.html` redirect hack required by GitHub Pages with HTML5 history mode.

2. **Household race condition guard**: `AppLayout.vue` renders `<router-view>` only when `householdStore.ready === true`. This ensures `householdId` is always available before meals/grocery stores make any Supabase queries.

3. **Realtime deduplication**: all three event types (INSERT, UPDATE, DELETE) must be handled in stores. UPDATE events replace the local record by ID regardless of whether the current user triggered it.

4. **RLS on the join table**: `grocery_item_meals` has no `household_id` column. Its RLS policy joins through `grocery_items → household_members`.

5. **Single internal grocery section**: The DB requires `section_id` on grocery items. A single "Ungrouped" section is auto-created on init via `_ensureUngroupedSection()`, but the UI never exposes section management.

6. **Meals `is_checked`**: Added via migration `002_meals_is_checked.sql`. Checked meals are deleted on "Clear checked" (same behavior as groceries).

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
| `src/lib/supabase.ts` | Typed Supabase client, imported by every store |
| `src/types/database.ts` | TypeScript interfaces for all DB tables |
| `src/stores/auth.ts` | Gates the entire app |
| `src/stores/household.ts` | Provides `householdId` for all queries |
| `src/stores/meals.ts` | Meal CRUD + realtime |
| `src/stores/grocery.ts` | Grocery CRUD + realtime |
| `src/style.css` | Design tokens + component classes |

---

## Deploy Steps

1. Run pending Supabase migrations in the SQL editor (check `supabase/migrations/`)
2. Push to `main` — GitHub Actions will auto-deploy to GitHub Pages
3. Smoke test: add meals, check them off, clear checked, add grocery items, link to meals, verify realtime sync between two tabs
