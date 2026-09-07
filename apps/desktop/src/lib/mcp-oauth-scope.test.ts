import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'

import { useMcpOAuthScopeGuard } from './mcp-oauth-scope'

afterEach(cleanup)

it('invalidates a captured OAuth operation when its view unmounts', () => {
  const { result, unmount } = renderHook(() => useMcpOAuthScopeGuard({ connectionId: 'remote-a', profile: 'work' }))
  const isCurrent = result.current()
  expect(isCurrent()).toBe(true)
  unmount()
  expect(isCurrent()).toBe(false)
})

it('invalidates only old operations when the explicit connection/profile selection changes', () => {
  const { result, rerender } = renderHook(
    ({ connectionId, profile }) => useMcpOAuthScopeGuard({ connectionId, profile }),
    {
      initialProps: { connectionId: 'remote-a', profile: 'work' }
    }
  )

  const first = result.current()
  rerender({ connectionId: 'remote-b', profile: 'work' })
  expect(first()).toBe(false)
  const second = result.current()
  expect(second()).toBe(true)
  rerender({ connectionId: 'remote-b', profile: 'personal' })
  expect(second()).toBe(false)
  expect(result.current()()).toBe(true)
})
