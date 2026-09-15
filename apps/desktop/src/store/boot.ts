import { atom } from 'nanostores'

import type { DesktopBootProgress } from '@/global'
import { translateNow } from '@/i18n'
import { appBrand, type AppBrand, replaceHermesBrandTerms } from '@/lib/app-brand'

export interface DesktopBootState extends DesktopBootProgress {
  visible: boolean
}

const INITIAL_BOOT_STATE: DesktopBootState = {
  error: null,
  fakeMode: false,
  message: translateNow('boot.steps.startingHermesDesktop'),
  phase: 'renderer.init',
  progress: 2,
  running: true,
  timestamp: Date.now(),
  visible: true
}

/** Normalize backend boot copy at the renderer store boundary. */
export function brandBootMessage(message: string, brand: AppBrand = appBrand()): string {
  return replaceHermesBrandTerms(message, brand)
}

export const $desktopBoot = atom<DesktopBootState>(INITIAL_BOOT_STATE)

function clampProgress(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(100, Math.round(value)))
}

export function applyDesktopBootProgress(progress: DesktopBootProgress) {
  const current = $desktopBoot.get()
  const nextProgress = clampProgress(progress.progress)
  const mergedProgress = progress.running ? Math.max(current.progress, nextProgress) : nextProgress
  const message = brandBootMessage(progress.message)
  const progressError = progress.error === null ? null : progress.error ? brandBootMessage(progress.error) : null

  // Don't let a late progress event (error: null) clobber a previously-set
  // boot failure — failDesktopBoot is terminal for this boot cycle.
  const error = progressError ?? (current.running ? null : current.error)

  $desktopBoot.set({
    ...current,
    ...progress,
    error,
    message,
    progress: mergedProgress,
    visible: progress.running || mergedProgress < 100 || Boolean(error)
  })
}

export function setDesktopBootStep(step: {
  phase: string
  message: string
  progress: number
  running?: boolean
  fakeMode?: boolean
  error?: string | null
}) {
  const current = $desktopBoot.get()
  applyDesktopBootProgress({
    error: step.error ?? null,
    fakeMode: step.fakeMode ?? current.fakeMode,
    message: step.message,
    phase: step.phase,
    progress: step.progress,
    running: step.running ?? true,
    timestamp: Date.now()
  })
}

/**
 * Re-arm the boot overlay for an automatic bounded retry of a failed REMOTE
 * boot (#82679). Unlike setDesktopBootStep — whose null `error` intentionally
 * cannot clear a latched failure — this explicitly lifts the error so the
 * overlay shows the retry status instead of the terminal failure surface
 * while the retry is in flight. failDesktopBoot() re-latches when the
 * bounded retries are exhausted.
 */
export function resumeDesktopBootForRetry(message: string) {
  const current = $desktopBoot.get()
  $desktopBoot.set({
    ...current,
    error: null,
    message: brandBootMessage(message),
    phase: 'renderer.boot.retry',
    running: true,
    timestamp: Date.now(),
    visible: true
  })
}

export function completeDesktopBoot(message = translateNow('boot.ready')) {
  const current = $desktopBoot.get()
  $desktopBoot.set({
    ...current,
    error: null,
    message: brandBootMessage(message),
    phase: 'renderer.ready',
    progress: 100,
    running: false,
    timestamp: Date.now(),
    visible: false
  })
}

export function failDesktopBoot(message: string, brand: AppBrand = appBrand()) {
  const current = $desktopBoot.get()
  const brandedMessage = brandBootMessage(message, brand)

  $desktopBoot.set({
    ...current,
    error: brandedMessage,
    message: translateNow('boot.desktopBootFailedWithMessage', brandedMessage),
    phase: 'renderer.error',
    progress: clampProgress(current.progress),
    running: false,
    timestamp: Date.now(),
    visible: true
  })
}
