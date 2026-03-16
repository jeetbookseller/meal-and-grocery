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
  for (const m of ['select', 'eq', 'gte', 'lte', 'order', 'insert', 'update', 'delete', 'maybeSingle']) {
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
  created_by: 'user-1',
  created_at: '2026-03-16T00:00:00Z',
  updated_at: '2026-03-16T00:00:00Z',
}

const addPayload: Omit<Meal, 'id' | 'created_at' | 'updated_at'> = {
  household_id: 'hh-1',
  date: '2026-03-16',
  meal_type: 'dinner',
  title: 'Pasta',
  notes: null,
  sort_order: 0,
  created_by: 'user-1',
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
    it('fetches meals and sets state when householdId and range are set', async () => {
      mockFrom.mockReturnValue(makeBuilder({ data: [mockMeal], error: null }))

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.selectedRange = { start: '2026-03-16', end: '2026-03-22' }

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
      store.selectedRange = { start: '2026-03-16', end: '2026-03-22' }

      await store.fetchMeals()

      expect(mockFrom).not.toHaveBeenCalled()
    })

    it('returns early when range start is not set', async () => {
      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      // selectedRange.start is '' by default

      await store.fetchMeals()

      expect(mockFrom).not.toHaveBeenCalled()
    })

    it('sets a readable error string on Supabase error', async () => {
      mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: 'DB error' } }))

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.selectedRange = { start: '2026-03-16', end: '2026-03-22' }

      await store.fetchMeals()

      expect(store.error).toBe('DB error')
      expect(store.meals).toEqual([])
      expect(store.loading).toBe(false)
    })
  })

  describe('setRange()', () => {
    it('updates selectedRange and triggers fetchMeals', async () => {
      mockFrom.mockReturnValue(makeBuilder({ data: [mockMeal], error: null }))

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()

      await store.setRange('2026-03-16', '2026-03-22')

      expect(store.selectedRange).toEqual({ start: '2026-03-16', end: '2026-03-22' })
      expect(mockFrom).toHaveBeenCalledWith('meals')
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

  describe('mealsByDate computed', () => {
    it('groups meals by date and sorts by sort_order', async () => {
      const mealA: Meal = { ...mockMeal, id: 'a', date: '2026-03-16', sort_order: 2 }
      const mealB: Meal = { ...mockMeal, id: 'b', date: '2026-03-16', sort_order: 0 }
      const mealC: Meal = { ...mockMeal, id: 'c', date: '2026-03-17', sort_order: 0 }

      const { useMealsStore } = await import('@/stores/meals')
      const store = useMealsStore()
      store.meals = [mealA, mealB, mealC]

      const byDate = store.mealsByDate
      expect(Object.keys(byDate)).toHaveLength(2)
      expect(byDate['2026-03-16'][0].id).toBe('b')
      expect(byDate['2026-03-16'][1].id).toBe('a')
      expect(byDate['2026-03-17'][0].id).toBe('c')
    })
  })
})
