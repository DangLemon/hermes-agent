import path from 'node:path'

export interface DesktopRuntimeIdentity {
  appId: string
  appName: string
  bootstrapMarkerName: string
  desktopLogName: string
  handoffResultName: string
  legacyBootstrapMarkerNames: string[]
  legacyDesktopLogNames: string[]
  legacyHandoffResultNames: string[]
  legacyPosixHomeDirNames: string[]
  legacyRuntimeRootDirNames: string[]
  legacyUpdateMarkerNames: string[]
  legacyWindowsLocalAppDataDirNames: string[]
  posixHomeDirName: string
  runtimeRootDirName: string
  stagedUpdaterNames: string[]
  updateHandoffLogName: string
  updateTempPrefix: string
  updateMarkerName: string
  userDataHomeDirName: string
  windowsLocalAppDataDirName: string
}

const HERMES_IDENTITY: DesktopRuntimeIdentity = Object.freeze({
  appId: 'com.nousresearch.hermes',
  appName: 'Hermes',
  bootstrapMarkerName: '.hermes-bootstrap-complete',
  desktopLogName: 'desktop.log',
  handoffResultName: '.hermes-update-result.json',
  legacyBootstrapMarkerNames: [],
  legacyDesktopLogNames: [],
  legacyHandoffResultNames: [],
  legacyPosixHomeDirNames: [],
  legacyRuntimeRootDirNames: [],
  legacyUpdateMarkerNames: [],
  legacyWindowsLocalAppDataDirNames: [],
  posixHomeDirName: '.hermes',
  runtimeRootDirName: 'hermes-agent',
  stagedUpdaterNames: ['hermes-setup.exe'],
  updateHandoffLogName: 'desktop-update-handoff.log',
  updateTempPrefix: 'hermes-update',
  updateMarkerName: '.hermes-update-in-progress',
  userDataHomeDirName: 'hermes-home',
  windowsLocalAppDataDirName: 'hermes'
})

const LEMON_AI_IDENTITY: DesktopRuntimeIdentity = Object.freeze({
  appId: 'com.lemondigital.lemonai',
  appName: 'Lemon AI',
  bootstrapMarkerName: '.lemon-ai-bootstrap-complete',
  desktopLogName: 'lemon-ai-desktop.log',
  handoffResultName: '.lemon-ai-update-result.json',
  legacyBootstrapMarkerNames: ['.hermes-bootstrap-complete'],
  legacyDesktopLogNames: ['desktop.log'],
  legacyHandoffResultNames: ['.hermes-update-result.json'],
  legacyPosixHomeDirNames: ['.hermes'],
  legacyRuntimeRootDirNames: ['hermes-agent'],
  legacyUpdateMarkerNames: ['.hermes-update-in-progress'],
  legacyWindowsLocalAppDataDirNames: ['hermes'],
  posixHomeDirName: '.lemon-ai',
  runtimeRootDirName: 'lemon-agent',
  stagedUpdaterNames: ['lemon-ai-setup.exe', 'hermes-setup.exe'],
  updateHandoffLogName: 'lemon-ai-desktop-update-handoff.log',
  updateTempPrefix: 'lemon-ai-update',
  updateMarkerName: '.lemon-ai-update-in-progress',
  userDataHomeDirName: 'lemon-ai-home',
  windowsLocalAppDataDirName: 'Lemon AI'
})

export function resolveDesktopRuntimeIdentity({
  internalHarnessRequested = false
}: {
  internalHarnessRequested?: boolean
} = {}): DesktopRuntimeIdentity {
  return internalHarnessRequested ? LEMON_AI_IDENTITY : HERMES_IDENTITY
}

export function resolveInternalDesktopBuild({
  internalPackage = false,
  internalHarnessRequested = false
}: {
  internalPackage?: boolean
  internalHarnessRequested?: boolean
} = {}): boolean {
  return internalPackage || internalHarnessRequested
}

export function resolveDefaultDesktopHome({
  homeDir,
  identity,
  isWindows = false,
  localAppData
}: {
  homeDir: string
  identity: DesktopRuntimeIdentity
  isWindows?: boolean
  localAppData?: string | null
}): string {
  if (isWindows && localAppData) {
    return path.join(localAppData, identity.windowsLocalAppDataDirName)
  }

  return path.join(homeDir, identity.posixHomeDirName)
}

