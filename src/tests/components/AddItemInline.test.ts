import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// --- Hoisted mock state ---

const { mockItems, mockAddItem, mockUpdateItem, mockLinkItemToMeals } = vi.hoisted(() => {
  const mockItems: any[] = []
  return {
    mockItems,
    mockAddItem: vi.fn(),
    mockUpdateItem: vi.fn(),
    mockLinkItemToMeals: vi.fn(),
  }
})

// --- Store mocks ---

vi.mock('@/stores/grocery', () => ({
  useGroceryStore: () => ({
    get items() {
      return mockItems
    },
    addItem: mockAddItem,
    updateItem: mockUpdateItem,
    linkItemToMeals: mockLinkItemToMeals,
  }),
}))

vi.mock('@/stores/meals', () => ({
  useMealsStore: () => ({
    meals: [],
    mealsByDate: {},
  }),
}))

import AddItemInline from '@/components/grocery/AddItemInline.vue'

const defaultProps = {
  sectionId: 'sec-1',
  householdId: 'hh-1',
}

beforeEach(() => {
  mockItems.length = 0
  vi.clearAllMocks()
})

describe('AddItemInline', () => {
  // --- Rendering ---
  describe('rendering', () => {
    it('renders a name input', () => {
      const wrapper = mount(AddItemInline, { props: defaultProps })
      expect(wrapper.find('input[data-testid="name-input"]').exists()).toBe(true)
    })

    it('renders a quantity input', () => {
      const wrapper = mount(AddItemInline, { props: defaultProps })
      expect(wrapper.find('input[data-testid="quantity-input"]').exists()).toBe(true)
    })

    it('renders a "Link meals" button', () => {
      const wrapper = mount(AddItemInline, { props: defaultProps })
      expect(wrapper.find('[data-testid="link-meals-btn"]').exists()).toBe(true)
    })

    it('renders "Add Item" submit button in add mode', () => {
      const wrapper = mount(AddItemInline, { props: defaultProps })
      const btn = wrapper.find('[data-testid="submit-btn"]')
      expect(btn.text()).toContain('Add Item')
    })

    it('renders "Save" submit button in edit mode', () => {
      const wrapper = mount(AddItemInline, {
        props: { ...defaultProps, itemId: 'item-1', initialName: 'Apples' },
      })
      const btn = wrapper.find('[data-testid="submit-btn"]')
      expect(btn.text()).toContain('Save')
    })

    it('pre-fills name from initialName prop', () => {
      const wrapper = mount(AddItemInline, {
        props: { ...defaultProps, initialName: 'Bananas' },
      })
      const input = wrapper.find('input[data-testid="name-input"]').element as HTMLInputElement
      expect(input.value).toBe('Bananas')
    })

    it('pre-fills quantity from initialQuantity prop', () => {
      const wrapper = mount(AddItemInline, {
        props: { ...defaultProps, initialQuantity: '2 lbs' },
      })
      const input = wrapper.find('input[data-testid="quantity-input"]').element as HTMLInputElement
      expect(input.value).toBe('2 lbs')
    })

    it('does not render MealLinkPicker initially', () => {
      const wrapper = mount(AddItemInline, { props: defaultProps })
      expect(wrapper.findComponent({ name: 'MealLinkPicker' }).exists()).toBe(false)
    })
  })

  // --- Validation ---
  describe('validation', () => {
    it('shows error when submitting with empty name', async () => {
      const wrapper = mount(AddItemInline, { props: defaultProps })
      await wrapper.find('form').trigger('submit')
      await nextTick()
      expect(wrapper.find('[data-testid="error-msg"]').exists()).toBe(true)
      expect(mockAddItem).not.toHaveBeenCalled()
    })

    it('submit button is disabled when name is empty', () => {
      const wrapper = mount(AddItemInline, { props: defaultProps })
      const btn = wrapper.find('[data-testid="submit-btn"]').element as HTMLButtonElement
      expect(btn.disabled).toBe(true)
    })
  })

  // --- MealLinkPicker visibility ---
  describe('MealLinkPicker', () => {
    it('shows MealLinkPicker when "Link meals" button is clicked', async () => {
      const wrapper = mount(AddItemInline, { props: defaultProps })
      await wrapper.find('[data-testid="link-meals-btn"]').trigger('click')
      expect(wrapper.findComponent({ name: 'MealLinkPicker' }).exists()).toBe(true)
    })

    it('hides MealLinkPicker when it emits close', async () => {
      const wrapper = mount(AddItemInline, { props: defaultProps })
      await wrapper.find('[data-testid="link-meals-btn"]').trigger('click')
      await wrapper.findComponent({ name: 'MealLinkPicker' }).vm.$emit('close')
      await nextTick()
      expect(wrapper.findComponent({ name: 'MealLinkPicker' }).exists()).toBe(false)
    })

    it('shows selected meal count on Link meals button', async () => {
      const wrapper = mount(AddItemInline, { props: defaultProps })
      await wrapper.find('[data-testid="link-meals-btn"]').trigger('click')
      await wrapper.findComponent({ name: 'MealLinkPicker' }).vm.$emit('update:modelValue', ['meal-1', 'meal-2'])
      await nextTick()
      expect(wrapper.find('[data-testid="link-meals-btn"]').text()).toContain('2')
    })
  })

  // --- Add mode (no itemId) ---
  describe('add mode', () => {
    it('calls addItem with name, quantity, sectionId, householdId on submit', async () => {
      mockAddItem.mockResolvedValueOnce(undefined)
      const wrapper = mount(AddItemInline, { props: defaultProps })
      await wrapper.find('input[data-testid="name-input"]').setValue('Apples')
      await wrapper.find('input[data-testid="quantity-input"]').setValue('6')
      await wrapper.find('form').trigger('submit')
      await nextTick()
      expect(mockAddItem).toHaveBeenCalledWith({
        name: 'Apples',
        quantity: '6',
        section_id: 'sec-1',
        household_id: 'hh-1',
      })
    })

    it('passes null quantity when quantity input is empty', async () => {
      mockAddItem.mockResolvedValueOnce(undefined)
      const wrapper = mount(AddItemInline, { props: defaultProps })
      await wrapper.find('input[data-testid="name-input"]').setValue('Apples')
      await wrapper.find('form').trigger('submit')
      await nextTick()
      expect(mockAddItem).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: null })
      )
    })

    it('calls linkItemToMeals after addItem when meals are selected', async () => {
      mockAddItem.mockImplementation(async () => {
        mockItems.push({ id: 'item-new', name: 'Apples' })
      })
      mockLinkItemToMeals.mockResolvedValueOnce(undefined)

      const wrapper = mount(AddItemInline, { props: defaultProps })
      // Select meals via picker
      await wrapper.find('[data-testid="link-meals-btn"]').trigger('click')
      await wrapper.findComponent({ name: 'MealLinkPicker' }).vm.$emit('update:modelValue', ['meal-1'])
      await nextTick()

      await wrapper.find('input[data-testid="name-input"]').setValue('Apples')
      await wrapper.find('form').trigger('submit')
      await nextTick()

      expect(mockLinkItemToMeals).toHaveBeenCalledWith('item-new', ['meal-1'])
    })

    it('does not call linkItemToMeals when no meals are selected', async () => {
      mockAddItem.mockImplementation(async () => {
        mockItems.push({ id: 'item-new', name: 'Apples' })
      })

      const wrapper = mount(AddItemInline, { props: defaultProps })
      await wrapper.find('input[data-testid="name-input"]').setValue('Apples')
      await wrapper.find('form').trigger('submit')
      await nextTick()

      expect(mockLinkItemToMeals).not.toHaveBeenCalled()
    })

    it('resets form after successful add', async () => {
      mockAddItem.mockResolvedValueOnce(undefined)
      const wrapper = mount(AddItemInline, { props: defaultProps })
      await wrapper.find('input[data-testid="name-input"]').setValue('Apples')
      await wrapper.find('input[data-testid="quantity-input"]').setValue('6')
      await wrapper.find('form').trigger('submit')
      await nextTick()

      const nameInput = wrapper.find('input[data-testid="name-input"]').element as HTMLInputElement
      const qtyInput = wrapper.find('input[data-testid="quantity-input"]').element as HTMLInputElement
      expect(nameInput.value).toBe('')
      expect(qtyInput.value).toBe('')
    })

    it('emits submitted after successful add', async () => {
      mockAddItem.mockResolvedValueOnce(undefined)
      const wrapper = mount(AddItemInline, { props: defaultProps })
      await wrapper.find('input[data-testid="name-input"]').setValue('Apples')
      await wrapper.find('form').trigger('submit')
      await nextTick()
      expect(wrapper.emitted('submitted')).toBeTruthy()
    })
  })

  // --- Edit mode (with itemId) ---
  describe('edit mode', () => {
    const editProps = {
      ...defaultProps,
      itemId: 'item-1',
      initialName: 'Apples',
      initialQuantity: '6',
      initialMealIds: [] as string[],
    }

    it('calls updateItem with name and quantity on submit', async () => {
      mockUpdateItem.mockResolvedValueOnce(undefined)
      const wrapper = mount(AddItemInline, { props: editProps })
      await wrapper.find('input[data-testid="name-input"]').setValue('Green Apples')
      await wrapper.find('form').trigger('submit')
      await nextTick()
      expect(mockUpdateItem).toHaveBeenCalledWith('item-1', {
        name: 'Green Apples',
        quantity: '6',
      })
      expect(mockAddItem).not.toHaveBeenCalled()
    })

    it('calls linkItemToMeals with itemId and selected meals in edit mode', async () => {
      mockUpdateItem.mockResolvedValueOnce(undefined)
      mockLinkItemToMeals.mockResolvedValueOnce(undefined)

      const wrapper = mount(AddItemInline, { props: editProps })
      await wrapper.find('[data-testid="link-meals-btn"]').trigger('click')
      await wrapper.findComponent({ name: 'MealLinkPicker' }).vm.$emit('update:modelValue', ['meal-1'])
      await nextTick()

      await wrapper.find('form').trigger('submit')
      await nextTick()

      expect(mockLinkItemToMeals).toHaveBeenCalledWith('item-1', ['meal-1'])
    })

    it('does not reset form after successful edit', async () => {
      mockUpdateItem.mockResolvedValueOnce(undefined)
      const wrapper = mount(AddItemInline, { props: editProps })
      await wrapper.find('form').trigger('submit')
      await nextTick()

      const nameInput = wrapper.find('input[data-testid="name-input"]').element as HTMLInputElement
      expect(nameInput.value).toBe('Apples')
    })

    it('emits submitted after successful edit', async () => {
      mockUpdateItem.mockResolvedValueOnce(undefined)
      const wrapper = mount(AddItemInline, { props: editProps })
      await wrapper.find('form').trigger('submit')
      await nextTick()
      expect(wrapper.emitted('submitted')).toBeTruthy()
    })

    it('pre-selects initialMealIds in the picker', async () => {
      const wrapper = mount(AddItemInline, {
        props: { ...editProps, initialMealIds: ['meal-1'] },
      })
      await wrapper.find('[data-testid="link-meals-btn"]').trigger('click')
      const picker = wrapper.findComponent({ name: 'MealLinkPicker' })
      expect(picker.props('modelValue')).toEqual(['meal-1'])
    })
  })

  // --- Loading state ---
  describe('loading state', () => {
    it('shows loading text on submit button during submission', async () => {
      let resolveAdd!: () => void
      mockAddItem.mockImplementation(() => new Promise(r => { resolveAdd = r }))

      const wrapper = mount(AddItemInline, { props: defaultProps })
      await wrapper.find('input[data-testid="name-input"]').setValue('Apples')
      wrapper.find('form').trigger('submit')
      await nextTick()

      expect(wrapper.find('[data-testid="submit-btn"]').text()).toContain('Saving')
      resolveAdd()
    })
  })
})
