import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
const { mockSetRange, mockSubscribeRealtime, mockUnsubscribeRealtime, mockStoreState } = vi.hoisted(() => {
  const mockStoreState = {
    setRange: vi.fn(),
    subscribeRealtime: vi.fn(),
    unsubscribeRealtime: vi.fn(),
    selectedRange: { start: '2026-03-16', end: '2026-03-22' },
    mealsByDate: {},
    loading: false,
    error: null as string | null,
  }
  return {
    mockSetRange: mockStoreState.setRange,
    mockSubscribeRealtime: mockStoreState.subscribeRealtime,
    mockUnsubscribeRealtime: mockStoreState.unsubscribeRealtime,
    mockStoreState,
  }
})

vi.mock('@/stores/meals', () => ({
  useMealsStore: () => mockStoreState,
}))

// Stub child components — implemented in TASK-07/08 respectively
vi.mock('@/components/TimelineSelector.vue', () => ({
  default: { template: '<div class="timeline-selector-stub" />' },
}))

vi.mock('@/components/DayColumn.vue', () => ({
  default: {
    props: ['date', 'meals'],
    template: '<div class="day-column-stub" :data-date="date" />',
  },
}))

import MealPlanView from '@/views/MealPlanView.vue'

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('MealPlanView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockSetRange.mockReset()
    mockSubscribeRealtime.mockReset()
    mockUnsubscribeRealtime.mockReset()
    mockStoreState.loading = false
    mockStoreState.error = null
    mockStoreState.selectedRange = { start: '2026-03-16', end: '2026-03-22' }
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-16T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls setRange with this week Mon–Sun on mount', () => {
    mount(MealPlanView)
    expect(mockSetRange).toHaveBeenCalledWith('2026-03-16', '2026-03-22')
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

  it('renders a DayColumn for each date in the selected range', () => {
    const wrapper = mount(MealPlanView)
    expect(wrapper.findAll('.day-column-stub').length).toBe(7)
  })

  it('passes the correct date prop to each DayColumn', () => {
    const wrapper = mount(MealPlanView)
    const columns = wrapper.findAll('.day-column-stub')
    expect(columns[0].attributes('data-date')).toBe('2026-03-16')
    expect(columns[6].attributes('data-date')).toBe('2026-03-22')
  })

  it('renders the TimelineSelector component', () => {
    const wrapper = mount(MealPlanView)
    expect(wrapper.find('.timeline-selector-stub').exists()).toBe(true)
  })

  it('shows loading spinner when loading', () => {
    mockStoreState.loading = true
    const wrapper = mount(MealPlanView)
    expect(wrapper.find('[data-testid="base-spinner"]').exists()).toBe(true)
  })

  it('hides day columns when loading', () => {
    mockStoreState.loading = true
    const wrapper = mount(MealPlanView)
    expect(wrapper.find('.day-column-stub').exists()).toBe(false)
  })

  it('shows error banner when error is set', () => {
    mockStoreState.error = 'Failed to fetch meals'
    const wrapper = mount(MealPlanView)
    expect(wrapper.find('[data-testid="base-error-banner"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Failed to fetch meals')
  })

  it('hides day columns when error is set', () => {
    mockStoreState.error = 'Some error'
    const wrapper = mount(MealPlanView)
    expect(wrapper.find('.day-column-stub').exists()).toBe(false)
  })
})
