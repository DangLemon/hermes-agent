import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getLogs: vi.fn().mockResolvedValue({ lines: [] }),
  notifyError: vi.fn(),
  reconnectGateway: vi.fn<() => Promise<void>>()
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tip: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

vi.mock('@/hermes', () => ({
  getLogs: mocks.getLogs
}))

vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: {
      commandCenter: { restartGateway: 'Restart gateway' },
      shell: {
        gatewayMenu: {
          checkingInference: 'Checking inference',
          connected: 'Connected',
          connecting: 'Connecting',
          disconnected: 'Disconnected',
          inferenceNotReady: 'Inference not ready',
          inferenceReady: 'Inference ready',
          messagingPlatforms: 'Messaging platforms',
          offline: 'Offline',
          openSystem: 'Open system panel',
          recentActivity: 'Recent activity',
          reconnectGateway: 'Reconnect gateway',
          viewAllLogs: 'View all logs'
        }
      }
    }
  })
}))

vi.mock('@/store/gateway-reconnect', () => ({
  reconnectGateway: mocks.reconnectGateway
}))

vi.mock('@/store/notifications', () => ({
  notifyError: mocks.notifyError
}))

vi.mock('@/store/system-actions', () => ({
  runGatewayRestart: vi.fn()
}))

import { GatewayMenuPanel } from './gateway-menu-panel'

const renderPanel = (gatewayState: string, props: Partial<React.ComponentProps<typeof GatewayMenuPanel>> = {}) =>
  render(
    <GatewayMenuPanel
      gatewayState={gatewayState}
      inferenceStatus={null}
      onClose={vi.fn()}
      onOpenSystem={vi.fn()}
      statusSnapshot={null}
      {...props}
    />
  )

describe('GatewayMenuPanel reconnect action', () => {
  beforeEach(() => {
    mocks.reconnectGateway.mockReset().mockResolvedValue(undefined)
    mocks.getLogs.mockReset().mockResolvedValue({ lines: [] })
    mocks.notifyError.mockReset()
  })

  afterEach(() => cleanup())

  it('shows reconnect only while disconnected and disables it in flight', async () => {
    let finish: (() => void) | undefined
    mocks.reconnectGateway.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          finish = resolve
        })
    )

    renderPanel('closed')

    const reconnect = screen.getByRole('button', { name: 'Reconnect gateway' })
    fireEvent.click(reconnect)
    fireEvent.click(reconnect)

    expect(mocks.reconnectGateway).toHaveBeenCalledOnce()
    expect((reconnect as HTMLButtonElement).disabled).toBe(true)

    await act(async () => finish?.())
  })

  it('hides reconnect while the socket is open', async () => {
    renderPanel('open')
    await act(async () => undefined)

    expect(screen.queryByRole('button', { name: 'Reconnect gateway' })).toBeNull()
  })
})

describe('GatewayMenuPanel internal harness chrome', () => {
  afterEach(() => cleanup())

  it('renders provisioning setup state and hides System and restart admin chrome', async () => {
    mocks.getLogs.mockResolvedValue({ lines: ['2026-09-07 10:00:00 setup check failed'] })

    renderPanel('open', {
      harnessMode: true,
      harnessProvisioning: { detail: 'No inference provider configured.', missing: ['inference'], state: 'incomplete' }
    })

    expect(await screen.findByText('IT setup incomplete')).toBeTruthy()
    expect(screen.getByText('No inference provider configured.')).toBeTruthy()
    expect(screen.getByText('Missing: inference')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Open system panel' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Restart gateway' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'View all logs' })).toBeNull()
  })

  it('renders an unknown provisioning notice without blocking the menu', () => {
    renderPanel('open', {
      harnessMode: true,
      harnessProvisioning: {
        detail: 'Runtime provisioning has not reported readiness yet.',
        missing: [],
        state: 'unknown'
      }
    })

    expect(screen.getByText('IT setup status unknown')).toBeTruthy()
    expect(screen.getByText('Runtime provisioning has not reported readiness yet.')).toBeTruthy()
  })
})
