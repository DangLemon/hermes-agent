import { internalCompanyBuildEnv, internalCompanyExpectedFromEnv } from '@/app/internal-company/capabilities'

export type AppBrandMode = 'upstream' | 'internal-harness'

export interface AppBrand {
  accent: string
  accentForeground: string
  displayName: string
  lockupSrc: string
  markSrc: string
  mode: AppBrandMode
  primary: string
  primaryForeground: string
  ring: string
  sidebarForeground: string
  wordmark: string
}

type BrandEnv = Record<string, unknown>

const assetPath = (path: string): string => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

export const upstreamAppBrand: AppBrand = {
  accent: '#0053fd',
  accentForeground: '#ffffff',
  displayName: 'Hermes Agent',
  lockupSrc: '',
  markSrc: assetPath('nous-girl.jpg'),
  mode: 'upstream',
  primary: '#0053fd',
  primaryForeground: '#ffffff',
  ring: '#0053fd',
  sidebarForeground: 'var(--ui-text-secondary)',
  wordmark: 'HERMES AGENT'
}

export const lemonAppBrand: AppBrand = {
  accent: '#ffdd00',
  accentForeground: '#322b29',
  displayName: 'Lemon AI',
  lockupSrc: assetPath('lemon-lockup.png'),
  markSrc: assetPath('lemon-mark.png'),
  mode: 'internal-harness',
  primary: '#ffdd00',
  primaryForeground: '#322b29',
  ring: '#806b00',
  sidebarForeground: '#322b29',
  wordmark: 'Lemon AI'
}

export function appBrandForEnv(env: BrandEnv = internalCompanyBuildEnv()): AppBrand {
  return internalCompanyExpectedFromEnv(env) ? lemonAppBrand : upstreamAppBrand
}

export const appBrand = appBrandForEnv

export function applyAppBrandRoot(
  root: HTMLElement,
  brand: AppBrand = appBrandForEnv(),
  mode: 'light' | 'dark' = root.classList.contains('dark') ? 'dark' : 'light'
): void {
  if (brand.mode !== 'internal-harness') {
    delete root.dataset.hermesBrand

    return
  }

  root.dataset.hermesBrand = 'lemon'

  const vars: Record<string, string> = {
    '--lemon-brand-primary': brand.primary,
    '--lemon-brand-primary-foreground': brand.primaryForeground,
    '--lemon-brand-accent': brand.accent,
    '--lemon-brand-accent-foreground': brand.accentForeground,
    '--lemon-brand-sidebar-foreground': brand.sidebarForeground,
    '--lemon-workspace-canvas': mode === 'dark' ? '#171412' : '#ffffff',
    '--lemon-workspace-sidebar': mode === 'dark' ? '#24201d' : '#f5f5f3',
    '--lemon-workspace-raised': mode === 'dark' ? '#2c2723' : '#ffffff',
    '--lemon-workspace-ink': mode === 'dark' ? '#f5f1ea' : '#322b29',
    '--lemon-workspace-ink-muted': mode === 'dark' ? '#c9c0b5' : '#68645f',
    '--lemon-workspace-border': mode === 'dark' ? '#433b35' : '#e6e4df',
    '--lemon-workspace-brand': brand.primary,
    '--lemon-workspace-brand-hover': '#f4d300',
    '--lemon-workspace-brand-ink': brand.primaryForeground,
    '--lemon-workspace-selected': mode === 'dark' ? '#51470d' : '#fff4b8',
    '--lemon-workspace-selected-border': mode === 'dark' ? '#75670c' : '#f0d456',
    '--lemon-workspace-control-hover': mode === 'dark' ? '#332d29' : '#ffffff',
    '--lemon-workspace-focus': brand.ring,
    '--theme-primary': brand.primary,
    '--theme-midground': mode === 'dark' ? brand.primary : brand.primaryForeground,
    '--theme-accent-soft': mode === 'dark' ? '#51470d' : '#fff4b8',
    '--theme-warm': brand.ring,
    '--ui-accent': mode === 'dark' ? brand.primary : brand.primaryForeground,
    '--ui-accent-secondary': brand.ring,
    '--dt-primary-foreground': brand.primaryForeground,
    '--dt-primary-solid': brand.primary,
    '--dt-primary-solid-foreground': brand.primaryForeground,
    '--dt-accent-foreground': brand.primaryForeground,
    '--dt-midground-foreground': brand.primaryForeground,
    '--dt-composer-ring': brand.ring,
    '--dt-ring': brand.ring
  }

  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
  }
}
