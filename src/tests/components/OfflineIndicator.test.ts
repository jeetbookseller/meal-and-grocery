import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value })
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('OfflineIndicator', () => {
  beforeEach(() => {
    setOnline(true)
    vi.resetModules()
  })

  afterEach(() => {
    setOnline(true)
  })

  it('does not render the banner when navigator.onLine is true', async () => {
    setOnline(true)
    const { default: OfflineIndicator } = await import('@/components/OfflineIndicator.vue')
    const wrapper = mount(OfflineIndicator)
    expect(wrapper.find('[data-testid="offline-banner"]').exists()).toBe(false)
  })

  it('renders the banner when navigator.onLine is false', async () => {
    setOnline(false)
    const { default: OfflineIndicator } = await import('@/components/OfflineIndicator.vue')
    const wrapper = mount(OfflineIndicator)
    expect(wrapper.find('[data-testid="offline-banner"]').exists()).toBe(true)
  })

  it('shows the banner after the offline event fires', async () => {
    setOnline(true)
    const { default: OfflineIndicator } = await import('@/components/OfflineIndicator.vue')
    const wrapper = mount(OfflineIndicator)
    expect(wrapper.find('[data-testid="offline-banner"]').exists()).toBe(false)

    window.dispatchEvent(new Event('offline'))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="offline-banner"]').exists()).toBe(true)
  })

  it('hides the banner after the online event fires', async () => {
    setOnline(false)
    const { default: OfflineIndicator } = await import('@/components/OfflineIndicator.vue')
    const wrapper = mount(OfflineIndicator)
    expect(wrapper.find('[data-testid="offline-banner"]').exists()).toBe(true)

    window.dispatchEvent(new Event('online'))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="offline-banner"]').exists()).toBe(false)
  })

  it('removes event listeners on unmount', async () => {
    setOnline(true)
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { default: OfflineIndicator } = await import('@/components/OfflineIndicator.vue')
    const wrapper = mount(OfflineIndicator)
    wrapper.unmount()
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function))
    removeSpy.mockRestore()
  })

  it('banner contains an offline message', async () => {
    setOnline(false)
    const { default: OfflineIndicator } = await import('@/components/OfflineIndicator.vue')
    const wrapper = mount(OfflineIndicator)
    expect(wrapper.find('[data-testid="offline-banner"]').text().toLowerCase()).toContain('offline')
  })
})
