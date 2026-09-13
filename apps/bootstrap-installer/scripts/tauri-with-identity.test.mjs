import assert from 'node:assert/strict'
import { test } from 'node:test'

import { withIdentityConfig } from './tauri-with-identity.mjs'

test('Tauri wrapper uses Lemon setup identity from the canonical desktop config by default', () => {
  const { args, env } = withIdentityConfig(['build'], {})

  assert.equal(args[0], 'build')
  assert.equal(args[1], '--config')
  assert.match(args[2], /"productName":"Lemon AI Setup"/)
  assert.equal(JSON.parse(args[2]).bundle.macOS.infoPlist, 'Info.lemon.plist')
  assert.equal(env.HERMES_INSTALLER_BRAND, 'lemon')
})

test('Tauri wrapper keeps explicit Hermes compatibility mode when no internal selector resolves', () => {
  const { args, env } = withIdentityConfig(['build'], {}, () => null)

  assert.deepEqual(args, ['build'])
  assert.equal(env.HERMES_INSTALLER_BRAND, undefined)
})
