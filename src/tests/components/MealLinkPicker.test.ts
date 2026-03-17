import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// --- Hoisted mock state ---
const { mockUseMealsStore } = vi.hoisted(() => ({
  mockUseMealsStore: vi.fn(),
}))

vi.mock('@/stores/meals', () => ({
  useMealsStore: mockUseMealsStore,
}))

// --- Store mocks ---

const mockMeals = [
  {
    id: 'meal-1',
    household_id: 'hh-1',
    date: '2026-03-16',
    meal_type: 'dinner',
    title: 'Pasta',
    notes: null,
    sort_order: 0,
    created_by: 'user-1',
    created_at: '2026-03-16T00:00:00Z',
    updated_at: '2026-03-16T00:00:00Z',
  },
  {
    id: 'meal-2',
    household_id: 'hh-1',
    date: '2026-03-16',
    meal_type: 'lunch',
    title: 'Salad',
    notes: null,
    sort_order: 1,
    created_by: 'user-1',
    created_at: '2026-03-16T00:00:00Z',
    updated_at: '2026-03-16T00:00:00Z',
  },
  {
    id: 'meal-3',
    household_id: 'hh-1',
    date: '2026-03-17',
    meal_type: 'breakfast',
    title: 'Pancakes',
    notes: null,
    sort_order: 0,
    created_by: 'user-1',
    created_at: '2026-03-17T00:00:00Z',
    updated_at: '2026-03-17T00:00:00Z',
  },
]

const mockMealsByDate = {
  '2026-03-16': [mockMeals[0], mockMeals[1]],
  '2026-03-17': [mockMeals[2]],
}

import MealLinkPicker from '@/components/grocery/MealLinkPicker.vue'

beforeEach(() => {
  vi.clearAllMocks()
  mockUseMealsStore.mockReturnValue({
    meals: mockMeals,
    mealsByDate: mockMealsByDate,
  })
})

describe('MealLinkPicker', () => {
  // --- Rendering ---
  describe('rendering', () => {
    it('renders all meals as checkboxes', () => {
      const wrapper = mount(MealLinkPicker, {
        props: { modelValue: [] },
      })
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      expect(checkboxes).toHaveLength(3)
    })

    it('displays meal titles', () => {
      const wrapper = mount(MealLinkPicker, {
        props: { modelValue: [] },
      })
      const text = wrapper.text()
      expect(text).toContain('Pasta')
      expect(text).toContain('Salad')
      expect(text).toContain('Pancakes')
    })

    it('groups meals by date with a date heading', () => {
      const wrapper = mount(MealLinkPicker, {
        props: { modelValue: [] },
      })
      // Should have two date headings for two different dates
      const headings = wrapper.findAll('[data-testid="date-heading"]')
      expect(headings).toHaveLength(2)
    })

    it('shows "No meals available" when meals list is empty', () => {
      mockUseMealsStore.mockReturnValueOnce({
        meals: [],
        mealsByDate: {},
      })
      const wrapper = mount(MealLinkPicker, {
        props: { modelValue: [] },
      })
      expect(wrapper.text()).toContain('No meals available')
    })

    it('renders a close button', () => {
      const wrapper = mount(MealLinkPicker, {
        props: { modelValue: [] },
      })
      expect(wrapper.find('[data-testid="close-btn"]').exists()).toBe(true)
    })

    it('renders a done button', () => {
      const wrapper = mount(MealLinkPicker, {
        props: { modelValue: [] },
      })
      expect(wrapper.find('[data-testid="done-btn"]').exists()).toBe(true)
    })
  })

  // --- Pre-selection ---
  describe('pre-selection', () => {
    it('pre-checks meals whose IDs are in modelValue', () => {
      const wrapper = mount(MealLinkPicker, {
        props: { modelValue: ['meal-1', 'meal-3'] },
      })
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      // meal-1 → checked, meal-2 → unchecked, meal-3 → checked
      expect((checkboxes[0].element as HTMLInputElement).checked).toBe(true)
      expect((checkboxes[1].element as HTMLInputElement).checked).toBe(false)
      expect((checkboxes[2].element as HTMLInputElement).checked).toBe(true)
    })

    it('all checkboxes are unchecked when modelValue is empty', () => {
      const wrapper = mount(MealLinkPicker, {
        props: { modelValue: [] },
      })
      wrapper.findAll('input[type="checkbox"]').forEach(cb => {
        expect((cb.element as HTMLInputElement).checked).toBe(false)
      })
    })
  })

  // --- Interaction ---
  describe('interactions', () => {
    it('emits update:modelValue with meal ID added when an unchecked checkbox is clicked', async () => {
      const wrapper = mount(MealLinkPicker, {
        props: { modelValue: [] },
      })
      await wrapper.findAll('input[type="checkbox"]')[0].trigger('change')
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([['meal-1']])
    })

    it('emits update:modelValue with meal ID removed when a checked checkbox is clicked', async () => {
      const wrapper = mount(MealLinkPicker, {
        props: { modelValue: ['meal-1'] },
      })
      await wrapper.findAll('input[type="checkbox"]')[0].trigger('change')
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([[]])
    })

    it('emits close when close button is clicked', async () => {
      const wrapper = mount(MealLinkPicker, {
        props: { modelValue: [] },
      })
      await wrapper.find('[data-testid="close-btn"]').trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('emits close when done button is clicked', async () => {
      const wrapper = mount(MealLinkPicker, {
        props: { modelValue: [] },
      })
      await wrapper.find('[data-testid="done-btn"]').trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('emits close when clicking the backdrop overlay', async () => {
      const wrapper = mount(MealLinkPicker, {
        props: { modelValue: [] },
      })
      await wrapper.find('[data-testid="backdrop"]').trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  // ─── Design system classes ───────────────────────────────────────────────────
  describe('design classes', () => {
    it('backdrop overlay has backdrop-blur-sm class', () => {
      const wrapper = mount(MealLinkPicker, { props: { modelValue: [] } })
      expect(wrapper.find('[data-testid="backdrop"]').classes()).toContain('backdrop-blur-sm')
    })

    it('inner panel has modal-panel class', () => {
      const wrapper = mount(MealLinkPicker, { props: { modelValue: [] } })
      expect(wrapper.find('.modal-panel').exists()).toBe(true)
    })
  })
})
