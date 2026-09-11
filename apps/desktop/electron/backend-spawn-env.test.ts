import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { test } from 'vitest'

import { buildHermesBackendSpawnEnv } from './backend-spawn-env'

for (const label of ['primary', 'pooled'] as const) {
  test(`${label} backend spawn env carries managed dir from the selected local runtime descriptor`, () => {
    const env = buildHermesBackendSpawnEnv({
      processEnv: { PATH: '/usr/bin', HERMES_MANAGED_DIR: '/stale' },
      hermesHome: '/tmp/hermes-home',
      backendEnv: { PYTHONPATH: '/repo', HERMES_MANAGED_DIR: `/tmp/${label}-managed` },
      terminalCwd: '/tmp/hermes-home',
      sessionToken: 'session-token',
      parentIdentityEnv: { HERMES_DESKTOP_PARENT_PID: '123' },
      webDist: '/app/dist',
      readyFile: label === 'primary' ? '/tmp/ready.json' : null
    })

    assert.equal(env.HERMES_MANAGED_DIR, `/tmp/${label}-managed`)
    assert.equal(env.HERMES_HOME, '/tmp/hermes-home')
    assert.equal(env.HERMES_DESKTOP, '1')
    assert.equal(env.TERMINAL_CWD, '/tmp/hermes-home')
    assert.equal(env.HERMES_WEB_DIST, '/app/dist')
  })
}


test('resolver-provided PATH hermes CLI backend env reaches spawn env before config load', () => {
  const resolverOutput = { env: { HERMES_MANAGED_DIR: '/tmp/path-cli-managed', PYTHONUTF8: '1' } }

  const env = buildHermesBackendSpawnEnv({
    processEnv: { HERMES_MANAGED_DIR: '/stale' },
    hermesHome: '/tmp/hermes-home',
    backendEnv: resolverOutput.env,
    terminalCwd: '/tmp/hermes-home',
    sessionToken: 'token',
    webDist: '/dist'
  })

  assert.equal(env.HERMES_MANAGED_DIR, '/tmp/path-cli-managed')
})

test('resolver-provided system Python backend env reaches spawn env before config load', () => {
  const resolverOutput = { env: { HERMES_MANAGED_DIR: '/tmp/system-python-managed', PYTHONUTF8: '1' } }

  const env = buildHermesBackendSpawnEnv({
    processEnv: {},
    hermesHome: '/tmp/hermes-home',
    backendEnv: resolverOutput.env,
    terminalCwd: '/tmp/hermes-home',
    sessionToken: 'token',
    webDist: '/dist'
  })

  assert.equal(env.HERMES_MANAGED_DIR, '/tmp/system-python-managed')
})

test('Lemon desktop runtime identity reaches backend child env', () => {
  const env = buildHermesBackendSpawnEnv({
    processEnv: { HERMES_UPDATE_PRODUCT_NAME: 'stale' },
    runtimeEnv: {
      LEMON_AI_DESKTOP_INTERNAL: '1',
      LEMON_AI_HOME: '/tmp/.lemon-ai',
      LEMON_AI_INSTALL_RUNTIME_DIR_NAME: 'lemon-agent',
      HERMES_DESKTOP_INTERNAL: '1',
      HERMES_INSTALL_RUNTIME_DIR_NAME: 'lemon-agent',
      HERMES_UPDATE_MARKER_NAME: '.lemon-ai-update-in-progress',
      HERMES_UPDATE_PRODUCT_NAME: 'Lemon AI'
    },
    backendEnv: { HERMES_UPDATE_PRODUCT_NAME: 'resolver-stale' },
    hermesHome: '/tmp/.lemon-ai',
    terminalCwd: '/tmp/.lemon-ai',
    sessionToken: 'token',
    webDist: '/dist'
  })

  assert.equal(env.LEMON_AI_DESKTOP_INTERNAL, '1')
  assert.equal(env.LEMON_AI_HOME, '/tmp/.lemon-ai')
  assert.equal(env.LEMON_AI_INSTALL_RUNTIME_DIR_NAME, 'lemon-agent')
  assert.equal(env.HERMES_DESKTOP_INTERNAL, '1')
  assert.equal(env.HERMES_INSTALL_RUNTIME_DIR_NAME, 'lemon-agent')
  assert.equal(env.HERMES_UPDATE_MARKER_NAME, '.lemon-ai-update-in-progress')
  assert.equal(env.HERMES_UPDATE_PRODUCT_NAME, 'Lemon AI')
})

test('main passes desktop runtime identity to pooled and primary backend children', () => {
  const source = fs.readFileSync(path.join(import.meta.dirname, 'main.ts'), 'utf8')

  const calls = source.match(
    /buildHermesBackendSpawnEnv\(\{[\s\S]*?runtimeEnv: desktopRuntimeEnv\(\)[\s\S]*?\n\s+\}\)/g
  )

  assert.equal(calls?.length, 2)
})
