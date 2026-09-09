import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'vitest'

import {
  readMachOArchitectures,
  readPEMachine,
  readWindowsVersionInfo,
  validateGeneratedConfig,
  validateHarnessManifest,
  validateWindowsIdentity,
  validateNativePayload,
  validateStamp,
  verifyInternalInstaller
} from './verify-internal-installer.mjs'
import PACKAGE_JSON from '../package.json' with { type: 'json' }

const require = createRequire(import.meta.url)
const VALID_SHA = '18ae041373f413f4270057de1120e54f61ea2970'
const VALID_REF = 'codex/internal-installer-ci'
const VERSION = PACKAGE_JSON.version
const WINDOWS_VERSION_INFO = {
  ProductName: 'Lemon AI',
  FileDescription: 'Lemon AI',
  CompanyName: 'Lemon Digital',
  LegalCopyright: 'Copyright (c) 2026 Lemon Digital'
}
const WINDOWS_NATIVE_VERSION_INFO_TIMEOUT_MS = 30_000

function withTempDir(fn) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-installer-verify-'))
  const cleanup = () => fs.rmSync(tempRoot, { recursive: true, force: true })
  try {
    const result = fn(tempRoot)
    if (result && typeof result.then === 'function') {
      return result.finally(cleanup)
    }
    cleanup()
    return result
  } catch (error) {
    cleanup()
    throw error
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function validManifest() {
  return {
    schemaVersion: 1,
    profile: 'internal',
    sourceRepository: 'DangLemon/hermes-agent',
    ui: {
      agents: false,
      cron: true,
      messaging: false,
      terminal: true,
      webhooks: false
    },
    managedConfig: {
      model: {
        provider: 'custom',
        default: 'openai-codex-gpt-5-5',
        base_url: 'http://127.0.0.1:5173/v1',
        api_key: '${HERMES_COMPANY_API_KEY}'
      },
      mcp_servers: {
        'tiktok-ads': {
          url: 'https://business-api.tiktok.com/open_mcp/tt-ads-mcp-layer',
          auth: 'oauth'
        },
        algolia: {
          url: 'https://mcp.algolia.com/mcp',
          auth: 'oauth',
          enabled: false
        },
        'amazon-ads': {
          url: 'https://advertising-ai.amazon.com/mcp',
          auth: 'oauth',
          oauth: {
            client_id: '${AMAZON_ADS_CLIENT_ID}',
            client_secret: '${AMAZON_ADS_CLIENT_SECRET}',
            redirect_uri: 'http://localhost:8000/auth/callback',
            redirect_port: 8000
          }
        }
      }
    },
    credentialRequirements: {
      provider: {
        requiredEnv: ['HERMES_COMPANY_API_KEY'],
        label: 'Company provider API key'
      },
      mcpServers: {
        'amazon-ads': {
          requiredEnv: ['AMAZON_ADS_CLIENT_ID', 'AMAZON_ADS_CLIENT_SECRET'],
          labels: {
            AMAZON_ADS_CLIENT_ID: 'Amazon Ads OAuth client ID',
            AMAZON_ADS_CLIENT_SECRET: 'Amazon Ads OAuth client secret'
          }
        }
      }
    }
  }
}

function validStamp() {
  return {
    schemaVersion: 1,
    commit: VALID_SHA,
    branch: VALID_REF,
    builtAt: '2026-09-09T04:00:00.000Z',
    dirty: false,
    source: 'ci'
  }
}

function validGeneratedConfig() {
  return {
    appId: 'com.nousresearch.hermes',
    productName: 'Lemon AI',
    executableName: 'Hermes',
    artifactName: 'Lemon-AI-${version}-${os}-${arch}.${ext}',
    icon: 'assets/lemon-icon',
    mac: {
      executableName: 'Lemon AI'
    },
    dmg: {
      title: 'Install Lemon AI'
    }
  }
}

function makeMachO(filePath, arch = 'arm64') {
  const cpu = arch === 'arm64' ? 0x0100000c : 0x01000007
  const buffer = Buffer.alloc(32)
  buffer.writeUInt32LE(0xfeedfacf, 0)
  buffer.writeUInt32LE(cpu, 4)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, buffer)
}

function makeFatMachO(filePath) {
  const buffer = Buffer.alloc(48)
  buffer.writeUInt32BE(0xcafebabe, 0)
  buffer.writeUInt32BE(2, 4)
  buffer.writeUInt32BE(0x0100000c, 8)
  buffer.writeUInt32BE(0, 12)
  buffer.writeUInt32BE(0, 16)
  buffer.writeUInt32BE(0, 20)
  buffer.writeUInt32BE(0, 24)
  buffer.writeUInt32BE(0x01000007, 28)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, buffer)
}

