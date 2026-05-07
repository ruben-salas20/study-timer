// OnboardingPage.tsx — T21
// Multi-step onboarding wizard shell.
// Renders GoalStep or InviteStep based on current step from useOnboardingFlow.
// Protected by RequireAuth at the router level.
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useOnboardingFlow } from '../hooks/useOnboardingFlow'
import { GoalStep } from '../components/GoalStep'
import { InviteStep } from '../components/InviteStep'
import { Link } from 'react-router-dom'

export function OnboardingPage() {
  const { user } = useAuth()
  const { step, goalError, isCompleting, goToInvite, completeOnboarding } = useOnboardingFlow()

  const stepLabel = step === 'goal' ? 'paso 2 de 3' : 'paso 3 de 3'

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-10 pb-4">
        <Link
          to={step === 'goal' ? '/welcome' : '#'}
          className="flex items-center justify-center w-9 h-9 rounded-full border border-current opacity-60"
          aria-label="Volver"
        >
          ←
        </Link>
        <span className="text-sm opacity-60 font-medium">{stepLabel}</span>
      </header>

      {/* Step content */}
      {step === 'goal' && (
        <GoalStep onNext={goToInvite} goalError={goalError} />
      )}

      {step === 'invite' && (
        <InviteStep
          friendCode={String(user?.friendCode ?? '------')}
          onSkip={completeOnboarding}
          onComplete={completeOnboarding}
          isCompleting={isCompleting}
        />
      )}
    </div>
  )
}
