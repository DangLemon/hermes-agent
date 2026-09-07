import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'vitest'

import {
  HARNESS_RESOURCE_FILENAME,
  generateInternalDesktopHarnessResource,
  loadHarnessConfigInput,
  resolveHarnessViteDefines,
  validateHarnessResource,
  isDirectRun
} from './internal-desktop-harness.mjs'

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
    },
    mcp_servers: {
      '<COMPANY_MCP_SERVER_ID>': {
        url: '<COMPANY_MCP_SERVER_URL_IF_HTTP>',
        auth: 'oauth'
      }
    }
  },
  credentialRequirements: {
    provider: {
      requiredEnv: ['<PROVIDER_REQUIRED_ENV_VAR>']
    }
  }
}

test('validateHarnessResource accepts the frozen nonsecret schema', () => {
  assert.deepEqual(validateHarnessResource(validResource), validResource)
})

test('validateHarnessResource permits credentialRequirements metadata and environment references in public MCP config', () => {
  const resource = {
    ...validResource,
    managedConfig: {
      ...validResource.managedConfig,
      mcp_servers: {
        '<COMPANY_MCP_SERVER_ID>': {
          url: '<COMPANY_MCP_SERVER_URL_IF_HTTP>',
          headers: {
            'X-Company-Auth': '${MCP_COMPANY_AUTH}'
          }
        }
      }
    },
    credentialRequirements: {
      provider: { requiredEnv: ['PROVIDER_API_KEY'], label: 'Provider API key' },
      mcpServers: { '<COMPANY_MCP_SERVER_ID>': { requiredEnv: ['MCP_COMPANY_AUTH'], label: 'Company MCP auth' } }
    }
  }

  assert.equal(validateHarnessResource(resource).managedConfig.mcp_servers['<COMPANY_MCP_SERVER_ID>'].headers['X-Company-Auth'], '${MCP_COMPANY_AUTH}')
})

test('validateHarnessResource accepts real nonsecret deployment identifiers in private build input', () => {
  const resource = {
    ...validResource,
    sourceRepository: 'DangLemon/hermes-agent',
    managedConfig: {
      model: { provider: 'openai-compatible', default: 'company-approved-model', base_url: 'https://models.company.example/v1', api_key: '${COMPANY_PROVIDER_API_KEY}' },
      mcp_servers: { company_search: { url: 'https://mcp.company.example/sse', headers: { 'X-Company-Auth': '${MCP_COMPANY_AUTH}' } } }
    }
  }

  assert.equal(validateHarnessResource(resource).managedConfig.model.provider, 'openai-compatible')
  assert.equal(validateHarnessResource(resource).sourceRepository, 'DangLemon/hermes-agent')
})

test('validateHarnessResource rejects unsafe source repositories and literal model api keys', () => {
  assert.throws(
    () => validateHarnessResource({ ...validResource, sourceRepository: 'https://github.com/DangLemon/hermes-agent' }),
    /sourceRepository/i
  )
  assert.throws(
    () => validateHarnessResource({ ...validResource, sourceRepository: '../hermes-agent' }),
    /sourceRepository/i
  )
  assert.throws(
    () => validateHarnessResource({ ...validResource, managedConfig: { model: { provider: 'p', default: 'm', api_key: 'sk-live-secret-value' } } }),
    /secret-shaped|environment reference/i
  )
})

test('configured internal manifest pins approved repo, model, and MCP env refs', () => {
  const manifestPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'internal-desktop-harness.config.json')
  const resource = loadHarnessConfigInput({ HERMES_DESKTOP_HARNESS_CONFIG: manifestPath })

  assert.equal(resource.sourceRepository, 'DangLemon/hermes-agent')
  assert.deepEqual(resource.ui, {
    agents: false,
    cron: true,
    messaging: false,
    terminal: true,
    webhooks: false
  })
  assert.deepEqual(resource.managedConfig.model, {
    provider: 'custom',
    default: 'openai-codex-gpt-5-5',
    base_url: 'http://127.0.0.1:5173/v1',
    api_key: '${HERMES_COMPANY_API_KEY}'
  })
  assert.deepEqual(Object.keys(resource.managedConfig.mcp_servers).sort(), ['algolia', 'amazon-ads', 'tiktok-ads'])
  assert.equal(resource.managedConfig.mcp_servers.algolia.enabled, false)
  assert.equal(resource.managedConfig.mcp_servers['amazon-ads'].oauth.client_id, '${AMAZON_ADS_CLIENT_ID}')
  assert.equal(resource.managedConfig.mcp_servers['amazon-ads'].oauth.client_secret, '${AMAZON_ADS_CLIENT_SECRET}')
  assert.equal(resource.managedConfig.mcp_servers['amazon-ads'].oauth.redirect_uri, 'http://localhost:8000/auth/callback')
  assert.equal(resource.managedConfig.mcp_servers['amazon-ads'].oauth.redirect_port, 8000)
})

test('validateHarnessResource rejects secret-shaped keys and values anywhere', () => {
  assert.throws(
    () =>
      validateHarnessResource({
        ...validResource,
        managedConfig: {
          headers: {
            Authorization: 'Bearer sk-live-secret'
          }
        }
      }),
    /secret-shaped/i
  )
})