function makePE(filePath, { machine = 0x8664, versionInfo = true } = {}) {
  const strings = versionInfo
    ? Object.entries(WINDOWS_VERSION_INFO)
        .map(([key, value]) => `${key}\u0000${value}\u0000`)
        .join('\u0000')
    : ''
  const stringBuffer = Buffer.from(strings, 'utf16le')
  const buffer = Buffer.alloc(0x90 + stringBuffer.length)
  buffer.write('MZ', 0, 'ascii')
  buffer.writeUInt32LE(0x80, 0x3c)
  buffer.write('PE\u0000\u0000', 0x80, 'ascii')
  buffer.writeUInt16LE(machine, 0x84)
  stringBuffer.copy(buffer, 0x90)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, buffer)
}

function makePlist(filePath, values = {}) {
  const merged = {
    CFBundleDisplayName: 'Lemon AI',
    CFBundleName: 'Lemon AI',
    CFBundleExecutable: 'Hermes',
    ...values
  }
  const body = Object.entries(merged)
    .map(([key, value]) => `  <key>${key}</key>\n  <string>${value}</string>`)
    .join('\n')
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(
    filePath,
    `<?xml version="1.0" encoding="UTF-8"?>\n<plist version="1.0">\n<dict>\n${body}\n</dict>\n</plist>\n`,
    'utf8'
  )
}

function makeMacFixture(root) {
  const appPath = path.join(root, 'release', 'mac-arm64', 'Lemon AI.app')
  const resources = path.join(appPath, 'Contents', 'Resources')
  const nodePty = path.join(resources, 'app.asar.unpacked', 'dist', 'node_modules', 'node-pty')
  fs.mkdirSync(path.join(appPath, 'Contents', 'MacOS'), { recursive: true })
  makeMachO(path.join(appPath, 'Contents', 'MacOS', 'Hermes'))
  makePlist(path.join(appPath, 'Contents', 'Info.plist'))
  fs.mkdirSync(path.join(resources, 'app.asar.unpacked', 'dist'), { recursive: true })
  fs.writeFileSync(path.join(resources, 'app.asar.unpacked', 'dist', 'index.html'), '<div></div>')
  writeJson(path.join(nodePty, 'package.json'), { name: 'node-pty' })
  fs.mkdirSync(path.join(nodePty, 'lib'), { recursive: true })
  fs.writeFileSync(path.join(nodePty, 'lib', 'index.js'), 'module.exports = {}')
  makeMachO(path.join(nodePty, 'prebuilds', 'darwin-arm64', 'pty.node'))
  makeMachO(path.join(nodePty, 'prebuilds', 'darwin-arm64', 'spawn-helper'))
  fs.chmodSync(path.join(nodePty, 'prebuilds', 'darwin-arm64', 'spawn-helper'), 0o755)
  makeMachO(path.join(nodePty, 'prebuilds', 'darwin-x64', 'pty.node'), 'x64')

  const manifest = validManifest()
  writeJson(path.join(resources, 'internal-desktop-harness.json'), manifest)
  writeJson(path.join(resources, 'install-stamp.json'), validStamp())
  writeJson(path.join(root, 'apps', 'desktop', 'internal-desktop-harness.config.json'), manifest)
  writeJson(path.join(root, 'apps', 'desktop', 'build', 'electron-builder.generated.json'), validGeneratedConfig())
  fs.writeFileSync(path.join(root, 'release', `Lemon-AI-${VERSION}-mac-arm64.dmg`), 'dmg-bytes')

  return {
    platform: 'darwin',
    arch: 'arm64',
    appPath,
    installerPath: path.join(root, 'release', `Lemon-AI-${VERSION}-mac-arm64.dmg`),
    canonicalManifestPath: path.join(root, 'apps', 'desktop', 'internal-desktop-harness.config.json'),
    generatedConfigPath: path.join(root, 'apps', 'desktop', 'build', 'electron-builder.generated.json'),
    outputDir: path.join(root, 'verified'),
    repoRoot: root
  }
}

