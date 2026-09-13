import assert from 'node:assert/strict'
import { test } from 'node:test'

import { internalDesktopBuild, withIdentityConfig } from './tauri-with-identity.mjs'

test('Tauri wrapper keeps Hermes compatibility identity when no internal selector resolves', () => {
  const { args, env } = withIdentityConfig(['build'], {})

  assert.deepEqual(args, ['build'])
  assert.equal(env.HERMES_INSTALLER_BRAND, undefined)
})

test('Tauri wrapper uses Lemon setup identity from an explicit Lemon selector', () => {
  const { args, env } = withIdentityConfig(['build'], { LEMON_AI_DESKTOP_HARNESS_CONFIG: '/tmp/lemon.json' }, () => ({
    schemaVersion: 1,
    profile: 'internal',
    ui: { agents: false, cron: true, messaging: false, terminal: true, webhooks: false }
  }))

  assert.equal(args[0], 'build')
  assert.equal(args[1], '--config')
  assert.match(args[2], /"productName":"Lemon AI Setup"/)
  assert.equal(JSON.parse(args[2]).bundle.macOS.infoPlist, 'Info.lemon.plist')
  assert.equal(env.HERMES_INSTALLER_BRAND, 'lemon')
})

test('Hermes installer brand suppresses inherited internal selectors', () => {
  assert.equal(
    internalDesktopBuild({
      HERMES_INSTALLER_BRAND: 'hermes',
      HERMES_DESKTOP_INTERNAL: '1',
      LEMON_AI_DESKTOP_HARNESS_CONFIG: '/tmp/lemon.json'
    }, () => ({ profile: 'internal' })),
    false
  )
})
