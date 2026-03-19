import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGroceryStore } from '@/stores/grocery'

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
  section_id: 'sec-1',
  name: 'Apples',
  quantity: '6',
  is_checked: false,
  sort_order: 0,
  created_by: 'user-1',
  created_at: '2026-03-16T00:00:00Z',
}

const mockItem2 = {
  id: 'item-2',
  household_id: 'hh-1',
  section_id: 'sec-1',
  name: 'Bananas',
  quantity: null,
  is_checked: true,
  sort_order: 1,
  created_by: 'user-1',
  created_at: '2026-03-16T00:00:00Z',
}

const mockUngroupedSection = {
  id: 'sec-ungrouped',
  household_id: 'hh-1',
  name: 'Ungrouped',
  sort_order: -1,
  is_default: false,
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  // Reset all builder methods to return themselves
  Object.keys(mockQueryBuilder).forEach(key => {
    mockQueryBuilder[key].mockReturnValue(mockQueryBuilder)
  })
  mockFrom.mockReturnValue(mockQueryBuilder)
})

describe('useGroceryStore', () => {
  // --- Public API shape ---
  describe('public API', () => {
    it('does not expose sections state', () => {
      const store = useGroceryStore()
      expect((store as any).sections).toBeUndefined()
    })

    it('does not expose addSection', () => {
      const store = useGroceryStore()
      expect((store as any).addSection).toBeUndefined()
    })

    it('does not expose renameSection', () => {
      const store = useGroceryStore()
      expect((store as any).renameSection).toBeUndefined()
    })

    it('does not expose deleteSection', () => {
      const store = useGroceryStore()
      expect((store as any).deleteSection).toBeUndefined()
    })

    it('does not expose reorderSections', () => {
      const store = useGroceryStore()
      expect((store as any).reorderSections).toBeUndefined()
    })

    it('does not expose itemsBySection', () => {
      const store = useGroceryStore()
      expect((store as any).itemsBySection).toBeUndefined()
    })

    it('does not expose fetchSections', () => {
      const store = useGroceryStore()
      expect((store as any).fetchSections).toBeUndefined()
    })

    it('does not expose ensureUngroupedSection', () => {
      const store = useGroceryStore()
      expect((store as any).ensureUngroupedSection).toBeUndefined()
    })

    it('does not expose ungroupedSection', () => {
      const store = useGroceryStore()
      expect((store as any).ungroupedSection).toBeUndefined()
    })
  })

  // --- fetchItems ---
  describe('fetchItems()', () => {
    it('populates items on success', async () => {
      mockQueryBuilder.order.mockResolvedValueOnce({ data: [mockItem, mockItem2], error: null })
      const store = useGroceryStore()
      await store.fetchItems()
      expect(mockFrom).toHaveBeenCalledWith('grocery_items')
      expect(store.items).toEqual([mockItem, mockItem2])
      expect(store.error).toBeNull()
    })

    it('sets error string on failure', async () => {
      mockQueryBuilder.order.mockResolvedValueOnce({ data: null, error: { message: 'Network error' } })
      const store = useGroceryStore()
      await store.fetchItems()
      expect(store.error).toBe('Network error')
    })
  })

  // --- addItem ---
  describe('addItem()', () => {
    it('auto-assigns section_id from ungrouped section and appends item', async () => {
      // ensureUngroupedSection: first check fetches sections (returns ungrouped already exists via select/order)
      // Actually: store checks internal _sections; if empty it fetches. Let's set up:
      // First mockFrom call: grocery_sections (fetch for ensureUngroupedSection)
      // Second mockFrom call: grocery_items (insert)
      mockQueryBuilder.order.mockResolvedValueOnce({ data: [mockUngroupedSection], error: null })
      const newItem = { ...mockItem, id: 'item-new', section_id: 'sec-ungrouped' }
      mockQueryBuilder.single.mockResolvedValueOnce({ data: newItem, error: null })

      const store = useGroceryStore()
      await store.addItem({ name: 'Apples', quantity: '6', household_id: 'hh-1' })

      expect(mockFrom).toHaveBeenCalledWith('grocery_items')
      expect(store.items).toContainEqual(newItem)
    })

    it('creates ungrouped section if it does not exist', async () => {
      // ensureUngroupedSection: fetch returns empty, then insert creates section
      mockQueryBuilder.order.mockResolvedValueOnce({ data: [], error: null })
      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: mockUngroupedSection, error: null }) // section insert
        .mockResolvedValueOnce({ data: { ...mockItem, id: 'item-new', section_id: 'sec-ungrouped' }, error: null }) // item insert

      const store = useGroceryStore()
      await store.addItem({ name: 'Apples', household_id: 'hh-1' })

      expect(mockFrom).toHaveBeenCalledWith('grocery_sections')
      expect(store.items).toHaveLength(1)
    })

    it('sets error on failure', async () => {
      mockQueryBuilder.order.mockResolvedValueOnce({ data: [mockUngroupedSection], error: null })
      mockQueryBuilder.single.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } })
      const store = useGroceryStore()
      await store.addItem({ name: 'Apples', household_id: 'hh-1' })
      expect(store.error).toBe('Insert failed')
    })
  })

  // --- updateItem ---
  describe('updateItem()', () => {
    it('optimistically updates item in local state', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: null })
      const store = useGroceryStore()
      store.items = [mockItem] as any
      await store.updateItem('item-1', { name: 'Green Apples' })
      expect(store.items[0].name).toBe('Green Apples')
    })

    it('sets error on DB failure', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: { message: 'Update failed' } })
      const store = useGroceryStore()
      store.items = [mockItem] as any
      await store.updateItem('item-1', { name: 'Green Apples' })
      expect(store.error).toBe('Update failed')
    })
  })

  // --- deleteItem ---
  describe('deleteItem()', () => {
    it('removes item from local state', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: null })
      const store = useGroceryStore()
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
      const store = useGroceryStore()
      store.items = [{ ...mockItem, is_checked: false }] as any
      await store.toggleChecked('item-1')
      expect(store.items[0].is_checked).toBe(true)
    })

    it('flips is_checked from true to false', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: null })
      const store = useGroceryStore()
      store.items = [{ ...mockItem, is_checked: true }] as any
      await store.toggleChecked('item-1')
      expect(store.items[0].is_checked).toBe(false)
    })

    it('does nothing if item not found', async () => {
      const store = useGroceryStore()
      store.items = [mockItem] as any
      await store.toggleChecked('nonexistent')
      expect(mockFrom).not.toHaveBeenCalled()
    })
  })

  // --- clearChecked ---
  describe('clearChecked()', () => {
    it('removes checked items from local state and calls DB delete', async () => {
      mockQueryBuilder.eq
        .mockReturnValueOnce(mockQueryBuilder)  // .eq('household_id', ...)
        .mockResolvedValueOnce({ error: null })  // .eq('is_checked', true)

      const store = useGroceryStore()
      store.items = [mockItem, mockItem2] as any // mockItem2 is checked
      await store.clearChecked()
      expect(store.items).toHaveLength(1)
      expect(store.items[0].id).toBe('item-1')
      expect(mockFrom).toHaveBeenCalledWith('grocery_items')
    })
  })

  // --- linkItemToMeals ---
  describe('linkItemToMeals()', () => {
    it('deletes existing links then inserts new ones', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: null }) // delete .eq()
      mockQueryBuilder.insert.mockResolvedValueOnce({ error: null })
      mockQueryBuilder.in.mockResolvedValueOnce({ data: [], error: null }) // fetchItemMealLinks refetch

      const store = useGroceryStore()
      await store.linkItemToMeals('item-1', ['meal-1', 'meal-2'])

      expect(mockFrom).toHaveBeenCalledWith('grocery_item_meals')
      expect(mockQueryBuilder.delete).toHaveBeenCalled()
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith([
        { grocery_item_id: 'item-1', meal_id: 'meal-1' },
        { grocery_item_id: 'item-1', meal_id: 'meal-2' },
      ])
    })

    it('skips insert when mealIds is empty', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: null })
      mockQueryBuilder.in.mockResolvedValueOnce({ data: [], error: null }) // fetchItemMealLinks refetch
      const store = useGroceryStore()
      await store.linkItemToMeals('item-1', [])
      expect(mockQueryBuilder.insert).not.toHaveBeenCalled()
    })

    it('sets error on delete failure', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: { message: 'Delete failed' } })
      const store = useGroceryStore()
      await store.linkItemToMeals('item-1', ['meal-1'])
      expect(store.error).toBe('Delete failed')
    })

    it('refreshes item meal links after successful save', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: null }) // delete .eq()
      mockQueryBuilder.insert.mockResolvedValueOnce({ error: null })
      // fetchItemMealLinks will call .in() at the end
      const linkData = [
        { grocery_item_id: 'item-1', meal_id: 'meal-1', meals: { id: 'meal-1', title: 'Pasta' } },
      ]
      mockQueryBuilder.in.mockResolvedValueOnce({ data: linkData, error: null })

      const store = useGroceryStore()
      store.items = [mockItem] as any
      await store.linkItemToMeals('item-1', ['meal-1'])

      expect(store.itemMealLinks['item-1']).toEqual([{ id: 'meal-1', title: 'Pasta' }])
    })
  })

  // --- linkMealToItems ---
  describe('linkMealToItems()', () => {
    it('deletes existing links for meal then inserts new ones', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: null }) // delete .eq()
      mockQueryBuilder.insert.mockResolvedValueOnce({ error: null })
      mockQueryBuilder.in.mockResolvedValueOnce({ data: [], error: null }) // fetchItemMealLinks refetch

      const store = useGroceryStore()
      await store.linkMealToItems('meal-1', ['item-1', 'item-2'])

      expect(mockFrom).toHaveBeenCalledWith('grocery_item_meals')
      expect(mockQueryBuilder.delete).toHaveBeenCalled()
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('meal_id', 'meal-1')
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith([
        { grocery_item_id: 'item-1', meal_id: 'meal-1' },
        { grocery_item_id: 'item-2', meal_id: 'meal-1' },
      ])
    })

    it('skips insert when itemIds is empty', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: null })
      mockQueryBuilder.in.mockResolvedValueOnce({ data: [], error: null }) // fetchItemMealLinks refetch
      const store = useGroceryStore()
      await store.linkMealToItems('meal-1', [])
      expect(mockQueryBuilder.insert).not.toHaveBeenCalled()
    })

    it('refreshes link data after successful save', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: null })
      mockQueryBuilder.insert.mockResolvedValueOnce({ error: null })
      const linkData = [
        { grocery_item_id: 'item-1', meal_id: 'meal-1', meals: { id: 'meal-1', title: 'Pasta' } },
      ]
      mockQueryBuilder.in.mockResolvedValueOnce({ data: linkData, error: null })

      const store = useGroceryStore()
      store.items = [mockItem] as any
      await store.linkMealToItems('meal-1', ['item-1'])

      expect(store.itemMealLinks['item-1']).toEqual([{ id: 'meal-1', title: 'Pasta' }])
    })

    it('sets error on delete failure', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: { message: 'Delete failed' } })
      const store = useGroceryStore()
      await store.linkMealToItems('meal-1', ['item-1'])
      expect(store.error).toBe('Delete failed')
    })
  })

  // --- mealItemIds ---
  describe('mealItemIds', () => {
    it('computes item IDs grouped by meal from link data', async () => {
      const linkData = [
        { grocery_item_id: 'item-1', meal_id: 'meal-1', meals: { id: 'meal-1', title: 'Pasta' } },
        { grocery_item_id: 'item-2', meal_id: 'meal-1', meals: { id: 'meal-1', title: 'Pasta' } },
        { grocery_item_id: 'item-1', meal_id: 'meal-2', meals: { id: 'meal-2', title: 'Salad' } },
      ]
      mockQueryBuilder.in.mockResolvedValueOnce({ data: linkData, error: null })

      const store = useGroceryStore()
      store.items = [mockItem, mockItem2] as any
      await store.fetchItemMealLinks()

      expect(store.mealItemIds['meal-1']).toEqual(['item-1', 'item-2'])
      expect(store.mealItemIds['meal-2']).toEqual(['item-1'])
    })
  })

  // --- subscribeRealtime ---
  describe('subscribeRealtime()', () => {
    it('subscribes to items and item-meals channels (not sections)', () => {
      const mockChannelInstance = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }
      mockChannel.mockReturnValue(mockChannelInstance)

      const store = useGroceryStore()
      store.subscribeRealtime()

      expect(mockChannel).toHaveBeenCalledTimes(2)
      expect(mockChannel).toHaveBeenCalledWith('grocery-items-changes')
      expect(mockChannel).toHaveBeenCalledWith('grocery-item-meals-changes')
      expect(mockChannel).not.toHaveBeenCalledWith('grocery-sections-changes')
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
        .mockReturnValueOnce(makeCh(true))   // grocery-items-changes
        .mockReturnValueOnce(makeCh(false))   // grocery-item-meals-changes

      const store = useGroceryStore()
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

      const store = useGroceryStore()
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

      const store = useGroceryStore()
      store.items = [mockItem, mockItem2] as any
      store.subscribeRealtime()

      itemCallback({ eventType: 'DELETE', new: {}, old: { id: 'item-1' } })
      expect(store.items.find(i => i.id === 'item-1')).toBeUndefined()
    })
  })

  // --- fetchItemMealLinks ---
  describe('fetchItemMealLinks()', () => {
    it('populates itemMealLinks map on success', async () => {
      const linkData = [
        { grocery_item_id: 'item-1', meal_id: 'meal-1', meals: { id: 'meal-1', title: 'Pasta' } },
      ]
      mockQueryBuilder.in.mockResolvedValueOnce({ data: linkData, error: null })

      const store = useGroceryStore()
      store.items = [mockItem] as any
      await store.fetchItemMealLinks()

      expect(mockFrom).toHaveBeenCalledWith('grocery_item_meals')
      expect(store.itemMealLinks['item-1']).toEqual([{ id: 'meal-1', title: 'Pasta' }])
    })

    it('groups multiple meals under the same item', async () => {
      const linkData = [
        { grocery_item_id: 'item-1', meal_id: 'meal-1', meals: { id: 'meal-1', title: 'Pasta' } },
        { grocery_item_id: 'item-1', meal_id: 'meal-2', meals: { id: 'meal-2', title: 'Salad' } },
      ]
      mockQueryBuilder.in.mockResolvedValueOnce({ data: linkData, error: null })

      const store = useGroceryStore()
      store.items = [mockItem] as any
      await store.fetchItemMealLinks()

      expect(store.itemMealLinks['item-1']).toHaveLength(2)
    })

    it('computes mealGroceryCounts from link data', async () => {
      const linkData = [
        { grocery_item_id: 'item-1', meal_id: 'meal-1', meals: { id: 'meal-1', title: 'Pasta' } },
        { grocery_item_id: 'item-2', meal_id: 'meal-1', meals: { id: 'meal-1', title: 'Pasta' } },
        { grocery_item_id: 'item-1', meal_id: 'meal-2', meals: { id: 'meal-2', title: 'Salad' } },
      ]
      mockQueryBuilder.in.mockResolvedValueOnce({ data: linkData, error: null })

      const store = useGroceryStore()
      store.items = [mockItem, mockItem2] as any
      await store.fetchItemMealLinks()

      expect(store.mealGroceryCounts['meal-1']).toBe(2)
      expect(store.mealGroceryCounts['meal-2']).toBe(1)
    })

    it('sets error on fetch failure', async () => {
      mockQueryBuilder.in.mockResolvedValueOnce({ data: null, error: { message: 'Link fetch failed' } })

      const store = useGroceryStore()
      store.items = [mockItem] as any
      await store.fetchItemMealLinks()

      expect(store.error).toBe('Link fetch failed')
    })

    it('skips fetch when items array is empty', async () => {
      const store = useGroceryStore()
      store.items = []
      await store.fetchItemMealLinks()

      // mockFrom is called in beforeEach setup, so check it wasn't called with grocery_item_meals
      expect(mockFrom).not.toHaveBeenCalledWith('grocery_item_meals')
    })
  })

  // --- unsubscribeRealtime ---
  describe('unsubscribeRealtime()', () => {
    it('calls removeChannel for both items and item-meals channels', async () => {
      const mockChannelInstance = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }
      mockChannel.mockReturnValue(mockChannelInstance)
      mockRemoveChannel.mockResolvedValue(undefined)

      const store = useGroceryStore()
      store.subscribeRealtime()
      await store.unsubscribeRealtime()

      expect(mockRemoveChannel).toHaveBeenCalledTimes(2)
    })
  })
})