function makeWindowsFixture(root) {
  const appPath = path.join(root, 'release', 'win-unpacked')
  const resources = path.join(appPath, 'resources')
  const nodePty = path.join(resources, 'app.asar.unpacked', 'dist', 'node_modules', 'node-pty')
  const getWindows = path.join(resources, 'app.asar.unpacked', 'dist', 'node_modules', 'get-windows')
  makePE(path.join(appPath, 'Hermes.exe'))
  fs.mkdirSync(path.join(resources, 'app.asar.unpacked', 'dist'), { recursive: true })
  fs.writeFileSync(path.join(resources, 'app.asar.unpacked', 'dist', 'index.html'), '<div></div>')
  writeJson(path.join(nodePty, 'package.json'), { name: 'node-pty' })
  fs.mkdirSync(path.join(nodePty, 'lib'), { recursive: true })
  fs.writeFileSync(path.join(nodePty, 'lib', 'index.js'), 'module.exports = {}')
  makePE(path.join(nodePty, 'prebuilds', 'win32-x64', 'pty.node'), { versionInfo: false })
  makePE(path.join(nodePty, 'prebuilds', 'darwin-x64', 'pty.node'), { machine: 0x014c, versionInfo: false })
  makePE(path.join(getWindows, 'lib', 'binding', 'napi-9-win32-unknown-x64', 'node-get-windows.node'), {
    versionInfo: false
  })

  const manifest = validManifest()
  writeJson(path.join(resources, 'internal-desktop-harness.json'), manifest)
  writeJson(path.join(resources, 'install-stamp.json'), validStamp())
  writeJson(path.join(root, 'apps', 'desktop', 'internal-desktop-harness.config.json'), manifest)
  writeJson(path.join(root, 'apps', 'desktop', 'build', 'electron-builder.generated.json'), validGeneratedConfig())
  fs.writeFileSync(path.join(root, 'release', `Lemon-AI-${VERSION}-win-x64.exe`), 'exe-installer-bytes')

  return {
    platform: 'win32',
    arch: 'x64',
    appPath,
    installerPath: path.join(root, 'release', `Lemon-AI-${VERSION}-win-x64.exe`),
    canonicalManifestPath: path.join(root, 'apps', 'desktop', 'internal-desktop-harness.config.json'),
    generatedConfigPath: path.join(root, 'apps', 'desktop', 'build', 'electron-builder.generated.json'),
    outputDir: path.join(root, 'verified'),
    repoRoot: root
  }
}

function makeHostSuccessfulFixture(root) {
  const options = process.platform === 'win32' ? makeWindowsFixture(root) : makeMacFixture(root)
  return {
    ...options,
    ...(process.platform === 'win32' ? { readWindowsVersionInfo: windowsVersionInfoReader() } : {})
  }
}

function fixturePackagedManifestPath(options) {
  const resourcesPath =
    options.platform === 'darwin'
      ? path.join(options.appPath, 'Contents', 'Resources')
      : path.join(options.appPath, 'resources')
  return path.join(resourcesPath, 'internal-desktop-harness.json')
}

function gitSpawn(expectedSha = VALID_SHA) {
  return (command, args) => {
    assert.equal(command, 'git')
    assert.deepEqual(args, ['rev-parse', 'HEAD'])
    return { status: 0, stdout: `${expectedSha}\n`, stderr: '' }
  }
}

function windowsVersionInfoReader(info = WINDOWS_VERSION_INFO) {
  return () => info
}

function changedCanonicalManifest() {
  return {
    ...validManifest(),
    ui: {
      agents: true,
      cron: false,
      messaging: true,
      terminal: true,
      webhooks: true
    },
    managedConfig: {
      model: {
        provider: 'company-openai-compatible',
        default: 'company-approved-gpt-5.6',
        base_url: 'https://models.lemon.example/v1',
        api_key: '${LEMON_MODEL_API_KEY}'
      },
      mcp_servers: {
        company_search: {
          url: 'https://mcp.lemon.example/sse',
          headers: {
            Authorization: 'Bearer ${LEMON_MCP_TOKEN}'
          }
        }
      }
    },
    credentialRequirements: {
      provider: {
        requiredEnv: ['LEMON_MODEL_API_KEY'],
        label: 'Lemon model API key'
      },
      mcpServers: {
        company_search: {
          requiredEnv: ['LEMON_MCP_TOKEN'],
          label: 'Lemon MCP token'
        }
      }
    }
  }
}

