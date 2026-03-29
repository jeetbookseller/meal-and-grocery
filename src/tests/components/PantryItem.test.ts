import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// --- Store mock ---
const mockToggleChecked = vi.fn()

vi.mock('@/stores/pantry', () => ({
  usePantryStore: vi.fn(() => ({
    toggleChecked: mockToggleChecked,
  })),
}))

import PantryItem from '@/components/PantryItem.vue'
import type { PantryItem as PantryItemType } from '@/types/database'

const baseItem: PantryItemType = {
  id: 'item-1',
  household_id: 'hh-1',
  name: 'Eggs',
  quantity: '12',
  is_checked: false,
  sort_order: 0,
  created_by: 'user-1',
  created_at: '2026-03-16T00:00:00Z',
}

describe('PantryItem.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders item name', () => {
    const wrapper = mount(PantryItem, { props: { item: baseItem } })
    expect(wrapper.text()).toContain('Eggs')
  })

  it('renders quantity when present', () => {
    const wrapper = mount(PantryItem, { props: { item: baseItem } })
    expect(wrapper.find('[data-testid="item-quantity"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('12')
  })

  it('does not render quantity when null', () => {
    const item = { ...baseItem, quantity: null }
    const wrapper = mount(PantryItem, { props: { item } })
    expect(wrapper.find('[data-testid="item-quantity"]').exists()).toBe(false)
  })

  it('checkbox is unchecked when item.is_checked is false', () => {
    const wrapper = mount(PantryItem, { props: { item: baseItem } })
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).checked).toBe(false)
  })

  it('checkbox is checked when item.is_checked is true', () => {
    const item = { ...baseItem, is_checked: true }
    const wrapper = mount(PantryItem, { props: { item } })
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).checked).toBe(true)
  })

  it('calls pantryStore.toggleChecked with item id when checkbox changes', async () => {
    const wrapper = mount(PantryItem, { props: { item: baseItem } })
    await wrapper.find('input[type="checkbox"]').trigger('change')
    expect(mockToggleChecked).toHaveBeenCalledWith('item-1')
  })

  it('renders meal link badges for linked meals', () => {
    const linkedMeals = [
      { id: 'meal-1', title: 'Pasta Night' },
      { id: 'meal-2', title: 'Taco Tuesday' },
    ]
    const wrapper = mount(PantryItem, { props: { item: baseItem, linkedMeals } })
    expect(wrapper.text()).toContain('Pasta Night')
    expect(wrapper.text()).toContain('Taco Tuesday')
  })

  it('renders no meal badges when linkedMeals is empty', () => {
    const wrapper = mount(PantryItem, { props: { item: baseItem, linkedMeals: [] } })
    expect(wrapper.findAll('[data-testid="meal-badge"]')).toHaveLength(0)
  })

  it('renders no meal badges when linkedMeals is undefined', () => {
    const wrapper = mount(PantryItem, { props: { item: baseItem } })
    expect(wrapper.findAll('[data-testid="meal-badge"]')).toHaveLength(0)
  })

  it('does not render a store label (no store field on pantry items)', () => {
    const wrapper = mount(PantryItem, { props: { item: baseItem } })
    expect(wrapper.find('[data-testid="item-store"]').exists()).toBe(false)
  })

  it('renders edit icon button', () => {
    const wrapper = mount(PantryItem, { props: { item: baseItem } })
    expect(wrapper.find('[data-testid="edit-item-btn"]').exists()).toBe(true)
  })

  it('emits edit event when edit button is clicked', async () => {
    const wrapper = mount(PantryItem, { props: { item: baseItem } })
    await wrapper.find('[data-testid="edit-item-btn"]').trigger('click')
    expect(wrapper.emitted('edit')).toBeTruthy()
    expect(wrapper.emitted('edit')![0]).toEqual([baseItem])
  })

  it('renders delete icon button', () => {
    const wrapper = mount(PantryItem, { props: { item: baseItem } })
    expect(wrapper.find('[data-testid="delete-item-btn"]').exists()).toBe(true)
  })

  it('emits delete event when delete button is clicked', async () => {
    const wrapper = mount(PantryItem, { props: { item: baseItem } })
    await wrapper.find('[data-testid="delete-item-btn"]').trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
    expect(wrapper.emitted('delete')![0]).toEqual([baseItem])
  })

  it('checked item name has line-through style', () => {
    const item = { ...baseItem, is_checked: true }
    const wrapper = mount(PantryItem, { props: { item } })
    const nameSpan = wrapper.find('[data-testid="item-name"]')
    expect(nameSpan.classes()).toContain('line-through')
  })

  it('unchecked item name does not have line-through style', () => {
    const wrapper = mount(PantryItem, { props: { item: baseItem } })
    const nameSpan = wrapper.find('[data-testid="item-name"]')
    expect(nameSpan.classes()).not.toContain('line-through')
  })

  // Touch targets
  it('checkbox is wrapped in a label with 44px touch target', () => {
    const wrapper = mount(PantryItem, { props: { item: baseItem } })
    const label = wrapper.find('label')
    expect(label.exists()).toBe(true)
    expect(label.classes()).toContain('min-w-[44px]')
    expect(label.classes()).toContain('min-h-[44px]')
  })

  it('edit button has 44px touch target', () => {
    const wrapper = mount(PantryItem, { props: { item: baseItem } })
    const btn = wrapper.find('[data-testid="edit-item-btn"]')
    expect(btn.classes()).toContain('min-w-[44px]')
    expect(btn.classes()).toContain('min-h-[44px]')
  })

  it('delete button has 44px touch target', () => {
    const wrapper = mount(PantryItem, { props: { item: baseItem } })
    const btn = wrapper.find('[data-testid="delete-item-btn"]')
    expect(btn.classes()).toContain('min-w-[44px]')
    expect(btn.classes()).toContain('min-h-[44px]')
  })
})
