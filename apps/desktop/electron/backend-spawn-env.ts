export function buildHermesBackendSpawnEnv({
  processEnv = process.env,
  runtimeEnv = {},
  hermesHome,
  backendEnv = {},
  terminalCwd,
  sessionToken,
  parentIdentityEnv = {},
  webDist,
  readyFile
}: {
  processEnv?: NodeJS.ProcessEnv | Record<string, string | undefined>
  runtimeEnv?: Record<string, string | undefined>
  hermesHome: string
  backendEnv?: Record<string, string>
  terminalCwd: string
  sessionToken: string
  parentIdentityEnv?: Record<string, string>
  webDist: string
  readyFile?: string | null
}): Record<string, string | undefined> {
  return {
    ...processEnv,
    ...backendEnv,
    ...runtimeEnv,
    HERMES_HOME: hermesHome,
    TERMINAL_CWD: terminalCwd,
    HERMES_DASHBOARD_SESSION_TOKEN: sessionToken,
    HERMES_DESKTOP: '1',
    ...parentIdentityEnv,
    HERMES_WEB_DIST: webDist,
    ...(readyFile ? { HERMES_DESKTOP_READY_FILE: readyFile } : {})
  }
}
