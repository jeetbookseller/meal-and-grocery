import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
const { mockAddMeal, mockMealsStore, mockHouseholdStore, mockAuthStore } = vi.hoisted(() => ({
  mockAddMeal: vi.fn(),
  mockMealsStore: vi.fn(),
  mockHouseholdStore: vi.fn(),
  mockAuthStore: vi.fn(),
}))

vi.mock('@/stores/meals', () => ({
  useMealsStore: mockMealsStore,
}))

vi.mock('@/stores/household', () => ({
  useHouseholdStore: mockHouseholdStore,
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: mockAuthStore,
}))

// ─── Setup ────────────────────────────────────────────────────────────────────
beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()

  mockMealsStore.mockReturnValue({
    addMeal: mockAddMeal,
    loading: false,
    error: null,
  })

  mockHouseholdStore.mockReturnValue({
    householdId: 'hh-1',
  })

  mockAuthStore.mockReturnValue({
    user: { id: 'user-1' },
  })
})

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('AddMealInline.vue', () => {
  const mountComponent = async (props = {}) => {
    const { default: AddMealInline } = await import('@/components/AddMealInline.vue')
    return mount(AddMealInline, {
      props: { date: '2026-03-16', ...props },
    })
  }

  it('renders a title input and a meal_type select', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
    expect(wrapper.find('select').exists()).toBe(true)
  })

  it('renders all meal type options including the blank option', async () => {
    const wrapper = await mountComponent()
    const options = wrapper.findAll('select option')
    const values = options.map((o) => o.element.value)
    expect(values).toContain('')
    expect(values).toContain('breakfast')
    expect(values).toContain('lunch')
    expect(values).toContain('dinner')
  })

  it('shows a validation error and does not submit when title is empty', async () => {
    const wrapper = await mountComponent()
    await wrapper.find('form').trigger('submit')
    expect(mockAddMeal).not.toHaveBeenCalled()
    expect(wrapper.text()).toMatch(/title is required/i)
  })

  it('calls mealsStore.addMeal with correct payload on valid submit', async () => {
    mockAddMeal.mockResolvedValue(undefined)
    const wrapper = await mountComponent()

    await wrapper.find('input[type="text"]').setValue('Pasta')
    await wrapper.find('select').setValue('dinner')
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()

    expect(mockAddMeal).toHaveBeenCalledWith(
      expect.objectContaining({
        date: '2026-03-16',
        title: 'Pasta',
        meal_type: 'dinner',
        household_id: 'hh-1',
      }),
    )
  })

  it('submits with null meal_type when no type is selected', async () => {
    mockAddMeal.mockResolvedValue(undefined)
    const wrapper = await mountComponent()

    await wrapper.find('input[type="text"]').setValue('Salad')
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()

    expect(mockAddMeal).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Salad',
        meal_type: null,
      }),
    )
  })

  it('resets the form fields after successful submit', async () => {
    mockAddMeal.mockResolvedValue(undefined)
    const wrapper = await mountComponent()

    const titleInput = wrapper.find('input[type="text"]')
    await titleInput.setValue('Pasta')
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()

    expect((titleInput.element as HTMLInputElement).value).toBe('')
  })

  it('disables the submit button while loading', async () => {
    let resolveAdd: () => void
    mockAddMeal.mockReturnValue(new Promise((res) => { resolveAdd = res }))

    const wrapper = await mountComponent()
    await wrapper.find('input[type="text"]').setValue('Pasta')
    wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()

    const btn = wrapper.find('button[type="submit"]')
    expect(btn.attributes('disabled')).toBeDefined()

    resolveAdd!()
  })
})
