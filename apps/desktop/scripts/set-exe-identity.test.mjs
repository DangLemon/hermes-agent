import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'vitest'

import { resolveExeIdentity, stampExeIdentity } from './set-exe-identity.mjs'

const desktopRoot = path.resolve(import.meta.dirname, '..')

const validHarnessResource = {
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

function withTempExe(fn) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-exe-identity-'))
  try {
    const exe = path.join(tempRoot, 'Hermes.exe')
    const config = path.join(tempRoot, 'internal.json')
    fs.writeFileSync(exe, '')
    fs.writeFileSync(config, JSON.stringify(validHarnessResource), 'utf8')
    return fn(exe, config)
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
}

test('resolveExeIdentity keeps Hermes resources by default', () => {
  assert.deepEqual(resolveExeIdentity({ desktopRoot, env: {} }), {
    icon: path.join(desktopRoot, 'assets', 'icon.ico'),
    productName: 'Hermes',
    fileDescription: 'Hermes',
    companyName: 'Nous Research',
    legalCopyright: 'Copyright (c) 2026 Nous Research'
  })
})

test('resolveExeIdentity keeps Hermes resources for compatibility mode', () => {
  assert.deepEqual(resolveExeIdentity({ desktopRoot, env: {}, harnessResource: null }), {
    icon: path.join(desktopRoot, 'assets', 'icon.ico'),
    productName: 'Hermes',
    fileDescription: 'Hermes',
    companyName: 'Nous Research',
    legalCopyright: 'Copyright (c) 2026 Nous Research'
  })
})

test('resolveExeIdentity uses Lemon resources only for a validated internal selector', () => {
  withTempExe((_exe, config) => {
    assert.deepEqual(
      resolveExeIdentity({
        desktopRoot,
        env: { LEMON_AI_DESKTOP_HARNESS_CONFIG: config }
      }),
      {
        icon: path.join(desktopRoot, 'assets', 'lemon-icon.ico'),
        productName: 'Lemon AI',
        fileDescription: 'Lemon AI',
        companyName: 'Lemon Digital',
        legalCopyright: 'Copyright (c) 2026 Lemon Digital'
      }
    )
  })
})

test('resolveExeIdentity keeps Hermes resources when a Lemon selector is inherited by Hermes', () => {
  withTempExe((_exe, config) => {
    assert.deepEqual(
      resolveExeIdentity({
        desktopRoot,
        env: { HERMES_INSTALLER_BRAND: 'hermes', LEMON_AI_DESKTOP_HARNESS_CONFIG: config }
      }),
      {
        icon: path.join(desktopRoot, 'assets', 'icon.ico'),
        productName: 'Hermes',
        fileDescription: 'Hermes',
        companyName: 'Nous Research',
        legalCopyright: 'Copyright (c) 2026 Nous Research'
      }
    )
  })
})

test('stampExeIdentity passes the selected identity to rcedit', async () => {
  await withTempExe(async (exe, config) => {
    const calls = []

    await stampExeIdentity(exe, {
      desktopRoot,
      env: { LEMON_AI_DESKTOP_HARNESS_CONFIG: config },
      rcedit: async (...args) => {
        calls.push(args)
      }
    })

    assert.equal(calls.length, 1)
    assert.equal(calls[0][0], exe)
    assert.equal(calls[0][1].icon, path.join(desktopRoot, 'assets', 'lemon-icon.ico'))
    assert.deepEqual(calls[0][1]['version-string'], {
      ProductName: 'Lemon AI',
      FileDescription: 'Lemon AI',
      CompanyName: 'Lemon Digital',
      LegalCopyright: 'Copyright (c) 2026 Lemon Digital'
    })
  })
})
