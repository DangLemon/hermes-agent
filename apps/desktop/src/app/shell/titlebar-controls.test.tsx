// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { initialInternalCompanyCapabilities } from '@/app/internal-company/capabilities'
import {
  resetInternalCompanyCapabilitiesForTest,
  setInternalCompanyCapabilitiesForTest
} from '@/app/internal-company/store'

import { TitlebarControls, type TitlebarTool } from './titlebar-controls'

function renderControls(tools: TitlebarTool[]) {
  return render(
    <MemoryRouter>
      <TitlebarControls onOpenSettings={vi.fn()} tools={tools} />
    </MemoryRouter>
  )
}

afterEach(() => {
  cleanup()
  resetInternalCompanyCapabilitiesForTest()
})

describe('TitlebarControls internal harness policy', () => {
  it('hides denied route tools before their action can execute', () => {
    const onSelect = vi.fn()
    setInternalCompanyCapabilitiesForTest(initialInternalCompanyCapabilities(true))

    renderControls([{ icon: <span />, id: 'profiles', label: 'Profiles', onSelect, to: '/profiles' }])

    expect(screen.queryByRole('button', { name: 'Profiles' })).toBeNull()
    expect(onSelect).not.toHaveBeenCalled()
  })
})
