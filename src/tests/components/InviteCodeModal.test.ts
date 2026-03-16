import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

const mockRegenerateInviteCode = vi.fn()

const mockHouseholdStore = {
  inviteCode: 'abc12345',
  householdName: 'Our Home',
  loading: false,
  error: null as string | null,
  regenerateInviteCode: mockRegenerateInviteCode,
}

vi.mock('@/stores/household', () => ({
  useHouseholdStore: () => mockHouseholdStore,
}))

const mockWriteText = vi.fn()
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: mockWriteText },
  writable: true,
})

const mountComponent = async () => {
  const { default: InviteCodeModal } = await import('@/components/InviteCodeModal.vue')
  return mount(InviteCodeModal, {
    global: { stubs: { Teleport: true } },
  })
}

describe('InviteCodeModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockHouseholdStore.inviteCode = 'abc12345'
    mockHouseholdStore.loading = false
    mockHouseholdStore.error = null
  })

  it('displays the current invite code', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.text()).toContain('abc12345')
  })

  it('emits close when the backdrop is clicked', async () => {
    const wrapper = await mountComponent()
    await wrapper.find('[data-testid="modal-backdrop"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emits close when the close button is clicked', async () => {
    const wrapper = await mountComponent()
    await wrapper.find('[data-testid="close-btn"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('copies invite code to clipboard when copy button is clicked', async () => {
    mockWriteText.mockResolvedValue(undefined)
    const wrapper = await mountComponent()
    await wrapper.find('[data-testid="copy-btn"]').trigger('click')
    await flushPromises()
    expect(mockWriteText).toHaveBeenCalledWith('abc12345')
  })

  it('shows "Copied!" feedback after copying', async () => {
    mockWriteText.mockResolvedValue(undefined)
    const wrapper = await mountComponent()
    await wrapper.find('[data-testid="copy-btn"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Copied!')
  })

  it('calls regenerateInviteCode when regenerate button is clicked', async () => {
    mockRegenerateInviteCode.mockResolvedValue(undefined)
    const wrapper = await mountComponent()
    await wrapper.find('[data-testid="regenerate-btn"]').trigger('click')
    expect(mockRegenerateInviteCode).toHaveBeenCalledOnce()
  })

  it('shows loading state on regenerate button while loading', async () => {
    mockHouseholdStore.loading = true
    const wrapper = await mountComponent()
    const btn = wrapper.find('[data-testid="regenerate-btn"]')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('shows error from store when present', async () => {
    mockHouseholdStore.error = 'Failed to regenerate invite code'
    const wrapper = await mountComponent()
    expect(wrapper.text()).toContain('Failed to regenerate invite code')
  })

  it('regenerate button meets 44px touch target', async () => {
    const wrapper = await mountComponent()
    const btn = wrapper.find('[data-testid="regenerate-btn"]')
    expect(btn.classes()).toContain('min-h-[44px]')
  })

  it('copy button meets 44px touch target', async () => {
    const wrapper = await mountComponent()
    const btn = wrapper.find('[data-testid="copy-btn"]')
    expect(btn.classes()).toContain('min-h-[44px]')
  })
})
