import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import {
  RENDERER_HARNESS_MARKER_FILENAME,
  harnessViteDefines,
  rendererHarnessMarkerFromDefines,
  rendererHarnessMarkerPlugin
} from '../vite.config'

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

function emittedRendererHarnessMarker(define: Record<string, string>) {
  const emitted: Array<{ fileName: string; source: string; type: 'asset' }> = []
  rendererHarnessMarkerPlugin(define).generateBundle.call({
    emitFile: asset => emitted.push(asset)
  })

  return emitted
}

test('Vite compiles internal harness defines from the Lemon selector alone', () => {
  withHarnessConfigs(lemonPath => {
    const define = harnessViteDefines({ LEMON_AI_DESKTOP_HARNESS_CONFIG: lemonPath })

    assert.equal(define.__HERMES_DESKTOP_HARNESS__, JSON.stringify('internal'))
    assert.equal(define.__HERMES_HARNESS_SHOW_AGENTS__, JSON.stringify('false'))
  })
})

test('Vite emits the renderer harness marker from the same resolved internal defines', () => {
  withHarnessConfigs(lemonPath => {
    const define = harnessViteDefines({ LEMON_AI_DESKTOP_HARNESS_CONFIG: lemonPath })
    const marker = rendererHarnessMarkerFromDefines(define)

    assert.deepEqual(marker, {
      schemaVersion: 1,
      profile: 'internal',
      ui: {
        agents: false,
        cron: true,
        messaging: false,
        terminal: true,
        webhooks: false
      }
    })

    const emitted = emittedRendererHarnessMarker(define)
    assert.equal(emitted.length, 1)
    assert.equal(emitted[0].fileName, RENDERER_HARNESS_MARKER_FILENAME)
    assert.deepEqual(JSON.parse(emitted[0].source), marker)
  })
})

test('Vite leaves ordinary builds unbranded when no selector is set', () => {
  const define = harnessViteDefines({})

  assert.equal(define.__HERMES_DESKTOP_HARNESS__, JSON.stringify(''))
  assert.equal(define.__HERMES_HARNESS_SHOW_AGENTS__, JSON.stringify('false'))
  assert.equal(define.__HERMES_HARNESS_SHOW_CRON__, JSON.stringify('true'))
  assert.equal(rendererHarnessMarkerFromDefines(define), null)
  assert.deepEqual(emittedRendererHarnessMarker(define), [])
})

test('Vite keeps ordinary builds unbranded when a Lemon selector is inherited by Hermes', () => {
  withHarnessConfigs(lemonPath => {
    const define = harnessViteDefines({
      HERMES_INSTALLER_BRAND: 'hermes',
      LEMON_AI_DESKTOP_HARNESS_CONFIG: lemonPath
    })

    assert.equal(define.__HERMES_DESKTOP_HARNESS__, JSON.stringify(''))
    assert.equal(define.__HERMES_HARNESS_SHOW_AGENTS__, JSON.stringify('false'))
  })
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
