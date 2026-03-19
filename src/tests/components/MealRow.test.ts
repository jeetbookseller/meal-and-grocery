import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import type { Meal } from '@/types/database'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
const { mockToggleChecked, mockDeleteMeal, mockMealsStore } = vi.hoisted(() => {
  const mockToggleChecked = vi.fn()
  const mockDeleteMeal = vi.fn()
  const mockMealsStore = vi.fn()
  return { mockToggleChecked, mockDeleteMeal, mockMealsStore }
})

vi.mock('@/stores/meals', () => ({
  useMealsStore: mockMealsStore,
}))

vi.mock('@/components/MealEditModal.vue', () => ({
  default: { template: '<div class="meal-edit-modal-stub" />', props: ['meal'] },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const baseMeal: Meal = {
  id: 'meal-1',
  household_id: 'hh-1',
  date: '',
  meal_type: null,
  title: 'Pasta Night',
  notes: null,
  sort_order: 0,
  is_checked: false,
  created_by: 'user-1',
  created_at: '',
  updated_at: '',
}

// ─── Setup ────────────────────────────────────────────────────────────────────
beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  mockMealsStore.mockReturnValue({
    toggleChecked: mockToggleChecked,
    deleteMeal: mockDeleteMeal,
  })
})

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('MealRow', () => {
  const mountRow = (props: object = {}) => {
    // dynamic import to isolate module cache
    return import('@/components/MealRow.vue').then(({ default: MealRow }) =>
      mount(MealRow, { props: { meal: baseMeal, ...props } })
    )
  }

  it('renders the meal title', async () => {
    const wrapper = await mountRow()
    expect(wrapper.text()).toContain('Pasta Night')
  })

  it('renders data-testid meal-row', async () => {
    const wrapper = await mountRow()
    expect(wrapper.find('[data-testid="meal-row"]').exists()).toBe(true)
  })

  it('unchecked meal: checkbox is not checked', async () => {
    const wrapper = await mountRow()
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).checked).toBe(false)
  })

  it('unchecked meal: title has no strikethrough class', async () => {
    const wrapper = await mountRow()
    const title = wrapper.find('[data-testid="meal-title"]')
    expect(title.classes()).not.toContain('line-through')
  })

  it('checked meal: checkbox is checked', async () => {
    const wrapper = await mountRow({ meal: { ...baseMeal, is_checked: true } })
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).checked).toBe(true)
  })

  it('checked meal: title has line-through class', async () => {
    const wrapper = await mountRow({ meal: { ...baseMeal, is_checked: true } })
    const title = wrapper.find('[data-testid="meal-title"]')
    expect(title.classes()).toContain('line-through')
  })

  it('clicking checkbox calls mealsStore.toggleChecked with meal id', async () => {
    const wrapper = await mountRow()
    await wrapper.find('input[type="checkbox"]').trigger('change')
    expect(mockToggleChecked).toHaveBeenCalledWith('meal-1')
  })

  it('edit button has 44px touch target classes', async () => {
    const wrapper = await mountRow()
    const editBtn = wrapper.find('[data-testid="edit-btn"]')
    expect(editBtn.classes()).toContain('min-w-[44px]')
    expect(editBtn.classes()).toContain('min-h-[44px]')
  })

  it('delete button has 44px touch target classes', async () => {
    const wrapper = await mountRow()
    const deleteBtn = wrapper.find('[data-testid="delete-btn"]')
    expect(deleteBtn.classes()).toContain('min-w-[44px]')
    expect(deleteBtn.classes()).toContain('min-h-[44px]')
  })

  it('clicking edit button shows MealEditModal', async () => {
    const wrapper = await mountRow()
    expect(wrapper.find('.meal-edit-modal-stub').exists()).toBe(false)
    await wrapper.find('[data-testid="edit-btn"]').trigger('click')
    expect(wrapper.find('.meal-edit-modal-stub').exists()).toBe(true)
  })

  it('MealEditModal closes when close event emitted', async () => {
    const wrapper = await mountRow()
    await wrapper.find('[data-testid="edit-btn"]').trigger('click')
    expect(wrapper.find('.meal-edit-modal-stub').exists()).toBe(true)
    wrapper.findComponent({ name: 'MealEditModal' }).vm.$emit('close')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.meal-edit-modal-stub').exists()).toBe(false)
  })

  it('calls mealsStore.deleteMeal when delete is confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = await mountRow()
    await wrapper.find('[data-testid="delete-btn"]').trigger('click')
    expect(mockDeleteMeal).toHaveBeenCalledWith('meal-1')
  })

  it('does not call deleteMeal when delete is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const wrapper = await mountRow()
    await wrapper.find('[data-testid="delete-btn"]').trigger('click')
    expect(mockDeleteMeal).not.toHaveBeenCalled()
  })

  it('shows linked grocery count badge when linkedGroceryCount > 0', async () => {
    const wrapper = await mountRow({ linkedGroceryCount: 3 })
    const badge = wrapper.find('[data-testid="linked-count-badge"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('3')
  })

  it('does not show linked count badge when linkedGroceryCount is 0', async () => {
    const wrapper = await mountRow({ linkedGroceryCount: 0 })
    expect(wrapper.find('[data-testid="linked-count-badge"]').exists()).toBe(false)
  })

  it('does not show linked count badge when prop is omitted', async () => {
    const wrapper = await mountRow()
    expect(wrapper.find('[data-testid="linked-count-badge"]').exists()).toBe(false)
  })
})
