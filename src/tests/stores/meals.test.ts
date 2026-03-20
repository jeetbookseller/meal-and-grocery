import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHouseholdStore } from '@/stores/household'
import type { Meal } from '@/types/database'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
const { mockFrom, mockChannel, mockRemoveChannel } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockChannel: vi.fn(),
  mockRemoveChannel: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}))

vi.mock('@/stores/household', () => ({
  useHouseholdStore: vi.fn(),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────
let realtimeCallback: ((payload: Record<string, unknown>) => void) | null = null

/** Creates a chainable Supabase query builder mock */
function makeBuilder(result: { data: unknown; error: unknown }) {
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order', 'insert', 'update', 'delete', 'maybeSingle', 'in']) {
    b[m] = vi.fn().mockReturnValue(b)
  }
  // terminal: .single() resolves
  b.single = vi.fn().mockResolvedValue(result)
  // terminal: plain await (used by delete queries)
  b.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve)
  return b
}

/** Creates a Supabase channel mock that captures the realtime callback */
function makeChannelMock() {
  const ch: Record<string, unknown> = {}
  ch.on = vi.fn().mockImplementation(
    (_event: unknown, _filter: unknown, cb: (p: Record<string, unknown>) => void) => {
      realtimeCallback = cb
      return ch
    },
  )
  ch.subscribe = vi.fn().mockReturnValue(ch)
  return ch
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const mockMeal: Meal = {
  id: 'meal-1',
  household_id: 'hh-1',
  date: '2026-03-16',
  meal_type: 'dinner',
  title: 'Pasta',
  notes: null,
  sort_order: 0,
  is_checked: false,
  created_by: 'user-1',
  created_at: '2026-03-16T00:00:00Z',
  updated_at: '2026-03-16T00:00:00Z',
}

const addPayload = {
  title: 'Pasta',
  household_id: 'hh-1',
  sort_order: 0,
  is_checked: false,
}

// ─── Setup ────────────────────────────────────────────────────────────────────
beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  realtimeCallback = null
  // Default household
  vi.mocked(useHouseholdStore).mockReturnValue({ householdId: 'hh-1' } as ReturnType<typeof useHouseholdStore>)
})

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('useMealsStore', () => {
  describe('fetchMeals()', () => {
    it('fetches all meals for household ordered by sort_order', async () => {
      mockFrom.mockReturnValue(makeBuilder({ data: [mockMeal], error: null }))

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()

      await store.fetchMeals()

      expect(mockFrom).toHaveBeenCalledWith('meals')
      expect(store.meals).toEqual([mockMeal])
      expect(store.error).toBeNull()
      expect(store.loading).toBe(false)
    })

    it('returns early when householdId is not set', async () => {
      vi.mocked(useHouseholdStore).mockReturnValue({ householdId: null } as ReturnType<typeof useHouseholdStore>)

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()

      await store.fetchMeals()

      expect(mockFrom).not.toHaveBeenCalled()
    })

    it('sets a readable error string on Supabase error', async () => {
      mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: 'DB error' } }))

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()

      await store.fetchMeals()

      expect(store.error).toBe('DB error')
      expect(store.meals).toEqual([])
      expect(store.loading).toBe(false)
    })
  })

  describe('addMeal()', () => {
    it('optimistically adds then replaces temp record with server data', async () => {
      const serverMeal = { ...mockMeal, id: 'meal-server-1' }
      mockFrom.mockReturnValue(makeBuilder({ data: serverMeal, error: null }))

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()

      const addPromise = store.addMeal(addPayload)
      // Optimistic: temp record present before resolution
      expect(store.meals.length).toBe(1)
      expect(store.meals[0].id).toMatch(/^temp-/)

      await addPromise

      expect(store.meals.length).toBe(1)
      expect(store.meals[0].id).toBe('meal-server-1')
      expect(store.error).toBeNull()
    })

    it('reverts temp record and sets error on failure', async () => {
      mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: 'Insert failed' } }))

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()

      await store.addMeal(addPayload)

      expect(store.meals).toEqual([])
      expect(store.error).toBe('Insert failed')
    })
  })

  describe('updateMeal()', () => {
    it('optimistically updates then syncs server response', async () => {
      const updatedMeal = { ...mockMeal, title: 'Updated Pasta' }
      mockFrom.mockReturnValue(makeBuilder({ data: updatedMeal, error: null }))

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.meals = [mockMeal]

      await store.updateMeal('meal-1', { title: 'Updated Pasta' })

      expect(store.meals[0].title).toBe('Updated Pasta')
      expect(store.error).toBeNull()
    })

    it('reverts to original and sets error on failure', async () => {
      mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: 'Update failed' } }))

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.meals = [mockMeal]

      await store.updateMeal('meal-1', { title: 'Updated Pasta' })

      expect(store.meals[0].title).toBe('Pasta')
      expect(store.error).toBe('Update failed')
    })

    it('does nothing when meal id is not found', async () => {
      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.meals = [mockMeal]

      await store.updateMeal('nonexistent', { title: 'x' })

      expect(store.meals).toEqual([mockMeal])
      expect(mockFrom).not.toHaveBeenCalled()
    })
  })

  describe('deleteMeal()', () => {
    it('optimistically removes meal and confirms on success', async () => {
      mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }))

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.meals = [mockMeal]

      const deletePromise = store.deleteMeal('meal-1')
      expect(store.meals).toEqual([])

      await deletePromise
      expect(store.meals).toEqual([])
      expect(store.error).toBeNull()
    })

    it('reverts removal and sets error on failure', async () => {
      mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: 'Delete failed' } }))

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.meals = [mockMeal]

      await store.deleteMeal('meal-1')

      expect(store.meals).toEqual([mockMeal])
      expect(store.error).toBe('Delete failed')
    })
  })

  describe('toggleChecked()', () => {
    it('optimistically toggles is_checked to true', async () => {
      const checkedMeal = { ...mockMeal, is_checked: true }
      mockFrom.mockReturnValue(makeBuilder({ data: checkedMeal, error: null }))

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.meals = [{ ...mockMeal, is_checked: false }]

      await store.toggleChecked('meal-1')

      expect(store.meals[0].is_checked).toBe(true)
      expect(store.error).toBeNull()
    })

    it('optimistically toggles is_checked back to false', async () => {
      const uncheckedMeal = { ...mockMeal, is_checked: false }
      mockFrom.mockReturnValue(makeBuilder({ data: uncheckedMeal, error: null }))

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.meals = [{ ...mockMeal, is_checked: true }]

      await store.toggleChecked('meal-1')

      expect(store.meals[0].is_checked).toBe(false)
    })

    it('does nothing when meal id is not found', async () => {
      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.meals = [mockMeal]

      await store.toggleChecked('nonexistent')

      expect(mockFrom).not.toHaveBeenCalled()
      expect(store.meals).toEqual([mockMeal])
    })

    it('reverts on DB failure', async () => {
      mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: 'Toggle failed' } }))

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.meals = [{ ...mockMeal, is_checked: false }]

      await store.toggleChecked('meal-1')

      expect(store.meals[0].is_checked).toBe(false)
      expect(store.error).toBe('Toggle failed')
    })
  })

  describe('clearChecked()', () => {
    it('removes all checked meals from local state and DB', async () => {
      mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }))

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      const checkedMeal = { ...mockMeal, id: 'meal-2', is_checked: true }
      store.meals = [mockMeal, checkedMeal]

      await store.clearChecked()

      expect(store.meals).toEqual([mockMeal])
      expect(store.error).toBeNull()
    })

    it('does nothing when no meals are checked', async () => {
      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.meals = [mockMeal]

      await store.clearChecked()

      expect(mockFrom).not.toHaveBeenCalled()
      expect(store.meals).toEqual([mockMeal])
    })

    it('reverts on DB failure', async () => {
      mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: 'Clear failed' } }))

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      const checkedMeal = { ...mockMeal, id: 'meal-2', is_checked: true }
      store.meals = [mockMeal, checkedMeal]

      await store.clearChecked()

      expect(store.meals).toContainEqual(checkedMeal)
      expect(store.error).toBe('Clear failed')
    })
  })

  describe('subscribeRealtime()', () => {
    it('creates a channel with the correct household filter', async () => {
      const ch = makeChannelMock()
      mockChannel.mockReturnValue(ch)

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.subscribeRealtime()

      expect(mockChannel).toHaveBeenCalledWith('meals-realtime')
      expect(ch.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({ filter: 'household_id=eq.hh-1' }),
        expect.any(Function),
      )
    })

    it('upserts a new meal on INSERT event', async () => {
      mockChannel.mockReturnValue(makeChannelMock())

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.subscribeRealtime()

      realtimeCallback!({ eventType: 'INSERT', new: mockMeal, old: {} })
      expect(store.meals).toContainEqual(mockMeal)
    })

    it('replaces existing meal on UPDATE event', async () => {
      const updatedMeal = { ...mockMeal, title: 'New Title' }
      mockChannel.mockReturnValue(makeChannelMock())

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.meals = [mockMeal]
      store.subscribeRealtime()

      realtimeCallback!({ eventType: 'UPDATE', new: updatedMeal, old: {} })
      expect(store.meals.length).toBe(1)
      expect(store.meals[0].title).toBe('New Title')
    })

    it('removes meal on DELETE event', async () => {
      mockChannel.mockReturnValue(makeChannelMock())

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.meals = [mockMeal]
      store.subscribeRealtime()

      realtimeCallback!({ eventType: 'DELETE', new: {}, old: { id: 'meal-1' } })
      expect(store.meals).toEqual([])
    })

    it('returns early when householdId is not set', async () => {
      vi.mocked(useHouseholdStore).mockReturnValue({ householdId: null } as ReturnType<typeof useHouseholdStore>)

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.subscribeRealtime()

      expect(mockChannel).not.toHaveBeenCalled()
    })
  })

  describe('groupedMeals', () => {
    it('groups meals by meal_type, null group labeled "Other" sorted last', async () => {
      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.meals = [
        { ...mockMeal, id: 'm1', meal_type: 'Dinner', is_checked: false, sort_order: 0 },
        { ...mockMeal, id: 'm2', meal_type: null, is_checked: false, sort_order: 1 },
      ]
      const groups = store.groupedMeals
      expect(groups[0].label).toBe('Dinner')
      expect(groups[1].label).toBe('Other')
      expect(groups[1].type).toBeNull()
    })

    it('sorts groups alphabetically (case-insensitive)', async () => {
      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.meals = [
        { ...mockMeal, id: 'm1', meal_type: 'snack', is_checked: false, sort_order: 0 },
        { ...mockMeal, id: 'm2', meal_type: 'Breakfast', is_checked: false, sort_order: 1 },
        { ...mockMeal, id: 'm3', meal_type: 'lunch', is_checked: false, sort_order: 2 },
      ]
      const labels = store.groupedMeals.map((g) => g.label)
      expect(labels).toEqual(['Breakfast', 'lunch', 'snack'])
    })

    it('only includes groups that have meals', async () => {
      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.meals = [
        { ...mockMeal, id: 'm1', meal_type: 'Breakfast', is_checked: false, sort_order: 0 },
      ]
      const groups = store.groupedMeals
      expect(groups.length).toBe(1)
      expect(groups[0].label).toBe('Breakfast')
    })

    it('puts unchecked meals before checked meals within each group', async () => {
      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.meals = [
        { ...mockMeal, id: 'm1', meal_type: 'Lunch', is_checked: true, sort_order: 0 },
        { ...mockMeal, id: 'm2', meal_type: 'Lunch', is_checked: false, sort_order: 1 },
      ]
      const group = store.groupedMeals[0]
      expect(group.meals[0].id).toBe('m2')
      expect(group.meals[1].id).toBe('m1')
    })

    it('groups meals case-insensitively, using first-seen casing as label', async () => {
      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.meals = [
        { ...mockMeal, id: 'm1', meal_type: 'Breakfast', is_checked: false, sort_order: 0 },
        { ...mockMeal, id: 'm2', meal_type: 'breakfast', is_checked: false, sort_order: 1 },
      ]
      const groups = store.groupedMeals
      expect(groups.length).toBe(1)
      expect(groups[0].label).toBe('Breakfast')
      expect(groups[0].meals.length).toBe(2)
    })

    it('returns empty array when there are no meals', async () => {
      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.meals = []
      expect(store.groupedMeals).toEqual([])
    })
  })

  describe('mealTypeOptions', () => {
    it('returns sorted unique non-null meal_type values', async () => {
      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.meals = [
        { ...mockMeal, id: 'm1', meal_type: 'Dinner' },
        { ...mockMeal, id: 'm2', meal_type: 'Breakfast' },
        { ...mockMeal, id: 'm3', meal_type: null },
      ]
      expect(store.mealTypeOptions).toEqual(['Breakfast', 'Dinner'])
    })

    it('deduplicates case-insensitively, keeping first-seen casing', async () => {
      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.meals = [
        { ...mockMeal, id: 'm1', meal_type: 'Breakfast' },
        { ...mockMeal, id: 'm2', meal_type: 'breakfast' },
        { ...mockMeal, id: 'm3', meal_type: 'BREAKFAST' },
      ]
      expect(store.mealTypeOptions).toEqual(['Breakfast'])
    })

    it('returns empty array when all meal_types are null', async () => {
      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.meals = [{ ...mockMeal, meal_type: null }]
      expect(store.mealTypeOptions).toEqual([])
    })
  })

  describe('addMeal() with meal_type', () => {
    it('passes meal_type through to the insert payload', async () => {
      const serverMeal = { ...mockMeal, id: 'server-1', meal_type: 'Brunch' }
      mockFrom.mockReturnValue(makeBuilder({ data: serverMeal, error: null }))

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()

      await store.addMeal({ ...addPayload, meal_type: 'Brunch' })

      expect(store.meals[0].meal_type).toBe('Brunch')
    })

    it('sets meal_type on the temp meal optimistically', async () => {
      mockFrom.mockReturnValue(makeBuilder({ data: { ...mockMeal, id: 'server-1', meal_type: 'Snack' }, error: null }))

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()

      const addPromise = store.addMeal({ ...addPayload, meal_type: 'Snack' })
      expect(store.meals[0].meal_type).toBe('Snack')
      await addPromise
    })

    it('defaults meal_type to null when omitted', async () => {
      const serverMeal = { ...mockMeal, id: 'server-1', meal_type: null }
      mockFrom.mockReturnValue(makeBuilder({ data: serverMeal, error: null }))

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()

      const addPromise = store.addMeal(addPayload)
      expect(store.meals[0].meal_type).toBeNull()
      await addPromise
    })
  })

  describe('unsubscribeRealtime()', () => {
    it('removes the channel and sets it to null', async () => {
      const ch = makeChannelMock()
      mockChannel.mockReturnValue(ch)

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.subscribeRealtime()
      store.unsubscribeRealtime()

      expect(mockRemoveChannel).toHaveBeenCalledOnce()
    })

    it('does nothing when no channel is active', async () => {
      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.unsubscribeRealtime()

      expect(mockRemoveChannel).not.toHaveBeenCalled()
    })
  })
})
