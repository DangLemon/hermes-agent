// Let electron-builder resolve Electron for the requested platform and arch.
// Reusing the host's installed Electron distribution breaks cross-platform
// packaging because a macOS dist does not contain Windows' electron.exe.

import path from "node:path"
import { pathToFileURL } from "node:url"
import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import { generateInternalDesktopHarnessResource } from "./internal-desktop-harness.mjs"

const require = createRequire(import.meta.url)

function electronBuilderCli() {
  const pkgJson = require.resolve("electron-builder/package.json")
  const bin = require(pkgJson).bin
  const rel = typeof bin === "string" ? bin : bin["electron-builder"]
  return path.join(path.dirname(pkgJson), rel)
}

export function buildElectronBuilderArgs({ argv = process.argv.slice(2) } = {}) {
  // Local `hermes desktop` builds only ever package (--dir or dist), never
  // publish a GitHub release — no CI workflow drives this script. But the npm
  // lifecycle env sets CI=1 (so esbuild's postinstall doesn't try interactive
  // animations), and electron-builder treats CI=1 as a signal to implicitly
  // resolve a publish target. That resolution reads <projectDir>/.git/config
  // directly — projectDir here is apps/desktop, which has no .git of its own
  // (only the repo root does) and no "repository" field in its package.json —
  // so it fails with "Cannot detect repository by .git/config". Pin publish to
  // "never" so electron-builder skips that lookup entirely.
  const args = ["--publish", "never"]
  args.push(...argv)
  return args
}

function main() {
  generateInternalDesktopHarnessResource()
  const args = buildElectronBuilderArgs()

  const result = spawnSync(process.execPath, [electronBuilderCli(), ...args], {
    stdio: "inherit",
  })
  if (result.error) {
    console.error(`[run-electron-builder] spawn failed: ${result.error.message}`)
    process.exit(1)
  }
  process.exit(result.status == null ? 1 : result.status)
}

export function isDirectRun(metaUrl, argv1 = process.argv[1], {
  resolve = path.resolve,
  pathToFileURLHref = value => pathToFileURL(value).href
} = {}) {
  return Boolean(argv1) && metaUrl === pathToFileURLHref(resolve(argv1))
}

if (isDirectRun(import.meta.url)) {
  main()
}
