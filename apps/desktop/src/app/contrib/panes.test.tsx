// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { initialInternalCompanyCapabilities } from '@/app/internal-company/capabilities'
import {
  resetInternalCompanyCapabilitiesForTest,
  setInternalCompanyCapabilitiesForTest
} from '@/app/internal-company/store'
import { registry } from '@/contrib/registry'

import { useStatusbarContributions, useTitlebarToolContributions } from './panes'

const disposers: Array<() => void> = []

function StatusProbe() {
  const items = useStatusbarContributions('right')

  return (
    <div>
      {items.map(item => (
        <span key={item.id}>{item.label ?? item.id}</span>
      ))}
    </div>
  )
}

function TitleProbe() {
  const tools = useTitlebarToolContributions('right')

  return (
    <div>
      {tools.map(tool => (
        <span key={tool.id}>{tool.label}</span>
      ))}
    </div>
  )
}

afterEach(() => {
  cleanup()
  resetInternalCompanyCapabilitiesForTest()

  while (disposers.length) {
    disposers.pop()?.()
  }
})

describe('internal harness contribution filtering', () => {
  it('hides optional third-party statusbar and arbitrary render contributions while keeping core data groups', () => {
    setInternalCompanyCapabilitiesForTest(initialInternalCompanyCapabilities(true))
    disposers.push(
      registry.register({
        area: 'statusBar.right',
        data: { id: 'core-status', label: 'Core status' },
        id: 'core-status',
        source: 'core'
      }),
      registry.register({
        area: 'statusBar.right',
        data: { id: 'plugin-status', label: 'Plugin status' },
        id: 'plugin-status',
        source: 'plugin-a'
      }),
      registry.register({
        area: 'statusBar.right',
        id: 'render-status',
        render: () => <span>Rendered status</span>,
        source: 'core'
      })
    )

    render(<StatusProbe />)

    expect(screen.getByText('Core status')).toBeTruthy()
    expect(screen.queryByText('Plugin status')).toBeNull()
    expect(screen.queryByText('render-status')).toBeNull()
  })

  it('hides optional third-party titlebar tool contributions in harness mode', () => {
    setInternalCompanyCapabilitiesForTest(initialInternalCompanyCapabilities(true))
    disposers.push(
      registry.register({
        area: 'titleBar.tools.right',
        data: { icon: null, id: 'core-tool', label: 'Core tool' },
        id: 'core-tool',
        source: 'core'
      }),
      registry.register({
        area: 'titleBar.tools.right',
        data: { icon: null, id: 'plugin-tool', label: 'Plugin tool' },
        id: 'plugin-tool',
        source: 'plugin-a'
      })
    )

    render(<TitleProbe />)

    expect(screen.getByText('Core tool')).toBeTruthy()
    expect(screen.queryByText('Plugin tool')).toBeNull()
  })
})
