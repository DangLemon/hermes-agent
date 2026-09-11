import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { test } from 'vitest'

const mainSource = fs.readFileSync(path.join(import.meta.dirname, 'main.ts'), 'utf8').replace(/\r\n/g, '\n')

function functionBody(name: string): string {
  const start = mainSource.indexOf(`function ${name}(`)

  assert.notEqual(start, -1, `${name} must exist in main.ts`)

  const end = mainSource.indexOf('\nfunction ', start + 1)

  return mainSource.slice(start, end === -1 ? undefined : end)
}

test('requested internal harness keeps Lemon identity when activation is unavailable', () => {
  assert.match(
    mainSource,
    /resolveDesktopRuntimeIdentity\(\{\s*internalHarnessRequested:\s*INTERNAL_DESKTOP_HARNESS\.requested\s*\}\)/
  )
})

test('desktop child environment carries both internal overrides and legacy runtime compatibility', () => {
  const body = functionBody('desktopRuntimeEnv')

  assert.match(body, /HERMES_DESKTOP_INTERNAL:\s*INTERNAL_DESKTOP_HARNESS\.requested\s*\?\s*'1'/)
  assert.match(body, /HERMES_DESKTOP_HOME_OVERRIDE:\s*HERMES_HOME/)
  assert.match(body, /const runtimeDirName = path\.basename\(ACTIVE_HERMES_ROOT\)/)
  assert.match(body, /HERMES_DESKTOP_RUNTIME_DIR_NAME:\s*runtimeDirName/)
  assert.match(body, /\n\s*HERMES_HOME,\n/)
  assert.match(body, /HERMES_INSTALL_RUNTIME_DIR_NAME:\s*runtimeDirName/)
})

test('managed SSH connections store control sockets under the active desktop home', () => {
  const body = functionBody('bootstrapSshConnectionInner')

  assert.match(body, /controlDir:\s*path\.join\(HERMES_HOME,\s*'desktop-ssh'\)/)
})

test('first-run bootstrap receives the same internal home and runtime identity', () => {
  const callStart = mainSource.indexOf('const bootstrapResult = await runBootstrap({')

  assert.notEqual(callStart, -1, 'runBootstrap call must exist in main.ts')

  const call = mainSource.slice(callStart, callStart + 2_000)

  assert.match(call, /desktopInternal:\s*INTERNAL_DESKTOP_HARNESS\.requested/)
  assert.match(call, /desktopHomeOverride:\s*HERMES_HOME/)
  assert.match(call, /runtimeDirName:\s*path\.basename\(ACTIVE_HERMES_ROOT\)/)
})
