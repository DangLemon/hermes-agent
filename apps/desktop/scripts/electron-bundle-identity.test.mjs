import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import { resolveElectronBundleDefines } from './electron-bundle-identity.mjs'

const packagedKey = ['process', 'env', 'HERMES_DESKTOP_IS_PACKAGED'].join('.')
const internalPackageKey = ['process', 'env', 'HERMES_DESKTOP_INTERNAL_PACKAGE'].join('.')

const validResource = {
  schemaVersion: 1,
  profile: 'internal',
  ui: {
    agents: false,
    cron: true,
    messaging: false,
    terminal: true,
    webhooks: false
  }
}

function withHarnessConfig(run) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'electron-bundle-identity-'))

  try {
    const configPath = path.join(tempRoot, 'lemon-ai-desktop.config.json')
    fs.writeFileSync(configPath, JSON.stringify(validResource), 'utf8')
    run(configPath)
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
}

test('production bundle bakes immutable internal-package identity from the Lemon selector', () => {
  withHarnessConfig(configPath => {
    assert.deepEqual(
      resolveElectronBundleDefines({
        env: { LEMON_AI_DESKTOP_HARNESS_CONFIG: configPath },
        isDev: false
      }),
      {
        [packagedKey]: 'true',
        [internalPackageKey]: JSON.stringify('1')
      }
    )
  })
})

test('production bundle remains compatible with the legacy Hermes selector', () => {
  withHarnessConfig(configPath => {
    assert.equal(
      resolveElectronBundleDefines({
        env: { HERMES_DESKTOP_HARNESS_CONFIG: configPath },
        isDev: false
      })[internalPackageKey],
      JSON.stringify('1')
    )
  })
})

test('ordinary production bundle bakes an empty internal-package identity', () => {
  assert.deepEqual(resolveElectronBundleDefines({ env: {}, isDev: false }), {
    [packagedKey]: 'true',
    [internalPackageKey]: JSON.stringify('')
  })
})

test('development bundle leaves package identity to the runtime environment', () => {
  assert.deepEqual(resolveElectronBundleDefines({ env: {}, isDev: true }), {})
})
