import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'

import { test } from 'vitest'

import {
  buildPinArgs,
  buildPosixPinArgs,
  cachedScriptPath,
  downloadInstallScript,
  hasExistingGitCheckout,
  installedAgentInstallScript,
  installRefForStamp,
  isPinnedCommit,
  resolveBootstrapSourceRepository,
  resolveInstallScript,
  resolveMarkerPinnedCommit,
  runBootstrap
} from './bootstrap-runner'

const SCRIPT_NAME = process.platform === 'win32' ? 'install.ps1' : 'install.sh'
const ZERO_COMMIT = '0000000000000000000000000000000000000000'

function mkTmpHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-bootstrap-test-'))
}

function createFakeDownloadRequest(sequence) {
  const calls = []

  return {
    calls,
    request: (url, onResponse) => {
      calls.push(String(url))
      const next = sequence.shift()
      const listeners = new Map()

      const request = {
        on: (event, handler) => {
          listeners.set(event, handler)

          return request
        },
        setTimeout: (_ms, handler) => {
          if (next.timeout) {
            queueMicrotask(handler)
          }

          return request
        },
        destroy: error => {
          if (error && listeners.has('error')) {
            listeners.get('error')(error)
          }
        }
      }

      queueMicrotask(() => {
        if (next.timeout) {
          return
        }

        if (next.error) {
          listeners.get('error')?.(next.error)

          return
        }

        const body = new PassThrough() as any

        body.statusCode = next.statusCode
        body.headers = next.headers || {}
        onResponse(body)
        body.end(next.body || '')
      })

      return request
    }
  }
}

test('runBootstrap bails immediately when the signal is already aborted', async () => {
  const controller = new AbortController()
  controller.abort()

  const events = []

  const result = await runBootstrap({
    installStamp: null,
    activeRoot: '/tmp/hermes-runner-test',
    sourceRepoRoot: null,
    hermesHome: '/tmp/hermes-runner-test',
    logRoot: '/tmp/hermes-runner-test',
    onEvent: ev => events.push(ev),
    abortSignal: controller.signal
  })

  // Cancelled before any install script is spawned.
  assert.deepEqual(result, { ok: false, cancelled: true })
  assert.ok(
    events.some(ev => ev.type === 'failed' && /cancelled/i.test(ev.error)),
    'should emit a cancelled failure event'
  )
})

