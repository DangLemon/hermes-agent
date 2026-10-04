import { afterEach, describe, expect, it, vi } from 'vitest'

import { $hapticsMuted } from '@/store/haptics'

import { __resetHapticsForTests, registerHapticTrigger, triggerHaptic } from './haptics'

describe('haptics', () => {
  afterEach(() => {
    __resetHapticsForTests()
    $hapticsMuted.set(false)
  })

  it('does not call the vibration trigger without a user activation', () => {
    const trigger = vi.fn()
    Object.defineProperty(navigator, 'userActivation', {
      configurable: true,
      value: { isActive: false }
    })
    registerHapticTrigger(trigger)

    triggerHaptic('selection')

    expect(trigger).not.toHaveBeenCalled()
  })

  it('calls the trigger during a user activation', () => {
    const trigger = vi.fn()
    Object.defineProperty(navigator, 'userActivation', {
      configurable: true,
      value: { isActive: true }
    })
    registerHapticTrigger(trigger)

    triggerHaptic('selection')

    expect(trigger).toHaveBeenCalledOnce()
  })
})
