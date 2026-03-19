import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
const mockUpdateItem = vi.fn()
const mockDeleteItem = vi.fn()
const mockLinkItemToMeals = vi.fn()

vi.mock('@/stores/grocery', () => ({
  useGroceryStore: vi.fn(() => ({
    updateItem: mockUpdateItem,
    deleteItem: mockDeleteItem,
    linkItemToMeals: mockLinkItemToMeals,
  })),
}))

vi.mock('@/stores/meals', () => ({
  useMealsStore: vi.fn(() => ({
    meals: [],
  })),
}))

import GroceryItemEditModal from '@/components/grocery/GroceryItemEditModal.vue'
import type { GroceryItem } from '@/types/database'

// ─── Fixtures ─────────────────────────────────────────────────────────────────
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

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('GroceryItemEditModal.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders the modal', () => {
    const wrapper = mount(GroceryItemEditModal, { props: { item: mockItem } })
    expect(wrapper.exists()).toBe(true)
  })

  it('pre-fills name input with item name', () => {
    const wrapper = mount(GroceryItemEditModal, { props: { item: mockItem } })
    const input = wrapper.find('[data-testid="edit-name-input"]')
    expect((input.element as HTMLInputElement).value).toBe('Apples')
  })

  it('pre-fills quantity input with item quantity', () => {
    const wrapper = mount(GroceryItemEditModal, { props: { item: mockItem } })
    const input = wrapper.find('[data-testid="edit-quantity-input"]')
    expect((input.element as HTMLInputElement).value).toBe('6')
  })

  it('does NOT render section dropdown', () => {
    const wrapper = mount(GroceryItemEditModal, { props: { item: mockItem } })
    expect(wrapper.find('[data-testid="edit-section-select"]').exists()).toBe(false)
  })

  it('renders link meals button', () => {
    const wrapper = mount(GroceryItemEditModal, { props: { item: mockItem } })
    expect(wrapper.find('[data-testid="link-meals-btn"]').exists()).toBe(true)
  })

  it('calls groceryStore.updateItem on form submit', async () => {
    mockUpdateItem.mockResolvedValue(undefined)
    mockLinkItemToMeals.mockResolvedValue(undefined)
    const wrapper = mount(GroceryItemEditModal, { props: { item: mockItem } })
    await wrapper.find('form').trigger('submit')
    expect(mockUpdateItem).toHaveBeenCalledWith('item-1', expect.objectContaining({ name: 'Apples' }))
  })

  it('calls groceryStore.linkItemToMeals on save', async () => {
    mockUpdateItem.mockResolvedValue(undefined)
    mockLinkItemToMeals.mockResolvedValue(undefined)
    const wrapper = mount(GroceryItemEditModal, { props: { item: mockItem, linkedMealIds: ['meal-1'] } })
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()
    expect(mockLinkItemToMeals).toHaveBeenCalledWith('item-1', ['meal-1'])
  })

  it('emits close after successful save', async () => {
    mockUpdateItem.mockResolvedValue(undefined)
    mockLinkItemToMeals.mockResolvedValue(undefined)
    const wrapper = mount(GroceryItemEditModal, { props: { item: mockItem } })
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('calls groceryStore.deleteItem when delete button is clicked', async () => {
    mockDeleteItem.mockResolvedValue(undefined)
    const wrapper = mount(GroceryItemEditModal, { props: { item: mockItem } })
    await wrapper.find('[data-testid="delete-item-btn"]').trigger('click')
    expect(mockDeleteItem).toHaveBeenCalledWith('item-1')
  })

  it('emits close after successful delete', async () => {
    mockDeleteItem.mockResolvedValue(undefined)
    const wrapper = mount(GroceryItemEditModal, { props: { item: mockItem } })
    await wrapper.find('[data-testid="delete-item-btn"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emits close when backdrop is clicked', async () => {
    const wrapper = mount(GroceryItemEditModal, { props: { item: mockItem } })
    await wrapper.find('.fixed.inset-0').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  // ─── Design system classes ─────────────────────────────────────────────────
  it('save button has btn-primary class', () => {
    const wrapper = mount(GroceryItemEditModal, { props: { item: mockItem } })
    expect(wrapper.find('[data-testid="save-item-btn"]').classes()).toContain('btn-primary')
  })

  it('overlay has backdrop-blur-sm class', () => {
    const wrapper = mount(GroceryItemEditModal, { props: { item: mockItem } })
    expect(wrapper.find('.fixed.inset-0').classes()).toContain('backdrop-blur-sm')
  })

  it('inner panel has modal-panel class', () => {
    const wrapper = mount(GroceryItemEditModal, { props: { item: mockItem } })
    expect(wrapper.find('.modal-panel').exists()).toBe(true)
  })

  // ─── Touch targets ─────────────────────────────────────────────────────────
  it('delete button has min-h-[44px] touch target', () => {
    const wrapper = mount(GroceryItemEditModal, { props: { item: mockItem } })
    expect(wrapper.find('[data-testid="delete-item-btn"]').classes()).toContain('min-h-[44px]')
  })

  it('save button has min-h-[44px] touch target', () => {
    const wrapper = mount(GroceryItemEditModal, { props: { item: mockItem } })
    expect(wrapper.find('[data-testid="save-item-btn"]').classes()).toContain('min-h-[44px]')
  })
})
