import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
const { mockSetRange } = vi.hoisted(() => ({
  mockSetRange: vi.fn(),
}))

vi.mock('@/stores/meals', () => ({
  useMealsStore: () => ({
    setRange: mockSetRange,
    selectedRange: { start: '', end: '' },
  }),
}))

import TimelineSelector from '@/components/TimelineSelector.vue'

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('TimelineSelector', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockSetRange.mockReset()
    // Pin to Monday 2026-03-16 at noon UTC (safe across all timezones)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-16T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders This Week, Next Week, and Custom Range buttons', () => {
    const wrapper = mount(TimelineSelector)
    const buttonTexts = wrapper.findAll('button').map((b) => b.text())
    expect(buttonTexts).toContain('This Week')
    expect(buttonTexts).toContain('Next Week')
    expect(buttonTexts).toContain('Custom Range')
  })

  it('calls setRange with current Mon–Sun when "This Week" is clicked', async () => {
    const wrapper = mount(TimelineSelector)
    const btn = wrapper.findAll('button').find((b) => b.text() === 'This Week')!
    await btn.trigger('click')
    expect(mockSetRange).toHaveBeenCalledWith('2026-03-16', '2026-03-22')
  })

  it('calls setRange with next Mon–Sun when "Next Week" is clicked', async () => {
    const wrapper = mount(TimelineSelector)
    const btn = wrapper.findAll('button').find((b) => b.text() === 'Next Week')!
    await btn.trigger('click')
    expect(mockSetRange).toHaveBeenCalledWith('2026-03-23', '2026-03-29')
  })

  it('does not show date inputs by default', () => {
    const wrapper = mount(TimelineSelector)
    expect(wrapper.find('input[type="date"]').exists()).toBe(false)
  })

  it('shows two date inputs after "Custom Range" is clicked', async () => {
    const wrapper = mount(TimelineSelector)
    const btn = wrapper.findAll('button').find((b) => b.text() === 'Custom Range')!
    await btn.trigger('click')
    expect(wrapper.findAll('input[type="date"]').length).toBe(2)
  })

  it('calls setRange when both custom date inputs have values', async () => {
    const wrapper = mount(TimelineSelector)
    const btn = wrapper.findAll('button').find((b) => b.text() === 'Custom Range')!
    await btn.trigger('click')

    const [startInput, endInput] = wrapper.findAll('input[type="date"]')
    await startInput.setValue('2026-04-01')
    await endInput.setValue('2026-04-07')
    await endInput.trigger('change')

    expect(mockSetRange).toHaveBeenCalledWith('2026-04-01', '2026-04-07')
  })

  it('does not call setRange when only the start date is set', async () => {
    const wrapper = mount(TimelineSelector)
    const btn = wrapper.findAll('button').find((b) => b.text() === 'Custom Range')!
    await btn.trigger('click')

    const [startInput] = wrapper.findAll('input[type="date"]')
    await startInput.setValue('2026-04-01')
    await startInput.trigger('change')

    expect(mockSetRange).not.toHaveBeenCalled()
  })
})
