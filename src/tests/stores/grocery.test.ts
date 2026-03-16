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

const mockSection = {
  id: 'sec-1',
  household_id: 'hh-1',
  name: 'Produce',
  sort_order: 0,
  is_default: true,
}

const mockSection2 = {
  id: 'sec-2',
  household_id: 'hh-1',
  name: 'Dairy',
  sort_order: 1,
  is_default: false,
}

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
  // --- itemsBySection computed ---
  describe('itemsBySection', () => {
    it('groups items by section_id', () => {
      const store = useGroceryStore()
      store.items = [mockItem, mockItem2, { ...mockItem, id: 'item-3', section_id: 'sec-2' }] as any
      expect(store.itemsBySection['sec-1']).toHaveLength(2)
      expect(store.itemsBySection['sec-2']).toHaveLength(1)
    })

    it('returns empty map when no items', () => {
      const store = useGroceryStore()
      expect(store.itemsBySection).toEqual({})
    })
  })

  // --- fetchSections ---
  describe('fetchSections()', () => {
    it('populates sections on success', async () => {
      mockQueryBuilder.order.mockResolvedValueOnce({ data: [mockSection, mockSection2], error: null })
      const store = useGroceryStore()
      await store.fetchSections()
      expect(mockFrom).toHaveBeenCalledWith('grocery_sections')
      expect(store.sections).toEqual([mockSection, mockSection2])
      expect(store.error).toBeNull()
      expect(store.loading).toBe(false)
    })

    it('sets error string on failure', async () => {
      mockQueryBuilder.order.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } })
      const store = useGroceryStore()
      await store.fetchSections()
      expect(store.error).toBe('DB error')
      expect(store.sections).toEqual([])
      expect(store.loading).toBe(false)
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

  // --- addSection ---
  describe('addSection()', () => {
    it('inserts and appends section to local state', async () => {
      const newSection = { ...mockSection2, id: 'sec-3', sort_order: 0 }
      mockQueryBuilder.single.mockResolvedValueOnce({ data: newSection, error: null })
      const store = useGroceryStore()
      await store.addSection('Dairy')
      expect(mockFrom).toHaveBeenCalledWith('grocery_sections')
      expect(store.sections).toContainEqual(newSection)
    })

    it('sets error on failure', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } })
      const store = useGroceryStore()
      await store.addSection('Dairy')
      expect(store.error).toBe('Insert failed')
    })

    it('computes next sort_order from existing sections', async () => {
      const newSection = { ...mockSection, id: 'sec-3', sort_order: 2 }
      mockQueryBuilder.single.mockResolvedValueOnce({ data: newSection, error: null })
      const store = useGroceryStore()
      store.sections = [mockSection, mockSection2] as any
      await store.addSection('Bakery')
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ sort_order: 2 })
      )
    })
  })

  // --- renameSection ---
  describe('renameSection()', () => {
    it('optimistically updates section name', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: null })
      const store = useGroceryStore()
      store.sections = [mockSection] as any
      await store.renameSection('sec-1', 'Fresh Produce')
      expect(store.sections[0].name).toBe('Fresh Produce')
    })

    it('sets error on DB failure', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: { message: 'Update failed' } })
      const store = useGroceryStore()
      store.sections = [mockSection] as any
      await store.renameSection('sec-1', 'Fresh Produce')
      expect(store.error).toBe('Update failed')
    })
  })

  // --- deleteSection ---
  describe('deleteSection()', () => {
    it('removes section from local state', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: null })
      const store = useGroceryStore()
      store.sections = [mockSection, mockSection2] as any
      await store.deleteSection('sec-1')
      expect(store.sections).toHaveLength(1)
      expect(store.sections[0].id).toBe('sec-2')
    })

    it('sets error on DB failure', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({ error: { message: 'Delete failed' } })
      const store = useGroceryStore()
      store.sections = [mockSection] as any
      await store.deleteSection('sec-1')
      expect(store.error).toBe('Delete failed')
    })
  })

  // --- reorderSections ---
  describe('reorderSections()', () => {
    it('updates local sort_order for each section', async () => {
      mockQueryBuilder.eq.mockResolvedValue({ error: null })
      const store = useGroceryStore()
      store.sections = [mockSection, mockSection2] as any
      await store.reorderSections(['sec-2', 'sec-1'])
      const sec2 = store.sections.find(s => s.id === 'sec-2')!
      const sec1 = store.sections.find(s => s.id === 'sec-1')!
      expect(sec2.sort_order).toBe(0)
      expect(sec1.sort_order).toBe(1)
    })
  })

  // --- addItem ---
  describe('addItem()', () => {
    it('inserts and appends item to local state', async () => {
      const newItem = { ...mockItem, id: 'item-new' }
      mockQueryBuilder.single.mockResolvedValueOnce({ data: newItem, error: null })
      const store = useGroceryStore()
      await store.addItem({ name: 'Apples', quantity: '6', section_id: 'sec-1', household_id: 'hh-1' })
      expect(mockFrom).toHaveBeenCalledWith('grocery_items')
      expect(store.items).toContainEqual(newItem)
    })

    it('sets error on failure', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } })
      const store = useGroceryStore()
      await store.addItem({ name: 'Apples', section_id: 'sec-1', household_id: 'hh-1' })
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
      // The chain ends at the second .eq() call
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
      // First eq call (delete) resolves; insert resolves via eq chain
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
    it('subscribes to two channels', () => {
      const mockChannelInstance = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }
      mockChannel.mockReturnValue(mockChannelInstance)

      const store = useGroceryStore()
      store.subscribeRealtime()

      expect(mockChannel).toHaveBeenCalledTimes(2)
      expect(mockChannel).toHaveBeenCalledWith('grocery-sections-changes')
      expect(mockChannel).toHaveBeenCalledWith('grocery-items-changes')
    })

    it('handles INSERT event for sections', () => {
      let sectionCallback: (payload: any) => void = () => {}
      const mockChannelInstance = {
        on: vi.fn().mockImplementation((_event, _filter, cb) => {
          sectionCallback = cb
          return mockChannelInstance
        }),
        subscribe: vi.fn().mockReturnThis(),
      }
      // First channel is sections
      mockChannel.mockReturnValueOnce(mockChannelInstance).mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      })

      const store = useGroceryStore()
      store.subscribeRealtime()

      sectionCallback({ eventType: 'INSERT', new: mockSection2, old: {} })
      expect(store.sections).toContainEqual(mockSection2)
    })

    it('handles DELETE event for items', () => {
      let itemCallback: (payload: any) => void = () => {}
      const mockSectionChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }
      const mockItemChannel = {
        on: vi.fn().mockImplementation((_event, _filter, cb) => {
          itemCallback = cb
          return mockItemChannel
        }),
        subscribe: vi.fn().mockReturnThis(),
      }
      mockChannel.mockReturnValueOnce(mockSectionChannel).mockReturnValueOnce(mockItemChannel)

      const store = useGroceryStore()
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

      const store = useGroceryStore()
      store.subscribeRealtime()
      await store.unsubscribeRealtime()

      expect(mockRemoveChannel).toHaveBeenCalledTimes(2)
    })
  })
})
