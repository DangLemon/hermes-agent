import path from 'node:path'

export interface GitBinaryOptions {
  isWindows: boolean
  env: Record<string, string | undefined>
  fileExists: (filePath: string) => boolean
  findOnPath?: (command: string) => string | null
  hermesHome?: string
  localAppDataProductDirs?: string[]
}

/**
 * Locate git.exe for desktop update checks.
 *
 * Windows packaged installs may only have PortableGit under the selected
 * HERMES_HOME. Lemon AI uses %LOCALAPPDATA%\Lemon AI, while legacy Hermes used
 * %LOCALAPPDATA%\hermes, so probe the active home first and keep legacy homes as
 * migration fallbacks before system Git/PATH.
 */
export function resolveGitBinaryPath(opts: GitBinaryOptions): string {
  const { isWindows, env, fileExists, findOnPath } = opts

  if (!isWindows) {
    return findOnPath?.('git') || 'git'
  }

  const localAppData = env.LOCALAPPDATA || ''
  const candidates: string[] = []
  const joinWin = path.win32.join

  const productHomes = [
    opts.hermesHome,
    ...(localAppData
      ? (opts.localAppDataProductDirs?.length ? opts.localAppDataProductDirs : ['hermes']).map(name =>
          joinWin(localAppData, name)
        )
      : [])
  ].filter((value): value is string => Boolean(value))

  for (const home of Array.from(new Set(productHomes))) {
    candidates.push(joinWin(home, 'git', 'cmd', 'git.exe'))
    candidates.push(joinWin(home, 'git', 'bin', 'git.exe'))
  }

  candidates.push(joinWin(env['ProgramFiles'] || 'C:\\Program Files', 'Git', 'cmd', 'git.exe'))
  candidates.push(joinWin(env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Git', 'cmd', 'git.exe'))

  if (localAppData) {
    candidates.push(joinWin(localAppData, 'Programs', 'Git', 'cmd', 'git.exe'))
  }

  for (const candidate of candidates) {
    if (fileExists(candidate)) {
      return candidate
    }
  }

  return findOnPath?.('git') || 'git'
}
