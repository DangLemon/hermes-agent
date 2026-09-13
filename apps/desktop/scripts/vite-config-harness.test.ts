import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import { harnessViteDefines } from '../vite.config'

function harnessResource(agents: boolean) {
  return {
    schemaVersion: 1,
    profile: 'internal',
    ui: {
      agents,
      cron: true,
      messaging: false,
      terminal: true,
      webhooks: false
    }
  }
}

function withHarnessConfigs(run: (lemonPath: string, hermesPath: string) => void) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vite-config-harness-'))

  try {
    const lemonPath = path.join(tempRoot, 'lemon.json')
    const hermesPath = path.join(tempRoot, 'hermes.json')
    fs.writeFileSync(lemonPath, JSON.stringify(harnessResource(false)), 'utf8')
    fs.writeFileSync(hermesPath, JSON.stringify(harnessResource(true)), 'utf8')
    run(lemonPath, hermesPath)
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
}

test('Vite compiles internal harness defines from the Lemon selector alone', () => {
  withHarnessConfigs(lemonPath => {
    const define = harnessViteDefines({ LEMON_AI_DESKTOP_HARNESS_CONFIG: lemonPath })

    assert.equal(define.__HERMES_DESKTOP_HARNESS__, JSON.stringify('internal'))
    assert.equal(define.__HERMES_HARNESS_SHOW_AGENTS__, JSON.stringify('false'))
  })
})

test('Vite compiles internal harness defines from the canonical Lemon config by default', () => {
  const define = harnessViteDefines({})

  assert.equal(define.__HERMES_DESKTOP_HARNESS__, JSON.stringify('internal'))
  assert.equal(define.__HERMES_HARNESS_SHOW_AGENTS__, JSON.stringify('false'))
  assert.equal(define.__HERMES_HARNESS_SHOW_CRON__, JSON.stringify('true'))
})

test('Vite falls back to the Hermes selector when the Lemon selector is blank', () => {
  withHarnessConfigs((_lemonPath, hermesPath) => {
    const define = harnessViteDefines({
      LEMON_AI_DESKTOP_HARNESS_CONFIG: '  ',
      HERMES_DESKTOP_HARNESS_CONFIG: hermesPath
    })

    assert.equal(define.__HERMES_DESKTOP_HARNESS__, JSON.stringify('internal'))
    assert.equal(define.__HERMES_HARNESS_SHOW_AGENTS__, JSON.stringify('true'))
  })
})

test('Vite gives a nonempty Lemon selector precedence over the Hermes selector', () => {
  withHarnessConfigs((lemonPath, hermesPath) => {
    const define = harnessViteDefines({
      LEMON_AI_DESKTOP_HARNESS_CONFIG: lemonPath,
      HERMES_DESKTOP_HARNESS_CONFIG: hermesPath
    })

    assert.equal(define.__HERMES_HARNESS_SHOW_AGENTS__, JSON.stringify('false'))
  })
})

test('Vite fails closed when a selected Lemon config is invalid instead of using Hermes fallback', () => {
  withHarnessConfigs((_lemonPath, hermesPath) => {
    const define = harnessViteDefines({
      LEMON_AI_DESKTOP_HARNESS_CONFIG: '/missing/lemon.json',
      HERMES_DESKTOP_HARNESS_CONFIG: hermesPath
    })

    assert.equal(define.__HERMES_DESKTOP_HARNESS__, JSON.stringify(''))
    assert.equal(define.__HERMES_HARNESS_SHOW_AGENTS__, JSON.stringify('false'))
  })
})
