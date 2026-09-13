import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  buildDesktopRuntimeEnv,
  HERMES_IDENTITY,
  LEMON_AI_IDENTITY,
  resolveDefaultDesktopHome,
  resolveDesktopHomeOverride,
  resolveDesktopHomeOverrideFromWindowsRegistry,
  resolveDesktopHomeOverrideWithRegistry,
  resolveDesktopHomeRegistryEnvVarName,
  resolveDesktopRuntimeDirNameOverride,
  resolveDesktopRuntimeDirNameOverrideFromWindowsRegistry,
  resolveDesktopRuntimeDirNameOverrideWithRegistry,
  resolveDesktopRuntimeDirNameRegistryEnvVarName,
  resolveDesktopRuntimeIdentity,
  resolveDesktopRuntimeRoot,
  resolveInternalDesktopBuild,
  shouldPreferWindowsDesktopRegistry,
  shouldReadWindowsHermesHomeRegistry
} from './desktop-runtime-identity'

test('desktop runtime child env carries Lemon identity and compatibility variables', () => {
  assert.deepEqual(
    buildDesktopRuntimeEnv({
      activeRuntimeRoot: '/Users/test/.lemon-ai/lemon-agent',
      harnessResourcePath: '/Applications/Lemon AI.app/Contents/Resources/lemon-ai-harness.json',
      hermesHome: '/Users/test/.lemon-ai',
      identity: LEMON_AI_IDENTITY,
      internalBuild: true,
      legacyHarnessConfigPath: '/tmp/legacy-harness.json'
    }),
    {
      HERMES_BOOTSTRAP_MARKER_NAME: '.lemon-ai-bootstrap-complete',
      HERMES_DESKTOP_HARNESS_CONFIG: '/Applications/Lemon AI.app/Contents/Resources/lemon-ai-harness.json',
      HERMES_DESKTOP_HOME_OVERRIDE: '/Users/test/.lemon-ai',
      HERMES_DESKTOP_INTERNAL: '1',
      HERMES_DESKTOP_RUNTIME_DIR_NAME: 'lemon-agent',
      HERMES_HOME: '/Users/test/.lemon-ai',
      HERMES_INSTALL_RUNTIME_DIR_NAME: 'lemon-agent',
      LEMON_AI_DESKTOP_INTERNAL: '1',
      LEMON_AI_HOME: '/Users/test/.lemon-ai',
      LEMON_AI_INSTALL_RUNTIME_DIR_NAME: 'lemon-agent',
      HERMES_UPDATE_HANDOFF_LOG_NAME: 'lemon-ai-desktop-update-handoff.log',
      HERMES_UPDATE_MARKER_NAME: '.lemon-ai-update-in-progress',
      HERMES_UPDATE_PRODUCT_NAME: 'Lemon AI',
      HERMES_UPDATE_TEMP_PREFIX: 'lemon-ai-update',
      HERMES_UPDATE_RESULT_NAME: '.lemon-ai-update-result.json'
    }
  )
})

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

test('baked internal package selects Lemon identity independently of harness activation', () => {
  const internalBuild = resolveInternalDesktopBuild({
    internalPackage: true,
    internalHarnessRequested: false
  })

  assert.equal(internalBuild, true)
  assert.equal(resolveDesktopRuntimeIdentity({ internalHarnessRequested: internalBuild }), LEMON_AI_IDENTITY)
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
  assert.equal(
    resolveDesktopRuntimeRoot('/Users/test/.lemon-ai', LEMON_AI_IDENTITY),
    '/Users/test/.lemon-ai/lemon-agent'
  )
  assert.equal(shouldReadWindowsHermesHomeRegistry(LEMON_AI_IDENTITY), true)
  assert.equal(shouldReadWindowsHermesHomeRegistry(HERMES_IDENTITY), true)
  assert.equal(resolveDesktopHomeRegistryEnvVarName(LEMON_AI_IDENTITY), 'LEMON_AI_HOME')
  assert.equal(resolveDesktopHomeRegistryEnvVarName(HERMES_IDENTITY), 'HERMES_HOME')
  assert.equal(resolveDesktopRuntimeDirNameRegistryEnvVarName(LEMON_AI_IDENTITY), 'LEMON_AI_INSTALL_RUNTIME_DIR_NAME')
  assert.equal(resolveDesktopRuntimeDirNameRegistryEnvVarName(HERMES_IDENTITY), 'HERMES_INSTALL_RUNTIME_DIR_NAME')
  assert.equal(shouldPreferWindowsDesktopRegistry(LEMON_AI_IDENTITY), true)
  assert.equal(shouldPreferWindowsDesktopRegistry(HERMES_IDENTITY), false)
  assert.equal(resolveDesktopHomeOverride({ HERMES_HOME: '/Users/test/.hermes' }, LEMON_AI_IDENTITY), '')
  assert.equal(
    resolveDesktopHomeOverride({ LEMON_AI_HOME: '/Users/test/.lemon-ai-custom' }, LEMON_AI_IDENTITY),
    '/Users/test/.lemon-ai-custom'
  )
  assert.equal(
    resolveDesktopRuntimeDirNameOverride({ HERMES_INSTALL_RUNTIME_DIR_NAME: 'hermes-agent' }, LEMON_AI_IDENTITY),
    ''
  )
  assert.equal(
    resolveDesktopRuntimeDirNameOverride({ LEMON_AI_INSTALL_RUNTIME_DIR_NAME: 'lemon-custom' }, LEMON_AI_IDENTITY),
    'lemon-custom'
  )
  assert.equal(
    resolveDesktopHomeOverride({ HERMES_DESKTOP_HOME_OVERRIDE: '/Users/test/lemon' }, LEMON_AI_IDENTITY),
    '/Users/test/lemon'
  )
  assert.equal(
    resolveDesktopRuntimeDirNameOverride({ HERMES_DESKTOP_RUNTIME_DIR_NAME: 'lemon-custom' }, LEMON_AI_IDENTITY),
    'lemon-custom'
  )
})

