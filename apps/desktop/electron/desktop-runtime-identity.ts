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
  return identity === HERMES_IDENTITY
}

function envValue(env: Record<string, string | undefined>, name: string): string {
  return (env[name] || '').trim()
}

export function resolveDesktopHomeOverride(
  env: Record<string, string | undefined>,
  identity: DesktopRuntimeIdentity
): string {
  const desktopOverride = envValue(env, 'HERMES_DESKTOP_HOME_OVERRIDE')

  if (desktopOverride) {
    return desktopOverride
  }

  if (identity === HERMES_IDENTITY) {
    return envValue(env, 'HERMES_HOME')
  }

  return envValue(env, 'LEMON_AI_HOME')
}

export function resolveDesktopRuntimeDirNameOverride(
  env: Record<string, string | undefined>,
  identity: DesktopRuntimeIdentity
): string {
  const desktopOverride = envValue(env, 'HERMES_DESKTOP_RUNTIME_DIR_NAME')

  if (desktopOverride) {
    return desktopOverride
  }

  if (identity === HERMES_IDENTITY) {
    return envValue(env, 'HERMES_INSTALL_RUNTIME_DIR_NAME')
  }

  return ''
}

export function resolveDesktopRuntimeRoot(
  hermesHome: string,
  identity: DesktopRuntimeIdentity,
  runtimeDirNameOverride = ''
): string {
  const runtimeDirName = runtimeDirNameOverride.trim() || identity.runtimeRootDirName

  if (
    runtimeDirName === '.' ||
    runtimeDirName === '..' ||
    runtimeDirName.includes('/') ||
    runtimeDirName.includes('\\')
  ) {
    throw new Error('runtime directory override must be a directory name')
  }

  return path.join(hermesHome, runtimeDirName)
}

export { HERMES_IDENTITY, LEMON_AI_IDENTITY }
