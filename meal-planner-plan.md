# Meal Planner & Grocery List App — Project Plan

## Goal
Build a shared meal planning and grocery list web app for two users (Jeet + partner). Use Supabase for auth, database, and real-time sync. Deploy to GitHub Pages as a Vue 3 + TypeScript SPA (consistent with existing `jeetbookseller/life-tracking` repo stack).

## Before implementing: sketch out the full data model, component tree, and Supabase RLS policies. Get my approval before writing any code.

---

## Architecture

- **Frontend**: Vue 3 + TypeScript, Vite, Tailwind CSS
- **Backend**: Supabase (Postgres + Auth + Realtime)
- **Deploy**: GitHub Pages (same pattern as life-tracking repo)
- **Auth**: Supabase email/password auth (two accounts, one shared household)

---

## Data Model (Supabase/Postgres)

### `households`
- `id` (uuid, PK)
- `name` (text)
- `created_at` (timestamptz)

### `household_members`
- `household_id` (FK → households)
- `user_id` (FK → auth.users)
- Join table. RLS: users can only access their own household's data.

### `meals`
- `id` (uuid, PK)
- `household_id` (FK → households)
- `date` (date) — which day
- `meal_type` (text, nullable) — 'breakfast' | 'lunch' | 'dinner' | null (optional)
- `title` (text) — e.g. "Pasta Primavera"
- `notes` (text, nullable)
- `sort_order` (int) — for manual ordering within a day
- `created_by` (FK → auth.users)
- `created_at`, `updated_at`

### `grocery_sections`
- `id` (uuid, PK)
- `household_id` (FK → households)
- `name` (text) — e.g. "Produce", "Frozen", "Condiments"
- `sort_order` (int)
- `is_default` (bool) — seed defaults, user can add more

Default sections to seed: Produce, Dairy, Meat & Seafood, Frozen, Pantry/Dry Goods, Condiments & Sauces, Beverages, Bakery/Bread, Snacks, Home Cleaning, Personal Hygiene, Other

### `grocery_items`
- `id` (uuid, PK)
- `household_id` (FK → households)
- `section_id` (FK → grocery_sections)
- `name` (text)
- `quantity` (text, nullable) — freeform like "2 lbs" or "1 bunch"
- `is_checked` (bool, default false)
- `sort_order` (int)
- `created_by` (FK → auth.users)
- `created_at`

### `grocery_item_meals` (join table)
- `grocery_item_id` (FK → grocery_items)
- `meal_id` (FK → meals)
- Optional link: a grocery item can be linked to 0..N meals

---

## UI Structure

### Tab 1: Meal Plan

- **Timeline selector** at top: toggle between "This Week", "Next Week", "Custom Range" (date picker)
- **Day columns or rows** showing each date in the selected range
- Each day shows meal cards; each card has:
  - Title (required)
  - Meal type badge (optional — breakfast/lunch/dinner, can be left blank)
  - Notes (expandable)
- **Add meal**: inline quick-add per day, meal type dropdown is optional
- **Edit/delete** meal via card actions
- **Drag-to-reorder** within a day (nice-to-have, not MVP)

### Tab 2: Grocery List

- **Collapsible sections** grouped by `grocery_sections`, sorted by `sort_order`
- Each section header shows: name, item count, expand/collapse toggle
- Inside each section: list of items with checkbox, name, quantity, optional meal link badges
- **Add item**: inline input at bottom of each section (name + optional quantity)
- **Link to meals**: when adding/editing an item, optional multi-select to link to meals in the current plan range
- **Add new section**: button at bottom to create a custom section
- **Clear checked items**: bulk action to remove purchased items
- **Section management**: rename, reorder, delete empty sections

### Shared Features
- Real-time sync via Supabase Realtime subscriptions — both users see changes live
- Simple top nav: two tabs + user avatar/logout
- Mobile-first responsive layout

---

## Supabase Setup

1. Create project on Supabase
2. Set up tables with the schema above
3. Enable RLS on all tables
4. RLS policy pattern: user must be a member of the household that owns the row
5. Enable Realtime on `meals`, `grocery_items`, `grocery_sections`
6. Seed default grocery sections on household creation (use a Postgres function or trigger)
7. Store Supabase URL and anon key in `.env` (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)

---

## Implementation Phases

### Phase 1 — Foundation
- Supabase project + schema + RLS + seed data
- Vue project scaffold with Supabase client, auth (login/signup), household creation
- Router: /login, /app/meals, /app/groceries

### Phase 2 — Meal Plan Tab
- Timeline selector component
- Day-grouped meal display
- CRUD for meals (add, edit, delete)
- Optional meal type tagging

### Phase 3 — Grocery List Tab
- Section-grouped item list with collapse/expand
- CRUD for items (add, check, edit, delete)
- Add/rename/reorder sections
- Clear checked items action

### Phase 4 — Linking & Realtime
- Grocery item ↔ meal linking (optional multi-select)
- Supabase Realtime subscriptions for live sync
- Conflict-free UI updates

### Phase 5 — Polish
- Mobile responsiveness pass
- Loading/error states
- Empty states with helpful prompts
- PWA setup (offline indicator, installable)

---

## Constraints
- Keep it in a single repo (can be a new repo or a subfolder of life-tracking)
- Use the TDD workflow skill: plan → tests → implement → document
- Prioritize working MVP over features — drag-reorder and advanced filtering are post-MVP
- Two-user household is the only use case — no multi-household complexity needed
