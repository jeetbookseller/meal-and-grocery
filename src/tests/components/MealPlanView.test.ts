import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { Meal } from '@/types/database'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
const {
  mockFetchMeals,
  mockSubscribeRealtime,
  mockUnsubscribeRealtime,
  mockAddMeal,
  mockClearChecked,
  mockStoreState,
} = vi.hoisted(() => {
  const mockFetchMeals = vi.fn()
  const mockSubscribeRealtime = vi.fn()
  const mockUnsubscribeRealtime = vi.fn()
  const mockAddMeal = vi.fn()
  const mockClearChecked = vi.fn()
  const mockStoreState = {
    meals: [] as Meal[],
    loading: false,
    error: null as string | null,
    fetchMeals: mockFetchMeals,
    subscribeRealtime: mockSubscribeRealtime,
    unsubscribeRealtime: mockUnsubscribeRealtime,
    addMeal: mockAddMeal,
    clearChecked: mockClearChecked,
  }
  return {
    mockFetchMeals,
    mockSubscribeRealtime,
    mockUnsubscribeRealtime,
    mockAddMeal,
    mockClearChecked,
    mockStoreState,
  }
})

vi.mock('@/stores/meals', () => ({
  useMealsStore: () => mockStoreState,
}))

vi.mock('@/stores/household', () => ({
  useHouseholdStore: () => ({ householdId: 'hh-1' }),
}))

// Stub child components
vi.mock('@/components/MealRow.vue', () => ({
  default: {
    props: ['meal', 'linkedGroceryCount'],
    template: '<div class="meal-row-stub" :data-meal-id="meal.id" :data-checked="meal.is_checked" />',
  },
}))

vi.mock('@/components/ClearCheckedButton.vue', () => ({
  default: {
    emits: ['clear'],
    template: '<button class="clear-checked-stub" data-testid="clear-checked-btn" @click="$emit(\'clear\')" />',
  },
}))

import MealPlanView from '@/views/MealPlanView.vue'

// ─── Fixtures ─────────────────────────────────────────────────────────────────
function makeMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: 'meal-1',
    household_id: 'hh-1',
    date: '',
    meal_type: null,
    title: 'Pasta',
    notes: null,
    sort_order: 0,
    is_checked: false,
    created_by: 'user-1',
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('MealPlanView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockStoreState.meals = []
    mockStoreState.loading = false
    mockStoreState.error = null
    mockAddMeal.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls fetchMeals on mount', () => {
    mount(MealPlanView)
    expect(mockFetchMeals).toHaveBeenCalledOnce()
  })

  it('calls subscribeRealtime on mount', () => {
    mount(MealPlanView)
    expect(mockSubscribeRealtime).toHaveBeenCalledOnce()
  })

  it('calls unsubscribeRealtime on unmount', () => {
    const wrapper = mount(MealPlanView)
    wrapper.unmount()
    expect(mockUnsubscribeRealtime).toHaveBeenCalledOnce()
  })

  it('shows loading spinner when loading', () => {
    mockStoreState.loading = true
    const wrapper = mount(MealPlanView)
    expect(wrapper.find('[data-testid="base-spinner"]').exists()).toBe(true)
  })

  it('shows error banner when error is set', () => {
    mockStoreState.error = 'Failed to fetch'
    const wrapper = mount(MealPlanView)
    expect(wrapper.find('[data-testid="base-error-banner"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Failed to fetch')
  })

  it('shows empty state when meals is empty', () => {
    mockStoreState.meals = []
    const wrapper = mount(MealPlanView)
    expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true)
  })

  it('renders a MealRow for each meal', () => {
    mockStoreState.meals = [makeMeal({ id: 'meal-1' }), makeMeal({ id: 'meal-2' })]
    const wrapper = mount(MealPlanView)
    expect(wrapper.findAll('.meal-row-stub').length).toBe(2)
  })

  it('renders unchecked meals before checked meals', () => {
    mockStoreState.meals = [
      makeMeal({ id: 'checked-1', is_checked: true, sort_order: 0 }),
      makeMeal({ id: 'unchecked-1', is_checked: false, sort_order: 1 }),
    ]
    const wrapper = mount(MealPlanView)
    const rows = wrapper.findAll('.meal-row-stub')
    expect(rows[0].attributes('data-meal-id')).toBe('unchecked-1')
    expect(rows[1].attributes('data-meal-id')).toBe('checked-1')
  })

  it('renders an add-meal input', () => {
    const wrapper = mount(MealPlanView)
    expect(wrapper.find('[data-testid="add-meal-input"]').exists()).toBe(true)
  })

  it('renders an Add button', () => {
    const wrapper = mount(MealPlanView)
    expect(wrapper.find('[data-testid="add-meal-btn"]').exists()).toBe(true)
  })

  it('Add button is disabled when input is empty', () => {
    const wrapper = mount(MealPlanView)
    const btn = wrapper.find('[data-testid="add-meal-btn"]')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('submitting form calls mealsStore.addMeal with the title', async () => {
    const wrapper = mount(MealPlanView)
    await wrapper.find('[data-testid="add-meal-input"]').setValue('Tacos')
    await wrapper.find('form').trigger('submit')
    expect(mockAddMeal).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Tacos', household_id: 'hh-1' })
    )
  })

  it('clears input after successful add', async () => {
    const wrapper = mount(MealPlanView)
    const input = wrapper.find('[data-testid="add-meal-input"]')
    await input.setValue('Tacos')
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()
    expect((input.element as HTMLInputElement).value).toBe('')
  })

  it('renders ClearCheckedButton', () => {
    const wrapper = mount(MealPlanView)
    expect(wrapper.find('.clear-checked-stub').exists()).toBe(true)
  })

  it('ClearCheckedButton calls mealsStore.clearChecked when clear event fires', async () => {
    const wrapper = mount(MealPlanView)
    await wrapper.find('.clear-checked-stub').trigger('click')
    expect(mockClearChecked).toHaveBeenCalledOnce()
  })
})
