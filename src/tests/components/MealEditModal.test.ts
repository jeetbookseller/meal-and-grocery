import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import type { Meal } from '@/types/database'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
const { mockUpdateMeal, mockMealsStore } = vi.hoisted(() => ({
  mockUpdateMeal: vi.fn(),
  mockMealsStore: vi.fn(),
}))

vi.mock('@/stores/meals', () => ({
  useMealsStore: mockMealsStore,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const mockMeal: Meal = {
  id: 'meal-1',
  household_id: 'hh-1',
  date: '2026-03-16',
  meal_type: 'dinner',
  title: 'Pasta',
  notes: 'Al dente',
  sort_order: 0,
  created_by: 'user-1',
  created_at: '2026-03-16T00:00:00Z',
  updated_at: '2026-03-16T00:00:00Z',
}

// ─── Setup ────────────────────────────────────────────────────────────────────
beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()

  mockMealsStore.mockReturnValue({
    updateMeal: mockUpdateMeal,
    loading: false,
    error: null,
  })
})

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('MealEditModal.vue', () => {
  const mountComponent = async (meal: Meal = mockMeal) => {
    const { default: MealEditModal } = await import('@/components/MealEditModal.vue')
    return mount(MealEditModal, {
      props: { meal },
      attachTo: document.body,
    })
  }

  it('renders a modal overlay with fixed inset-0 positioning', async () => {
    const wrapper = await mountComponent()
    const overlay = wrapper.find('.fixed.inset-0')
    expect(overlay.exists()).toBe(true)
  })

  it('pre-fills the title input with the meal title', async () => {
    const wrapper = await mountComponent()
    const titleInput = wrapper.find('input[type="text"]')
    expect((titleInput.element as HTMLInputElement).value).toBe('Pasta')
  })

  it('pre-fills the meal_type select with the meal meal_type', async () => {
    const wrapper = await mountComponent()
    const select = wrapper.find('select')
    expect((select.element as HTMLSelectElement).value).toBe('dinner')
  })

  it('pre-fills the notes textarea with the meal notes', async () => {
    const wrapper = await mountComponent()
    const textarea = wrapper.find('textarea')
    expect((textarea.element as HTMLTextAreaElement).value).toBe('Al dente')
  })

  it('emits close when the close button is clicked', async () => {
    const wrapper = await mountComponent()
    await wrapper.find('[data-testid="modal-close"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('calls mealsStore.updateMeal with changed fields on submit', async () => {
    mockUpdateMeal.mockResolvedValue(undefined)
    const wrapper = await mountComponent()

    await wrapper.find('input[type="text"]').setValue('Updated Pasta')
    await wrapper.find('select').setValue('lunch')
    await wrapper.find('textarea').setValue('Overcooked')
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()

    expect(mockUpdateMeal).toHaveBeenCalledWith('meal-1', {
      title: 'Updated Pasta',
      meal_type: 'lunch',
      notes: 'Overcooked',
    })
  })

  it('emits close after successful updateMeal', async () => {
    mockUpdateMeal.mockResolvedValue(undefined)
    const wrapper = await mountComponent()

    await wrapper.find('input[type="text"]').setValue('Updated Pasta')
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('disables the submit button while loading', async () => {
    let resolveUpdate: () => void
    mockUpdateMeal.mockReturnValue(new Promise((res) => { resolveUpdate = res }))

    const wrapper = await mountComponent()
    await wrapper.find('input[type="text"]').setValue('Pasta')
    wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()

    const btn = wrapper.find('button[type="submit"]')
    expect(btn.attributes('disabled')).toBeDefined()

    resolveUpdate!()
  })

  it('does not emit close when updateMeal results in a store error', async () => {
    const storeInstance = {
      updateMeal: mockUpdateMeal,
      loading: false,
      error: null as string | null,
    }
    mockMealsStore.mockReturnValue(storeInstance)
    mockUpdateMeal.mockImplementation(async () => {
      storeInstance.error = 'Update failed'
    })

    const { default: MealEditModal } = await import('@/components/MealEditModal.vue')
    const wrapper = mount(MealEditModal, {
      props: { meal: mockMeal },
      attachTo: document.body,
    })

    await wrapper.find('input[type="text"]').setValue('Pasta')
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('close')).toBeFalsy()
  })

  it('closes modal when overlay backdrop is clicked', async () => {
    const wrapper = await mountComponent()
    await wrapper.find('.fixed.inset-0').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
