import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// --- Mock state ---
const { mockGroceryStore } = vi.hoisted(() => {
  return {
    mockGroceryStore: vi.fn(),
  }
})

vi.mock('@/stores/grocery', () => ({
  useGroceryStore: mockGroceryStore,
}))

const mockItems = [
  { id: 'item-1', name: 'Apples', quantity: '6', is_checked: false, sort_order: 0 },
  { id: 'item-2', name: 'Milk', quantity: '1 gal', is_checked: false, sort_order: 1 },
]

beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  mockGroceryStore.mockReturnValue({ items: mockItems })
})

describe('GroceryLinkPicker.vue', () => {
  const mountComponent = async (props: { modelValue: string[] } = { modelValue: [] }) => {
    const { default: GroceryLinkPicker } = await import('@/components/grocery/GroceryLinkPicker.vue')
    return mount(GroceryLinkPicker, { props })
  }

  it('renders all grocery items as checkboxes', async () => {
    const wrapper = await mountComponent()
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect(checkboxes).toHaveLength(2)
    expect(wrapper.text()).toContain('Apples')
    expect(wrapper.text()).toContain('Milk')
  })

  it('pre-checks items matching modelValue', async () => {
    const wrapper = await mountComponent({ modelValue: ['item-1'] })
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect((checkboxes[0].element as HTMLInputElement).checked).toBe(true)
    expect((checkboxes[1].element as HTMLInputElement).checked).toBe(false)
  })

  it('emits update:modelValue when toggling an item on', async () => {
    const wrapper = await mountComponent({ modelValue: [] })
    await wrapper.findAll('input[type="checkbox"]')[0].setValue(true)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['item-1']])
  })

  it('emits update:modelValue when toggling an item off', async () => {
    const wrapper = await mountComponent({ modelValue: ['item-1', 'item-2'] })
    await wrapper.findAll('input[type="checkbox"]')[0].setValue(false)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['item-2']])
  })

  it('shows empty state when no items exist', async () => {
    mockGroceryStore.mockReturnValue({ items: [] })
    const wrapper = await mountComponent()
    expect(wrapper.text()).toContain('No grocery items available')
  })

  it('emits close when Done button is clicked', async () => {
    const wrapper = await mountComponent()
    await wrapper.find('[data-testid="done-btn"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