export function shouldReadWindowsHermesHomeRegistry(identity: DesktopRuntimeIdentity): boolean {
  return Boolean(resolveDesktopHomeRegistryEnvVarName(identity))
}

export function resolveDesktopHomeRegistryEnvVarName(identity: DesktopRuntimeIdentity): 'HERMES_HOME' | 'LEMON_AI_HOME' {
  return identity === HERMES_IDENTITY ? 'HERMES_HOME' : 'LEMON_AI_HOME'
}

export function shouldPreferWindowsDesktopRegistry(identity: DesktopRuntimeIdentity): boolean {
  return identity === LEMON_AI_IDENTITY
}

export function resolveDesktopRuntimeDirNameRegistryEnvVarName(
  identity: DesktopRuntimeIdentity
): 'HERMES_INSTALL_RUNTIME_DIR_NAME' | 'LEMON_AI_INSTALL_RUNTIME_DIR_NAME' {
  return identity === HERMES_IDENTITY ? 'HERMES_INSTALL_RUNTIME_DIR_NAME' : 'LEMON_AI_INSTALL_RUNTIME_DIR_NAME'
}

function envValue(env: Record<string, string | undefined>, name: string): string {
  return (env[name] || '').trim()
}

function identityHomeEnvOverride(
  env: Record<string, string | undefined>,
  identity: DesktopRuntimeIdentity
): string {
  if (identity === HERMES_IDENTITY) {
    return envValue(env, 'HERMES_HOME')
  }

  return envValue(env, 'LEMON_AI_HOME')
}

export function resolveDesktopHomeOverride(
  env: Record<string, string | undefined>,
  identity: DesktopRuntimeIdentity
): string {
  const desktopOverride = envValue(env, 'HERMES_DESKTOP_HOME_OVERRIDE')

  if (desktopOverride) {
    return desktopOverride
  }

  return identityHomeEnvOverride(env, identity)
}

export function resolveDesktopHomeOverrideWithRegistry({
  env,
  identity,
  preferRegistry = false,
  registryValue = ''
}: {
  env: Record<string, string | undefined>
  identity: DesktopRuntimeIdentity
  preferRegistry?: boolean
  registryValue?: string | null
}): string {
  const desktopOverride = envValue(env, 'HERMES_DESKTOP_HOME_OVERRIDE')

  if (desktopOverride) {
    return desktopOverride
  }

  const envOverride = identityHomeEnvOverride(env, identity)
  const registryOverride = (registryValue || '').trim()

  return preferRegistry ? registryOverride || envOverride : envOverride || registryOverride
}

export function resolveDesktopHomeOverrideFromWindowsRegistry({
  env,
  identity,
  isWindows = false,
  readRegistry = () => null
}: {
  env: Record<string, string | undefined>
  identity: DesktopRuntimeIdentity
  isWindows?: boolean
  readRegistry?: (name: string) => string | null
}): string {
  const desktopOverride = envValue(env, 'HERMES_DESKTOP_HOME_OVERRIDE')
  const envOverride = identityHomeEnvOverride(env, identity)
  const preferRegistry = isWindows && shouldPreferWindowsDesktopRegistry(identity)

  const registryValue =
    isWindows &&
    shouldReadWindowsHermesHomeRegistry(identity) &&
    !desktopOverride &&
    (preferRegistry || !envOverride)
      ? readRegistry(resolveDesktopHomeRegistryEnvVarName(identity))
      : ''

  return resolveDesktopHomeOverrideWithRegistry({
    env,
    identity,
    preferRegistry,
    registryValue
  })
}

function identityRuntimeDirNameEnvOverride(
  env: Record<string, string | undefined>,
  identity: DesktopRuntimeIdentity
): string {
  if (identity === HERMES_IDENTITY) {
    return envValue(env, 'HERMES_INSTALL_RUNTIME_DIR_NAME')
  }

  return envValue(env, 'LEMON_AI_INSTALL_RUNTIME_DIR_NAME')
}

export function resolveDesktopRuntimeDirNameOverride(
  env: Record<string, string | undefined>,
  identity: DesktopRuntimeIdentity
): string {
  const desktopOverride = envValue(env, 'HERMES_DESKTOP_RUNTIME_DIR_NAME')

  if (desktopOverride) {
    return desktopOverride
  }

  return identityRuntimeDirNameEnvOverride(env, identity)
}