function electronExePath() {
  const electronMain = require.resolve('electron')
  return path.join(path.dirname(electronMain), 'dist', 'electron.exe')
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

test('validateStamp requires exact CI source SHA and ref', () => {
  assert.throws(
    () =>
      validateStamp(
        { ...validStamp(), commit: VALID_SHA.slice(0, 12) },
        { expectedSha: VALID_SHA, expectedRef: VALID_REF }
      ),
    /install stamp commit/
  )
  assert.throws(
    () => validateStamp({ ...validStamp(), source: 'local' }, { expectedSha: VALID_SHA, expectedRef: VALID_REF }),
    /install stamp source/
  )
})

test('validateHarnessManifest requires the approved fork and canonical harness resource contract', () => {
  validateHarnessManifest(validManifest())
  assert.throws(
    () => validateHarnessManifest({ ...validManifest(), sourceRepository: 'NousResearch/hermes-agent' }),
    /sourceRepository/
  )
  const literalSecret = validManifest()
  literalSecret.managedConfig.model.api_key = 'sk-live-secret'
  assert.throws(() => validateHarnessManifest(literalSecret), /secret-shaped|environment reference/)
})

test('verification accepts valid canonical model, UI, and MCP changes when packaged bytes match', () => {
  withTempDir(root => {
    const options = makeHostSuccessfulFixture(root)
    const manifest = changedCanonicalManifest()
    writeJson(fixturePackagedManifestPath(options), manifest)
    writeJson(options.canonicalManifestPath, manifest)

    const result = verifyInternalInstaller({
      ...options,
      expectedSha: VALID_SHA,
      expectedRef: VALID_REF,
      spawn: gitSpawn()
    })

    assert.equal(result.manifest.managedConfig.model.default, 'company-approved-gpt-5.6')
    assert.deepEqual(Object.keys(result.manifest.managedConfig.mcp_servers), ['company_search'])
  })
})

test('binary readers detect Mach-O and PE CPU values', () => {
  withTempDir(root => {
    const macho = path.join(root, 'Hermes')
    const pe = path.join(root, 'Hermes.exe')
    makeMachO(macho)
    makePE(pe)
    assert.deepEqual(readMachOArchitectures(macho), [0x0100000c])
    assert.equal(readPEMachine(pe), 0x8664)
  })
})

test('macOS verification rejects universal or x64 Mach-O payloads', () => {
  withTempDir(root => {
    const options = makeMacFixture(root)
    makeFatMachO(path.join(options.appPath, 'Contents', 'MacOS', 'Hermes'))
    assert.throws(
      () => verifyInternalInstaller({ ...options, expectedSha: VALID_SHA, expectedRef: VALID_REF, spawn: gitSpawn() }),
      /must contain only arm64/
    )
  })
})

test('macOS verification fails when Lemon plist metadata is missing', () => {
  withTempDir(root => {
    const options = makeMacFixture(root)
    makePlist(path.join(options.appPath, 'Contents', 'Info.plist'), { CFBundleDisplayName: 'Hermes' })
    assert.throws(
      () => verifyInternalInstaller({ ...options, expectedSha: VALID_SHA, expectedRef: VALID_REF, spawn: gitSpawn() }),
      /CFBundleDisplayName/
    )
  })
})

test('Windows verification catches rcedit failures through executable VersionInfo', () => {
  withTempDir(root => {
    const options = makeWindowsFixture(root)
    assert.throws(
      () =>
        validateWindowsIdentity(path.join(options.appPath, 'Hermes.exe'), {
          readWindowsVersionInfo: windowsVersionInfoReader({})
        }),
      /VersionInfo ProductName/
    )
  })
})

test(
  'Windows VersionInfo reader does not accept synthetic UTF-16 strings as native resources',
  () => {
    withTempDir(root => {
      const exePath = path.join(root, 'Hermes.exe')
      makePE(exePath, { versionInfo: true })
      const expectedError =
        process.platform === 'win32'
          ? /PowerShell VersionInfo query failed|VersionInfo ProductName: missing native VersionInfo value/
          : /Windows VersionInfo requires Windows/
      assert.throws(() => readWindowsVersionInfo(exePath), expectedError)
    })
  },
  WINDOWS_NATIVE_VERSION_INFO_TIMEOUT_MS
)

const windowsOnlyTest = process.platform === 'win32' ? test : test.skip

windowsOnlyTest(
  'Windows VersionInfo reader reads real Electron executable resources',
  async () => {
    const { rcedit } = await import('rcedit')
    await withTempDir(async root => {
      const exePath = path.join(root, 'Hermes.exe')
      fs.copyFileSync(electronExePath(), exePath)
      await rcedit(exePath, {
        'version-string': WINDOWS_VERSION_INFO
      })

      assert.deepEqual(readWindowsVersionInfo(exePath), WINDOWS_VERSION_INFO)
    })
  },
  WINDOWS_NATIVE_VERSION_INFO_TIMEOUT_MS
)

test('Windows verification requires PE x64 for exe, node-pty, and get-windows selected payloads', () => {
  withTempDir(root => {
    const options = makeWindowsFixture(root)
    makePE(
      path.join(
        options.appPath,
        'resources',
        'app.asar.unpacked',
        'dist',
        'node_modules',
        'get-windows',
        'lib',
        'binding',
        'napi-9-win32-unknown-x64',
        'node-get-windows.node'
      ),
      { machine: 0x014c, versionInfo: false }
    )
    assert.throws(
      () =>
        verifyInternalInstaller({
          ...options,
          expectedSha: VALID_SHA,
          expectedRef: VALID_REF,
          spawn: gitSpawn(),
          readWindowsVersionInfo: windowsVersionInfoReader()
        }),
      /must be x64 PE machine/
    )
  })
})

test('verification ignores unused foreign native prebuilds and writes installer checksum receipt', () => {
  withTempDir(root => {
    const options = makeWindowsFixture(root)
    const result = verifyInternalInstaller({
      ...options,
      expectedSha: VALID_SHA,
      expectedRef: VALID_REF,
      spawn: gitSpawn(),
      readWindowsVersionInfo: windowsVersionInfoReader()
    })
    const installerName = `Lemon-AI-${VERSION}-win-x64.exe`
    assert.equal(fs.existsSync(path.join(options.outputDir, installerName)), true)
    assert.match(
      fs.readFileSync(path.join(options.outputDir, `${installerName}.sha256`), 'utf8'),
      new RegExp(`^[0-9a-f]{64} {2}${escapeRegex(installerName)}\\n$`)
    )
    const receipt = JSON.parse(fs.readFileSync(path.join(options.outputDir, 'installer-receipt.json'), 'utf8'))
    assert.equal(receipt.commit, VALID_SHA)
    assert.equal(receipt.ref, VALID_REF)
    assert.equal(receipt.platform, 'win32')
    assert.equal(receipt.arch, 'x64')
    assert.equal(receipt.sourceRepository, 'DangLemon/hermes-agent')
    assert.equal(receipt.checksumFile, `${installerName}.sha256`)
    assert.equal(result.nativePayload.nodePtyBinaries.length, 1)
  })
})

test('verification compares packaged manifest to generated canonical bytes, not source formatting', () => {
  withTempDir(root => {
    const options = makeHostSuccessfulFixture(root)
    fs.writeFileSync(options.canonicalManifestPath, JSON.stringify(validManifest()), 'utf8')
    const result = verifyInternalInstaller({
      ...options,
      expectedSha: VALID_SHA,
      expectedRef: VALID_REF,
      spawn: gitSpawn()
    })
    assert.equal(result.manifest.sourceRepository, 'DangLemon/hermes-agent')
  })
})

test('verification rejects packaged manifest byte drift from canonical input', () => {
  withTempDir(root => {
    const options = makeMacFixture(root)
    fs.appendFileSync(path.join(options.appPath, 'Contents', 'Resources', 'internal-desktop-harness.json'), '\n')
    assert.throws(
      () => verifyInternalInstaller({ ...options, expectedSha: VALID_SHA, expectedRef: VALID_REF, spawn: gitSpawn() }),
      /manifest bytes differ/
    )
  })
})

test('validateNativePayload rejects missing target node-pty binary', () => {
  withTempDir(root => {
    const options = makeMacFixture(root)
    fs.rmSync(
      path.join(
        options.appPath,
        'Contents',
        'Resources',
        'app.asar.unpacked',
        'dist',
        'node_modules',
        'node-pty',
        'prebuilds',
        'darwin-arm64',
        'pty.node'
      ),
      { force: true }
    )
    assert.throws(
      () =>
        validateNativePayload({
          layout: {
            unpackedDistIndex: path.join(
              options.appPath,
              'Contents',
              'Resources',
              'app.asar.unpacked',
              'dist',
              'index.html'
            ),
            nodePtyRoot: path.join(
              options.appPath,
              'Contents',
              'Resources',
              'app.asar.unpacked',
              'dist',
              'node_modules',
              'node-pty'
            ),
            getWindowsRoot: ''
          },
          platform: 'darwin',
          arch: 'arm64'
        }),
      /missing node-pty native/
    )
  })
})

test('validateGeneratedConfig requires Lemon visible product identity while keeping executable stable', () => {
  validateGeneratedConfig(validGeneratedConfig())
  assert.throws(
    () => validateGeneratedConfig({ ...validGeneratedConfig(), executableName: 'Lemon AI' }),
    /executableName/
  )
})
