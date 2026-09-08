import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type * as AppBrandModule from '@/lib/app-brand'

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.doUnmock('@/lib/app-brand')
  vi.resetModules()
})

async function loadIntro() {
  return import('./intro')
}

async function loadIntroHarness() {
  vi.resetModules()
  vi.doMock('@/lib/app-brand', async importOriginal => {
    const actual = (await importOriginal()) as typeof AppBrandModule

    return {
      ...actual,
      appBrand: () => actual.lemonAppBrand,
      appBrandForEnv: () => actual.lemonAppBrand
    }
  })

  const { I18nProvider } = await import('@/i18n')
  const { Intro } = await import('./intro')

  return { Intro, I18nProvider }
}

describe('Intro', () => {
  it('keeps the upstream Hermes fresh-chat wordmark by default', async () => {
    const { Intro } = await loadIntro()

    render(<Intro seed={0} />)

    expect(screen.getAllByText('HERMES AGENT')).toHaveLength(2)
    expect(screen.queryAllByText('LEMON AI')).toHaveLength(0)
  })

  it('uses Lemon AI for fresh chat in the internal harness', async () => {
    const { Intro, I18nProvider } = await loadIntroHarness()

    render(
      <I18nProvider configClient={null} initialLocale="vi">
        <Intro seed={0} />
      </I18nProvider>
    )

    expect(screen.getByRole('heading', { name: 'Hôm nay bạn cần hỗ trợ gì?' })).toBeTruthy()
    expect(
      screen.getByText('Viết nội dung, tìm thông tin hoặc xử lý tài liệu - bắt đầu bằng một yêu cầu.')
    ).toBeTruthy()
    expect(screen.queryByText('LEMON AI')).toBeNull()
    expect(screen.queryAllByText('HERMES AGENT')).toHaveLength(0)
  })

  it('inserts an editable starter draft and focuses the real composer without submitting', async () => {
    const { Intro, I18nProvider } = await loadIntroHarness()
    const insert = vi.fn()
    const focus = vi.fn()
    const submit = vi.fn()
    window.addEventListener('hermes:composer-insert', insert)
    window.addEventListener('hermes:composer-focus', focus)
    window.addEventListener('hermes:composer-submit', submit)

    render(
      <I18nProvider configClient={null} initialLocale="vi">
        <Intro composerTarget="main" seed={0} />
      </I18nProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: /Viết nội dung/i }))

    await waitFor(() => {
      expect(insert).toHaveBeenCalledTimes(1)
      expect(focus).toHaveBeenCalledTimes(1)
    })
    expect(insert.mock.calls[0]?.[0]).toMatchObject({
      detail: {
        mode: 'block',
        target: 'main',
        text: expect.stringContaining('Hỗ trợ tôi viết nội dung')
      }
    })
    expect(focus.mock.calls[0]?.[0]).toMatchObject({ detail: { target: 'main' } })
    expect(submit).not.toHaveBeenCalled()

    window.removeEventListener('hermes:composer-insert', insert)
    window.removeEventListener('hermes:composer-focus', focus)
    window.removeEventListener('hermes:composer-submit', submit)
  })
})
