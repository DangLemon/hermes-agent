import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export const HARNESS_RESOURCE_FILENAME = 'internal-desktop-harness.json'
const HARNESS_SCHEMA_VERSION = 1
const UI_KEYS = ['agents', 'cron', 'messaging', 'terminal', 'webhooks'] as const
const SOURCE_REPOSITORY_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?\/[A-Za-z0-9](?:[A-Za-z0-9._-]{0,98}[A-Za-z0-9])?$/
const SECRET_KEY_RE = /(^|[_-])(api[_-]?key|authorization|bearer|client[_-]?secret|password|secret|token)([_-]|$)|^(api[_-]?key|authorization|bearer|client[_-]?secret|password|secret|token)$/i
const SECRET_VALUE_RE = /\b(?:bearer\s+(?!\$\{)[a-z0-9._~+/=-]{12,}|sk-[a-z0-9_-]{12,}|[a-z0-9_]*token[a-z0-9_]*\s*[:=]\s*[a-z0-9._~+/=-]{12,})\b/i
const OPAQUE_SECRET_VALUE_RE = /^[A-Za-z0-9._~+/=-]{16,}$/
const AUTH_LIKE_KEY_RE = /(auth|authorization|token|secret|password|credential|api[-_]?key)/i

export interface InternalDesktopHarnessResource {
  schemaVersion: 1
  profile: 'internal'
  sourceRepository?: string
  ui: Record<(typeof UI_KEYS)[number], boolean>
  managedConfig?: Record<string, unknown>
  credentialRequirements?: Record<string, unknown>
}

export interface InternalDesktopHarnessLoadResult {
  active: boolean
  diagnostic: string | null
  path: string | null
  resource: InternalDesktopHarnessResource | null
}

export interface InternalDesktopHarnessState {
  active: boolean
  diagnostic: string | null
  managedDir: string | null
  requested: boolean
  resource: InternalDesktopHarnessResource | null
  suppressRemoteBackends: boolean
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function fail(message: string): never {
  throw new Error(`[internal-desktop-harness] ${message}`)
}

function requireNonEmptyString(value: unknown, label: string): void {
  if (typeof value !== 'string' || value.length === 0) {
    fail(`${label} must be a non-empty string`)
  }
}

function isEnvironmentReference(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    (/^\$\{[A-Z_][A-Z0-9_]*\}$/.test(value) || /^Bearer \$\{[A-Z_][A-Z0-9_]*\}$/.test(value))
  )
}

function validateSourceRepository(value: unknown): void {
  if (typeof value !== 'string' || !SOURCE_REPOSITORY_RE.test(value)) {
    fail('sourceRepository must be a GitHub owner/repo identity')
  }

  if (value.includes('..') || value.endsWith('.git') || value.startsWith('-') || /^(https?:|git@)/i.test(value)) {
    fail('sourceRepository must be a safe GitHub owner/repo identity')
  }
}


function validateCredentialRequirements(value: unknown, trail: string[] = ['credentialRequirements']): void {
  if (!isPlainObject(value)) {
    fail(`${trail.join('.')} must be an object`)
  }

  for (const [key, child] of Object.entries(value)) {
    if (!['provider', 'mcpServers', 'mcp_servers'].includes(key) && !/^<[^>]+>$/.test(key)) {
      fail(`credentialRequirements contains unsupported key ${[...trail, key].join('.')}`)
    }

    validateCredentialRequirementNode(child, [...trail, key])
  }
}

function validateCredentialRequirementNode(value: unknown, trail: string[]): void {
  if (typeof value === 'string') {
    const parentKey = trail[trail.length - 2]
    const metadataName = ['requiredEnv', 'required_env', 'name', 'names'].includes(parentKey)

    if (!metadataName && (SECRET_VALUE_RE.test(value) || OPAQUE_SECRET_VALUE_RE.test(value))) {
      fail(`secret-shaped value at ${trail.join('.')}`)
    }

    return
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => validateCredentialRequirementNode(item, [...trail, String(index)]))

    return
  }

  if (!isPlainObject(value)) {
    return
  }

  for (const [key, child] of Object.entries(value)) {
    const parentKey = trail[trail.length - 1]
    const metadataMap = ['mcpServers', 'mcp_servers', 'labels'].includes(parentKey)

    if (!metadataMap && !['requiredEnv', 'required_env', 'label', 'labels', 'name', 'names', 'login'].includes(key) && !/^<[^>]+>$/.test(key)) {
      fail(`credentialRequirements contains unsupported key ${[...trail, key].join('.')}`)
    }

    validateCredentialRequirementNode(child, [...trail, key])
  }
}

function scanNonSecret(value: unknown, trail: string[] = []): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanNonSecret(item, [...trail, String(index)]))

    return
  }

  if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (trail[0] !== 'credentialRequirements' && SECRET_KEY_RE.test(key) && !isEnvironmentReference(child)) {
        fail(`secret-shaped field at ${[...trail, key].join('.')}`)
      }

      if (trail[0] !== 'credentialRequirements' && AUTH_LIKE_KEY_RE.test(key) && typeof child === 'string' && !isEnvironmentReference(child) && OPAQUE_SECRET_VALUE_RE.test(child)) {
        fail(`secret-shaped value at ${[...trail, key].join('.')}`)
      }


      scanNonSecret(child, [...trail, key])
    }

    return
  }

  if (typeof value === 'string') {
    if (SECRET_VALUE_RE.test(value)) {
      fail(`secret-shaped value at ${trail.join('.') || '<root>'}`)
    }
  }
}