test('installedAgentInstallScript resolves the installer in the agent checkout', () => {
  const home = mkTmpHome()

  try {
    assert.equal(installedAgentInstallScript(home), null, 'absent before the checkout exists')

    const scriptsDir = path.join(home, 'hermes-agent', 'scripts')
    fs.mkdirSync(scriptsDir, { recursive: true })
    const scriptPath = path.join(scriptsDir, SCRIPT_NAME)
    fs.writeFileSync(scriptPath, '#!/bin/sh\necho hi\n')

    assert.equal(installedAgentInstallScript(home), scriptPath)
    assert.equal(installedAgentInstallScript(null), null, 'null home -> null')
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

test('existing checkout detection requires git metadata', () => {
  const home = mkTmpHome()

  try {
    const activeRoot = path.join(home, 'hermes-agent')
    assert.equal(hasExistingGitCheckout(activeRoot), false)

    fs.mkdirSync(path.join(activeRoot, '.git'), { recursive: true })
    assert.equal(hasExistingGitCheckout(activeRoot), true)
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

test('fresh bootstrap args include the packaged commit pin', () => {
  const installStamp = { commit: 'a'.repeat(40), branch: 'main' }

  assert.deepEqual(buildPinArgs(installStamp), ['-Commit', installStamp.commit, '-Branch', 'main'])
  assert.deepEqual(
    buildPosixPinArgs({
      installStamp,
      activeRoot: '/tmp/hermes-agent',
      hermesHome: '/tmp/hermes'
    }),
    ['--dir', '/tmp/hermes-agent', '--hermes-home', '/tmp/hermes', '--branch', 'main', '--commit', installStamp.commit]
  )
})

test('internal bootstrap args include a validated source repository', () => {
  const installStamp = { commit: 'a'.repeat(40), branch: 'main' }

  assert.deepEqual(buildPinArgs(installStamp, { sourceRepository: 'DangLemon/hermes-agent' }), [
    '-Repository',
    'DangLemon/hermes-agent',
    '-Commit',
    installStamp.commit,
    '-Branch',
    'main'
  ])
  assert.deepEqual(
    buildPosixPinArgs({
      installStamp,
      activeRoot: '/tmp/hermes-agent',
      hermesHome: '/tmp/hermes',
      sourceRepository: 'DangLemon/hermes-agent'
    }),
    [
      '--dir',
      '/tmp/hermes-agent',
      '--hermes-home',
      '/tmp/hermes',
      '--repo',
      'DangLemon/hermes-agent',
      '--branch',
      'main',
      '--commit',
      installStamp.commit
    ]
  )
})

test('existing-checkout bootstrap args keep branch but skip the packaged commit pin', () => {
  const installStamp = { commit: 'a'.repeat(40), branch: 'main' }

  assert.deepEqual(buildPinArgs(installStamp, { pinCommit: false }), ['-Branch', 'main'])
  assert.deepEqual(
    buildPosixPinArgs({
      installStamp,
      activeRoot: '/tmp/hermes-agent',
      hermesHome: '/tmp/hermes',
      pinCommit: false
    }),
    ['--dir', '/tmp/hermes-agent', '--hermes-home', '/tmp/hermes', '--branch', 'main']
  )
})

test('fallback install stamps use an unpinned branch ref', () => {
  const stamp = { commit: ZERO_COMMIT, branch: 'main' }

  assert.equal(isPinnedCommit(ZERO_COMMIT), false)
  assert.deepEqual(installRefForStamp(stamp), {
    ref: 'main',
    cacheKey: 'fallback-main',
    pinned: false
  })
  // Must NOT pass -Commit / --commit for the all-zero placeholder.
  assert.deepEqual(buildPinArgs(stamp), ['-Branch', 'main'])
  assert.deepEqual(
    buildPosixPinArgs({
      installStamp: stamp,
      activeRoot: '/tmp/hermes',
      hermesHome: '/tmp/home'
    }),
    ['--dir', '/tmp/hermes', '--hermes-home', '/tmp/home', '--branch', 'main']
  )
})

test('resolveMarkerPinnedCommit prefers real HEAD over fallback stamp zeros', () => {
  const realHead = 'c'.repeat(40)
  assert.equal(
    resolveMarkerPinnedCommit({ commit: ZERO_COMMIT, branch: 'main' }, '/tmp/checkout', {
      resolveHead: () => realHead
    }),
    realHead
  )
  assert.equal(
    resolveMarkerPinnedCommit({ commit: 'd'.repeat(40), branch: 'main' }, '/tmp/checkout', {
      resolveHead: () => realHead
    }),
    'd'.repeat(40),
    'packaged real pin wins over checkout HEAD'
  )
  assert.equal(
    resolveMarkerPinnedCommit({ commit: ZERO_COMMIT, branch: 'main' }, '/tmp/missing', {
      resolveHead: () => null
    }),
    null
  )
})

test('resolveInstallScript downloads fallback stamps by branch instead of zero commit', async () => {
  const home = mkTmpHome()

  try {
    const logs = []
    const refs = []

    const result = await resolveInstallScript({
      installStamp: { commit: ZERO_COMMIT, branch: 'main' },
      sourceRepoRoot: null,
      hermesHome: home,
      emit: ev => logs.push(ev),
      _download: async (ref, destPath) => {
        refs.push(ref)
        fs.mkdirSync(path.dirname(destPath), { recursive: true })
        fs.writeFileSync(destPath, '#!/bin/sh\necho fallback branch\n')

        return destPath
      }
    })

    assert.deepEqual(refs, ['main'])
    assert.equal(result.source, 'download')
    assert.equal(result.commit, null)
    assert.equal(result.path, cachedScriptPath(home, 'fallback-main'))
    assert.ok(
      logs.some(ev => /fallback, unpinned/.test(ev.line || '')),
      'emits an unpinned fallback log line'
    )
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

test('resolveInstallScript downloads internal scripts from the harness repository and isolates cache entries', async () => {
  const home = mkTmpHome()

  try {
    const commit = 'b'.repeat(40)
    const calls = []

    const result = await resolveInstallScript({
      installStamp: { commit, branch: 'main' },
      sourceRepoRoot: null,
      hermesHome: home,
      sourceRepository: 'DangLemon/hermes-agent',
      emit: () => {},
      _download: async (ref, destPath, sourceRepository) => {
        calls.push({ ref, destPath, sourceRepository })
        fs.mkdirSync(path.dirname(destPath), { recursive: true })
        fs.writeFileSync(destPath, '#!/bin/sh\necho internal\n')

        return destPath
      }
    })

    assert.deepEqual(calls.map(call => ({ ref: call.ref, sourceRepository: call.sourceRepository })), [
      { ref: commit, sourceRepository: 'DangLemon/hermes-agent' }
    ])
    assert.equal(result.source, 'download')
    assert.equal(result.path, cachedScriptPath(home, commit, 'DangLemon/hermes-agent'))
    assert.ok(result.path.includes('DangLemon__hermes-agent'))
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

test('resolveBootstrapSourceRepository reads packaged harness sourceRepository and rejects unsafe identities', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-source-repo-'))

  try {
    const resourcesPath = path.join(tempRoot, 'resources')
    fs.mkdirSync(resourcesPath, { recursive: true })
    fs.writeFileSync(
      path.join(resourcesPath, 'internal-desktop-harness.json'),
      JSON.stringify({ schemaVersion: 1, profile: 'internal', sourceRepository: 'DangLemon/hermes-agent', ui: { agents: false, cron: true, messaging: false, terminal: true, webhooks: false } }),
      'utf8'
    )

    assert.equal(resolveBootstrapSourceRepository({ resourcesPath, env: {} }), 'DangLemon/hermes-agent')

    fs.writeFileSync(
      path.join(resourcesPath, 'internal-desktop-harness.json'),
      JSON.stringify({ schemaVersion: 1, profile: 'internal', sourceRepository: 'https://github.com/DangLemon/hermes-agent', ui: { agents: false, cron: true, messaging: false, terminal: true, webhooks: false } }),
      'utf8'
    )
    assert.throws(() => resolveBootstrapSourceRepository({ resourcesPath, env: {} }), /sourceRepository/)
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('resolveInstallScript prefers a cached script without touching the network', async () => {
  const home = mkTmpHome()

  try {
    const commit = 'a'.repeat(40)
    const cached = cachedScriptPath(home, commit)
    fs.mkdirSync(path.dirname(cached), { recursive: true })
    fs.writeFileSync(cached, '#!/bin/sh\necho cached\n')

    const logs = []

    const result = await resolveInstallScript({
      installStamp: { commit },
      sourceRepoRoot: null,
      hermesHome: home,
      emit: ev => logs.push(ev)
    })

    assert.equal(result.source, 'cache')
    assert.equal(result.path, cached)
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

test('resolveInstallScript falls back to the installed agent checkout on a 404', async () => {
  const home = mkTmpHome()

  try {
    const commit = 'a'.repeat(40)
    // Seed the installed agent checkout so the fallback has something to resolve.
    const scriptsDir = path.join(home, 'hermes-agent', 'scripts')
    fs.mkdirSync(scriptsDir, { recursive: true })
    const installed = path.join(scriptsDir, SCRIPT_NAME)
    fs.writeFileSync(installed, '#!/bin/sh\necho fallback\n')

    const logs = []

    const result = await resolveInstallScript({
      installStamp: { commit },
      sourceRepoRoot: null,
      hermesHome: home,
      emit: ev => logs.push(ev),
      // Simulate GitHub returning a 404 for the pinned commit.
      _download: async () => {
        throw new Error('Failed to download install.sh: HTTP 404')
      }
    })

    assert.equal(result.source, 'installed-agent')
    // It should have copied the installer into the bootstrap cache.
    assert.equal(result.path, cachedScriptPath(home, commit))
    assert.ok(fs.existsSync(result.path), 'fallback script copied into cache')
    assert.ok(
      logs.some(ev => /falling back to installed agent/.test(ev.line || '')),
      'emits a fallback log line'
    )
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

test('resolveInstallScript rethrows when the 404 fallback is unavailable', async () => {
  const home = mkTmpHome()

  try {
    const commit = 'a'.repeat(40)
    // No installed agent checkout seeded -> nothing to fall back to.
    await assert.rejects(
      resolveInstallScript({
        installStamp: { commit },
        sourceRepoRoot: null,
        hermesHome: home,
        emit: () => {},
        _download: async () => {
          throw new Error('Failed to download install.sh: HTTP 404')
        }
      }),
      /HTTP 404|Failed to download/
    )
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

test('downloadInstallScript retries a transient 429 and writes the completed script atomically', async () => {
  const home = mkTmpHome()

  try {
    const destPath = path.join(home, SCRIPT_NAME)
    const sleeps = []
    const fake = createFakeDownloadRequest([{ statusCode: 429 }, { statusCode: 200, body: '#!/bin/sh\necho ok\n' }])

    const result = await downloadInstallScript('a'.repeat(40), destPath, 'DangLemon/hermes-agent', {
      request: fake.request,
      sleep: ms => {
        sleeps.push(ms)

        return Promise.resolve()
      },
      random: () => 0,
      now: () => 0
    })

    assert.equal(result, destPath)
    assert.equal(fs.readFileSync(destPath, 'utf8'), '#!/bin/sh\necho ok\n')
    assert.equal(fs.existsSync(destPath + '.tmp'), false, 'no partial temp file remains after success')
    assert.equal(fake.calls.length, 2)
    assert.deepEqual(sleeps, [750])
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

test('downloadInstallScript exhausts retryable 429 responses after four attempts', async () => {
  const home = mkTmpHome()

  try {
    const destPath = path.join(home, SCRIPT_NAME)
    const sleeps = []

    const fake = createFakeDownloadRequest([
      { statusCode: 429 },
      { statusCode: 429 },
      { statusCode: 429 },
      { statusCode: 429 }
    ])

    await assert.rejects(
      downloadInstallScript('a'.repeat(40), destPath, undefined, {
        request: fake.request,
        sleep: ms => {
          sleeps.push(ms)

          return Promise.resolve()
        },
        random: () => 0,
        now: () => 0
      }),
      /HTTP 429/
    )

    assert.equal(fake.calls.length, 4)
    assert.deepEqual(sleeps, [750, 1500, 3000])
    assert.equal(fs.existsSync(destPath), false)
    assert.equal(fs.existsSync(destPath + '.tmp'), false)
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

test('downloadInstallScript does not retry permanent 404 responses', async () => {
  const home = mkTmpHome()

  try {
    const destPath = path.join(home, SCRIPT_NAME)
    const fake = createFakeDownloadRequest([{ statusCode: 404 }])

    await assert.rejects(
      downloadInstallScript('a'.repeat(40), destPath, undefined, {
        request: fake.request,
        sleep: () => {
          throw new Error('404 should not sleep before retry')
        }
      }),
      /HTTP 404/
    )

    assert.equal(fake.calls.length, 1)
    assert.equal(fs.existsSync(destPath), false)
    assert.equal(fs.existsSync(destPath + '.tmp'), false)
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

test('downloadInstallScript retries transient network errors and removes partial temp files', async () => {
  const home = mkTmpHome()

  try {
    const destPath = path.join(home, SCRIPT_NAME)
    fs.mkdirSync(path.dirname(destPath), { recursive: true })
    fs.writeFileSync(destPath + '.tmp', 'partial')

    const fake = createFakeDownloadRequest([
      { error: Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }) },
      { statusCode: 200, body: 'Write-Output ok\n' }
    ])

    await downloadInstallScript('a'.repeat(40), destPath, undefined, {
      request: fake.request,
      sleep: () => Promise.resolve(),
      random: () => 0,
      now: () => 0
    })

    assert.equal(fake.calls.length, 2)
    assert.equal(fs.readFileSync(destPath, 'utf8'), 'Write-Output ok\n')
    assert.equal(fs.existsSync(destPath + '.tmp'), false)
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

test('downloadInstallScript retries request timeouts without waiting for real time', async () => {
  const home = mkTmpHome()

  try {
    const destPath = path.join(home, SCRIPT_NAME)
    let timerCalls = 0
    const fake = createFakeDownloadRequest([{ timeout: true }, { statusCode: 200, body: '# timeout recovered\n' }])

    await downloadInstallScript('a'.repeat(40), destPath, undefined, {
      request: fake.request,
      requestTimeoutMs: 250,
      setTimeout: handler => {
        timerCalls += 1

        if (timerCalls === 1) {
          queueMicrotask(handler)
        }

        return timerCalls
      },
      clearTimeout: () => {},
      sleep: () => Promise.resolve(),
      random: () => 0,
      now: () => 0
    })

    assert.equal(fake.calls.length, 2)
    assert.equal(fs.readFileSync(destPath, 'utf8'), '# timeout recovered\n')
    assert.equal(fs.existsSync(destPath + '.tmp'), false)
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

test('downloadInstallScript does not publish a cache file after a slow response times out', async () => {
  const home = mkTmpHome()

  try {
    const destPath = path.join(home, SCRIPT_NAME)
    let timeoutHandler = null
    let response = null

    const request = (_url, onResponse) => {
      const listeners = new Map()

      const req = {
        on: (event, handler) => {
          listeners.set(event, handler)

          return req
        },
        destroy: error => {
          if (error) {
            listeners.get('error')?.(error)
          }
        }
      }

      queueMicrotask(() => {
        response = new PassThrough() as any
        response.statusCode = 200
        response.headers = {}
        onResponse(response)
        response.write('partial')
      })

      return req
    }

    const download = downloadInstallScript('a'.repeat(40), destPath, undefined, {
      request,
      maxAttempts: 1,
      requestTimeoutMs: 250,
      setTimeout: handler => {
        timeoutHandler = handler

        return 1
      },
      clearTimeout: () => {},
      sleep: () => Promise.resolve(),
      random: () => 0,
      now: () => 0
    })

    await new Promise<void>(resolve => queueMicrotask(() => resolve()))
    timeoutHandler()
    response.end('late completion')

    await assert.rejects(download, /request timed out after 250ms/)
    assert.equal(fs.existsSync(destPath), false)
    assert.equal(fs.existsSync(destPath + '.tmp'), false)
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

test('downloadInstallScript does not retry TLS validation failures', async () => {
  const home = mkTmpHome()

  try {
    const destPath = path.join(home, SCRIPT_NAME)

    const fake = createFakeDownloadRequest([
      { error: Object.assign(new Error('self-signed certificate'), { code: 'DEPTH_ZERO_SELF_SIGNED_CERT' }) }
    ])

    await assert.rejects(
      downloadInstallScript('a'.repeat(40), destPath, undefined, {
        request: fake.request,
        sleep: () => {
          throw new Error('TLS validation failures should not retry')
        }
      }),
      /self-signed certificate/
    )

    assert.equal(fake.calls.length, 1)
    assert.equal(fs.existsSync(destPath), false)
    assert.equal(fs.existsSync(destPath + '.tmp'), false)
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

test('downloadInstallScript rejects redirect chains beyond the bounded redirect policy', async () => {
  const home = mkTmpHome()

  try {
    const destPath = path.join(home, SCRIPT_NAME)

    const fake = createFakeDownloadRequest([
      { statusCode: 302, headers: { location: 'https://example.com/1' } },
      { statusCode: 302, headers: { location: 'https://example.com/2' } },
      { statusCode: 302, headers: { location: 'https://example.com/3' } },
      { statusCode: 302, headers: { location: 'https://example.com/4' } },
      { statusCode: 200, body: '# should not reach\n' }
    ])

    await assert.rejects(
      downloadInstallScript('main', destPath, 'DangLemon/hermes-agent', {
        request: fake.request,
        sleep: () => Promise.resolve()
      }),
      /redirect could not be followed/
    )

    assert.equal(fake.calls.length, 4)
    assert.equal(fs.existsSync(destPath), false)
    assert.equal(fs.existsSync(destPath + '.tmp'), false)
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

test('downloadInstallScript treats Retry-After beyond the total budget as terminal', async () => {
  const home = mkTmpHome()

  try {
    const destPath = path.join(home, SCRIPT_NAME)
    const fake = createFakeDownloadRequest([{ statusCode: 429, headers: { 'retry-after': '120' } }])

    await assert.rejects(
      downloadInstallScript('a'.repeat(40), destPath, undefined, {
        request: fake.request,
        sleep: () => {
          throw new Error('over-budget Retry-After should not sleep')
        },
        now: () => 0
      }),
      /Retry-After 120000ms exceeds remaining bootstrap download budget/
    )

    assert.equal(fake.calls.length, 1)
    assert.equal(fs.existsSync(destPath), false)
    assert.equal(fs.existsSync(destPath + '.tmp'), false)
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

test('downloadInstallScript honors Retry-After HTTP dates within the download budget', async () => {
  const home = mkTmpHome()

  try {
    const destPath = path.join(home, SCRIPT_NAME)
    const sleeps = []
    const nowMs = Date.parse('2026-09-11T04:00:00Z')

    const fake = createFakeDownloadRequest([
      { statusCode: 429, headers: { 'retry-after': new Date(nowMs + 5000).toUTCString() } },
      { statusCode: 200, body: '# date retry\n' }
    ])

    await downloadInstallScript('a'.repeat(40), destPath, undefined, {
      request: fake.request,
      sleep: ms => {
        sleeps.push(ms)

        return Promise.resolve()
      },
      now: () => nowMs
    })

    assert.deepEqual(sleeps, [5000])
    assert.equal(fake.calls.length, 2)
    assert.equal(fs.readFileSync(destPath, 'utf8'), '# date retry\n')
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

test('downloadInstallScript follows bounded redirects within the current attempt', async () => {
  const home = mkTmpHome()

  try {
    const destPath = path.join(home, SCRIPT_NAME)

    const fake = createFakeDownloadRequest([
      {
        statusCode: 302,
        headers: { location: 'https://raw.githubusercontent.com/DangLemon/hermes-agent/main/scripts/install.sh' }
      },
      { statusCode: 200, body: '# redirected\n' }
    ])

    await downloadInstallScript('main', destPath, 'DangLemon/hermes-agent', {
      request: fake.request,
      sleep: () => Promise.resolve()
    })

    assert.equal(fake.calls.length, 2)
    assert.equal(fs.readFileSync(destPath, 'utf8'), '# redirected\n')
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})
