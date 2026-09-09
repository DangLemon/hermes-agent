import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import { newestValidMacAppPath } from './mac-app-bundle.mjs'

function withTempDir(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-mac-app-bundle-'))
  try {
    return fn(root)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

function makeBundle(root, name, { appMtime, executableMtime = 50, executable = true } = {}) {
  const appPath = path.join(root, name)
  const requiredFile = path.join(appPath, 'Contents', 'MacOS', 'Hermes')
  fs.mkdirSync(path.dirname(requiredFile), { recursive: true })
  fs.writeFileSync(requiredFile, '')
  fs.chmodSync(requiredFile, executable ? 0o755 : 0o644)
  fs.utimesSync(requiredFile, executableMtime, executableMtime)
  fs.utimesSync(appPath, appMtime, appMtime)
  return { appPath, requiredFile }
}

test('selects the bundle with the newest outer app when inner executable mtimes are equal', () => {
  withTempDir(root => {
    const lemon = makeBundle(root, 'Lemon AI.app', { appMtime: 100 })
    const hermes = makeBundle(root, 'Hermes.app', { appMtime: 200 })

    assert.equal(newestValidMacAppPath([lemon, hermes], lemon.appPath), hermes.appPath)

    fs.utimesSync(lemon.appPath, 300, 300)
    assert.equal(newestValidMacAppPath([lemon, hermes], lemon.appPath), lemon.appPath)
  })
})

test('prefers Lemon AI deterministically when outer bundle mtimes tie', () => {
  withTempDir(root => {
    const lemon = makeBundle(root, 'Lemon AI.app', { appMtime: 200 })
    const hermes = makeBundle(root, 'Hermes.app', { appMtime: 200 })

    assert.equal(newestValidMacAppPath([hermes, lemon], lemon.appPath), lemon.appPath)
  })
})

const posixTest = process.platform === 'win32' ? test.skip : test

posixTest('requires the inner Hermes binary to be executable', () => {
  withTempDir(root => {
    const lemon = makeBundle(root, 'Lemon AI.app', { appMtime: 300, executable: false })
    const hermes = makeBundle(root, 'Hermes.app', { appMtime: 200 })

    assert.equal(newestValidMacAppPath([lemon, hermes], lemon.appPath), hermes.appPath)
  })
})
