import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseErrorBanner from '@/components/base/BaseErrorBanner.vue'

describe('BaseErrorBanner', () => {
  it('renders with data-testid="base-error-banner"', () => {
    const wrapper = mount(BaseErrorBanner, { props: { message: 'Something went wrong' } })
    expect(wrapper.find('[data-testid="base-error-banner"]').exists()).toBe(true)
  })

  it('displays the message prop', () => {
    const wrapper = mount(BaseErrorBanner, { props: { message: 'Failed to load data' } })
    expect(wrapper.text()).toContain('Failed to load data')
  })
})
