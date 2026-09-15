import { describe, expect, it } from 'vitest'

import { harnessEnvFromBuildConstants } from '@/app/internal-company/capabilities'
import { TRANSLATIONS } from '@/i18n/catalog'
import { BOT_ATTENTION_HINTS } from '@/plugins/hermes-bots/data'

import {
  appBrandForEnv,
  applyAppBrandRoot,
  brandTranslationTree,
  lemonAppBrand,
  replaceAppBrandTokens,
  replaceHermesBrandTerms,
  upstreamAppBrand
} from './app-brand'

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
    expect(lemonAppBrand.urls.installer).toBe('https://github.com/DangLemon/hermes-agent/releases')
  })

  it('replaces brand tokens without changing Hermes defaults', () => {
    expect(replaceAppBrandTokens('Uninstall {appName}: remove {agentName}.', upstreamAppBrand)).toBe(
      'Uninstall Hermes: remove the Hermes agent.'
    )
    expect(replaceAppBrandTokens('Uninstall {appName}: remove {agentName}.', lemonAppBrand)).toBe(
      'Uninstall Lemon AI: remove the Lemon AI agent.'
    )
  })

  it('replaces legacy Hermes terms across internal update copy', () => {
    const source = 'Hermes Desktop checks for updates and restarts the Hermes Agent.'

    expect(replaceHermesBrandTerms(source, upstreamAppBrand)).toBe(source)
    expect(replaceHermesBrandTerms(source, lemonAppBrand)).toBe(
      'Lemon AI checks for updates and restarts the Lemon AI.'
    )
  })

  it('brands renderer fallback copy without changing upstream copy', () => {
    const source =
      'Ask Hermes… Not connected — open Hermes to reconnect. Open in Hermes. Hermes is working. Reacted by Hermes. Hermes reported an error.'

    expect(replaceHermesBrandTerms(source, upstreamAppBrand)).toBe(source)
    expect(replaceHermesBrandTerms(source, lemonAppBrand)).toBe(
      'Ask Lemon AI… Not connected — open Lemon AI to reconnect. Open in Lemon AI. Lemon AI is working. Reacted by Lemon AI. Lemon AI reported an error.'
    )
  })

  it('brands quoted product labels while preserving quoted executable Hermes commands', () => {
    const source =
      "Open 'Hermes Desktop', read \"Hermes Agent\", keep `Hermes Desktop`, then run 'hermes model' and `hermes mcp login amazon-ads`."

    expect(replaceHermesBrandTerms(source, lemonAppBrand)).toBe(
      "Open 'Lemon AI', read \"Lemon AI\", keep `Lemon AI`, then run 'hermes model' and `hermes mcp login amazon-ads`."
    )
  })

  it('preserves only bounded bare executable commands and brands following prose', () => {
    const source = 'Run hermes model before opening Hermes Desktop. Then run hermes doctor if Hermes Agent still fails.'

    expect(replaceHermesBrandTerms(source, lemonAppBrand)).toBe(
      'Run hermes model before opening Lemon AI. Then run hermes doctor if Lemon AI still fails.'
    )
  })

  it('does not protect arbitrary quoted or backticked Hermes product text', () => {
    const source = 'Read "Hermes Desktop" and `Hermes Agent`; keep "hermes doctor" and `hermes desktop --force-build`.'

    expect(replaceHermesBrandTerms(source, lemonAppBrand)).toBe(
      'Read "Lemon AI" and `Lemon AI`; keep "hermes doctor" and `hermes desktop --force-build`.'
    )
  })

  it('preserves the executable model command while branding config path hints without changing upstream copy', () => {
    const source =
      "Run 'hermes model', then check ~/.hermes/.env and ~/.hermes/config.yaml if the Hermes backend or hermes gateway still fails."

    expect(replaceHermesBrandTerms(source, upstreamAppBrand)).toBe(source)
    expect(replaceHermesBrandTerms(source, lemonAppBrand)).toBe(
      "Run 'hermes model', then check ~/.lemon-ai/.env and ~/.lemon-ai/config.yaml if the Lemon AI backend or Lemon AI gateway still fails."
    )
  })

  it('preserves interpolation values when the same text also contains executable Hermes commands', () => {
    const source = "Run 'hermes model', then reopen Hermes Agent.txt in Hermes Desktop."

    expect(replaceHermesBrandTerms(source, lemonAppBrand, ['Hermes Agent.txt'])).toBe(
      "Run 'hermes model', then reopen Hermes Agent.txt in Lemon AI."
    )
  })

  it('preserves generic lower-case executable Hermes commands while branding surrounding UI text', () => {
    const cases = [
      ['hermes', 'hermes'],
      ['`hermes gateway`', '`hermes gateway`'],
      ['hermes gateway', 'hermes gateway'],
      ['hermes project', 'hermes project'],
      ['hermes --profile default gateway', 'hermes --profile default gateway'],
      ['hermes -p default project list --json', 'hermes -p default project list --json'],
      ['hermes curator restore', 'hermes curator restore'],
      ['hermes pets', 'hermes pets'],
      ['hermes debug share --nous', 'hermes debug share --nous'],
      ['hermes --help', 'hermes --help']
    ] as const

    for (const [source, expected] of cases) {
      expect(replaceHermesBrandTerms(source, lemonAppBrand)).toBe(expected)
    }
  })

  it('stops generic command protection before prose boundaries', () => {
    expect(replaceHermesBrandTerms('Run hermes gateway before opening Hermes Desktop.', lemonAppBrand)).toBe(
      'Run hermes gateway before opening Lemon AI.'
    )
    expect(replaceHermesBrandTerms('Try hermes project if Hermes Agent still fails.', lemonAppBrand)).toBe(
      'Try hermes project if Lemon AI still fails.'
    )
    expect(
      replaceHermesBrandTerms('Hermes gateway is not connected. See https://example.com/hermes/help.', lemonAppBrand)
    ).toBe('Lemon AI gateway is not connected. See https://example.com/hermes/help.')
  })

  it('keeps a bare command intact across shell operators and line breaks', () => {
    expect(replaceHermesBrandTerms('hermes gateway && echo ok', lemonAppBrand)).toBe('hermes gateway && echo ok')
    expect(replaceHermesBrandTerms('hermes gateway | tee gateway.log', lemonAppBrand)).toBe(
      'hermes gateway | tee gateway.log'
    )
    expect(replaceHermesBrandTerms('hermes gateway > gateway.log', lemonAppBrand)).toBe(
      'hermes gateway > gateway.log'
    )
    expect(replaceHermesBrandTerms('hermes gateway\nHermes Agent is ready.', lemonAppBrand)).toBe(
      'hermes gateway\nLemon AI is ready.'
    )
  })

  it('leaves generic command and prose boundaries unchanged in upstream mode', () => {
    const source =
      'Run hermes gateway before opening Hermes Desktop. Try hermes project if Hermes Agent still fails. Hermes gateway is unavailable.'

    expect(replaceHermesBrandTerms(source, upstreamAppBrand)).toBe(source)
  })

  it('preserves actual catalog and plugin executable command strings', () => {
    expect(replaceHermesBrandTerms(TRANSLATIONS.en.skills.skillArchivedMessage, lemonAppBrand)).toBe(
      'Restorable via hermes curator restore.'
    )
    expect(replaceHermesBrandTerms(TRANSLATIONS.en.desktop.handoff.timedOut, lemonAppBrand)).toBe(
      'Timed out waiting for the gateway. Is `hermes gateway` running?'
    )
    expect(replaceHermesBrandTerms(BOT_ATTENTION_HINTS.missing_config, lemonAppBrand)).toBe(
      'Provider not configured — run hermes model'
    )
  })

  it('preserves bare CLI commands embedded in localized catalog copy', () => {
    expect(replaceHermesBrandTerms(TRANSLATIONS.zh.skills.skillArchivedMessage, lemonAppBrand)).toBe(
      '可通过 hermes curator restore 恢复。'
    )
    expect(replaceHermesBrandTerms(TRANSLATIONS['zh-hant'].skills.skillArchivedMessage, lemonAppBrand)).toBe(
      '可透過 hermes curator restore 還原。'
    )
    expect(replaceHermesBrandTerms(TRANSLATIONS.ja.skills.skillArchivedMessage, lemonAppBrand)).toBe(
      'hermes curator restore で復元できます。'
    )
    expect(replaceHermesBrandTerms(TRANSLATIONS.ru.skills.skillArchivedMessage, lemonAppBrand)).toBe(
      'Восстановить через hermes curator restore.'
    )
  })

  it('preserves executable Hermes CLI commands while branding surrounding UI text', () => {
    const source =
      'Hermes gateway is not connected. Run `hermes gateway setup`, then try hermes mcp login amazon-ads. See https://example.com/hermes/help.'

    expect(replaceHermesBrandTerms(source, lemonAppBrand)).toBe(
      'Lemon AI gateway is not connected. Run `hermes gateway setup`, then try hermes mcp login amazon-ads. See https://example.com/hermes/help.'
    )
  })

  it('preserves internal Hermes protocol, IPC channel, package, and module identifiers', () => {
    const source =
      'Open Hermes Desktop for hermes://open/settings/plugins, call hermes:api, import @hermes/plugin-sdk, and load hermes-agent from /opt/hermes-agent/bin.'

    expect(replaceHermesBrandTerms(source, lemonAppBrand)).toBe(
      'Open Lemon AI for hermes://open/settings/plugins, call hermes:api, import @hermes/plugin-sdk, and load hermes-agent from /opt/hermes-agent/bin.'
    )
  })

  it('preserves lower-case technical identifiers while keeping legacy Hermes home display branding', () => {
    const source =
      'Store data-hermes-mode and hermes.desktop.routeTiles.v1 next to ~/.hermes/config.yaml for Hermes Desktop.'

    expect(replaceHermesBrandTerms(source, lemonAppBrand)).toBe(
      'Store data-hermes-mode and hermes.desktop.routeTiles.v1 next to ~/.lemon-ai/config.yaml for Lemon AI.'
    )
  })

  it('preserves explicit runtime values while branding static copy', () => {
    const source =
      'Hermes Desktop could not open Hermes Agent.txt from https://example.com/Hermes and reported: Hermes gateway unavailable.'

    expect(
      replaceHermesBrandTerms(source, lemonAppBrand, [
        'Hermes Agent.txt',
        'https://example.com/Hermes',
        'Hermes gateway unavailable'
      ])
    ).toBe(
      'Lemon AI could not open Hermes Agent.txt from https://example.com/Hermes and reported: Hermes gateway unavailable.'
    )
  })

  it('brands translation functions without mutating interpolated filenames', () => {
    const branded = brandTranslationTree(
      {
        failedOpen: (name: string) => `Hermes Desktop could not open ${name}.`,
        nested: {
          ready: 'Hermes Agent is ready.'
        }
      },
      lemonAppBrand
    )

    expect(branded.failedOpen('Hermes Agent.txt')).toBe('Lemon AI could not open Hermes Agent.txt.')
    expect(branded.nested.ready).toBe('Lemon AI is ready.')
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