test('Windows Lemon identity prefers live registry aliases over stale process aliases', () => {
  assert.equal(
    resolveDesktopHomeOverrideWithRegistry({
      env: { LEMON_AI_HOME: 'C:\\stale-lemon-home' },
      identity: LEMON_AI_IDENTITY,
      preferRegistry: true,
      registryValue: 'D:\\fresh-lemon-home'
    }),
    'D:\\fresh-lemon-home'
  )
  assert.equal(
    resolveDesktopRuntimeDirNameOverrideWithRegistry({
      env: { LEMON_AI_INSTALL_RUNTIME_DIR_NAME: 'stale-runtime' },
      identity: LEMON_AI_IDENTITY,
      preferRegistry: true,
      registryValue: 'fresh-runtime'
    }),
    'fresh-runtime'
  )
  assert.equal(
    resolveDesktopHomeOverrideWithRegistry({
      env: {
        HERMES_DESKTOP_HOME_OVERRIDE: 'E:\\explicit-desktop-home',
        LEMON_AI_HOME: 'C:\\stale-lemon-home'
      },
      identity: LEMON_AI_IDENTITY,
      preferRegistry: true,
      registryValue: 'D:\\fresh-lemon-home'
    }),
    'E:\\explicit-desktop-home'
  )
})

test('Windows Hermes identity keeps process aliases ahead of registry fallback', () => {
  assert.equal(
    resolveDesktopHomeOverrideWithRegistry({
      env: { HERMES_HOME: 'C:\\process-hermes-home' },
      identity: HERMES_IDENTITY,
      registryValue: 'D:\\registry-hermes-home'
    }),
    'C:\\process-hermes-home'
  )
  assert.equal(
    resolveDesktopRuntimeDirNameOverrideWithRegistry({
      env: { HERMES_INSTALL_RUNTIME_DIR_NAME: 'process-runtime' },
      identity: HERMES_IDENTITY,
      registryValue: 'registry-runtime'
    }),
    'process-runtime'
  )
  assert.equal(
    resolveDesktopHomeOverrideWithRegistry({
      env: {},
      identity: HERMES_IDENTITY,
      registryValue: 'D:\\registry-hermes-home'
    }),
    'D:\\registry-hermes-home'
  )
})

test('explicit desktop overrides bypass Windows registry reads for fresh sandboxes', () => {
  const reads: string[] = []

  const readRegistry = (name: string) => {
    reads.push(name)

    return 'registry-value'
  }

  const env = {
    HERMES_DESKTOP_HOME_OVERRIDE: 'E:\\sandbox-home',
    HERMES_DESKTOP_RUNTIME_DIR_NAME: 'sandbox-runtime',
    LEMON_AI_HOME: 'C:\\stale-lemon-home',
    LEMON_AI_INSTALL_RUNTIME_DIR_NAME: 'stale-runtime'
  }

  assert.equal(
    resolveDesktopHomeOverrideFromWindowsRegistry({
      env,
      identity: LEMON_AI_IDENTITY,
      isWindows: true,
      readRegistry
    }),
    'E:\\sandbox-home'
  )
  assert.equal(
    resolveDesktopRuntimeDirNameOverrideFromWindowsRegistry({
      env,
      identity: LEMON_AI_IDENTITY,
      isWindows: true,
      readRegistry
    }),
    'sandbox-runtime'
  )
  assert.deepEqual(reads, [])
})

test('ordinary Hermes process aliases bypass Windows registry reads', () => {
  const reads: string[] = []

  const readRegistry = (name: string) => {
    reads.push(name)

    return 'registry-value'
  }

  const env = {
    HERMES_HOME: 'E:\\hermes-home',
    HERMES_INSTALL_RUNTIME_DIR_NAME: 'hermes-runtime'
  }

  assert.equal(
    resolveDesktopHomeOverrideFromWindowsRegistry({
      env,
      identity: HERMES_IDENTITY,
      isWindows: true,
      readRegistry
    }),
    'E:\\hermes-home'
  )
  assert.equal(
    resolveDesktopRuntimeDirNameOverrideFromWindowsRegistry({
      env,
      identity: HERMES_IDENTITY,
      isWindows: true,
      readRegistry
    }),
    'hermes-runtime'
  )
  assert.deepEqual(reads, [])
})

test('Windows Lemon identity still reads live registry aliases ahead of stale process values', () => {
  const reads: string[] = []

  const values: Record<string, string> = {
    LEMON_AI_HOME: 'D:\\fresh-lemon-home',
    LEMON_AI_INSTALL_RUNTIME_DIR_NAME: 'fresh-runtime'
  }

  const readRegistry = (name: string) => {
    reads.push(name)

    return values[name]
  }

  const env = {
    LEMON_AI_HOME: 'C:\\stale-lemon-home',
    LEMON_AI_INSTALL_RUNTIME_DIR_NAME: 'stale-runtime'
  }

  assert.equal(
    resolveDesktopHomeOverrideFromWindowsRegistry({
      env,
      identity: LEMON_AI_IDENTITY,
      isWindows: true,
      readRegistry
    }),
    'D:\\fresh-lemon-home'
  )
  assert.equal(
    resolveDesktopRuntimeDirNameOverrideFromWindowsRegistry({
      env,
      identity: LEMON_AI_IDENTITY,
      isWindows: true,
      readRegistry
    }),
    'fresh-runtime'
  )
  assert.deepEqual(reads, ['LEMON_AI_HOME', 'LEMON_AI_INSTALL_RUNTIME_DIR_NAME'])
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
