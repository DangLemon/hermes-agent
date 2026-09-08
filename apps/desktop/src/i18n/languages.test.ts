import { describe, expect, it } from 'vitest'

import { TRANSLATIONS } from './catalog'
import { DEFAULT_LOCALE, isLocale, isSupportedLocaleValue, localeConfigValue, normalizeLocale } from './languages'

describe('desktop i18n languages', () => {
  it('normalizes supported locale aliases', () => {
    expect(normalizeLocale('en')).toBe('en')
    expect(normalizeLocale('EN-US')).toBe('en')
    expect(normalizeLocale('zh')).toBe('zh')
    expect(normalizeLocale('zh-CN')).toBe('zh')
    expect(normalizeLocale('zh-Hans')).toBe('zh')
    expect(normalizeLocale(' zh_hans_cn ')).toBe('zh')
    expect(normalizeLocale('zh-Hant')).toBe('zh-hant')
    expect(normalizeLocale('zh-TW')).toBe('zh-hant')
    expect(normalizeLocale('zh_HK')).toBe('zh-hant')
    expect(normalizeLocale('ja')).toBe('ja')
    expect(normalizeLocale('ja-JP')).toBe('ja')
    expect(normalizeLocale('ar')).toBe('ar')
    expect(normalizeLocale('AR-SA')).toBe('ar')
    expect(normalizeLocale(' ar_eg ')).toBe('ar')
    expect(normalizeLocale('ru')).toBe('ru')
    expect(normalizeLocale('RU-RU')).toBe('ru')
    expect(normalizeLocale(' ru_ru ')).toBe('ru')
    expect(normalizeLocale('Русский')).toBe('ru')
    expect(normalizeLocale('vi')).toBe('vi')
    expect(normalizeLocale('vi-VN')).toBe('vi')
    expect(normalizeLocale('Vietnamese')).toBe('vi')
    expect(normalizeLocale('Tiếng Việt')).toBe('vi')
  })

  it('falls back to English for empty or unsupported values', () => {
    expect(normalizeLocale(null)).toBe(DEFAULT_LOCALE)
    expect(normalizeLocale('')).toBe(DEFAULT_LOCALE)
    expect(normalizeLocale('de')).toBe(DEFAULT_LOCALE)
  })

  it('distinguishes exact locale ids from supported config aliases', () => {
    expect(isSupportedLocaleValue('zh-CN')).toBe(true)
    expect(isSupportedLocaleValue('zh-TW')).toBe(true)
    expect(isSupportedLocaleValue('ja-JP')).toBe(true)
    expect(isSupportedLocaleValue('ru-RU')).toBe(true)
    expect(isSupportedLocaleValue('vi-VN')).toBe(true)
    expect(isSupportedLocaleValue('de')).toBe(false)
    expect(isLocale('zh-CN')).toBe(false)
    expect(isLocale('zh')).toBe(true)
    expect(isLocale('zh-hant')).toBe(true)
    expect(isLocale('ja')).toBe(true)
    expect(isLocale('ar')).toBe(true)
    expect(isLocale('ru')).toBe(true)
    expect(isLocale('vi')).toBe(true)
  })

  it('returns the persisted config value for supported locales', () => {
    expect(localeConfigValue('en')).toBe('en')
    expect(localeConfigValue('zh')).toBe('zh')
    expect(localeConfigValue('zh-hant')).toBe('zh-hant')
    expect(localeConfigValue('ja')).toBe('ja')
    expect(localeConfigValue('ar')).toBe('ar')
    expect(localeConfigValue('ru')).toBe('ru')
    expect(localeConfigValue('vi')).toBe('vi')
  })

  it('provides internal Lemon workspace copy without inherited English chrome labels', () => {
    const t = TRANSLATIONS.vi

    expect(t.internalWorkspace.actions.newConversation).toBe('Cuộc trò chuyện mới')
    expect(t.shell.gatewayMenu.connected).toBe('Đã kết nối')
    expect(t.shell.gatewayMenu.inferenceReady).toBe('Đã kết nối')
    expect(t.shell.statusbar.gatewayReady).toBe('Đã kết nối')
    expect(t.shell.statusbar.gatewayConnecting).toBe('Đang kết nối')
    expect(t.composer.voiceControls).toBe('Giọng nói')
    expect(t.skills.sortMostUsed).toBe('Dùng nhiều')
  })

  it('keeps the English internal new conversation label icon-free', () => {
    expect(TRANSLATIONS.en.internalWorkspace.actions.newConversation).toBe('New conversation')
  })
})
