import { beforeEach, describe, expect, it } from 'vitest'

import { lemonAppBrand } from '@/lib/app-brand'

import { $desktopBoot, brandBootMessage, completeDesktopBoot, failDesktopBoot } from './boot'

describe('boot display branding', () => {
  beforeEach(() => {
    $desktopBoot.set({
      error: null,
      fakeMode: false,
      message: 'Starting',
      phase: 'renderer.init',
      progress: 2,
      running: true,
      timestamp: Date.now(),
      visible: true
    })
  })

  it('rewrites raw provider setup errors for the internal app', () => {
    const raw =
      "No inference provider configured. Run 'hermes model' to choose a provider and model, or set an API key (OPENROUTER_API_KEY) in ~/.hermes/config.yaml."

    expect(brandBootMessage(raw, lemonAppBrand)).toBe(
      "No inference provider configured. Run 'hermes model' to choose a provider and model, or set an API key (OPENROUTER_API_KEY) in ~/.lemon-ai/config.yaml."
    )
  })

  it('brands terminal boot errors before the recovery surface renders them', () => {
    failDesktopBoot('Hermes gateway unavailable', lemonAppBrand)

    expect($desktopBoot.get().error).toBe('Lemon AI gateway unavailable')
    expect($desktopBoot.get().message).toContain('Lemon AI gateway unavailable')
  })

  it('keeps completion and failure messages compatible for the upstream build', () => {
    completeDesktopBoot('Hermes Desktop is ready')
    expect($desktopBoot.get().message).toBe('Hermes Desktop is ready')

    failDesktopBoot('Hermes gateway unavailable')
    expect($desktopBoot.get().error).toBe('Hermes gateway unavailable')
  })
})
