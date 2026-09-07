import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'vitest'
import { validateConfiguration } from 'app-builder-lib/out/util/config/config.js'

import { buildElectronBuilderArgs, isDirectRun } from './run-electron-builder.mjs'

test('electron-builder uses a schema-valid static harness resource without indexed CLI overrides', async () => {
  const withHarness = buildElectronBuilderArgs({
    dist: null,
    argv: ['--dir']
  })
  assert.equal(withHarness.some(arg => String(arg).includes('extraResources')), false)

  const ordinary = buildElectronBuilderArgs({ dist: null, argv: ['--dir'] })
  assert.equal(ordinary.some(arg => String(arg).includes('internal-desktop-harness.json')), false)

  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  assert.deepEqual(pkg.build.extraResources.at(-1), {
    from: 'build',
    to: '.',
    filter: ['internal-desktop-harness.json']
  })
  await validateConfiguration(structuredClone(pkg.build))
})

test('package build script generates harness resource before Vite reads harness flags', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  assert.match(pkg.scripts.build, /write-build-stamp\.mjs && node scripts\/internal-desktop-harness\.mjs && vite build/)
})

test('cross-platform builds let electron-builder resolve the requested Electron distribution', () => {
  const args = buildElectronBuilderArgs({
    dist: '/host/electron/dist',
    fsExists: () => true,
    argv: ['--win', 'nsis', '--x64']
  })

  assert.equal(args.some(arg => String(arg).includes('electronDist')), false)
})


test('isDirectRun uses platform-correct file URL comparison for Windows paths', () => {
  const href = 'file:///C:/repo/apps/desktop/scripts/run-electron-builder.mjs'
  assert.equal(
    isDirectRun(href, String.raw`C:\repo\apps\desktop\scripts\run-electron-builder.mjs`, {
      resolve: value => value.replace(/\\/g, '/').replace(/^C:/, '/C:'),
      pathToFileURLHref: value => `file://${value}`
    }),
    true
  )
})
