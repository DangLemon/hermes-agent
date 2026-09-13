import { describe, expect, it } from 'vitest'

import { harnessEnvFromBuildConstants } from '@/app/internal-company/capabilities'

import { appBrandForEnv, applyAppBrandRoot, lemonAppBrand, replaceAppBrandTokens, upstreamAppBrand } from './app-brand'

describe('appBrandForEnv', () => {
  it('keeps upstream Hermes branding by default', () => {
    const brand = appBrandForEnv({})

    expect(brand.mode).toBe('upstream')
    expect(brand.displayName).toBe('Hermes Agent')
    expect(brand.wordmark).toBe('HERMES AGENT')
    expect(brand.markSrc).toContain('nous-girl.jpg')
  })

  it('uses Lemon AI branding only for the internal desktop harness', () => {
    const brand = appBrandForEnv({ VITE_HERMES_DESKTOP_HARNESS: 'internal' })

    expect(brand.mode).toBe('internal-harness')
    expect(brand.displayName).toBe('Lemon AI')
    expect(brand.wordmark).toBe('Lemon AI')
    expect(brand.markSrc).toContain('lemon-mark.png')
    expect(brand.lockupSrc).toContain('lemon-lockup.png')
  })

  it('uses Lemon AI branding when called with the configured build env object', () => {
    const brand = appBrandForEnv(harnessEnvFromBuildConstants({ harness: 'internal' }))

    expect(brand.mode).toBe('internal-harness')
    expect(brand.displayName).toBe('Lemon AI')
  })

  it('centralizes user-facing URLs for upstream and Lemon builds', () => {
    expect(upstreamAppBrand.urls.releaseNotes).toBe('https://github.com/NousResearch/hermes-agent/releases')
    expect(upstreamAppBrand.urls.installer).toBe('https://hermes-agent.nousresearch.com/')
    expect(lemonAppBrand.urls.releaseNotes).toBe('https://github.com/DangLemon/hermes-agent/releases')
    expect(lemonAppBrand.urls.installer).toBe('https://github.com/DangLemon/hermes-agent/releases/latest')
  })

  it('replaces brand tokens without changing Hermes defaults', () => {
    expect(replaceAppBrandTokens('Uninstall {appName}: remove {agentName}.', upstreamAppBrand)).toBe(
      'Uninstall Hermes: remove the Hermes agent.'
    )
    expect(replaceAppBrandTokens('Uninstall {appName}: remove {agentName}.', lemonAppBrand)).toBe(
      'Uninstall Lemon AI: remove the Lemon AI agent.'
    )
  })
})

describe('applyAppBrandRoot', () => {
  it('publishes contrast-safe Lemon theme tokens in harness mode', () => {
    const root = document.createElement('html')
    const brand = appBrandForEnv({ VITE_HERMES_DESKTOP_HARNESS: 'internal' })

    applyAppBrandRoot(root, brand)

    expect(root.dataset.hermesBrand).toBe('lemon')
    expect(root.style.getPropertyValue('--theme-primary')).toBe('#ffdd00')
    expect(root.style.getPropertyValue('--theme-accent-soft')).toBe('#fff4b8')
    expect(root.style.getPropertyValue('--theme-midground')).toBe('#322b29')
    expect(root.style.getPropertyValue('--ui-accent')).toBe('#322b29')
    expect(root.style.getPropertyValue('--ui-accent-secondary')).toBe('#806b00')
    expect(root.style.getPropertyValue('--lemon-workspace-sidebar')).toBe('#f5f5f3')
    expect(root.style.getPropertyValue('--lemon-workspace-selected')).toBe('#fff4b8')
    expect(root.style.getPropertyValue('--dt-primary-foreground')).toBe('#322b29')
    expect(root.style.getPropertyValue('--dt-primary-solid-foreground')).toBe('#322b29')
    expect(root.style.getPropertyValue('--dt-ring')).toBe('#806b00')
  })

  it('uses yellow as readable brand ink on dark surfaces', () => {
    const root = document.createElement('html')
    const brand = appBrandForEnv({ VITE_HERMES_DESKTOP_HARNESS: 'internal' })

    applyAppBrandRoot(root, brand, 'dark')

    expect(root.style.getPropertyValue('--theme-midground')).toBe('#ffdd00')
    expect(root.style.getPropertyValue('--ui-accent')).toBe('#ffdd00')
    expect(root.style.getPropertyValue('--lemon-workspace-sidebar')).toBe('#24201d')
    expect(root.style.getPropertyValue('--lemon-workspace-selected')).toBe('#51470d')
    expect(root.style.getPropertyValue('--dt-primary-foreground')).toBe('#322b29')
  })

  it('removes the harness brand marker for upstream mode', () => {
    const root = document.createElement('html')
    root.dataset.hermesBrand = 'lemon'

    applyAppBrandRoot(root, appBrandForEnv({}))

    expect(root.dataset.hermesBrand).toBeUndefined()
  })
})
