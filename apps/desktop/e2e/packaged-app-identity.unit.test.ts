import assert from 'node:assert/strict'
import path from 'node:path'

import { test } from 'vitest'

import { resolvePackagedAppIdentity } from './packaged-app-identity'

const releaseRoot = path.join('/tmp', 'desktop-release')

test('packaged resolver selects the Lemon AI macOS bundle and executable before Hermes', () => {
  const lemon = path.join(releaseRoot, 'mac-arm64', 'Lemon AI.app', 'Contents', 'MacOS', 'Lemon AI')
  const hermes = path.join(releaseRoot, 'mac-arm64', 'Hermes.app', 'Contents', 'MacOS', 'Hermes')

  const resolved = resolvePackagedAppIdentity({
    arch: 'arm64',
    exists: candidate => candidate === lemon || candidate === hermes,
    platform: 'darwin',
    releaseRoot
  })

  assert.deepEqual(resolved, { binaryPath: lemon, productName: 'Lemon AI' })
})

test('packaged resolver falls back to an ordinary Hermes macOS bundle', () => {
  const hermes = path.join(releaseRoot, 'mac-x64', 'Hermes.app', 'Contents', 'MacOS', 'Hermes')

  const resolved = resolvePackagedAppIdentity({
    arch: 'x64',
    exists: candidate => candidate === hermes,
    platform: 'darwin',
    releaseRoot
  })

  assert.deepEqual(resolved, { binaryPath: hermes, productName: 'Hermes' })
})

test('packaged resolver selects Lemon AI on Windows and falls back to Hermes', () => {
  const lemon = path.join(releaseRoot, 'win-unpacked', 'Lemon AI.exe')
  const hermes = path.join(releaseRoot, 'win-unpacked', 'Hermes.exe')

  assert.deepEqual(
    resolvePackagedAppIdentity({
      exists: candidate => candidate === lemon,
      platform: 'win32',
      releaseRoot
    }),
    { binaryPath: lemon, productName: 'Lemon AI' }
  )
  assert.deepEqual(
    resolvePackagedAppIdentity({
      exists: candidate => candidate === hermes,
      platform: 'win32',
      releaseRoot
    }),
    { binaryPath: hermes, productName: 'Hermes' }
  )
})

test('packaged resolver selects the Lemon AI Linux executable with Hermes fallback', () => {
  const lemon = path.join(releaseRoot, 'linux-unpacked', 'Lemon AI')
  const hermes = path.join(releaseRoot, 'linux-unpacked', 'hermes')

  assert.deepEqual(
    resolvePackagedAppIdentity({
      exists: candidate => candidate === lemon,
      platform: 'linux',
      releaseRoot
    }),
    { binaryPath: lemon, productName: 'Lemon AI' }
  )
  assert.deepEqual(
    resolvePackagedAppIdentity({
      exists: candidate => candidate === hermes,
      platform: 'linux',
      releaseRoot
    }),
    { binaryPath: hermes, productName: 'Hermes' }
  )
})
