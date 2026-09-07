import assert from 'node:assert/strict'

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
