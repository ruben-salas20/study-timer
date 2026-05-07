// useOnboardingFlow.ts — T18
// Manages onboarding step state and goal validation.
// Steps: goal → invite → complete
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import pb from '@/shared/pb'
import { useAuth } from '@/features/auth/hooks/useAuth'

type OnboardingStep = 'goal' | 'invite' | 'complete'

const MIN_MINUTES = 30
const MAX_MINUTES = 4200

interface UseOnboardingFlowReturn {
  step: OnboardingStep
  weeklyGoalMinutes: number
  goalError: string | null
  isCompleting: boolean
  goToInvite: (minutes: number) => void
  completeOnboarding: () => Promise<void>
}

/**
 * useOnboardingFlow — manages the multi-step onboarding wizard.
 *
 * Step flow: goal → invite → complete (redirect to /home)
 *
 * goToInvite(minutes): validates the goal, transitions to invite step
 * completeOnboarding(): PATCHes the user record and navigates to /home
 */
export function useOnboardingFlow(): UseOnboardingFlowReturn {
  const [step, setStep] = useState<OnboardingStep>('goal')
  const [weeklyGoalMinutes, setWeeklyGoalMinutes] = useState(600)
  const [goalError, setGoalError] = useState<string | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)

  const { user } = useAuth()
  const navigate = useNavigate()

  const goToInvite = useCallback((minutes: number) => {
    if (minutes < MIN_MINUTES) {
      setGoalError(`La meta mínima es ${MIN_MINUTES} minutos (${MIN_MINUTES / 60}h) por semana`)
      return
    }
    if (minutes > MAX_MINUTES) {
      setGoalError(`La meta máxima es ${MAX_MINUTES} minutos (${MAX_MINUTES / 60}h) por semana`)
      return
    }

    setGoalError(null)
    setWeeklyGoalMinutes(minutes)
    setStep('invite')
  }, [])

  const completeOnboarding = useCallback(async () => {
    if (!user?.id) return

    setIsCompleting(true)
    try {
      await pb.collection('users').update(user.id, { weeklyGoalMinutes })
      setStep('complete')
      navigate('/home')
    } finally {
      setIsCompleting(false)
    }
  }, [user, weeklyGoalMinutes, navigate])

  return {
    step,
    weeklyGoalMinutes,
    goalError,
    isCompleting,
    goToInvite,
    completeOnboarding,
  }
}
