import { loadHarnessConfigInput } from './internal-desktop-harness.mjs'

const DEFINE_PREFIX = 'process.env.'

export function resolveElectronBundleDefines({ env = process.env, isDev = false } = {}) {
  if (isDev) {
    return {}
  }

  const internalPackage = Boolean(loadHarnessConfigInput(env))

  return {
    [`${DEFINE_PREFIX}HERMES_DESKTOP_IS_PACKAGED`]: JSON.stringify(true),
    [`${DEFINE_PREFIX}HERMES_DESKTOP_INTERNAL_PACKAGE`]: JSON.stringify(internalPackage ? '1' : '')
  }
}
