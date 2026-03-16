// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '../../../')

describe('vite.config.ts', () => {
  const viteConfig = readFileSync(resolve(root, 'vite.config.ts'), 'utf-8')

  it('exports base set to /meal-and-grocery/', () => {
    expect(viteConfig).toMatch(/base\s*:\s*['"]\/meal-and-grocery\/['"]/)
  })
})

describe('.env.example', () => {
  const envExample = readFileSync(resolve(root, '.env.example'), 'utf-8')

  it('documents VITE_SUPABASE_URL', () => {
    expect(envExample).toContain('VITE_SUPABASE_URL')
  })

  it('documents VITE_SUPABASE_ANON_KEY', () => {
    expect(envExample).toContain('VITE_SUPABASE_ANON_KEY')
  })
})

describe('.github/workflows/deploy.yml', () => {
  const workflow = readFileSync(resolve(root, '.github/workflows/deploy.yml'), 'utf-8')

  it('triggers on push to main', () => {
    expect(workflow).toMatch(/push\s*:/)
    expect(workflow).toMatch(/branches\s*:/)
    expect(workflow).toMatch(/[-\s]+main/)
  })

  it('includes npm ci step', () => {
    expect(workflow).toContain('npm ci')
  })

  it('includes npm run build step', () => {
    expect(workflow).toContain('npm run build')
  })

  it('deploys the dist/ directory', () => {
    expect(workflow).toContain('dist')
  })

  it('targets gh-pages branch', () => {
    expect(workflow).toContain('gh-pages')
  })
})
