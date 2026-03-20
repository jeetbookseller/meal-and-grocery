import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// --- Store mock ---
const mockToggleChecked = vi.fn()

vi.mock('@/stores/grocery', () => ({
  useGroceryStore: vi.fn(() => ({
    toggleChecked: mockToggleChecked,
  })),
}))

import GroceryItem from '@/components/GroceryItem.vue'
import type { GroceryItem as GroceryItemType } from '@/types/database'

const baseItem: GroceryItemType = {
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
}

describe('GroceryItem.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders item name', () => {
    const wrapper = mount(GroceryItem, { props: { item: baseItem } })
    expect(wrapper.text()).toContain('Apples')
  })

  it('renders quantity when present', () => {
    const wrapper = mount(GroceryItem, { props: { item: baseItem } })
    expect(wrapper.text()).toContain('6')
  })

  it('does not render quantity when null', () => {
    const item = { ...baseItem, quantity: null }
    const wrapper = mount(GroceryItem, { props: { item } })
    expect(wrapper.find('[data-testid="item-quantity"]').exists()).toBe(false)
  })

  it('checkbox is unchecked when item.is_checked is false', () => {
    const wrapper = mount(GroceryItem, { props: { item: baseItem } })
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).checked).toBe(false)
  })

  it('checkbox is checked when item.is_checked is true', () => {
    const item = { ...baseItem, is_checked: true }
    const wrapper = mount(GroceryItem, { props: { item } })
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).checked).toBe(true)
  })

  it('calls groceryStore.toggleChecked with item id when checkbox changes', async () => {
    const wrapper = mount(GroceryItem, { props: { item: baseItem } })
    await wrapper.find('input[type="checkbox"]').trigger('change')
    expect(mockToggleChecked).toHaveBeenCalledWith('item-1')
  })

  it('renders meal link badges for linked meals', () => {
    const linkedMeals = [
      { id: 'meal-1', title: 'Pasta Night' },
      { id: 'meal-2', title: 'Taco Tuesday' },
    ]
    const wrapper = mount(GroceryItem, { props: { item: baseItem, linkedMeals } })
    expect(wrapper.text()).toContain('Pasta Night')
    expect(wrapper.text()).toContain('Taco Tuesday')
  })

  it('renders no meal badges when linkedMeals is empty', () => {
    const wrapper = mount(GroceryItem, { props: { item: baseItem, linkedMeals: [] } })
    expect(wrapper.findAll('[data-testid="meal-badge"]')).toHaveLength(0)
  })

  it('renders edit icon button', () => {
    const wrapper = mount(GroceryItem, { props: { item: baseItem } })
    expect(wrapper.find('[data-testid="edit-item-btn"]').exists()).toBe(true)
  })

  it('emits edit event when edit button is clicked', async () => {
    const wrapper = mount(GroceryItem, { props: { item: baseItem } })
    await wrapper.find('[data-testid="edit-item-btn"]').trigger('click')
    expect(wrapper.emitted('edit')).toBeTruthy()
  })

  // ─── Delete button ───────────────────────────────────────────────────────────
  it('renders delete icon button', () => {
    const wrapper = mount(GroceryItem, { props: { item: baseItem } })
    expect(wrapper.find('[data-testid="delete-item-btn"]').exists()).toBe(true)
  })

  it('emits delete event when delete button is clicked', async () => {
    const wrapper = mount(GroceryItem, { props: { item: baseItem } })
    await wrapper.find('[data-testid="delete-item-btn"]').trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
    expect(wrapper.emitted('delete')![0]).toEqual([baseItem])
  })

  it('delete button has min-h-[44px] touch target', () => {
    const wrapper = mount(GroceryItem, { props: { item: baseItem } })
    expect(wrapper.find('[data-testid="delete-item-btn"]').classes()).toContain('min-h-[44px]')
  })

  it('delete button has min-w-[44px] touch target', () => {
    const wrapper = mount(GroceryItem, { props: { item: baseItem } })
    expect(wrapper.find('[data-testid="delete-item-btn"]').classes()).toContain('min-w-[44px]')
  })

  // ─── Mobile responsiveness: touch targets ───────────────────────────────────
  it('checkbox is wrapped in a label with 44px touch target', () => {
    const wrapper = mount(GroceryItem, { props: { item: baseItem } })
    const label = wrapper.find('label')
    expect(label.exists()).toBe(true)
    expect(label.classes()).toContain('min-w-[44px]')
    expect(label.classes()).toContain('min-h-[44px]')
  })

  it('checkbox is inside the label element', () => {
    const wrapper = mount(GroceryItem, { props: { item: baseItem } })
    const label = wrapper.find('label')
    expect(label.find('input[type="checkbox"]').exists()).toBe(true)
  })

  // ─── Store label ─────────────────────────────────────────────────────────────
  it('shows store name as muted label when item has a store and hideStore is false', () => {
    const item = { ...baseItem, store: "Trader Joe's" }
    const wrapper = mount(GroceryItem, { props: { item } })
    expect(wrapper.find('[data-testid="item-store"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="item-store"]').text()).toContain("Trader Joe's")
  })

  it('does not show store label when item.store is null', () => {
    const wrapper = mount(GroceryItem, { props: { item: { ...baseItem, store: null } } })
    expect(wrapper.find('[data-testid="item-store"]').exists()).toBe(false)
  })

  it('hides store label when hideStore prop is true', () => {
    const item = { ...baseItem, store: "Trader Joe's" }
    const wrapper = mount(GroceryItem, { props: { item, hideStore: true } })
    expect(wrapper.find('[data-testid="item-store"]').exists()).toBe(false)
  })
})