test('loadHarnessConfigInput reads only the explicit selector', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-harness-input-'))
  try {
    const input = path.join(tempRoot, 'input.json')
    fs.writeFileSync(input, JSON.stringify(validResource), 'utf8')

    assert.equal(loadHarnessConfigInput({ HERMES_DESKTOP_HARNESS_CONFIG: input })?.profile, 'internal')
    assert.equal(loadHarnessConfigInput({}), null)
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('generateInternalDesktopHarnessResource writes selected input and removes stale output when absent or invalid', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-harness-generate-'))
  try {
    const buildDir = path.join(tempRoot, 'build')
    const input = path.join(tempRoot, 'input.json')
    fs.writeFileSync(input, JSON.stringify(validResource), 'utf8')

    const written = generateInternalDesktopHarnessResource({
      env: { HERMES_DESKTOP_HARNESS_CONFIG: input },
      buildDir
    })
    assert.equal(written.resourcePath, path.join(buildDir, HARNESS_RESOURCE_FILENAME))
    assert.equal(JSON.parse(fs.readFileSync(written.resourcePath, 'utf8')).profile, 'internal')

    const absent = generateInternalDesktopHarnessResource({ env: {}, buildDir })
    assert.equal(absent.resourcePath, null)
    assert.equal(fs.existsSync(path.join(buildDir, HARNESS_RESOURCE_FILENAME)), false)

    fs.writeFileSync(path.join(buildDir, HARNESS_RESOURCE_FILENAME), JSON.stringify(validResource), 'utf8')
    const invalidInput = path.join(tempRoot, 'invalid.json')
    fs.writeFileSync(invalidInput, JSON.stringify({ ...validResource, schemaVersion: 2 }), 'utf8')
    assert.throws(
      () => generateInternalDesktopHarnessResource({ env: { HERMES_DESKTOP_HARNESS_CONFIG: invalidInput }, buildDir }),
      /schemaVersion/
    )
    assert.equal(fs.existsSync(path.join(buildDir, HARNESS_RESOURCE_FILENAME)), false)
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('resolveHarnessViteDefines emits internal flags only for a valid selected input', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-harness-vite-'))
  try {
    const input = path.join(tempRoot, 'input.json')
    fs.writeFileSync(input, JSON.stringify(validResource), 'utf8')

    assert.deepEqual(resolveHarnessViteDefines({ HERMES_DESKTOP_HARNESS_CONFIG: input }), {
      'import.meta.env.VITE_HERMES_DESKTOP_HARNESS': JSON.stringify('internal'),
      'import.meta.env.VITE_HERMES_HARNESS_SHOW_AGENTS': JSON.stringify('false'),
      'import.meta.env.VITE_HERMES_HARNESS_SHOW_CRON': JSON.stringify('true'),
      'import.meta.env.VITE_HERMES_HARNESS_SHOW_MESSAGING': JSON.stringify('false'),
      'import.meta.env.VITE_HERMES_HARNESS_SHOW_TERMINAL': JSON.stringify('true'),
      'import.meta.env.VITE_HERMES_HARNESS_SHOW_WEBHOOKS': JSON.stringify('false')
    })
    assert.deepEqual(resolveHarnessViteDefines({}), {})
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})


test('validateHarnessResource allows stdio MCP command fields and Authorization env references', () => {
  const resource = {
    ...validResource,
    managedConfig: {
      model: { provider: 'company-provider', default: 'company-model' },
      mcp_servers: {
        company_stdio: { command: 'company-mcp', args: ['--profile', 'internal'], env: { COMPANY_MCP_TOKEN: '${COMPANY_MCP_TOKEN}' } },
        company_http: { url: 'https://mcp.company.example/sse', headers: { Authorization: 'Bearer ${COMPANY_MCP_OAUTH}' } }
      }
    }
  }

  assert.equal(validateHarnessResource(resource).managedConfig.mcp_servers.company_stdio.command, 'company-mcp')
})

test('validateHarnessResource rejects literal secrets in MCP config and credentialRequirements metadata', () => {
  assert.throws(
    () => validateHarnessResource({ ...validResource, managedConfig: { model: { provider: 'p', default: 'm' }, mcp_servers: { a: { headers: { Authorization: 'Bearer literal-secret-value' } } } } }),
    /secret-shaped/i
  )
  assert.throws(
    () => validateHarnessResource({ ...validResource, credentialRequirements: { provider: { label: 'sk-live-secret-value' } } }),
    /secret-shaped/i
  )
})


test('isDirectRun uses platform-correct file URL comparison for Windows paths', () => {
  const href = 'file:///C:/repo/apps/desktop/scripts/internal-desktop-harness.mjs'
  assert.equal(
    isDirectRun(href, String.raw`C:\repo\apps\desktop\scripts\internal-desktop-harness.mjs`, {
      resolve: value => value.replace(/\\/g, '/').replace(/^C:/, '/C:'),
      pathToFileURLHref: value => `file://${value}`
    }),
    true
  )
})


test('validateHarnessResource rejects opaque auth header literals and credentialRequirements password keys', () => {
  assert.throws(
    () => validateHarnessResource({ ...validResource, managedConfig: { ...validResource.managedConfig, mcp_servers: { company_http: { headers: { 'X-Company-Auth': 'abcdefghijklmnop' } } } } }),
    /secret-shaped/i
  )
  assert.throws(
    () => validateHarnessResource({ ...validResource, credentialRequirements: { provider: { password: 'hunter2hunter2' } } }),
    /credentialRequirements/i
  )
})
