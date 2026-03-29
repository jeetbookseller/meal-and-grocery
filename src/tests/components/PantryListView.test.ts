import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// --- Mock state ---
const { mockState } = vi.hoisted(() => {
  const items = [
    {
      id: 'item-1',
      household_id: 'hh-1',
      name: 'Eggs',
      quantity: '12',
      is_checked: false,
      sort_order: 0,
      created_by: 'user-1',
      created_at: '2026-03-16T00:00:00Z',
    },
    {
      id: 'item-2',
      household_id: 'hh-1',
      name: 'Milk',
      quantity: null,
      is_checked: true,
      sort_order: 1,
      created_by: 'user-1',
      created_at: '2026-03-16T00:00:00Z',
    },
  ]
  return {
    mockState: {
      items,
      loading: false,
      error: null as string | null,
      fetchItems: vi.fn().mockResolvedValue(undefined),
      subscribeRealtime: vi.fn(),
      unsubscribeRealtime: vi.fn(),
      addItem: vi.fn().mockResolvedValue(undefined),
      deleteItem: vi.fn().mockResolvedValue(undefined),
      clearChecked: vi.fn(),
      toggleChecked: vi.fn(),
      fetchItemMealLinks: vi.fn().mockResolvedValue(undefined),
      itemMealLinks: {} as Record<string, Array<{ id: string; title: string }>>,
      mealPantryCounts: {} as Record<string, number>,
    },
  }
})

vi.mock('@/stores/pantry', () => ({
  usePantryStore: vi.fn(() => mockState),
}))

vi.mock('@/stores/household', () => ({
  useHouseholdStore: vi.fn(() => ({ householdId: 'hh-1' })),
}))

import PantryListView from '@/views/PantryListView.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  mockState.items = [
    {
      id: 'item-1',
      household_id: 'hh-1',
      name: 'Eggs',
      quantity: '12',
      is_checked: false,
      sort_order: 0,
      created_by: 'user-1',
      created_at: '2026-03-16T00:00:00Z',
    },
    {
      id: 'item-2',
      household_id: 'hh-1',
      name: 'Milk',
      quantity: null,
      is_checked: true,
      sort_order: 1,
      created_by: 'user-1',
      created_at: '2026-03-16T00:00:00Z',
    },
  ]
  mockState.loading = false
  mockState.error = null
  mockState.fetchItems.mockResolvedValue(undefined)
  mockState.fetchItemMealLinks.mockResolvedValue(undefined)
})

describe('PantryListView.vue', () => {
  it('renders pantry item names', () => {
    const wrapper = mount(PantryListView)
    expect(wrapper.text()).toContain('Eggs')
    expect(wrapper.text()).toContain('Milk')
  })

  it('shows empty state when items array is empty', () => {
    mockState.items = []
    const wrapper = mount(PantryListView)
    expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('pantry is empty')
  })

  it('does not show empty state when items exist', () => {
    const wrapper = mount(PantryListView)
    expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(false)
  })

  it('shows loading spinner when loading is true', () => {
    mockState.loading = true
    mockState.items = []
    const wrapper = mount(PantryListView)
    expect(wrapper.find('[data-testid="loading-spinner"]').exists()).toBe(true)
  })

  it('shows error banner when error is set', () => {
    mockState.error = 'Something went wrong'
    mockState.items = []
    const wrapper = mount(PantryListView)
    expect(wrapper.text()).toContain('Something went wrong')
  })

  it('renders a quick-add input', () => {
    const wrapper = mount(PantryListView)
    expect(wrapper.find('[data-testid="global-add-input"]').exists()).toBe(true)
  })

  it('renders a quick-add button', () => {
    const wrapper = mount(PantryListView)
    expect(wrapper.find('[data-testid="global-add-btn"]').exists()).toBe(true)
  })

  it('does NOT render a store input in the quick-add form', () => {
    const wrapper = mount(PantryListView)
    expect(wrapper.find('[data-testid="store-input"]').exists()).toBe(false)
  })

  it('does NOT render a grouping toggle button', () => {
    const wrapper = mount(PantryListView)
    expect(wrapper.find('[data-testid="group-toggle-btn"]').exists()).toBe(false)
  })

  it('calls pantryStore.addItem when quick-add form is submitted', async () => {
    const wrapper = mount(PantryListView)
    const input = wrapper.find('[data-testid="global-add-input"]')
    await input.setValue('Butter')
    await wrapper.find('form').trigger('submit.prevent')
    expect(mockState.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Butter', household_id: 'hh-1' })
    )
  })

  it('does not call addItem when input is empty', async () => {
    const wrapper = mount(PantryListView)
    await wrapper.find('form').trigger('submit.prevent')
    expect(mockState.addItem).not.toHaveBeenCalled()
  })

  it('calls pantryStore.deleteItem when delete is emitted from item', async () => {
    const wrapper = mount(PantryListView)
    const pantryItem = wrapper.findComponent({ name: 'PantryItem' })
    pantryItem.vm.$emit('delete', { id: 'item-1' })
    await wrapper.vm.$nextTick()
    expect(mockState.deleteItem).toHaveBeenCalledWith('item-1')
  })

  it('renders ClearCheckedButton', () => {
    const wrapper = mount(PantryListView)
    const btn = wrapper.findComponent({ name: 'ClearCheckedButton' })
    expect(btn.exists()).toBe(true)
  })

  it('calls pantryStore.clearChecked when ClearCheckedButton emits clear', async () => {
    const wrapper = mount(PantryListView)
    const btn = wrapper.findComponent({ name: 'ClearCheckedButton' })
    btn.vm.$emit('clear')
    await wrapper.vm.$nextTick()
    expect(mockState.clearChecked).toHaveBeenCalled()
  })

  it('calls fetchItems on mount', () => {
    mount(PantryListView)
    expect(mockState.fetchItems).toHaveBeenCalled()
  })

  it('calls subscribeRealtime on mount', async () => {
    mount(PantryListView)
    await vi.dynamicImportSettled()
    expect(mockState.subscribeRealtime).toHaveBeenCalled()
  })

  it('calls unsubscribeRealtime on unmount', () => {
    const wrapper = mount(PantryListView)
    wrapper.unmount()
    expect(mockState.unsubscribeRealtime).toHaveBeenCalled()
  })
})
