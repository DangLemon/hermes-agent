import { atom } from 'nanostores'

import type { RuntimeReadinessResult } from '@/lib/runtime-readiness'

import {
  harnessProvisioningFromRuntimeReadiness,
  harnessUiFlagsFromEnv,
  initialInternalCompanyCapabilities,
  internalCompanyBuildEnv,
  type InternalCompanyCapabilityState,
  internalCompanyExpectedFromEnv,
  updateInternalCompanyProvisioning
} from './capabilities'

const internalCompanyEnvFromBuild = internalCompanyBuildEnv()

export const internalCompanyExpectedFromBuild = internalCompanyExpectedFromEnv(internalCompanyEnvFromBuild)
export const internalCompanyUiFlagsFromBuild = harnessUiFlagsFromEnv(internalCompanyEnvFromBuild)

export const $internalCompanyCapabilities = atom<InternalCompanyCapabilityState>(
  initialInternalCompanyCapabilities(internalCompanyExpectedFromBuild, internalCompanyUiFlagsFromBuild)
)

export function setInternalCompanyCapabilitiesForTest(state: InternalCompanyCapabilityState): void {
  $internalCompanyCapabilities.set(state)
}

export function resetInternalCompanyCapabilities(): void {
  $internalCompanyCapabilities.set(
    initialInternalCompanyCapabilities(internalCompanyExpectedFromBuild, internalCompanyUiFlagsFromBuild)
  )
}

export const resetInternalCompanyCapabilitiesForTest = resetInternalCompanyCapabilities

export function updateInternalCompanyRuntimeReadiness(status: RuntimeReadinessResult | null): void {
  const current = $internalCompanyCapabilities.get()

  $internalCompanyCapabilities.set(
    updateInternalCompanyProvisioning(current, harnessProvisioningFromRuntimeReadiness(status))
  )
}
