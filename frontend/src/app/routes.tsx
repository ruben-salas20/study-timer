// routes.tsx — Full application routing
// Public routes: /welcome, /register, /login
// Protected routes (RequireAuth): /home, /onboarding/*, /me, /stats, /profile,
//   /settings, /timer/active, /friends, /friends/add, /challenges
// Catch-all: 404
// BrowserRouter is provided by providers.tsx — do NOT add it here.
// F8: page-enter animation keyed on location for subtle 100ms fade transition.
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { RequireAuth } from '@/features/auth/components/RequireAuth'
import { RedirectIfAuthenticated } from '@/features/auth/components/RedirectIfAuthenticated'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { WelcomePage } from '@/features/auth/pages/WelcomePage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { HomeTimerPage } from '@/features/timer/pages/HomeTimerPage'
import { ActiveSessionPage } from '@/features/timer/pages/ActiveSessionPage'
import { SessionSummaryPage } from '@/features/timer/pages/SessionSummaryPage'
import { SubjectDetailPage } from '@/features/subjects/pages/SubjectDetailPage'
import { FeedPage } from '@/features/activity/pages/FeedPage'
import { UserProfilePage } from '@/features/profile/pages/UserProfilePage'
import { OnboardingPage } from '@/features/onboarding/pages/OnboardingPage'
import { FriendsPage } from '@/features/friends/pages/FriendsPage'
import { AddFriendPage } from '@/features/friends/pages/AddFriendPage'
import { ChallengesPage } from '@/features/challenges/pages/ChallengesPage'
import { NewChallengePage } from '@/features/challenges/pages/NewChallengePage'
import { ChallengeDetailPage } from '@/features/challenges/pages/ChallengeDetailPage'
import { MePage } from '@/features/me/pages/MePage'
import { StatsPage } from '@/features/stats/pages/StatsPage'
import { ProfilePage } from '@/features/profile/pages/ProfilePage'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'
import { SubjectsPage } from '@/features/subjects/pages/SubjectsPage'

/**
 * RootRedirect — decides where "/" sends the user based on auth state.
 * Without this, "/" always redirected to /welcome and PWA start_url
 * users with a valid token in localStorage were re-prompted to login.
 */
function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"
          aria-label="Cargando..."
          role="status"
        />
      </div>
    )
  }
  return <Navigate to={isAuthenticated ? '/home' : '/welcome'} replace />
}

/** 404 fallback */
function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-foreground bg-background">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="opacity-60">Página no encontrada</p>
      <Link to="/welcome" className="text-(--color-primary) text-sm">← Volver al inicio</Link>
    </div>
  )
}

/**
 * AppRoutes — renders the full route tree.
 * Import and use in App.tsx.
 */
export function AppRoutes() {
  const location = useLocation()
  return (
    <div key={location.pathname} className="page-enter">
    <Routes>
      {/* Root redirect — auth-aware so PWA start_url respects existing session */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public routes — bounce already-authenticated users straight to /home */}
      <Route
        path="/welcome"
        element={
          <RedirectIfAuthenticated>
            <WelcomePage />
          </RedirectIfAuthenticated>
        }
      />
      <Route
        path="/register"
        element={
          <RedirectIfAuthenticated>
            <RegisterPage />
          </RedirectIfAuthenticated>
        }
      />
      <Route
        path="/login"
        element={
          <RedirectIfAuthenticated>
            <LoginPage />
          </RedirectIfAuthenticated>
        }
      />

      {/* Protected routes */}
      <Route
        path="/home"
        element={
          <RequireAuth>
            <HomeTimerPage />
          </RequireAuth>
        }
      />
      <Route
        path="/timer/active"
        element={
          <RequireAuth>
            <ActiveSessionPage />
          </RequireAuth>
        }
      />
      <Route
        path="/timer/summary/:id"
        element={
          <RequireAuth>
            <SessionSummaryPage />
          </RequireAuth>
        }
      />
      <Route
        path="/onboarding/goal"
        element={
          <RequireAuth>
            <OnboardingPage />
          </RequireAuth>
        }
      />
      <Route
        path="/onboarding/invite"
        element={
          <RequireAuth>
            <OnboardingPage />
          </RequireAuth>
        }
      />
      <Route
        path="/friends"
        element={
          <RequireAuth>
            <FriendsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/friends/add"
        element={
          <RequireAuth>
            <AddFriendPage />
          </RequireAuth>
        }
      />
      <Route
        path="/challenges"
        element={
          <RequireAuth>
            <ChallengesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/challenges/new"
        element={
          <RequireAuth>
            <NewChallengePage />
          </RequireAuth>
        }
      />
      <Route
        path="/challenges/:id"
        element={
          <RequireAuth>
            <ChallengeDetailPage />
          </RequireAuth>
        }
      />

      {/* F5: Yo section */}
      <Route
        path="/me"
        element={
          <RequireAuth>
            <MePage />
          </RequireAuth>
        }
      />
      <Route
        path="/stats"
        element={
          <RequireAuth>
            <StatsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <SettingsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/subjects"
        element={
          <RequireAuth>
            <SubjectsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/subjects/:id"
        element={
          <RequireAuth>
            <SubjectDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/feed"
        element={
          <RequireAuth>
            <FeedPage />
          </RequireAuth>
        }
      />
      <Route
        path="/u/:id"
        element={
          <RequireAuth>
            <UserProfilePage />
          </RequireAuth>
        }
      />

      {/* 404 catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </div>
  )
}
