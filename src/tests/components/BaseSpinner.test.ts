import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseSpinner from '@/components/base/BaseSpinner.vue'

describe('BaseSpinner', () => {
  it('renders with data-testid="base-spinner"', () => {
    const wrapper = mount(BaseSpinner)
    expect(wrapper.find('[data-testid="base-spinner"]').exists()).toBe(true)
  })

  it('contains an svg with animate-spin class', () => {
    const wrapper = mount(BaseSpinner)
    expect(wrapper.find('svg.animate-spin').exists()).toBe(true)
  })
})
