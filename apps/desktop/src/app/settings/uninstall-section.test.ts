import { describe, expect, it } from 'vitest'

import { lemonAppBrand, upstreamAppBrand } from '@/lib/app-brand'

import { uninstallCopyForBrand, uninstallOptionsForBrand } from './uninstall-section'

describe('uninstallCopyForBrand', () => {
  it('preserves upstream Hermes uninstall copy by default', () => {
    const copy = uninstallCopyForBrand(upstreamAppBrand)

    expect(copy.heading).toBe('Uninstall Hermes')
    expect(copy.options[0].description).toBe('Remove this desktop app. The Hermes agent, your config, and chats all stay.')
  })

  it('replaces Hermes user-visible nouns for Lemon AI', () => {
    const copy = uninstallCopyForBrand(lemonAppBrand)

    const combined = [
      copy.heading,
      copy.intro,
      ...copy.options.flatMap(option => [option.title, option.description, option.consequence])
    ].join('\n')

    expect(copy.heading).toBe('Uninstall Lemon AI')
    expect(combined).toContain('the Lemon AI agent')
    expect(combined).not.toContain('Hermes')
  })
})

describe('uninstallOptionsForBrand', () => {
  it('keeps GUI-only visible when no local agent is installed', () => {
    expect(uninstallOptionsForBrand(lemonAppBrand, false).map(option => option.mode)).toEqual(['gui'])
  })

  it('shows agent-removing options when a local agent is installed', () => {
    expect(uninstallOptionsForBrand(lemonAppBrand, true).map(option => option.mode)).toEqual(['gui', 'lite', 'full'])
  })
})
