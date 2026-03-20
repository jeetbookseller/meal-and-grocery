import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// --- Mock state ---
const { mockState } = vi.hoisted(() => {
  const items = [
    {
      id: 'item-1',
      household_id: 'hh-1',
      section_id: 'sec-1',
      name: 'Apples',
      quantity: '6',
      store: null,
      is_checked: false,
      sort_order: 0,
      created_by: 'user-1',
      created_at: '2026-03-16T00:00:00Z',
    },
    {
      id: 'item-2',
      household_id: 'hh-1',
      section_id: 'sec-1',
      name: 'Milk',
      quantity: null,
      store: null,
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
      mealGroceryCounts: {} as Record<string, number>,
      storeNames: [] as string[],
    },
  }
})

vi.mock('@/stores/grocery', () => ({
  useGroceryStore: vi.fn(() => mockState),
}))

vi.mock('@/stores/household', () => ({
  useHouseholdStore: vi.fn(() => ({ householdId: 'hh-1' })),
}))

import GroceryListView from '@/views/GroceryListView.vue'

const defaultItems = [
  {
    id: 'item-1',
    household_id: 'hh-1',
    section_id: 'sec-1',
    name: 'Apples',
    quantity: '6',
    store: null,
    is_checked: false,
    sort_order: 0,
    created_by: 'user-1',
    created_at: '2026-03-16T00:00:00Z',
  },
  {
    id: 'item-2',
    household_id: 'hh-1',
    section_id: 'sec-1',
    name: 'Milk',
    quantity: null,
    store: null,
    is_checked: true,
    sort_order: 1,
    created_by: 'user-1',
    created_at: '2026-03-16T00:00:00Z',
  },
]

