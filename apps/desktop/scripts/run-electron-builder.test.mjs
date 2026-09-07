import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'vitest'

import { buildElectronBuilderArgs, isDirectRun } from './run-electron-builder.mjs'

test('electron-builder args include harness extraResource only when generated resource exists', () => {
  const withHarness = buildElectronBuilderArgs({
    dist: null,
    harnessResourcePath: 'build/internal-desktop-harness.json',
    argv: ['--dir']
  })
  assert.ok(withHarness.includes('-c.extraResources.2.from=build/internal-desktop-harness.json'))
  assert.ok(withHarness.includes('-c.extraResources.2.to=internal-desktop-harness.json'))

  const ordinary = buildElectronBuilderArgs({ dist: null, harnessResourcePath: null, argv: ['--dir'] })
  assert.equal(ordinary.some(arg => String(arg).includes('internal-desktop-harness.json')), false)
})

test('package build script generates harness resource before Vite reads harness flags', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  assert.match(pkg.scripts.build, /write-build-stamp\.mjs && node scripts\/internal-desktop-harness\.mjs && vite build/)
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
