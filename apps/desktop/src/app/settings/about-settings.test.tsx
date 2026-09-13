import { describe, expect, it } from 'vitest'

import { lemonAppBrand, upstreamAppBrand } from '@/lib/app-brand'

import { aboutSettingsCopyForBrand, aboutSettingsLinksForBrand } from './about-settings'

describe('aboutSettingsLinksForBrand', () => {
  it('uses upstream Hermes URLs by default', () => {
    expect(aboutSettingsLinksForBrand(upstreamAppBrand)).toEqual({
      installer: 'https://hermes-agent.nousresearch.com/',
      releaseNotes: 'https://github.com/NousResearch/hermes-agent/releases'
    })
  })

  it('uses Lemon AI URLs for internal harness branding', () => {
    expect(aboutSettingsLinksForBrand(lemonAppBrand)).toEqual({
      installer: 'https://github.com/DangLemon/hermes-agent/releases/latest',
      releaseNotes: 'https://github.com/DangLemon/hermes-agent/releases'
    })
  })
})

const aboutCopy = {
  heading: 'Hermes Desktop',
  bundleOutOfSyncDesc:
    'The Hermes runtime was updated, but the desktop app itself is still an older build — new interface features (like Bot Mode) will be missing until it updates. Run the update below to rebuild the app. If that doesn’t clear this warning, reinstall from the latest desktop installer.',
  bundleSwapPendingDesc:
    'The updated app is already installed — Hermes only needs to restart to load it. Chats and settings are untouched.',
  bundleSwapPendingAction: 'Restart Hermes',
  automaticUpdatesDesc: 'Hermes checks for updates automatically in the background and lets you know when one is ready.'
}

describe('aboutSettingsCopyForBrand', () => {
  it('preserves upstream Hermes text', () => {
    expect(aboutSettingsCopyForBrand(aboutCopy, upstreamAppBrand)).toEqual(aboutCopy)
  })

  it('replaces Hermes-bearing About text for Lemon AI', () => {
    const copy = aboutSettingsCopyForBrand(aboutCopy, lemonAppBrand)
    const combined = Object.values(copy).join('\n')

    expect(copy.heading).toBe('Lemon AI')
    expect(copy.bundleSwapPendingAction).toBe('Restart Lemon AI')
    expect(combined).toContain('Lemon AI checks for updates')
    expect(combined).not.toContain('Hermes')
  })

  it('preserves localized surrounding text while replacing Hermes terms', () => {
    const copy = aboutSettingsCopyForBrand(
      {
        ...aboutCopy,
        heading: '桌面版 Hermes',
        automaticUpdatesDesc: 'Hermes 會在背景自動檢查更新。'
      },
      lemonAppBrand
    )

    expect(copy.heading).toBe('桌面版 Lemon AI')
    expect(copy.automaticUpdatesDesc).toBe('Lemon AI 會在背景自動檢查更新。')
  })
})
