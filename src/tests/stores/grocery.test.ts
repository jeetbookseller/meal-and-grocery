import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGroceryStore } from '@/stores/grocery'

// --- Supabase mock setup ---

const mockQueryBuilder = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  single: vi.fn(),
}

// Make every builder method return itself for chaining by default
Object.keys(mockQueryBuilder).forEach(key => {
  mockQueryBuilder[key as keyof typeof mockQueryBuilder].mockReturnValue(mockQueryBuilder)
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
  vi.clearAllMocks()
  // Reset all builder methods to return themselves
  Object.keys(mockQueryBuilder).forEach(key => {
    mockQueryBuilder[key as keyof typeof mockQueryBuilder].mockReturnValue(mockQueryBuilder)
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
      const eqMock = vi.fn().mockReturnValueOnce(mockQueryBuilder).mockResolvedValueOnce({ error: null })
      mockQueryBuilder.eq = eqMock
      mockFrom.mockReturnValue(mockQueryBuilder)

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
      const eqMock = vi.fn()
        .mockResolvedValueOnce({ error: null }) // delete .eq()
      mockQueryBuilder.eq = eqMock
      mockQueryBuilder.insert.mockResolvedValueOnce({ error: null })
      mockFrom.mockReturnValue(mockQueryBuilder)

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
  })

  // --- subscribeRealtime ---
  describe('subscribeRealtime()', () => {
    it('subscribes to only items channel (not sections)', () => {
      const mockChannelInstance = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }
      mockChannel.mockReturnValue(mockChannelInstance)

      const store = useGroceryStore()
      store.subscribeRealtime()

      expect(mockChannel).toHaveBeenCalledTimes(1)
      expect(mockChannel).toHaveBeenCalledWith('grocery-items-changes')
      expect(mockChannel).not.toHaveBeenCalledWith('grocery-sections-changes')
    })

    it('handles INSERT event for items', () => {
      let itemCallback: (payload: any) => void = () => {}
      const mockChannelInstance = {
        on: vi.fn().mockImplementation((_event, _filter, cb) => {
          itemCallback = cb
          return mockChannelInstance
        }),
        subscribe: vi.fn().mockReturnThis(),
      }
      mockChannel.mockReturnValue(mockChannelInstance)

      const store = useGroceryStore()
      store.subscribeRealtime()

      itemCallback({ eventType: 'INSERT', new: mockItem2, old: {} })
      expect(store.items).toContainEqual(mockItem2)
    })

    it('handles UPDATE event for items', () => {
      let itemCallback: (payload: any) => void = () => {}
      const mockChannelInstance = {
        on: vi.fn().mockImplementation((_event, _filter, cb) => {
          itemCallback = cb
          return mockChannelInstance
        }),
        subscribe: vi.fn().mockReturnThis(),
      }
      mockChannel.mockReturnValue(mockChannelInstance)

      const store = useGroceryStore()
      store.items = [mockItem] as any
      store.subscribeRealtime()

      itemCallback({ eventType: 'UPDATE', new: { ...mockItem, name: 'Updated' }, old: {} })
      expect(store.items[0].name).toBe('Updated')
    })

    it('handles DELETE event for items', () => {
      let itemCallback: (payload: any) => void = () => {}
      const mockChannelInstance = {
        on: vi.fn().mockImplementation((_event, _filter, cb) => {
          itemCallback = cb
          return mockChannelInstance
        }),
        subscribe: vi.fn().mockReturnThis(),
      }
      mockChannel.mockReturnValue(mockChannelInstance)

      const store = useGroceryStore()
      store.items = [mockItem, mockItem2] as any
      store.subscribeRealtime()

      itemCallback({ eventType: 'DELETE', new: {}, old: { id: 'item-1' } })
      expect(store.items.find(i => i.id === 'item-1')).toBeUndefined()
    })
  })

  // --- unsubscribeRealtime ---
  describe('unsubscribeRealtime()', () => {
    it('calls removeChannel once (items channel only)', async () => {
      const mockChannelInstance = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }
      mockChannel.mockReturnValue(mockChannelInstance)
      mockRemoveChannel.mockResolvedValue(undefined)

      const store = useGroceryStore()
      store.subscribeRealtime()
      await store.unsubscribeRealtime()

      expect(mockRemoveChannel).toHaveBeenCalledTimes(1)
    })
  })
})
