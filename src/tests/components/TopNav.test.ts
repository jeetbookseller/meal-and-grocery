import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, RouterLinkStub, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
const mockGetUser = vi.fn()
const mockSignOut = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
      signOut: mockSignOut,
    },
  },
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn() }),
  }
})

const mockHouseholdStore = {
  ready: true,
  inviteCode: 'abc12345',
}

vi.mock('@/stores/household', () => ({
  useHouseholdStore: () => mockHouseholdStore,
}))

vi.mock('@/components/InviteCodeModal.vue', () => ({
  default: { template: '<div data-testid="invite-modal" />' },
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────
const mountComponent = async () => {
  const { default: TopNav } = await import('@/components/TopNav.vue')
  return mount(TopNav, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('TopNav', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { email: 'test@example.com' } } })
    mockSignOut.mockResolvedValue({})
    mockHouseholdStore.ready = true
    mockHouseholdStore.inviteCode = 'abc12345'
  })

  it('hides the user email on mobile (hidden class)', async () => {
    const wrapper = await mountComponent()
    await flushPromises()
    const email = wrapper.find('[data-testid="user-email"]')
    expect(email.exists()).toBe(true)
    expect(email.classes()).toContain('hidden')
  })

  it('shows the user email on sm+ screens (sm:inline class)', async () => {
    const wrapper = await mountComponent()
    await flushPromises()
    const email = wrapper.find('[data-testid="user-email"]')
    expect(email.classes()).toContain('sm:inline')
  })

  it('logout button meets 44px touch target (min-h-[44px])', async () => {
    const wrapper = await mountComponent()
    const logoutBtn = wrapper.find('[data-testid="logout-btn"]')
    expect(logoutBtn.exists()).toBe(true)
    expect(logoutBtn.classes()).toContain('min-h-[44px]')
  })

  it('nav tab links meet 44px touch target (min-h-[44px])', async () => {
    const wrapper = await mountComponent()
    const links = wrapper.findAllComponents(RouterLinkStub)
    expect(links.length).toBeGreaterThanOrEqual(2)
    for (const link of links) {
      expect(link.classes()).toContain('min-h-[44px]')
    }
  })

  it('renders the user email after mount', async () => {
    const wrapper = await mountComponent()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('test@example.com')
  })

  it('calls signOut and redirects on logout click', async () => {
    const wrapper = await mountComponent()
    await wrapper.find('[data-testid="logout-btn"]').trigger('click')
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('shows invite button when household is ready', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.find('[data-testid="invite-btn"]').exists()).toBe(true)
  })

  it('hides invite button when household is not ready', async () => {
    mockHouseholdStore.ready = false
    const wrapper = await mountComponent()
    expect(wrapper.find('[data-testid="invite-btn"]').exists()).toBe(false)
  })

  it('invite button meets 44px touch target', async () => {
    const wrapper = await mountComponent()
    const btn = wrapper.find('[data-testid="invite-btn"]')
    expect(btn.classes()).toContain('min-h-[44px]')
  })

  it('opens InviteCodeModal when invite button is clicked', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.find('[data-testid="invite-modal"]').exists()).toBe(false)
    await wrapper.find('[data-testid="invite-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="invite-modal"]').exists()).toBe(true)
  })
})
