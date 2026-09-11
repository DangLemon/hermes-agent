import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  HERMES_IDENTITY,
  LEMON_AI_IDENTITY,
  resolveDefaultDesktopHome,
  resolveDesktopRuntimeIdentity,
  resolveDesktopRuntimeRoot
} from './desktop-runtime-identity'

test('ordinary desktop runtime identity keeps the Hermes filesystem contract', () => {
  const identity = resolveDesktopRuntimeIdentity()

  assert.equal(identity, HERMES_IDENTITY)
  assert.equal(identity.appId, 'com.nousresearch.hermes')
  assert.equal(identity.appName, 'Hermes')
  assert.equal(identity.posixHomeDirName, '.hermes')
  assert.equal(identity.windowsLocalAppDataDirName, 'hermes')
  assert.equal(identity.runtimeRootDirName, 'hermes-agent')
  assert.equal(identity.bootstrapMarkerName, '.hermes-bootstrap-complete')
  assert.equal(identity.updateMarkerName, '.hermes-update-in-progress')
  assert.equal(identity.handoffResultName, '.hermes-update-result.json')
  assert.equal(identity.desktopLogName, 'desktop.log')
  assert.deepEqual(identity.stagedUpdaterNames, ['hermes-setup.exe'])
  assert.equal(identity.updateTempPrefix, 'hermes-update')
})

test('internal desktop runtime identity uses Lemon AI primary names with Hermes fallbacks', () => {
  const identity = resolveDesktopRuntimeIdentity({ internalHarnessRequested: true })

  assert.equal(identity, LEMON_AI_IDENTITY)
  assert.equal(identity.appId, 'com.lemondigital.lemonai')
  assert.equal(identity.appName, 'Lemon AI')
  assert.equal(identity.posixHomeDirName, '.lemon-ai')
  assert.equal(identity.windowsLocalAppDataDirName, 'Lemon AI')
  assert.equal(identity.runtimeRootDirName, 'lemon-agent')
  assert.equal(identity.bootstrapMarkerName, '.lemon-ai-bootstrap-complete')
  assert.equal(identity.updateMarkerName, '.lemon-ai-update-in-progress')
  assert.equal(identity.handoffResultName, '.lemon-ai-update-result.json')
  assert.equal(identity.desktopLogName, 'lemon-ai-desktop.log')
  assert.deepEqual(identity.stagedUpdaterNames, ['lemon-ai-setup.exe', 'hermes-setup.exe'])
  assert.equal(identity.updateTempPrefix, 'lemon-ai-update')
  assert.deepEqual(identity.legacyPosixHomeDirNames, ['.hermes'])
  assert.deepEqual(identity.legacyWindowsLocalAppDataDirNames, ['hermes'])
  assert.deepEqual(identity.legacyRuntimeRootDirNames, ['hermes-agent'])
  assert.deepEqual(identity.legacyBootstrapMarkerNames, ['.hermes-bootstrap-complete'])
  assert.deepEqual(identity.legacyUpdateMarkerNames, ['.hermes-update-in-progress'])
  assert.deepEqual(identity.legacyHandoffResultNames, ['.hermes-update-result.json'])
})

test('internal desktop defaults never adopt legacy Hermes filesystem paths implicitly', () => {
  assert.equal(
    resolveDefaultDesktopHome({ homeDir: '/Users/test', identity: LEMON_AI_IDENTITY }),
    '/Users/test/.lemon-ai'
  )
  assert.equal(
    resolveDefaultDesktopHome({
      homeDir: 'C:\\Users\\test',
      identity: LEMON_AI_IDENTITY,
      isWindows: true,
      localAppData: 'C:\\Users\\test\\AppData\\Local'
    }),
    'C:\\Users\\test\\AppData\\Local/Lemon AI'
  )
  assert.equal(resolveDesktopRuntimeRoot('/Users/test/.lemon-ai', LEMON_AI_IDENTITY), '/Users/test/.lemon-ai/lemon-agent')
})

test('legacy runtime use requires the explicit compatibility override', () => {
  assert.equal(
    resolveDesktopRuntimeRoot('/Users/test/.lemon-ai', LEMON_AI_IDENTITY, 'hermes-agent'),
    '/Users/test/.lemon-ai/hermes-agent'
  )
  assert.throws(
    () => resolveDesktopRuntimeRoot('/Users/test/.lemon-ai', LEMON_AI_IDENTITY, '../hermes-agent'),
    /directory name/
  )
})
