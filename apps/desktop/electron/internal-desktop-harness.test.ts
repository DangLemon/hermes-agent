import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import {
  HARNESS_RESOURCE_FILENAME,
  initializeInternalDesktopHarness,
  loadInternalDesktopHarnessResource,
  materializeInternalDesktopManagedConfig,
  validateInternalDesktopHarnessResource
} from './internal-desktop-harness'

const validResource = {
  schemaVersion: 1,
  profile: 'internal',
  ui: {
    agents: false,
    cron: true,
    messaging: false,
    terminal: true,
    webhooks: false
  },
  managedConfig: {
    model: {
      provider: '<COMPANY_PROVIDER_ID>',
      default: '<COMPANY_MODEL_ID>',
      base_url: '<COMPANY_PROVIDER_BASE_URL_IF_REQUIRED>',
      api_key: '${COMPANY_PROVIDER_API_KEY}'
    }
  },
  credentialRequirements: {
    provider: {
      label: '<PROVIDER_CREDENTIAL_LABEL>'
    }
  }
} as const

test('loadInternalDesktopHarnessResource reads packaged resources before dev build output', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-harness-electron-'))

  try {
    const resourcesPath = path.join(tempRoot, 'resources')
    const appRoot = path.join(tempRoot, 'app')
    fs.mkdirSync(resourcesPath, { recursive: true })
    fs.mkdirSync(path.join(appRoot, 'build'), { recursive: true })
    fs.writeFileSync(path.join(appRoot, 'build', HARNESS_RESOURCE_FILENAME), JSON.stringify({ ...validResource, profile: 'dev-wrong' }), 'utf8')
    fs.writeFileSync(path.join(resourcesPath, HARNESS_RESOURCE_FILENAME), JSON.stringify(validResource), 'utf8')

    const loaded = loadInternalDesktopHarnessResource({ resourcesPath, appRoot, allowBuildResource: true })
    assert.equal(loaded.active, true)
    assert.equal(loaded.resource?.profile, 'internal')
    assert.equal(loaded.path, path.join(resourcesPath, HARNESS_RESOURCE_FILENAME))
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('loadInternalDesktopHarnessResource rejects malformed packaged resources without falling back to stale dev data', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-harness-electron-'))

  try {
    const resourcesPath = path.join(tempRoot, 'resources')
    const appRoot = path.join(tempRoot, 'app')
    fs.mkdirSync(resourcesPath, { recursive: true })
    fs.mkdirSync(path.join(appRoot, 'build'), { recursive: true })
    fs.writeFileSync(path.join(resourcesPath, HARNESS_RESOURCE_FILENAME), '{ bad json', 'utf8')
    fs.writeFileSync(path.join(appRoot, 'build', HARNESS_RESOURCE_FILENAME), JSON.stringify(validResource), 'utf8')

    const loaded = loadInternalDesktopHarnessResource({ resourcesPath, appRoot })
    assert.equal(loaded.active, false)
    assert.match(loaded.diagnostic || '', /invalid/i)
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('materializeInternalDesktopManagedConfig writes only managedConfig as JSON config.yaml', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-harness-managed-'))

  try {
    const dir = materializeInternalDesktopManagedConfig(validResource, {
      userDataPath: tempRoot,
      pid: 1234,
      nonce: () => 'abcd'
    })

    assert.equal(path.basename(dir), '1234-abcd')
    const config = JSON.parse(fs.readFileSync(path.join(dir, 'config.yaml'), 'utf8'))
    assert.deepEqual(config, validResource.managedConfig)
    assert.equal(JSON.stringify(config).includes('credentialRequirements'), false)
    assert.equal(JSON.stringify(config).includes('ui'), false)
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('initializeInternalDesktopHarness returns inactive instead of reusing stale data when no valid resource exists', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-harness-init-'))

  try {
    const state = initializeInternalDesktopHarness({ resourcesPath: path.join(tempRoot, 'missing'), appRoot: tempRoot, userDataPath: tempRoot })
    assert.deepEqual(state, {
      active: false,
      managedDir: null,
      requested: false,
      resource: null,
      suppressRemoteBackends: false,
      diagnostic: null
    })
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})


test('validateInternalDesktopHarnessResource permits credential metadata and environment references but rejects real secrets', () => {
  const withEnvRef = {
    ...validResource,
    managedConfig: {
      ...validResource.managedConfig,
      mcp_servers: {
        '<COMPANY_MCP_SERVER_ID>': {
          url: '<COMPANY_MCP_SERVER_URL_IF_HTTP>',
          headers: { 'X-Company-Auth': '${MCP_COMPANY_AUTH}' }
        }
      }
    },
    credentialRequirements: {
      provider: { requiredEnv: ['PROVIDER_API_KEY'], label: 'Provider API key' }
    }
  }

  assert.equal(validateInternalDesktopHarnessResource(withEnvRef).profile, 'internal')

  assert.throws(
    () =>
      validateInternalDesktopHarnessResource({
        ...validResource,
        managedConfig: { ...validResource.managedConfig, mcp_servers: { '<COMPANY_MCP_SERVER_ID>': { token: 'sk-live-secret-value' } } }
      }),
    /secret-shaped/i
  )
})


test('validateInternalDesktopHarnessResource accepts real nonsecret deployment identifiers in private build input', () => {
  const resource = {
    ...validResource,
    sourceRepository: 'DangLemon/hermes-agent',
    managedConfig: {
      model: { provider: 'openai-compatible', default: 'company-approved-model', base_url: 'https://models.company.example/v1', api_key: '${COMPANY_PROVIDER_API_KEY}' },
      mcp_servers: { company_search: { url: 'https://mcp.company.example/sse', headers: { 'X-Company-Auth': '${MCP_COMPANY_AUTH}' } } }
    }
  }

  assert.equal(validateInternalDesktopHarnessResource(resource).managedConfig?.model, resource.managedConfig.model)
  assert.equal(validateInternalDesktopHarnessResource(resource).sourceRepository, 'DangLemon/hermes-agent')
})

test('validateInternalDesktopHarnessResource rejects unsafe source repositories and literal model api keys', () => {
  assert.throws(
    () => validateInternalDesktopHarnessResource({ ...validResource, sourceRepository: 'https://github.com/DangLemon/hermes-agent' }),
    /sourceRepository/i
  )
  assert.throws(
    () => validateInternalDesktopHarnessResource({ ...validResource, sourceRepository: '../hermes-agent' }),
    /sourceRepository/i
  )
  assert.throws(
    () => validateInternalDesktopHarnessResource({ ...validResource, managedConfig: { model: { provider: 'p', default: 'm', api_key: 'sk-live-secret-value' } } }),
    /secret-shaped|environment reference/i
  )
})


test('valid harness stays inactive on WSL instead of injecting an untranslated host managed path', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-harness-wsl-'))

  try {
    fs.mkdirSync(path.join(tempRoot, 'build'), { recursive: true })
    fs.writeFileSync(path.join(tempRoot, 'build', HARNESS_RESOURCE_FILENAME), JSON.stringify(validResource), 'utf8')

    const state = initializeInternalDesktopHarness({ resourcesPath: null, appRoot: tempRoot, userDataPath: tempRoot, isWsl: true, allowBuildResource: true })
    assert.equal(state.active, false)
    assert.equal(state.managedDir, null)
    assert.match(state.diagnostic || '', /WSL/)
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})


test('ordinary development does not activate stale appRoot build resource without selector', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-harness-stale-dev-'))

  try {
    fs.mkdirSync(path.join(tempRoot, 'build'), { recursive: true })
    fs.writeFileSync(path.join(tempRoot, 'build', HARNESS_RESOURCE_FILENAME), JSON.stringify(validResource), 'utf8')

    const state = loadInternalDesktopHarnessResource({ resourcesPath: null, appRoot: tempRoot, allowBuildResource: false })
    assert.equal(state.active, false)
    assert.equal(state.resource, null)
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('validateInternalDesktopHarnessResource allows stdio MCP commands and Authorization env refs', () => {
  const resource = {
    ...validResource,
    managedConfig: {
      model: { provider: 'company-provider', default: 'company-model' },
      mcp_servers: {
        company_stdio: { cmd: 'company-mcp', argv: ['--stdio'], env: { COMPANY_MCP_TOKEN: '${COMPANY_MCP_TOKEN}' } },
        company_http: { url: 'https://mcp.company.example/sse', headers: { Authorization: 'Bearer ${COMPANY_MCP_OAUTH}' } }
      }
    }
  }

  assert.equal(validateInternalDesktopHarnessResource(resource).managedConfig?.mcp_servers, resource.managedConfig.mcp_servers)
})


test('validateInternalDesktopHarnessResource rejects opaque auth header literals and unknown credential requirement keys', () => {
  assert.throws(
    () =>
      validateInternalDesktopHarnessResource({
        ...validResource,
        managedConfig: {
          ...validResource.managedConfig,
          mcp_servers: { company_http: { headers: { 'X-Company-Auth': 'abcdefghijklmnop' } } }
        }
      }),
    /secret-shaped/i
  )
  assert.throws(
    () =>
      validateInternalDesktopHarnessResource({
        ...validResource,
        credentialRequirements: { provider: { password: 'hunter2hunter2' } }
      }),
    /credentialRequirements/i
  )
})

test('requested WSL harness is unavailable but still suppresses remote/profile fallback', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-harness-wsl-requested-'))

  try {
    fs.mkdirSync(path.join(tempRoot, 'build'), { recursive: true })
    fs.writeFileSync(path.join(tempRoot, 'build', HARNESS_RESOURCE_FILENAME), JSON.stringify(validResource), 'utf8')

    const state = initializeInternalDesktopHarness({ resourcesPath: null, appRoot: tempRoot, userDataPath: tempRoot, isWsl: true, allowBuildResource: true })
    assert.equal(state.requested, true)
    assert.equal(state.active, false)
    assert.equal(state.suppressRemoteBackends, true)
    assert.equal(state.managedDir, null)
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})
