import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import type { Meal } from '@/types/database'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
const { mockUpdateMeal, mockMealsStore, mockLinkMealToItems, mockGroceryStore } = vi.hoisted(() => ({
  mockUpdateMeal: vi.fn(),
  mockMealsStore: vi.fn(),
  mockLinkMealToItems: vi.fn(),
  mockGroceryStore: vi.fn(),
}))

vi.mock('@/stores/meals', () => ({
  useMealsStore: mockMealsStore,
}))

vi.mock('@/stores/grocery', () => ({
  useGroceryStore: mockGroceryStore,
}))

vi.mock('@/components/grocery/GroceryLinkPicker.vue', () => ({
  default: { template: '<div class="grocery-link-picker-stub" />', props: ['modelValue'] },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const mockMeal: Meal = {
  id: 'meal-1',
  household_id: 'hh-1',
  date: '',
  meal_type: null,
  title: 'Pasta',
  notes: null,
  sort_order: 0,
  is_checked: false,
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

  mockLinkMealToItems.mockResolvedValue(undefined)
  mockGroceryStore.mockReturnValue({
    linkMealToItems: mockLinkMealToItems,
    items: [],
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
    expect(wrapper.find('.fixed.inset-0').exists()).toBe(true)
  })

  it('overlay has backdrop-blur-sm class', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.find('.fixed.inset-0').classes()).toContain('backdrop-blur-sm')
  })

  it('panel has modal-panel class', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.find('.modal-panel').exists()).toBe(true)
  })

  it('panel is wrapped in <Transition name="modal">', async () => {
    const { default: MealEditModal } = await import('@/components/MealEditModal.vue')
    const { Transition } = await import('vue')
    const wrapper = mount(MealEditModal, { props: { meal: mockMeal }, attachTo: document.body })
    expect(wrapper.findComponent(Transition).props('name')).toBe('modal')
  })

  it('pre-fills the title input with the meal title', async () => {
    const wrapper = await mountComponent()
    const input = wrapper.find('input[type="text"]')
    expect((input.element as HTMLInputElement).value).toBe('Pasta')
  })

  it('does NOT render a meal_type select', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.find('select').exists()).toBe(false)
  })

  it('does NOT render a notes textarea', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.find('textarea').exists()).toBe(false)
  })

  it('emits close when the close button is clicked', async () => {
    const wrapper = await mountComponent()
    await wrapper.find('[data-testid="modal-close"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('closes modal when overlay backdrop is clicked', async () => {
    const wrapper = await mountComponent()
    await wrapper.find('.fixed.inset-0').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('calls mealsStore.updateMeal with title on submit', async () => {
    mockUpdateMeal.mockResolvedValue(undefined)
    const wrapper = await mountComponent()
    await wrapper.find('input[type="text"]').setValue('Updated Pasta')
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()
    expect(mockUpdateMeal).toHaveBeenCalledWith('meal-1', { title: 'Updated Pasta' })
  })

  it('emits close after successful updateMeal', async () => {
    mockUpdateMeal.mockResolvedValue(undefined)
    const wrapper = await mountComponent()
    await wrapper.find('input[type="text"]').setValue('Updated Pasta')
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('close')).toBeTruthy()
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
    const wrapper = mount(MealEditModal, { props: { meal: mockMeal }, attachTo: document.body })
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('close')).toBeFalsy()
  })

  it('disables the submit button while loading', async () => {
    let resolveUpdate: () => void
    mockUpdateMeal.mockReturnValue(new Promise((res) => { resolveUpdate = res }))

    const wrapper = await mountComponent()
    wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()

    const btn = wrapper.find('button[type="submit"]')
    expect(btn.attributes('disabled')).toBeDefined()

    resolveUpdate!()
  })

  it('renders a "Link to groceries..." button', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.find('[data-testid="link-groceries-btn"]').exists()).toBe(true)
  })

  it('shows linked count when linkedItemIds is provided', async () => {
    const { default: MealEditModal } = await import('@/components/MealEditModal.vue')
    const wrapper = mount(MealEditModal, {
      props: { meal: mockMeal, linkedItemIds: ['item-1', 'item-2'] },
      attachTo: document.body,
    })
    expect(wrapper.find('[data-testid="link-groceries-btn"]').text()).toContain('2')
  })

  it('calls groceryStore.linkMealToItems on submit', async () => {
    mockUpdateMeal.mockResolvedValue(undefined)
    const { default: MealEditModal } = await import('@/components/MealEditModal.vue')
    const wrapper = mount(MealEditModal, {
      props: { meal: mockMeal, linkedItemIds: ['item-1'] },
      attachTo: document.body,
    })
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()
    expect(mockLinkMealToItems).toHaveBeenCalledWith('meal-1', ['item-1'])
  })
})