export function resolveDesktopRuntimeDirNameOverrideWithRegistry({
  env,
  identity,
  preferRegistry = false,
  registryValue = ''
}: {
  env: Record<string, string | undefined>
  identity: DesktopRuntimeIdentity
  preferRegistry?: boolean
  registryValue?: string | null
}): string {
  const desktopOverride = envValue(env, 'HERMES_DESKTOP_RUNTIME_DIR_NAME')

  if (desktopOverride) {
    return desktopOverride
  }

  const envOverride = identityRuntimeDirNameEnvOverride(env, identity)
  const registryOverride = (registryValue || '').trim()

  return preferRegistry ? registryOverride || envOverride : envOverride || registryOverride
}

export function resolveDesktopRuntimeDirNameOverrideFromWindowsRegistry({
  env,
  identity,
  isWindows = false,
  readRegistry = () => null
}: {
  env: Record<string, string | undefined>
  identity: DesktopRuntimeIdentity
  isWindows?: boolean
  readRegistry?: (name: string) => string | null
}): string {
  const desktopOverride = envValue(env, 'HERMES_DESKTOP_RUNTIME_DIR_NAME')
  const envOverride = identityRuntimeDirNameEnvOverride(env, identity)
  const preferRegistry = isWindows && shouldPreferWindowsDesktopRegistry(identity)

  const registryValue =
    isWindows && !desktopOverride && (preferRegistry || !envOverride)
      ? readRegistry(resolveDesktopRuntimeDirNameRegistryEnvVarName(identity))
      : ''

  return resolveDesktopRuntimeDirNameOverrideWithRegistry({
    env,
    identity,
    preferRegistry,
    registryValue
  })
}

export function resolveDesktopRuntimeRoot(
  hermesHome: string,
  identity: DesktopRuntimeIdentity,
  runtimeDirNameOverride = ''
): string {
  const runtimeDirName = runtimeDirNameOverride.trim() || identity.runtimeRootDirName

  if (runtimeDirName === '.' || runtimeDirName === '..' || runtimeDirName.includes('/') || runtimeDirName.includes('\\')) {
    throw new Error('runtime directory override must be a directory name')
  }

  return path.join(hermesHome, runtimeDirName)
}

export function buildDesktopRuntimeEnv({
  activeRuntimeRoot,
  harnessResourcePath,
  hermesHome,
  identity,
  internalBuild = false,
  legacyHarnessConfigPath
}: {
  activeRuntimeRoot: string
  harnessResourcePath?: string | null
  hermesHome: string
  identity: DesktopRuntimeIdentity
  internalBuild?: boolean
  legacyHarnessConfigPath?: string
}): Record<string, string | undefined> {
  const runtimeDirName = path.basename(activeRuntimeRoot)

  const env: Record<string, string | undefined> = {
    HERMES_BOOTSTRAP_MARKER_NAME: identity.bootstrapMarkerName,
    HERMES_DESKTOP_HARNESS_CONFIG: harnessResourcePath || legacyHarnessConfigPath || undefined,
    HERMES_DESKTOP_HOME_OVERRIDE: hermesHome,
    HERMES_DESKTOP_INTERNAL: internalBuild ? '1' : undefined,
    HERMES_DESKTOP_RUNTIME_DIR_NAME: runtimeDirName,
    HERMES_HOME: hermesHome,
    HERMES_INSTALL_RUNTIME_DIR_NAME: runtimeDirName,
    HERMES_UPDATE_HANDOFF_LOG_NAME: identity.updateHandoffLogName,
    HERMES_UPDATE_MARKER_NAME: identity.updateMarkerName,
    HERMES_UPDATE_PRODUCT_NAME: identity.appName,
    HERMES_UPDATE_TEMP_PREFIX: identity.updateTempPrefix,
    HERMES_UPDATE_RESULT_NAME: identity.handoffResultName
  }

  if (identity === LEMON_AI_IDENTITY) {
    env.LEMON_AI_DESKTOP_INTERNAL = internalBuild ? '1' : undefined
    env.LEMON_AI_HOME = hermesHome
    env.LEMON_AI_INSTALL_RUNTIME_DIR_NAME = runtimeDirName
  }

  return env
}

export { HERMES_IDENTITY, LEMON_AI_IDENTITY }
