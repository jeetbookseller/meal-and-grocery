import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePantryStore } from '@/stores/pantry'

// --- Supabase mock setup ---

const mockQueryBuilder: Record<string, ReturnType<typeof vi.fn>> = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  in: vi.fn(),
  order: vi.fn(),
  single: vi.fn(),
}

// Make every builder method return itself for chaining by default
Object.keys(mockQueryBuilder).forEach(key => {
  mockQueryBuilder[key].mockReturnValue(mockQueryBuilder)
})

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

// Household store mock
vi.mock('@/stores/household', () => ({
  useHouseholdStore: vi.fn(() => ({ householdId: 'hh-1' })),
}))

// --- Fixtures ---

const mockItem = {
  id: 'item-1',
  household_id: 'hh-1',
  name: 'Eggs',
  quantity: '12',
  is_checked: false,
  sort_order: 0,
  created_by: 'user-1',
  created_at: '2026-03-16T00:00:00Z',
}

const mockItem2 = {
  id: 'item-2',
  household_id: 'hh-1',
  name: 'Milk',
  quantity: null,
  is_checked: true,
  sort_order: 1,
  created_by: 'user-1',
  created_at: '2026-03-16T00:00:00Z',
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  Object.keys(mockQueryBuilder).forEach(key => {
    mockQueryBuilder[key].mockReturnValue(mockQueryBuilder)
  })
  mockFrom.mockReturnValue(mockQueryBuilder)
})

