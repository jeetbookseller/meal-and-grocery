import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Meal } from '@/types/database'

// ─── Stub child components ────────────────────────────────────────────────────
vi.mock('@/components/MealCard.vue', () => ({
  default: {
    name: 'MealCard',
    template: '<div class="meal-card-stub" />',
    props: ['meal'],
  },
}))

vi.mock('@/components/AddMealInline.vue', () => ({
  default: {
    name: 'AddMealInline',
    template: '<div class="add-meal-inline-stub" />',
    props: ['date'],
  },
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeMeal(id: string): Meal {
  return {
    id,
    household_id: 'hh-1',
    date: '2026-03-16',
    meal_type: 'dinner',
    title: `Meal ${id}`,
    notes: null,
    sort_order: 0,
    created_by: 'user-1',
    created_at: '',
    updated_at: '',
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('DayColumn', () => {
  it('renders the formatted date heading (weekday, month, day)', async () => {
    const { default: DayColumn } = await import('@/components/DayColumn.vue')
    const wrapper = mount(DayColumn, { props: { date: '2026-03-16', meals: [] } })
    const heading = wrapper.find('[data-testid="day-heading"]')
    expect(heading.exists()).toBe(true)
    // March 16, 2026 is a Monday
    expect(heading.text()).toMatch(/mon/i)
    expect(heading.text()).toMatch(/mar/i)
    expect(heading.text()).toContain('16')
  })

  it('renders one MealCard per meal', async () => {
    const { default: DayColumn } = await import('@/components/DayColumn.vue')
    const meals = [makeMeal('a'), makeMeal('b'), makeMeal('c')]
    const wrapper = mount(DayColumn, { props: { date: '2026-03-16', meals } })
    expect(wrapper.findAll('.meal-card-stub')).toHaveLength(3)
  })

  it('renders zero MealCards when meals array is empty', async () => {
    const { default: DayColumn } = await import('@/components/DayColumn.vue')
    const wrapper = mount(DayColumn, { props: { date: '2026-03-16', meals: [] } })
    expect(wrapper.findAll('.meal-card-stub')).toHaveLength(0)
  })

  it('always renders AddMealInline', async () => {
    const { default: DayColumn } = await import('@/components/DayColumn.vue')
    const wrapper = mount(DayColumn, { props: { date: '2026-03-16', meals: [] } })
    expect(wrapper.find('.add-meal-inline-stub').exists()).toBe(true)
  })

  it('passes the correct date prop to AddMealInline', async () => {
    const { default: DayColumn } = await import('@/components/DayColumn.vue')
    const wrapper = mount(DayColumn, { props: { date: '2026-03-20', meals: [] } })
    const addMeal = wrapper.findComponent({ name: 'AddMealInline' })
    expect(addMeal.props('date')).toBe('2026-03-20')
  })

  it('passes each meal as a prop to corresponding MealCard', async () => {
    const { default: DayColumn } = await import('@/components/DayColumn.vue')
    const meals = [makeMeal('x'), makeMeal('y')]
    const wrapper = mount(DayColumn, { props: { date: '2026-03-16', meals } })
    const cards = wrapper.findAllComponents({ name: 'MealCard' })
    expect(cards[0].props('meal').id).toBe('x')
    expect(cards[1].props('meal').id).toBe('y')
  })
})
