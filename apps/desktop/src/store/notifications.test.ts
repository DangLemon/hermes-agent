import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { $notifications, clearNotifications, isDiskFullErrorMessage, notify, notifyError } from './notifications'

beforeEach(() => {
  clearNotifications()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function lastMessage(): string {
  return $notifications.get()[0]?.message ?? ''
}

// Regression for #39365: a gateway auth 401 (bad API_SERVER_KEY) must not be
// summarized as a provider (OpenAI/OpenRouter) API key problem.
test('gateway_auth_failed error is summarized as gateway auth, not provider key', () => {
  notifyError(
    new Error(
      '401 {"error": {"message": "Invalid gateway API key (API_SERVER_KEY)", "type": "gateway_auth_error", "code": "gateway_auth_failed"}}'
    ),
    'Request failed'
  )

  expect(lastMessage()).toContain('API_SERVER_KEY')
  expect(lastMessage()).not.toMatch(/OpenAI/i)
})

test('provider invalid_api_key error still maps to the OpenAI summary', () => {
  notifyError(
    new Error('401 {"error": {"message": "Incorrect API key provided", "code": "invalid_api_key"}}'),
    'Request failed'
  )

  expect(lastMessage()).toMatch(/OpenAI rejected the API key/i)
})

test('disk-full / ENOSPC errors toast a free-space message', () => {
  expect(isDiskFullErrorMessage('OSError: [Errno 28] No space left on device')).toBe(true)
  expect(isDiskFullErrorMessage('sqlite3.OperationalError: database or disk is full')).toBe(true)
  expect(isDiskFullErrorMessage('disk full: session storage could not be written — free some disk space')).toBe(true)
  expect(isDiskFullErrorMessage('This is often a full disk — free some space')).toBe(true)
  expect(isDiskFullErrorMessage('session storage could not be written: permission denied')).toBe(false)
  expect(isDiskFullErrorMessage('network timeout')).toBe(false)

  notifyError(new Error('OSError: [Errno 28] No space left on device: state.db'), 'Prompt failed')

  expect(lastMessage()).toMatch(/Disk full/i)
  expect(lastMessage()).toMatch(/free some space/i)
})

test('session storage write failure is treated as disk-full class', () => {
  notifyError(
    new Error('disk full: session storage could not be written — free some disk space and try again'),
    'Prompt failed'
  )

  expect(lastMessage()).toMatch(/Disk full/i)
})

test('code-skew 503 unwraps to a restart-required summary, not raw IPC JSON', () => {
  notifyError(
    new Error(
      'Error invoking remote method \'hermes:api\': Error: 503: {"detail":"Restart required: This process is running code from 08b4875f4a but the checkout on disk is now 48d2528066."}'
    ),
    'Could not load models'
  )

  expect(lastMessage()).toMatch(/running old code after an update/i)
  expect(lastMessage()).not.toMatch(/hermes:api/)
  expect(lastMessage()).not.toMatch(/systemctl/)
})

test('notifyError brands static titles but preserves raw backend messages', () => {
  vi.stubGlobal('__HERMES_DESKTOP_HARNESS__', 'internal')
  const sourceEnvPath = ['~/.hermes/', 'env'].join('.')

  notifyError(
    new Error(`Run 'hermes model', then check ${sourceEnvPath} because Hermes-4.5 failed in the Hermes backend.`),
    'Hermes error'
  )

  const toast = $notifications.get()[0]
  expect(toast?.title).toBe('Lemon AI error')
  expect(toast?.message).toBe(
    `Run 'hermes model', then check ${sourceEnvPath} because Hermes-4.5 failed in the Hermes backend.`
  )
  expect(toast?.message).toContain('~/.hermes/.env')
  expect(toast?.message).toContain('Hermes-4.5')
})

test('notifyError preserves raw backend detail when the summary is a static fallback', () => {
  vi.stubGlobal('__HERMES_DESKTOP_HARNESS__', 'internal')
  const sourceEnvPath = ['~/.hermes/', 'env'].join('.')
  const raw = `Error invoking remote method 'hermes:api': Error: ${'x'.repeat(181)} ${sourceEnvPath} Hermes-4.5`

  notifyError(new Error(raw), 'Hermes error')

  const toast = $notifications.get()[0]
  expect(toast?.title).toBe('Lemon AI error')
  expect(toast?.message).toBe('Lemon AI error')
  expect(toast?.detail).toContain('~/.hermes/.env')
  expect(toast?.detail).toContain('Hermes-4.5')
})

test('direct notifications brand title and action labels without rewriting payload fields', () => {
  vi.stubGlobal('__HERMES_DESKTOP_HARNESS__', 'internal')

  notify({
    title: 'Update Hermes Desktop',
    message: 'Hermes Desktop is ready for Hermes-4.5.',
    detail: 'Hermes gateway reads ~/.hermes/.env.',
    meta: 'Hermes Agent / Hermes-4.5',
    action: { label: 'Open Hermes Desktop', onClick: () => {} }
  })

  const toast = $notifications.get()[0]
  expect(toast?.title).toBe('Update Lemon AI')
  expect(toast?.message).toBe('Hermes Desktop is ready for Hermes-4.5.')
  expect(toast?.detail).toBe('Hermes gateway reads ~/.hermes/.env.')
  expect(toast?.meta).toBe('Hermes Agent / Hermes-4.5')
  expect(toast?.action?.label).toBe('Open Lemon AI')
})
