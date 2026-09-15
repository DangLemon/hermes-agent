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
