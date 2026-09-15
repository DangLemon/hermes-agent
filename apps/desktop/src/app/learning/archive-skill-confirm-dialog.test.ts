import { describe, expect, it, vi } from 'vitest'

import { TRANSLATIONS } from '@/i18n/catalog'
import { lemonAppBrand, upstreamAppBrand } from '@/lib/app-brand'

import { archiveLearningSkill, archiveSkillDialogCopyForBrand } from './archive-skill-confirm-dialog'

vi.mock('@/hermes', () => ({
  deleteLearningNode: vi.fn()
}))

describe('archiveSkillDialogCopyForBrand', () => {
  it('preserves upstream archive copy and the Hermes CLI restore command', () => {
    const copy = archiveSkillDialogCopyForBrand(TRANSLATIONS.en, upstreamAppBrand)

    expect(copy.confirmLabel).toBe('Archive')
    expect(copy.description).toBe('The skill is archived and can be restored with `hermes curator restore`.')
    expect(copy.title('research')).toBe('Archive research?')
  })

  it('uses Vietnamese internal copy while preserving the Hermes CLI restore command', () => {
    const copy = archiveSkillDialogCopyForBrand(TRANSLATIONS.vi, lemonAppBrand)
    const combined = [copy.confirmLabel, copy.description, copy.failureFallback, copy.title('research')].join('\n')

    expect(copy.confirmLabel).toBe('Lưu trữ')
    expect(copy.description).toContain('`hermes curator restore`')
    expect(copy.title('research')).toBe('Lưu trữ research?')
    expect(combined).not.toContain('Archive')
  })

  it('uses the active Japanese locale for Lemon archive copy', () => {
    const copy = archiveSkillDialogCopyForBrand(TRANSLATIONS.ja, lemonAppBrand)
    const combined = [copy.confirmLabel, copy.description, copy.failureFallback, copy.title('research')].join('\n')

    expect(copy.confirmLabel).toBe('アーカイブ')
    expect(copy.description).toContain('hermes curator restore')
    expect(copy.title('research')).toBe('research をアーカイブしますか？')
    expect(combined).not.toContain('Lưu trữ')
    expect(combined).not.toContain('Archive')
  })

  it.each([
    ['zh-hant', '封存 demo？', '封存失敗'],
    ['ru', 'Отправить demo в архив?', 'Не удалось отправить в архив'],
    ['ar', 'أرشفة demo؟', 'فشلت الأرشفة']
  ] as const)('keeps %s archive dialog copy localized', (locale, title, failureFallback) => {
    const copy = archiveSkillDialogCopyForBrand(TRANSLATIONS[locale], lemonAppBrand)
    const combined = [copy.confirmLabel, copy.description, copy.failureFallback, copy.title('demo')].join('\n')

    expect(copy.title('demo')).toBe(title)
    expect(copy.failureFallback).toBe(failureFallback)
    expect(copy.description).toContain('hermes curator restore')
    expect(combined).not.toContain('Archive')
  })
})

describe('archiveLearningSkill', () => {
  it('preserves backend error messages instead of branding runtime text', async () => {
    const { deleteLearningNode } = await import('@/hermes')

    vi.mocked(deleteLearningNode).mockResolvedValueOnce({
      message: 'Hermes backend refused archive',
      ok: false
    })

    await expect(archiveLearningSkill('skill-1', undefined, 'Không thể lưu trữ')).rejects.toThrow(
      'Hermes backend refused archive'
    )
  })

  it('uses the provided static fallback when the backend omits a message', async () => {
    const { deleteLearningNode } = await import('@/hermes')

    vi.mocked(deleteLearningNode).mockResolvedValueOnce({ message: '', ok: false })

    await expect(archiveLearningSkill('skill-1', undefined, 'Không thể lưu trữ')).rejects.toThrow('Không thể lưu trữ')
  })
})