export function validateInternalDesktopHarnessResource(input: unknown): InternalDesktopHarnessResource {
  if (!isPlainObject(input)) {fail('resource must be a JSON object')}

  if (input.schemaVersion !== HARNESS_SCHEMA_VERSION) {fail(`schemaVersion must be ${HARNESS_SCHEMA_VERSION}`)}

  if (input.profile !== 'internal') {fail('profile must be "internal"')}

  if ('sourceRepository' in input) {validateSourceRepository(input.sourceRepository)}

  if (!isPlainObject(input.ui)) {fail('ui must be an object')}

  for (const key of UI_KEYS) {
    if (typeof input.ui[key] !== 'boolean') {fail(`ui.${key} must be boolean`)}
  }

  for (const key of Object.keys(input.ui)) {
    if (!(UI_KEYS as readonly string[]).includes(key)) {fail(`ui.${key} is not part of the frozen schema`)}
  }

  if ('managedConfig' in input && !isPlainObject(input.managedConfig)) {fail('managedConfig must be an object when present')}

  if ('credentialRequirements' in input) {
    validateCredentialRequirements(input.credentialRequirements)
  }

  scanNonSecret(input)

  if (isPlainObject(input.managedConfig)) {
    for (const key of Object.keys(input.managedConfig)) {
      if (!['model', 'mcp_servers'].includes(key)) {fail(`managedConfig.${key} is not allowed`)}
    }

    if ('model' in input.managedConfig) {
      const model = input.managedConfig.model

      if (!isPlainObject(model)) {fail('managedConfig.model must be an object')}
      const modelKeys = Object.keys(model)

      for (const key of modelKeys) {
        if (!['provider', 'default', 'base_url', 'api_key'].includes(key)) {fail(`managedConfig.model.${key} is not allowed`)}
      }

      if (!modelKeys.includes('provider') || !modelKeys.includes('default')) {
        fail('managedConfig.model must include placeholder provider and default values')
      }

      requireNonEmptyString(model.provider, 'managedConfig.model.provider')
      requireNonEmptyString(model.default, 'managedConfig.model.default')

      if ('base_url' in model) {requireNonEmptyString(model.base_url, 'managedConfig.model.base_url')}

      if ('api_key' in model && !isEnvironmentReference(model.api_key)) {
        fail('managedConfig.model.api_key must be an environment reference')
      }
    }
  }

  return input as unknown as InternalDesktopHarnessResource
}

export function loadInternalDesktopHarnessResource({
  resourcesPath,
  appRoot,
  allowBuildResource = false
}: {
  resourcesPath?: string | null
  appRoot: string
  allowBuildResource?: boolean
}): InternalDesktopHarnessLoadResult {
  const candidates = [
    resourcesPath ? path.join(resourcesPath, HARNESS_RESOURCE_FILENAME) : null,
    allowBuildResource ? path.join(appRoot, 'build', HARNESS_RESOURCE_FILENAME) : null
  ].filter(Boolean) as string[]

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) {continue}

    try {
      const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8'))
      const resource = validateInternalDesktopHarnessResource(parsed)

      return { active: true, diagnostic: null, path: candidate, resource }
    } catch (error) {
      return {
        active: false,
        diagnostic: `invalid ${HARNESS_RESOURCE_FILENAME} at ${candidate}: ${(error as Error).message}`,
        path: candidate,
        resource: null
      }
    }
  }

  return { active: false, diagnostic: null, path: null, resource: null }
}

export function materializeInternalDesktopManagedConfig(
  resource: InternalDesktopHarnessResource,
  {
    userDataPath,
    pid = process.pid,
    nonce = () => crypto.randomBytes(6).toString('hex')
  }: { userDataPath: string; pid?: number; nonce?: () => string }
): string {
  const managedDir = path.join(userDataPath, 'internal-desktop-harness', `${pid}-${nonce()}`)
  fs.mkdirSync(managedDir, { recursive: true })
  fs.writeFileSync(path.join(managedDir, 'config.yaml'), `${JSON.stringify(resource.managedConfig || {}, null, 2)}\n`, 'utf8')

  return managedDir
}

export function initializeInternalDesktopHarness({
  resourcesPath,
  appRoot,
  userDataPath,
  isWsl = false,
  allowBuildResource = false
}: {
  resourcesPath?: string | null
  appRoot: string
  userDataPath: string
  isWsl?: boolean
  allowBuildResource?: boolean
}): InternalDesktopHarnessState {
  const loaded = loadInternalDesktopHarnessResource({ resourcesPath, appRoot, allowBuildResource })

  if (loaded.active && isWsl) {
    return {
      active: false,
      managedDir: null,
      requested: true,
      resource: loaded.resource,
      suppressRemoteBackends: true,
      diagnostic: 'internal Desktop harness resource is ignored for WSL until explicit path translation is implemented'
    }
  }

  if (!loaded.active || !loaded.resource) {
    return {
      active: false,
      managedDir: null,
      requested: false,
      resource: null,
      suppressRemoteBackends: false,
      diagnostic: loaded.diagnostic
    }
  }

  try {
    return {
      active: true,
      managedDir: materializeInternalDesktopManagedConfig(loaded.resource, { userDataPath }),
      requested: true,
      resource: loaded.resource,
      suppressRemoteBackends: true,
      diagnostic: null
    }
  } catch (error) {
    return {
      active: false,
      managedDir: null,
      requested: true,
      resource: null,
      suppressRemoteBackends: true,
      diagnostic: `could not materialize ${HARNESS_RESOURCE_FILENAME}: ${(error as Error).message}`
    }
  }
}