describe('GroceryListView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockState.items = [...defaultItems]
    mockState.loading = false
    mockState.error = null
  })

  it('calls fetchItems on mount', () => {
    mount(GroceryListView)
    expect(mockState.fetchItems).toHaveBeenCalledOnce()
  })

  it('calls subscribeRealtime on mount', async () => {
    mount(GroceryListView)
    await vi.dynamicImportSettled()
    expect(mockState.subscribeRealtime).toHaveBeenCalledOnce()
  })

  it('calls unsubscribeRealtime on unmount', () => {
    const wrapper = mount(GroceryListView)
    wrapper.unmount()
    expect(mockState.unsubscribeRealtime).toHaveBeenCalledOnce()
  })

  it('does NOT call fetchSections (no longer needed)', () => {
    mount(GroceryListView)
    // grocery store no longer exposes fetchSections
    expect(mockState).not.toHaveProperty('fetchSections')
  })

  it('renders GroceryItem for each item', () => {
    const wrapper = mount(GroceryListView)
    const items = wrapper.findAll('[data-testid="grocery-item"]')
    expect(items).toHaveLength(2)
  })

  it('renders item names in the flat list', () => {
    const wrapper = mount(GroceryListView)
    expect(wrapper.text()).toContain('Apples')
    expect(wrapper.text()).toContain('Milk')
  })

  it('does NOT render AddSectionButton', () => {
    const wrapper = mount(GroceryListView)
    expect(wrapper.find('[data-testid="add-section-btn"]').exists()).toBe(false)
  })

  it('does NOT render GrocerySection', () => {
    const wrapper = mount(GroceryListView)
    expect(wrapper.find('[data-testid="grocery-section"]').exists()).toBe(false)
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

  it('hides items when loading', () => {
    mockState.loading = true
    const wrapper = mount(GroceryListView)
    expect(wrapper.find('[data-testid="grocery-item"]').exists()).toBe(false)
  })

  it('shows error message when error is set', () => {
    mockState.loading = false
    mockState.error = 'Failed to load'
    const wrapper = mount(GroceryListView)
    expect(wrapper.text()).toContain('Failed to load')
  })

  it('shows empty state when no items', () => {
    mockState.items = []
    const wrapper = mount(GroceryListView)
    expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true)
  })

  it('unchecked items render before checked items', () => {
    const wrapper = mount(GroceryListView)
    const items = wrapper.findAll('[data-testid="grocery-item"]')
    // First item should be Apples (unchecked), second Milk (checked)
    expect(items[0].text()).toContain('Apples')
    expect(items[1].text()).toContain('Milk')
  })

  it('renders add input and button', () => {
    const wrapper = mount(GroceryListView)
    expect(wrapper.find('[data-testid="global-add-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="global-add-btn"]').exists()).toBe(true)
  })

  it('calls addItem when form is submitted with a name', async () => {
    const wrapper = mount(GroceryListView)
    await wrapper.find('[data-testid="global-add-input"]').setValue('Bananas')
    await wrapper.find('form').trigger('submit')
    expect(mockState.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Bananas', household_id: 'hh-1' })
    )
  })

  it('clears input after successful add', async () => {
    const wrapper = mount(GroceryListView)
    await wrapper.find('[data-testid="global-add-input"]').setValue('Bananas')
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()
    expect((wrapper.find('[data-testid="global-add-input"]').element as HTMLInputElement).value).toBe('')
  })

  // ─── Grouping toggle ──────────────────────────────────────────────────────
  it('renders a grouping toggle button', () => {
    const wrapper = mount(GroceryListView)
    expect(wrapper.find('[data-testid="group-toggle-btn"]').exists()).toBe(true)
  })

  it('toggle button shows "By Store" label initially (switching to that mode)', () => {
    const wrapper = mount(GroceryListView)
    expect(wrapper.find('[data-testid="group-toggle-btn"]').text()).toContain('By Store')
  })

  it('clicking toggle switches to By Store mode (button shows "Default")', async () => {
    const wrapper = mount(GroceryListView)
    await wrapper.find('[data-testid="group-toggle-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="group-toggle-btn"]').text()).toContain('Default')
  })

  // ─── By Store mode ────────────────────────────────────────────────────────
  describe('By Store mode', () => {
    const storeItems = [
      { id: 'item-1', household_id: 'hh-1', section_id: 'sec-1', name: 'Apples', quantity: null, store: 'Whole Foods', is_checked: false, sort_order: 0, created_by: 'u1', created_at: '' },
      { id: 'item-2', household_id: 'hh-1', section_id: 'sec-1', name: 'Bananas', quantity: null, store: "Trader Joe's", is_checked: false, sort_order: 1, created_by: 'u1', created_at: '' },
      { id: 'item-3', household_id: 'hh-1', section_id: 'sec-1', name: 'Milk', quantity: null, store: null, is_checked: false, sort_order: 2, created_by: 'u1', created_at: '' },
    ]

    it('renders store group headers in By Store mode', async () => {
      mockState.items = storeItems as any
      const wrapper = mount(GroceryListView)
      await wrapper.find('[data-testid="group-toggle-btn"]').trigger('click')
      await wrapper.vm.$nextTick()
      const headers = wrapper.findAll('[data-testid="store-group-header"]')
      expect(headers.length).toBeGreaterThan(0)
    })

    it('groups are in alphabetical order by store name', async () => {
      mockState.items = storeItems as any
      const wrapper = mount(GroceryListView)
      await wrapper.find('[data-testid="group-toggle-btn"]').trigger('click')
      await wrapper.vm.$nextTick()
      const headers = wrapper.findAll('[data-testid="store-group-header"]')
      const texts = headers.map(h => h.text())
      expect(texts[0]).toContain("Trader Joe's")
      expect(texts[1]).toContain('Whole Foods')
    })

    it('"No store" group appears last', async () => {
      mockState.items = storeItems as any
      const wrapper = mount(GroceryListView)
      await wrapper.find('[data-testid="group-toggle-btn"]').trigger('click')
      await wrapper.vm.$nextTick()
      const headers = wrapper.findAll('[data-testid="store-group-header"]')
      expect(headers[headers.length - 1].text()).toContain('No store')
    })

    it('unchecked items render before checked items within each group', async () => {
      const mixed = [
        { id: 'i-a', household_id: 'hh-1', section_id: 'sec-1', name: 'Checked', quantity: null, store: 'Whole Foods', is_checked: true, sort_order: 0, created_by: 'u1', created_at: '' },
        { id: 'i-b', household_id: 'hh-1', section_id: 'sec-1', name: 'Unchecked', quantity: null, store: 'Whole Foods', is_checked: false, sort_order: 1, created_by: 'u1', created_at: '' },
      ]
      mockState.items = mixed as any
      const wrapper = mount(GroceryListView)
      await wrapper.find('[data-testid="group-toggle-btn"]').trigger('click')
      await wrapper.vm.$nextTick()
      const items = wrapper.findAll('[data-testid="grocery-item"]')
      expect(items[0].text()).toContain('Unchecked')
      expect(items[1].text()).toContain('Checked')
    })
  })
})
