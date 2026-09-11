import { spawnSync } from 'node:child_process'

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const result = spawnSync(npm, ['exec', 'tauri', '--', 'build', '--config', 'src-tauri/tauri.lemon.conf.json'], {
  cwd: new URL('..', import.meta.url),
  env: { ...process.env, HERMES_INSTALLER_BRAND: 'lemon' },
  stdio: 'inherit'
})
if (result.error) throw result.error
process.exitCode = result.status ?? 1
