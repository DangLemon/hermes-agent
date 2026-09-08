import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ChatBarState } from '@/app/chat/composer/types'
import { I18nProvider, useI18n } from '@/i18n'

import { ContextMenu } from './context-menu'
import type * as ComposerContrib from './contrib'

vi.mock('./contrib', async importOriginal => ({
  ...(await importOriginal<typeof ComposerContrib>()),
  useComposerAttachmentProviders: () => []
}))

const state: ChatBarState = {
  model: { canSwitch: false, model: '', provider: '' },
  tools: { enabled: true, label: 'Add context' },
  voice: { active: false, enabled: false }
}

function LocalizedContextMenu() {
  const { t } = useI18n()

  return (
    <ContextMenu
      label={t.internalWorkspace.composer.attach}
      onInsertText={vi.fn()}
      onOpenUrlDialog={vi.fn()}
      onPickFiles={vi.fn()}
      onPickFolders={vi.fn()}
      onPickImages={vi.fn()}
      state={state}
    />
  )
}

afterEach(cleanup)

describe('ContextMenu label', () => {
  it('uses the visible localized attachment label as the accessible name', () => {
    render(
      <I18nProvider configClient={null} initialLocale="vi">
        <LocalizedContextMenu />
      </I18nProvider>
    )

    expect(screen.getByRole('button', { name: 'Đính kèm' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Add context' })).toBeNull()
  })
})
