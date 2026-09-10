// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { initialInternalCompanyCapabilities } from '@/app/internal-company/capabilities'
import { resetInternalCompanyCapabilitiesForTest, setInternalCompanyCapabilitiesForTest } from '@/app/internal-company/store'

vi.mock('./about-settings', () => ({ AboutSettings: () => <div>About panel</div> }))
vi.mock('./ai-connection-settings', () => ({ AiConnectionSettings: () => <div>AI connection panel</div> }))
vi.mock('./appearance-settings', () => ({ AppearanceSettings: () => <div>Appearance panel</div> }))
vi.mock('./billing', () => ({ BillingSettings: () => <div>Billing panel</div> }))
vi.mock('./config-settings', () => ({ ConfigSettings: ({ activeSectionId }: { activeSectionId: string }) => <div>Config {activeSectionId}</div> }))
vi.mock('./gateway-settings', () => ({ GatewaySettings: () => <div>Gateway panel</div> }))
vi.mock('./keybind-settings', () => ({ KeybindSettings: () => <div>Keybinds panel</div> }))
vi.mock('./keys-settings', () => ({
  KEYS_VIEWS: ['tools', 'settings'],
  KeysSettings: () => <div>Keys panel</div>
}))
vi.mock('./notifications-settings', () => ({ NotificationsSettings: () => <div>Notifications panel</div> }))
vi.mock('./plugins-settings', () => ({ PluginsSettings: () => <div>Plugins panel</div> }))
vi.mock('./providers-settings', () => ({
  PROVIDER_VIEWS: ['accounts', 'keys', 'custom-endpoints', 'local'],
  ProvidersSettings: () => <div>Providers panel</div>
}))
vi.mock('./sessions-settings', () => ({ SessionsSettings: () => <div>Sessions panel</div> }))

async function renderSettings(route: string) {
  const { SettingsView } = await import('./index')

  return render(
    <MemoryRouter initialEntries={[route]}>
      <SettingsView onClose={vi.fn()} />
    </MemoryRouter>
  )
}

afterEach(() => {
  cleanup()
  resetInternalCompanyCapabilitiesForTest()
  vi.clearAllMocks()
})

describe('SettingsView internal harness policy', () => {
  it('routes providers to the friendly AI connection screen and hides managed settings surfaces', async () => {
    setInternalCompanyCapabilitiesForTest(initialInternalCompanyCapabilities(true))

    const view = await renderSettings('/settings?tab=providers&pview=custom-endpoints')

    expect(await screen.findByText('AI connection panel')).not.toBeNull()
    expect(screen.queryByText('Providers panel')).toBeNull()

    await waitFor(() => {
      expect(view.container.querySelector('[data-tour="nav-providers"]')).not.toBeNull()
    })

    expect(screen.getAllByText('AI Connection')).toHaveLength(2)
    expect(view.container.querySelector('[data-tour="nav-pview:accounts"]')).toBeNull()
    expect(view.container.querySelector('[data-tour="nav-pview:keys"]')).toBeNull()
    expect(view.container.querySelector('[data-tour="nav-pview:custom-endpoints"]')).toBeNull()
    expect(view.container.querySelector('[data-tour="nav-gateway"]')).toBeNull()
    expect(view.container.querySelector('[data-tour="nav-keys"]')).toBeNull()
    expect(view.container.querySelector('[data-tour="nav-billing"]')).toBeNull()
    expect(view.container.querySelector('[data-tour="nav-plugins"]')).toBeNull()
    expect(view.container.querySelector('[data-tour="nav-config:model"]')).toBeNull()
    expect(view.container.querySelector('[data-tour="nav-config:advanced"]')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Export config' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Import config' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reset to defaults' })).toBeNull()
  })
})
