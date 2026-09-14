import assert from 'node:assert/strict'

import { test } from 'vitest'

import { resolveGitBinaryPath } from './git-binary'

const no = () => false

test('Windows prefers PortableGit under selected Lemon HERMES_HOME before legacy Hermes and system Git', () => {
  const env = {
    LOCALAPPDATA: 'C:\\Users\\dang\\AppData\\Local',
    ProgramFiles: 'C:\\Program Files',
    'ProgramFiles(x86)': 'C:\\Program Files (x86)'
  }

  const lemonCmd = 'C:\\Users\\dang\\AppData\\Local\\Lemon AI\\git\\cmd\\git.exe'
  const legacyHermesCmd = 'C:\\Users\\dang\\AppData\\Local\\hermes\\git\\cmd\\git.exe'

  const result = resolveGitBinaryPath({
    isWindows: true,
    env,
    fileExists: candidate => candidate === lemonCmd || candidate === legacyHermesCmd || candidate.includes('Program Files\\Git\\cmd\\git.exe'),
    findOnPath: () => 'C:\\PathGit\\git.exe',
    hermesHome: 'C:\\Users\\dang\\AppData\\Local\\Lemon AI',
    localAppDataProductDirs: ['Lemon AI', 'hermes']
  })

  assert.equal(result, lemonCmd)
})

test('Windows probes HERMES_HOME git cmd before bin', () => {
  const env = { LOCALAPPDATA: 'C:\\Users\\dang\\AppData\\Local' }
  const lemonCmd = 'C:\\Users\\dang\\AppData\\Local\\Lemon AI\\git\\cmd\\git.exe'
  const lemonBin = 'C:\\Users\\dang\\AppData\\Local\\Lemon AI\\git\\bin\\git.exe'

  assert.equal(
    resolveGitBinaryPath({
      isWindows: true,
      env,
      fileExists: candidate => candidate === lemonCmd || candidate === lemonBin,
      findOnPath: () => null,
      hermesHome: 'C:\\Users\\dang\\AppData\\Local\\Lemon AI',
      localAppDataProductDirs: ['hermes']
    }),
    lemonCmd
  )
})

test('Windows preserves legacy Hermes PortableGit fallback before system Git and PATH', () => {
  const env = {
    LOCALAPPDATA: 'C:\\Users\\dang\\AppData\\Local',
    ProgramFiles: 'C:\\Program Files'
  }

  const legacyBin = 'C:\\Users\\dang\\AppData\\Local\\hermes\\git\\bin\\git.exe'

  assert.equal(
    resolveGitBinaryPath({
      isWindows: true,
      env,
      fileExists: candidate => candidate === legacyBin || candidate.includes('Program Files\\Git\\cmd\\git.exe'),
      findOnPath: () => 'C:\\PathGit\\git.exe',
      localAppDataProductDirs: ['hermes']
    }),
    legacyBin
  )
})

test('non-Windows uses git from PATH or bare git fallback', () => {
  assert.equal(
    resolveGitBinaryPath({ isWindows: false, env: {}, fileExists: no, findOnPath: command => command === 'git' ? '/usr/bin/git' : null }),
    '/usr/bin/git'
  )
  assert.equal(resolveGitBinaryPath({ isWindows: false, env: {}, fileExists: no, findOnPath: () => null }), 'git')
})
