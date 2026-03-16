import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
const { mockSetRange, mockSubscribeRealtime, mockUnsubscribeRealtime } = vi.hoisted(() => ({
  mockSetRange: vi.fn(),
  mockSubscribeRealtime: vi.fn(),
  mockUnsubscribeRealtime: vi.fn(),
}))

vi.mock('@/stores/meals', () => ({
  useMealsStore: () => ({
    setRange: mockSetRange,
    subscribeRealtime: mockSubscribeRealtime,
    unsubscribeRealtime: mockUnsubscribeRealtime,
    // Pre-populated so the dateRange computed renders 7 day columns
    selectedRange: { start: '2026-03-16', end: '2026-03-22' },
    mealsByDate: {},
  }),
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
})
