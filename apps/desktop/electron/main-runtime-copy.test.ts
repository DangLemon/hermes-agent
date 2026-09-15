import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { test } from 'vitest'

const mainSource = () => fs.readFileSync(path.join(import.meta.dirname, 'main.ts'), 'utf8')

test('main runtime copy preserves raw dynamic backend and runtime values', () => {
  const source = mainSource()

  const forbiddenWholeStringRewrites = [
    'runtimeUserText(String(result.message',
    'runtimeUserText(`Update failed to start: ${handoffOutcome.message}',
    'runtimeUserText(String(bootstrapResult.error',
    'error: runtimeUserText(error.message)',
    'runtimeUserText(`Hermes venv missing at ${VENV_ROOT}',
    'runtimeUserText(`Starting Hermes backend via ${backend.label}',
    'runtimeUserText(`Connecting to remote Hermes backend at ${remote.baseUrl}',
    'runtimeUserText(`Hermes backend failed to start: ${error.message}',
    'runtimeUserText(`Hermes backend exited before it became ready (${signal || code}).${primaryOutputTail.describe()}',
    'runtimeUserText(`Hermes backend exited before it became ready (${signal || code}). Log: ${DESKTOP_LOG_PATH}',
    'runtimeUserText(`Local Hermes backend is HTTP-reachable but the WebSocket (/api/ws) rejected the session token: ${wsProbe.reason}',
    "runtimeUserText(`Can't run the uninstaller: no Hermes agent venv at ${VENV_ROOT}."
  ]

  for (const pattern of forbiddenWholeStringRewrites) {
    assert.equal(source.includes(pattern), false, pattern)
  }

  assert.match(
    source,
    /runtimeUserTemplate`Update failed to start: \$\{handoffOutcome\.message\}\. Hermes will keep running/
  )
  assert.match(source, /runtimeUserTemplate`Connecting to remote Hermes backend at \$\{remote\.baseUrl\}`/)
  assert.match(source, /runtimeUserTemplate`Starting Hermes backend via \$\{backend\.label\}`/)
  assert.match(source, /error: error\.message/)
  assert.match(
    source,
    /runtimeUserTemplate`Local Hermes backend is HTTP-reachable but the WebSocket \(\/api\/ws\) rejected the session token: \$\{wsProbe\.reason\}`/
  )
})

test('main Cloud auth errors use the runtime desktop product name', () => {
  const source = mainSource()

  assert.match(source, /You are not signed in to \$\{DESKTOP_RUNTIME_IDENTITY\.appName\} Cloud\. Open Settings/)
  assert.match(source, /Your \$\{DESKTOP_RUNTIME_IDENTITY\.appName\} Cloud session has expired/)
  assert.doesNotMatch(source, /You are not signed in to Hermes Cloud\./)
  assert.doesNotMatch(source, /Your Hermes Cloud session has expired\./)
})

test('main active backend label uses the runtime desktop product name', () => {
  const source = mainSource()

  assert.match(source, /label: `\$\{DESKTOP_RUNTIME_IDENTITY\.appName\} at \$\{ACTIVE_HERMES_ROOT\}`/)
  assert.match(source, /backend\.label = `\$\{DESKTOP_RUNTIME_IDENTITY\.appName\} at \$\{ACTIVE_HERMES_ROOT\} \(venv: \$\{VENV_ROOT\}\)`/)
  assert.doesNotMatch(source, /label: `Hermes at \$\{ACTIVE_HERMES_ROOT\}`/)
  assert.doesNotMatch(source, /backend\.label = `Hermes at \$\{ACTIVE_HERMES_ROOT\} \(venv:/)
})

test('main bootstrap-needed label uses the runtime desktop product name', () => {
  const source = mainSource()

  assert.match(source, /label: `\$\{DESKTOP_RUNTIME_IDENTITY\.appName\} not installed yet; bootstrap required`/)
  assert.doesNotMatch(source, /label: 'Hermes Agent not installed yet; bootstrap required'/)
})

test('legacy manual update path stops when the internal origin cannot be normalized', () => {
  const source = mainSource()
  const start = source.indexOf('if (!resolveUpdateScriptHandoff(updateRoot))')
  const end = source.indexOf('return { ok: true, manual: true, command, hermesRoot: updateRoot }', start)
  const body = source.slice(start, end)

  assert.notEqual(start, -1, 'legacy manual update branch must remain present')
  assert.notEqual(end, -1, 'legacy manual update branch must have a bounded success path')
  assert.match(body, /ensureUpdateOriginRepository\(updateRoot, updateRepository\)/)
  assert.match(body, /if \(!originReady\.ok\)/)
  assert.match(body, /error: 'origin-config-failed'/)
})

test('legacy POSIX manual update path also verifies the configured origin', () => {
  const source = mainSource()
  const functionStart = source.indexOf('async function applyUpdatesPosixHandoff')
  const start = source.indexOf('if (!handoff)', functionStart)
  const end = source.indexOf('const handoffConflict', start)
  const body = source.slice(start, end)

  assert.notEqual(functionStart, -1, 'POSIX handoff helper must remain present')
  assert.notEqual(start, -1, 'POSIX legacy fallback must remain present')
  assert.notEqual(end, -1, 'POSIX legacy fallback must have a bounded success path')
  assert.match(body, /ensureUpdateOriginRepository\(updateRoot, updateRepository\)/)
  assert.match(body, /error: 'origin-config-failed'/)
  assert.ok(body.indexOf('ensureUpdateOriginRepository') < body.indexOf("emitUpdateProgress({ stage: 'manual'"))
})
