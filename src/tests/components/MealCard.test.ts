import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Meal } from '@/types/database'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
const mockDeleteMeal = vi.fn()

vi.mock('@/stores/meals', () => ({
  useMealsStore: () => ({ deleteMeal: mockDeleteMeal }),
}))

vi.mock('@/components/MealEditModal.vue', () => ({
  default: { template: '<div class="meal-edit-modal-stub" />', props: ['meal'] },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const baseMeal: Meal = {
  id: 'meal-1',
  household_id: 'hh-1',
  date: '2026-03-16',
  meal_type: 'dinner',
  title: 'Pasta',
  notes: 'Boil water first',
  sort_order: 0,
  created_by: 'user-1',
  created_at: '',
  updated_at: '',
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('MealCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the meal title', async () => {
    const { default: MealCard } = await import('@/components/MealCard.vue')
    const wrapper = mount(MealCard, { props: { meal: baseMeal } })
    expect(wrapper.text()).toContain('Pasta')
  })

  it('renders a dinner badge with blue styling', async () => {
    const { default: MealCard } = await import('@/components/MealCard.vue')
    const wrapper = mount(MealCard, { props: { meal: baseMeal } })
    const badge = wrapper.find('[data-testid="meal-type-badge"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text().toLowerCase()).toBe('dinner')
    expect(badge.classes().join(' ')).toMatch(/blue/)
  })

  it('renders a breakfast badge with yellow styling', async () => {
    const { default: MealCard } = await import('@/components/MealCard.vue')
    const wrapper = mount(MealCard, { props: { meal: { ...baseMeal, meal_type: 'breakfast' } } })
    const badge = wrapper.find('[data-testid="meal-type-badge"]')
    expect(badge.exists()).toBe(true)
    expect(badge.classes().join(' ')).toMatch(/yellow/)
  })

  it('renders a lunch badge with green styling', async () => {
    const { default: MealCard } = await import('@/components/MealCard.vue')
    const wrapper = mount(MealCard, { props: { meal: { ...baseMeal, meal_type: 'lunch' } } })
    const badge = wrapper.find('[data-testid="meal-type-badge"]')
    expect(badge.exists()).toBe(true)
    expect(badge.classes().join(' ')).toMatch(/green/)
  })

  it('does not render badge when meal_type is null', async () => {
    const { default: MealCard } = await import('@/components/MealCard.vue')
    const wrapper = mount(MealCard, { props: { meal: { ...baseMeal, meal_type: null } } })
    expect(wrapper.find('[data-testid="meal-type-badge"]').exists()).toBe(false)
  })

  it('hides notes by default', async () => {
    const { default: MealCard } = await import('@/components/MealCard.vue')
    const wrapper = mount(MealCard, { props: { meal: baseMeal } })
    expect(wrapper.find('[data-testid="meal-notes"]').exists()).toBe(false)
  })

  it('shows notes after clicking toggle button', async () => {
    const { default: MealCard } = await import('@/components/MealCard.vue')
    const wrapper = mount(MealCard, { props: { meal: baseMeal } })
    await wrapper.find('[data-testid="notes-toggle"]').trigger('click')
    const notes = wrapper.find('[data-testid="meal-notes"]')
    expect(notes.exists()).toBe(true)
    expect(notes.text()).toContain('Boil water first')
  })

  it('hides notes again on second toggle click', async () => {
    const { default: MealCard } = await import('@/components/MealCard.vue')
    const wrapper = mount(MealCard, { props: { meal: baseMeal } })
    await wrapper.find('[data-testid="notes-toggle"]').trigger('click')
    await wrapper.find('[data-testid="notes-toggle"]').trigger('click')
    expect(wrapper.find('[data-testid="meal-notes"]').exists()).toBe(false)
  })

  it('does not render notes toggle when notes is null', async () => {
    const { default: MealCard } = await import('@/components/MealCard.vue')
    const wrapper = mount(MealCard, { props: { meal: { ...baseMeal, notes: null } } })
    expect(wrapper.find('[data-testid="notes-toggle"]').exists()).toBe(false)
  })

  it('calls mealsStore.deleteMeal when delete is confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { default: MealCard } = await import('@/components/MealCard.vue')
    const wrapper = mount(MealCard, { props: { meal: baseMeal } })
    await wrapper.find('[data-testid="delete-btn"]').trigger('click')
    expect(mockDeleteMeal).toHaveBeenCalledWith('meal-1')
  })

  it('does not call deleteMeal when delete is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { default: MealCard } = await import('@/components/MealCard.vue')
    const wrapper = mount(MealCard, { props: { meal: baseMeal } })
    await wrapper.find('[data-testid="delete-btn"]').trigger('click')
    expect(mockDeleteMeal).not.toHaveBeenCalled()
  })

  it('shows MealEditModal after clicking edit button', async () => {
    const { default: MealCard } = await import('@/components/MealCard.vue')
    const wrapper = mount(MealCard, { props: { meal: baseMeal } })
    expect(wrapper.find('[data-testid="edit-modal"]').exists()).toBe(false)
    await wrapper.find('[data-testid="edit-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="edit-modal"]').exists()).toBe(true)
  })

  it('closes MealEditModal when close event is emitted', async () => {
    const { default: MealCard } = await import('@/components/MealCard.vue')
    const wrapper = mount(MealCard, { props: { meal: baseMeal } })
    await wrapper.find('[data-testid="edit-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="edit-modal"]').exists()).toBe(true)
    // Simulate close event from modal stub via the wrapper div
    wrapper.findComponent({ name: 'MealEditModal' }).vm.$emit('close')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="edit-modal"]').exists()).toBe(false)
  })

  // ─── Mobile responsiveness: touch targets ───────────────────────────────────
  it('edit button meets 44px touch target (min-w-[44px] and min-h-[44px])', async () => {
    const { default: MealCard } = await import('@/components/MealCard.vue')
    const wrapper = mount(MealCard, { props: { meal: baseMeal } })
    const editBtn = wrapper.find('[data-testid="edit-btn"]')
    expect(editBtn.classes()).toContain('min-w-[44px]')
    expect(editBtn.classes()).toContain('min-h-[44px]')
  })

  it('delete button meets 44px touch target (min-w-[44px] and min-h-[44px])', async () => {
    const { default: MealCard } = await import('@/components/MealCard.vue')
    const wrapper = mount(MealCard, { props: { meal: baseMeal } })
    const deleteBtn = wrapper.find('[data-testid="delete-btn"]')
    expect(deleteBtn.classes()).toContain('min-w-[44px]')
    expect(deleteBtn.classes()).toContain('min-h-[44px]')
  })
})
