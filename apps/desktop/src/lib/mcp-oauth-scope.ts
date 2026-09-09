import { useEffect, useRef } from 'react'

import { type ProfileScope, profileScopeKey } from '@/api/client'
import { desktopFsCacheKey } from '@/lib/desktop-fs'
import { $activeGatewayProfile, normalizeProfileKey } from '@/store/profile'
import { $connection } from '@/store/session'

function shouldTrackActiveProfile(scope?: ProfileScope): boolean {
  if (scope === undefined || scope === null) {
    return true
  }

  if (typeof scope === 'string') {
    return false
  }

  return !scope.profile
}

export function captureMcpOAuthScopeGuard(scope?: ProfileScope): () => boolean {
  if (scope && typeof scope === 'object' && scope.connectionId) {
    return () => true
  }

  const capturedConnection = desktopFsCacheKey($connection.get())
  const capturedActiveProfile = normalizeProfileKey($activeGatewayProfile.get())
  const trackActiveProfile = shouldTrackActiveProfile(scope)

  return () =>
    desktopFsCacheKey($connection.get()) === capturedConnection &&
    (!trackActiveProfile || normalizeProfileKey($activeGatewayProfile.get()) === capturedActiveProfile)
}

export function useMcpOAuthScopeGuard(scope?: ProfileScope): () => () => boolean {
  const epoch = useRef(0)
  const scopeKey = profileScopeKey(scope)

  useEffect(
    () => () => {
      epoch.current += 1
    },
    [scopeKey]
  )

  return () => {
    const capturedEpoch = epoch.current
    const isCurrent = captureMcpOAuthScopeGuard(scope)

    return () => epoch.current === capturedEpoch && isCurrent()
  }
}
