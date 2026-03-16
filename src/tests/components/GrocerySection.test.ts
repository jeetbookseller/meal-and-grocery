import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// --- Store mock ---
const mockRenameSection = vi.fn()
const mockDeleteSection = vi.fn()

vi.mock('@/stores/grocery', () => ({
  useGroceryStore: vi.fn(() => ({
    renameSection: mockRenameSection,
    deleteSection: mockDeleteSection,
    toggleChecked: vi.fn(),
  })),
}))

import GrocerySection from '@/components/GrocerySection.vue'
import type { GrocerySection as GrocerySectionType, GroceryItem } from '@/types/database'

const mockSection: GrocerySectionType = {
  id: 'sec-1',
  household_id: 'hh-1',
  name: 'Produce',
  sort_order: 0,
  is_default: true,
}

const mockItem: GroceryItem = {
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

describe('GrocerySection.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders section name', () => {
    const wrapper = mount(GrocerySection, {
      props: { section: mockSection, items: [] },
    })
    expect(wrapper.text()).toContain('Produce')
  })

  it('shows correct item count badge', () => {
    const wrapper = mount(GrocerySection, {
      props: { section: mockSection, items: [mockItem] },
    })
    expect(wrapper.find('[data-testid="item-count"]').text()).toBe('1')
  })

  it('shows 0 in item count badge when no items', () => {
    const wrapper = mount(GrocerySection, {
      props: { section: mockSection, items: [] },
    })
    expect(wrapper.find('[data-testid="item-count"]').text()).toBe('0')
  })

  it('body is visible by default (expanded)', () => {
    const wrapper = mount(GrocerySection, {
      props: { section: mockSection, items: [mockItem] },
    })
    expect(wrapper.find('[data-testid="section-body"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="section-body"]').isVisible()).toBe(true)
  })

  it('clicking chevron toggles collapse', async () => {
    const wrapper = mount(GrocerySection, {
      props: { section: mockSection, items: [mockItem] },
    })
    await wrapper.find('[data-testid="toggle-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="section-body"]').isVisible()).toBe(false)
  })

  it('clicking chevron again re-expands', async () => {
    const wrapper = mount(GrocerySection, {
      props: { section: mockSection, items: [mockItem] },
    })
    await wrapper.find('[data-testid="toggle-btn"]').trigger('click')
    await wrapper.find('[data-testid="toggle-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="section-body"]').isVisible()).toBe(true)
  })

  it('rename button is visible', () => {
    const wrapper = mount(GrocerySection, {
      props: { section: mockSection, items: [] },
    })
    expect(wrapper.find('[data-testid="rename-btn"]').exists()).toBe(true)
  })

  it('delete button is visible when section has 0 items', () => {
    const wrapper = mount(GrocerySection, {
      props: { section: mockSection, items: [] },
    })
    expect(wrapper.find('[data-testid="delete-btn"]').exists()).toBe(true)
  })

  it('delete button is hidden when section has items', () => {
    const wrapper = mount(GrocerySection, {
      props: { section: mockSection, items: [mockItem] },
    })
    expect(wrapper.find('[data-testid="delete-btn"]').exists()).toBe(false)
  })

  it('clicking rename button shows rename input', async () => {
    const wrapper = mount(GrocerySection, {
      props: { section: mockSection, items: [] },
    })
    await wrapper.find('[data-testid="rename-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="rename-input"]').exists()).toBe(true)
  })

  it('submitting rename calls renameSection and hides input', async () => {
    const wrapper = mount(GrocerySection, {
      props: { section: mockSection, items: [] },
    })
    await wrapper.find('[data-testid="rename-btn"]').trigger('click')
    const input = wrapper.find('[data-testid="rename-input"]')
    await input.setValue('Vegetables')
    await wrapper.find('[data-testid="rename-form"]').trigger('submit')
    expect(mockRenameSection).toHaveBeenCalledWith('sec-1', 'Vegetables')
    expect(wrapper.find('[data-testid="rename-input"]').exists()).toBe(false)
  })

  it('clicking delete calls deleteSection', async () => {
    const wrapper = mount(GrocerySection, {
      props: { section: mockSection, items: [] },
    })
    await wrapper.find('[data-testid="delete-btn"]').trigger('click')
    expect(mockDeleteSection).toHaveBeenCalledWith('sec-1')
  })

  it('renders a GroceryItem for each item', () => {
    const items = [mockItem, { ...mockItem, id: 'item-2', name: 'Bananas' }]
    const wrapper = mount(GrocerySection, {
      props: { section: mockSection, items },
    })
    const renderedItems = wrapper.findAll('[data-testid="grocery-item"]')
    expect(renderedItems).toHaveLength(2)
  })
})
