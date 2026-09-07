import { routePathname, routeSessionIdWithReserved } from '@/app/route-contract'

export type InternalCompanyUiMode = 'harness' | 'upstream'
export type HarnessProvisioningState = 'complete' | 'incomplete' | 'unknown'

export interface HarnessUiFlags {
  agents: boolean
  cron: boolean
  messaging: boolean
  terminal: boolean
  webhooks: boolean
}

export interface HarnessProvisioning {
  detail?: string
  missing: string[]
  state: HarnessProvisioningState
}

export interface InternalCompanyCapabilityState {
  allowedRoutes: ReadonlySet<string>
  expected: boolean
  mode: InternalCompanyUiMode
  provisioning: HarnessProvisioning
  reservedRoutes: ReadonlySet<string>
  terminalAllowed: boolean
  ui: HarnessUiFlags
}

export interface InternalCompanyRouteState {
  allowedRoutes?: ReadonlySet<string>
  mode: InternalCompanyUiMode
  reservedRoutes?: ReadonlySet<string>
}

interface HarnessEnv {
  readonly [key: string]: unknown
}

const BASE_ALLOWED_ROUTES = ['/', '/artifacts', '/settings', '/skills'] as const
const SESSION_RESERVED_ROUTES = [
  ...BASE_ALLOWED_ROUTES,
  '/agents',
  '/command-center',
  '/cron',
  '/messaging',
  '/profiles',
  '/starmap',
  '/webhooks'
] as const

function envString(env: HarnessEnv, key: string): string {
  const value = env[key]

  return typeof value === 'string' ? value.trim() : ''
}

function envBoolean(env: HarnessEnv, key: string, fallback: boolean): boolean {
  const value = envString(env, key).toLowerCase()

  if (!value) {
    return fallback
  }

  return value === '1' || value === 'true' || value === 'yes' || value === 'on'
}

export function internalCompanyExpectedFromEnv(env: HarnessEnv): boolean {
  const profile = envString(env, 'VITE_HERMES_DESKTOP_HARNESS').toLowerCase()

  return profile === 'internal'
}

export function harnessUiFlagsFromEnv(env: HarnessEnv): HarnessUiFlags {
  return {
    agents: envBoolean(env, 'VITE_HERMES_HARNESS_SHOW_AGENTS', false),
    cron: envBoolean(env, 'VITE_HERMES_HARNESS_SHOW_CRON', true),
    messaging: envBoolean(env, 'VITE_HERMES_HARNESS_SHOW_MESSAGING', false),
    terminal: envBoolean(env, 'VITE_HERMES_HARNESS_SHOW_TERMINAL', true),
    webhooks: envBoolean(env, 'VITE_HERMES_HARNESS_SHOW_WEBHOOKS', false)
  }
}

function buildAllowedRoutes(ui: HarnessUiFlags): ReadonlySet<string> {
  const routes = new Set<string>(BASE_ALLOWED_ROUTES)

  if (ui.agents) {
    routes.add('/agents')
  }

  if (ui.cron) {
    routes.add('/cron')
  }

  if (ui.messaging) {
    routes.add('/messaging')
  }

  if (ui.webhooks) {
    routes.add('/webhooks')
  }

  return routes
}

export function initialInternalCompanyCapabilities(expected: boolean, ui: HarnessUiFlags = harnessUiFlagsFromEnv({})): InternalCompanyCapabilityState {
  if (!expected) {
    return {
      allowedRoutes: new Set(),
      expected,
      mode: 'upstream',
      provisioning: { missing: [], state: 'unknown' },
      reservedRoutes: new Set(),
      terminalAllowed: true,
      ui
    }
  }

  const allowedRoutes = buildAllowedRoutes(ui)

  return {
    allowedRoutes,
    expected,
    mode: 'harness',
    provisioning: { detail: 'Runtime provisioning has not reported readiness yet.', missing: [], state: 'unknown' },
    reservedRoutes: new Set(SESSION_RESERVED_ROUTES),
    terminalAllowed: ui.terminal,
    ui
  }
}

export function updateInternalCompanyProvisioning(
  current: InternalCompanyCapabilityState,
  provisioning: HarnessProvisioning
): InternalCompanyCapabilityState {
  if (current.mode === 'upstream') {
    return current
  }

  return { ...current, provisioning }
}

export function harnessProvisioningFromRuntimeReadiness(status: {
  ready: boolean
  reason: null | string
} | null): HarnessProvisioning {
  if (status === null) {
    return { missing: [], state: 'unknown' }
  }

  if (status.ready) {
    return { missing: [], state: 'complete' }
  }

  return {
    detail: status.reason ?? 'IT setup incomplete.',
    missing: ['inference'],
    state: 'incomplete'
  }
}

export function internalCompanyRouteAllowed(to: string, state: InternalCompanyRouteState): boolean {
  if (state.mode === 'upstream') {
    return true
  }

  const path = routePathname(to)

  if (state.allowedRoutes?.has(path)) {
    return true
  }

  return routeSessionIdWithReserved(path, state.reservedRoutes ?? new Set(SESSION_RESERVED_ROUTES)) !== null
}

export function filterInternalCompanyRoutes(
  routes: readonly string[],
  state: InternalCompanyRouteState
): string[] {
  return routes.filter(route => internalCompanyRouteAllowed(route, state))
}