describe('usePantryStore', () => {
  // --- Public API shape ---
  describe('public API', () => {
    it('does not expose sections state', () => {
      const store = usePantryStore()
      expect((store as any).sections).toBeUndefined()
    })

    it('does not expose storeNames', () => {
      const store = usePantryStore()
      expect((store as any).storeNames).toBeUndefined()
    })

    it('does not expose ensureUngroupedSection', () => {
      const store = usePantryStore()
      expect((store as any).ensureUngroupedSection).toBeUndefined()
    })
  })

  // --- fetchItems ---
  describe('fetchItems()', () => {
    it('populates items on success', async () => {
      mockQueryBuilder.order.mockResolvedValueOnce({ data: [mockItem, mockItem2], error: null })
      const store = usePantryStore()
      await store.fetchItems()
      expect(mockFrom).toHaveBeenCalledWith('pantry_items')
      expect(store.items).toEqual([mockItem, mockItem2])
      expect(store.error).toBeNull()
    })

    it('sets error string on failure', async () => {
      mockQueryBuilder.order.mockResolvedValueOnce({ data: null, error: { message: 'Network error' } })
      const store = usePantryStore()
      await store.fetchItems()
      expect(store.error).toBe('Network error')
    })

    it('sets loading to false after success', async () => {
      mockQueryBuilder.order.mockResolvedValueOnce({ data: [], error: null })
      const store = usePantryStore()
      await store.fetchItems()
      expect(store.loading).toBe(false)
    })
  })

  // --- addItem ---
  describe('addItem()', () => {
    it('inserts item directly without section logic and appends to local state', async () => {
      const newItem = { ...mockItem, id: 'item-new' }
      mockQueryBuilder.single.mockResolvedValueOnce({ data: newItem, error: null })

      const store = usePantryStore()
      await store.addItem({ name: 'Eggs', quantity: '12', household_id: 'hh-1' })

      expect(mockFrom).toHaveBeenCalledWith('pantry_items')
      expect(store.items).toContainEqual(newItem)
    })

    it('does not reference grocery_sections', async () => {
      const newItem = { ...mockItem, id: 'item-new' }
      mockQueryBuilder.single.mockResolvedValueOnce({ data: newItem, error: null })

      const store = usePantryStore()
      await store.addItem({ name: 'Eggs', household_id: 'hh-1' })

      expect(mockFrom).not.toHaveBeenCalledWith('grocery_sections')
      expect(mockFrom).not.toHaveBeenCalledWith('pantry_sections')
    })

    it('does not include section_id in insert payload', async () => {
      const newItem = { ...mockItem, id: 'item-new' }
      mockQueryBuilder.single.mockResolvedValueOnce({ data: newItem, error: null })

      const store = usePantryStore()
      await store.addItem({ name: 'Eggs', household_id: 'hh-1' })

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.not.objectContaining({ section_id: expect.anything() })
      )
    })

    it('sets error on failure', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } })
      const store = usePantryStore()
      await store.addItem({ name: 'Eggs', household_id: 'hh-1' })
      expect(store.error).toBe('Insert failed')
    })

    it('addItem without quantity defaults to null', async () => {
      const newItem = { ...mockItem, id: 'item-new', quantity: null }
      mockQueryBuilder.single.mockResolvedValueOnce({ data: newItem, error: null })

      const store = usePantryStore()
      await store.addItem({ name: 'Eggs', household_id: 'hh-1' })

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: null })
      )
    })
  })

  // --- updateItem ---
  describe('updateItem()', () => {
    it('optimistically updates item in local state', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: null })
      const store = usePantryStore()
      store.items = [mockItem] as any
      await store.updateItem('item-1', { name: 'Free-range Eggs' })
      expect(store.items[0].name).toBe('Free-range Eggs')
    })

    it('sets error on DB failure', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: { message: 'Update failed' } })
      const store = usePantryStore()
      store.items = [mockItem] as any
      await store.updateItem('item-1', { name: 'Free-range Eggs' })
      expect(store.error).toBe('Update failed')
    })
  })

  // --- deleteItem ---
  describe('deleteItem()', () => {
    it('removes item from local state', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: null })
      const store = usePantryStore()
      store.items = [mockItem, mockItem2] as any
      await store.deleteItem('item-1')
      expect(store.items).toHaveLength(1)
      expect(store.items[0].id).toBe('item-2')
    })
  })

  // --- toggleChecked ---
  describe('toggleChecked()', () => {
    it('flips is_checked from false to true', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: null })
      const store = usePantryStore()
      store.items = [{ ...mockItem, is_checked: false }] as any
      await store.toggleChecked('item-1')
      expect(store.items[0].is_checked).toBe(true)
    })

    it('flips is_checked from true to false', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: null })
      const store = usePantryStore()
      store.items = [{ ...mockItem, is_checked: true }] as any
      await store.toggleChecked('item-1')
      expect(store.items[0].is_checked).toBe(false)
    })

    it('does nothing if item not found', async () => {
      const store = usePantryStore()
      store.items = [mockItem] as any
      await store.toggleChecked('nonexistent')
      expect(mockFrom).not.toHaveBeenCalled()
    })
  })

  // --- clearChecked ---
  describe('clearChecked()', () => {
    it('removes checked items from local state and calls DB delete', async () => {
      mockQueryBuilder.eq
        .mockReturnValueOnce(mockQueryBuilder)   // .eq('household_id', ...)
        .mockResolvedValueOnce({ error: null })   // .eq('is_checked', true)

      const store = usePantryStore()
      store.items = [mockItem, mockItem2] as any  // mockItem2 is checked
      await store.clearChecked()
      expect(store.items).toHaveLength(1)
      expect(store.items[0].id).toBe('item-1')
      expect(mockFrom).toHaveBeenCalledWith('pantry_items')
    })
  })

  // --- linkItemToMeals ---
  describe('linkItemToMeals()', () => {
    it('deletes existing links then inserts new ones', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: null }) // delete .eq()
      mockQueryBuilder.insert.mockResolvedValueOnce({ error: null })
      mockQueryBuilder.in.mockResolvedValueOnce({ data: [], error: null }) // fetchItemMealLinks refetch

      const store = usePantryStore()
      await store.linkItemToMeals('item-1', ['meal-1', 'meal-2'])

      expect(mockFrom).toHaveBeenCalledWith('pantry_item_meals')
      expect(mockQueryBuilder.delete).toHaveBeenCalled()
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith([
        { pantry_item_id: 'item-1', meal_id: 'meal-1' },
        { pantry_item_id: 'item-1', meal_id: 'meal-2' },
      ])
    })

    it('skips insert when mealIds is empty', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: null })
      mockQueryBuilder.in.mockResolvedValueOnce({ data: [], error: null })
      const store = usePantryStore()
      await store.linkItemToMeals('item-1', [])
      expect(mockQueryBuilder.insert).not.toHaveBeenCalled()
    })

    it('sets error on delete failure', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: { message: 'Delete failed' } })
      const store = usePantryStore()
      await store.linkItemToMeals('item-1', ['meal-1'])
      expect(store.error).toBe('Delete failed')
    })

    it('refreshes item meal links after successful save', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: null })
      mockQueryBuilder.insert.mockResolvedValueOnce({ error: null })
      const linkData = [
        { pantry_item_id: 'item-1', meal_id: 'meal-1', meals: { id: 'meal-1', title: 'Pasta' } },
      ]
      mockQueryBuilder.in.mockResolvedValueOnce({ data: linkData, error: null })

      const store = usePantryStore()
      store.items = [mockItem] as any
      await store.linkItemToMeals('item-1', ['meal-1'])

      expect(store.itemMealLinks['item-1']).toEqual([{ id: 'meal-1', title: 'Pasta' }])
    })
  })

  // --- linkMealToItems ---
  describe('linkMealToItems()', () => {
    it('deletes existing links for meal then inserts new ones', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: null })
      mockQueryBuilder.insert.mockResolvedValueOnce({ error: null })
      mockQueryBuilder.in.mockResolvedValueOnce({ data: [], error: null })

      const store = usePantryStore()
      await store.linkMealToItems('meal-1', ['item-1', 'item-2'])

      expect(mockFrom).toHaveBeenCalledWith('pantry_item_meals')
      expect(mockQueryBuilder.delete).toHaveBeenCalled()
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('meal_id', 'meal-1')
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith([
        { pantry_item_id: 'item-1', meal_id: 'meal-1' },
        { pantry_item_id: 'item-2', meal_id: 'meal-1' },
      ])
    })

    it('skips insert when itemIds is empty', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: null })
      mockQueryBuilder.in.mockResolvedValueOnce({ data: [], error: null })
      const store = usePantryStore()
      await store.linkMealToItems('meal-1', [])
      expect(mockQueryBuilder.insert).not.toHaveBeenCalled()
    })

    it('refreshes link data after successful save', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: null })
      mockQueryBuilder.insert.mockResolvedValueOnce({ error: null })
      const linkData = [
        { pantry_item_id: 'item-1', meal_id: 'meal-1', meals: { id: 'meal-1', title: 'Pasta' } },
      ]
      mockQueryBuilder.in.mockResolvedValueOnce({ data: linkData, error: null })

      const store = usePantryStore()
      store.items = [mockItem] as any
      await store.linkMealToItems('meal-1', ['item-1'])

      expect(store.itemMealLinks['item-1']).toEqual([{ id: 'meal-1', title: 'Pasta' }])
    })

    it('sets error on delete failure', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: { message: 'Delete failed' } })
      const store = usePantryStore()
      await store.linkMealToItems('meal-1', ['item-1'])
      expect(store.error).toBe('Delete failed')
    })
  })

  // --- fetchItemMealLinks ---
  describe('fetchItemMealLinks()', () => {
    it('populates itemMealLinks map on success', async () => {
      const linkData = [
        { pantry_item_id: 'item-1', meal_id: 'meal-1', meals: { id: 'meal-1', title: 'Pasta' } },
      ]
      mockQueryBuilder.in.mockResolvedValueOnce({ data: linkData, error: null })

      const store = usePantryStore()
      store.items = [mockItem] as any
      await store.fetchItemMealLinks()

      expect(mockFrom).toHaveBeenCalledWith('pantry_item_meals')
      expect(store.itemMealLinks['item-1']).toEqual([{ id: 'meal-1', title: 'Pasta' }])
    })

    it('groups multiple meals under the same item', async () => {
      const linkData = [
        { pantry_item_id: 'item-1', meal_id: 'meal-1', meals: { id: 'meal-1', title: 'Pasta' } },
        { pantry_item_id: 'item-1', meal_id: 'meal-2', meals: { id: 'meal-2', title: 'Salad' } },
      ]
      mockQueryBuilder.in.mockResolvedValueOnce({ data: linkData, error: null })

      const store = usePantryStore()
      store.items = [mockItem] as any
      await store.fetchItemMealLinks()

      expect(store.itemMealLinks['item-1']).toHaveLength(2)
    })

    it('computes mealPantryCounts from link data', async () => {
      const linkData = [
        { pantry_item_id: 'item-1', meal_id: 'meal-1', meals: { id: 'meal-1', title: 'Pasta' } },
        { pantry_item_id: 'item-2', meal_id: 'meal-1', meals: { id: 'meal-1', title: 'Pasta' } },
        { pantry_item_id: 'item-1', meal_id: 'meal-2', meals: { id: 'meal-2', title: 'Salad' } },
      ]
      mockQueryBuilder.in.mockResolvedValueOnce({ data: linkData, error: null })

      const store = usePantryStore()
      store.items = [mockItem, mockItem2] as any
      await store.fetchItemMealLinks()

      expect(store.mealPantryCounts['meal-1']).toBe(2)
      expect(store.mealPantryCounts['meal-2']).toBe(1)
    })

    it('computes mealItemIds from link data', async () => {
      const linkData = [
        { pantry_item_id: 'item-1', meal_id: 'meal-1', meals: { id: 'meal-1', title: 'Pasta' } },
        { pantry_item_id: 'item-2', meal_id: 'meal-1', meals: { id: 'meal-1', title: 'Pasta' } },
        { pantry_item_id: 'item-1', meal_id: 'meal-2', meals: { id: 'meal-2', title: 'Salad' } },
      ]
      mockQueryBuilder.in.mockResolvedValueOnce({ data: linkData, error: null })

      const store = usePantryStore()
      store.items = [mockItem, mockItem2] as any
      await store.fetchItemMealLinks()

      expect(store.mealItemIds['meal-1']).toEqual(['item-1', 'item-2'])
      expect(store.mealItemIds['meal-2']).toEqual(['item-1'])
    })

    it('sets error on fetch failure', async () => {
      mockQueryBuilder.in.mockResolvedValueOnce({ data: null, error: { message: 'Link fetch failed' } })

      const store = usePantryStore()
      store.items = [mockItem] as any
      await store.fetchItemMealLinks()

      expect(store.error).toBe('Link fetch failed')
    })

    it('skips fetch when items array is empty', async () => {
      const store = usePantryStore()
      store.items = []
      await store.fetchItemMealLinks()
      expect(mockFrom).not.toHaveBeenCalledWith('pantry_item_meals')
    })
  })

  // --- subscribeRealtime ---
  describe('subscribeRealtime()', () => {
    it('subscribes to pantry-items and pantry-item-meals channels', () => {
      const mockChannelInstance = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }
      mockChannel.mockReturnValue(mockChannelInstance)

      const store = usePantryStore()
      store.subscribeRealtime()

      expect(mockChannel).toHaveBeenCalledTimes(2)
      expect(mockChannel).toHaveBeenCalledWith('pantry-items-changes')
      expect(mockChannel).toHaveBeenCalledWith('pantry-item-meals-changes')
    })

    it('handles INSERT event for items', () => {
      let itemCallback: (payload: any) => void = () => {}
      function makeCh(captureCb: boolean) {
        const ch: Record<string, any> = {}
        ch.on = vi.fn().mockImplementation((_event: any, _filter: any, cb: any) => {
          if (captureCb) itemCallback = cb
          return ch
        })
        ch.subscribe = vi.fn().mockReturnValue(ch)
        return ch
      }
      mockChannel
        .mockReturnValueOnce(makeCh(true))
        .mockReturnValueOnce(makeCh(false))

      const store = usePantryStore()
      store.subscribeRealtime()

      itemCallback({ eventType: 'INSERT', new: mockItem2, old: {} })
      expect(store.items).toContainEqual(mockItem2)
    })

    it('handles UPDATE event for items', () => {
      let itemCallback: (payload: any) => void = () => {}
      function makeCh(captureCb: boolean) {
        const ch: Record<string, any> = {}
        ch.on = vi.fn().mockImplementation((_event: any, _filter: any, cb: any) => {
          if (captureCb) itemCallback = cb
          return ch
        })
        ch.subscribe = vi.fn().mockReturnValue(ch)
        return ch
      }
      mockChannel
        .mockReturnValueOnce(makeCh(true))
        .mockReturnValueOnce(makeCh(false))

      const store = usePantryStore()
      store.items = [mockItem] as any
      store.subscribeRealtime()

      itemCallback({ eventType: 'UPDATE', new: { ...mockItem, name: 'Updated' }, old: {} })
      expect(store.items[0].name).toBe('Updated')
    })

    it('handles DELETE event for items', () => {
      let itemCallback: (payload: any) => void = () => {}
      function makeCh(captureCb: boolean) {
        const ch: Record<string, any> = {}
        ch.on = vi.fn().mockImplementation((_event: any, _filter: any, cb: any) => {
          if (captureCb) itemCallback = cb
          return ch
        })
        ch.subscribe = vi.fn().mockReturnValue(ch)
        return ch
      }
      mockChannel
        .mockReturnValueOnce(makeCh(true))
        .mockReturnValueOnce(makeCh(false))

      const store = usePantryStore()
      store.items = [mockItem, mockItem2] as any
      store.subscribeRealtime()

      itemCallback({ eventType: 'DELETE', new: {}, old: { id: 'item-1' } })
      expect(store.items.find(i => i.id === 'item-1')).toBeUndefined()
    })
  })

  // --- unsubscribeRealtime ---
  describe('unsubscribeRealtime()', () => {
    it('calls removeChannel for both channels', async () => {
      const mockChannelInstance = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }
      mockChannel.mockReturnValue(mockChannelInstance)
      mockRemoveChannel.mockResolvedValue(undefined)

      const store = usePantryStore()
      store.subscribeRealtime()
      await store.unsubscribeRealtime()

      expect(mockRemoveChannel).toHaveBeenCalledTimes(2)
    })
  })
})
