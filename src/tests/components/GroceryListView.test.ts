import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// --- Mock state (plain reactive object for correct template access) ---
const { mockState } = vi.hoisted(() => {
  const sections = [
    { id: 'sec-1', household_id: 'hh-1', name: 'Produce', sort_order: 0, is_default: true },
    { id: 'sec-2', household_id: 'hh-1', name: 'Dairy', sort_order: 1, is_default: false },
  ]
  const items = [
    {
      id: 'item-1',
      household_id: 'hh-1',
      section_id: 'sec-1',
      name: 'Apples',
      quantity: '6',
      is_checked: false,
      sort_order: 0,
      created_by: 'user-1',
      created_at: '2026-03-16T00:00:00Z',
    },
  ]
  return {
    mockState: {
      sections,
      items,
      loading: false,
      error: null as string | null,
      itemsBySection: { 'sec-1': items } as Record<string, typeof items>,
      fetchSections: vi.fn(),
      fetchItems: vi.fn(),
      subscribeRealtime: vi.fn(),
      unsubscribeRealtime: vi.fn(),
      clearChecked: vi.fn(),
      addSection: vi.fn(),
      renameSection: vi.fn(),
      deleteSection: vi.fn(),
      toggleChecked: vi.fn(),
    },
  }
})

vi.mock('@/stores/grocery', () => ({
  useGroceryStore: vi.fn(() => mockState),
}))

import GroceryListView from '@/views/GroceryListView.vue'

const defaultSections = [
  { id: 'sec-1', household_id: 'hh-1', name: 'Produce', sort_order: 0, is_default: true },
  { id: 'sec-2', household_id: 'hh-1', name: 'Dairy', sort_order: 1, is_default: false },
]
const defaultItems = [
  {
    id: 'item-1',
    household_id: 'hh-1',
    section_id: 'sec-1',
    name: 'Apples',
    quantity: '6',
    is_checked: false,
    sort_order: 0,
    created_by: 'user-1',
    created_at: '2026-03-16T00:00:00Z',
  },
]

describe('GroceryListView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockState.sections = [...defaultSections]
    mockState.items = [...defaultItems]
    mockState.loading = false
    mockState.error = null
    mockState.itemsBySection = { 'sec-1': [...defaultItems] }
  })

  it('calls fetchSections on mount', () => {
    mount(GroceryListView)
    expect(mockState.fetchSections).toHaveBeenCalledOnce()
  })

  it('calls fetchItems on mount', () => {
    mount(GroceryListView)
    expect(mockState.fetchItems).toHaveBeenCalledOnce()
  })

  it('calls subscribeRealtime on mount', () => {
    mount(GroceryListView)
    expect(mockState.subscribeRealtime).toHaveBeenCalledOnce()
  })

  it('calls unsubscribeRealtime on unmount', () => {
    const wrapper = mount(GroceryListView)
    wrapper.unmount()
    expect(mockState.unsubscribeRealtime).toHaveBeenCalledOnce()
  })

  it('renders one GrocerySection per section', () => {
    const wrapper = mount(GroceryListView)
    const sections = wrapper.findAll('[data-testid="grocery-section"]')
    expect(sections).toHaveLength(2)
  })

  it('renders section names', () => {
    const wrapper = mount(GroceryListView)
    expect(wrapper.text()).toContain('Produce')
    expect(wrapper.text()).toContain('Dairy')
  })

  it('renders AddSectionButton', () => {
    const wrapper = mount(GroceryListView)
    expect(wrapper.find('[data-testid="add-section-btn"]').exists()).toBe(true)
  })

  it('renders ClearCheckedButton', () => {
    const wrapper = mount(GroceryListView)
    expect(wrapper.find('[data-testid="clear-checked-btn"]').exists()).toBe(true)
  })

  it('shows loading spinner when loading', () => {
    mockState.loading = true
    const wrapper = mount(GroceryListView)
    expect(wrapper.find('[data-testid="loading-spinner"]').exists()).toBe(true)
  })

  it('hides sections when loading', () => {
    mockState.loading = true
    const wrapper = mount(GroceryListView)
    expect(wrapper.find('[data-testid="grocery-section"]').exists()).toBe(false)
  })

  it('shows error message when error is set', () => {
    mockState.error = 'Failed to load'
    const wrapper = mount(GroceryListView)
    expect(wrapper.text()).toContain('Failed to load')
  })

  it('shows empty state when no sections', () => {
    mockState.sections = []
    const wrapper = mount(GroceryListView)
    expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true)
  })
})
