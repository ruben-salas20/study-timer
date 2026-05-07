// ChallengeCard.test.tsx — RED → GREEN tests for the ChallengeCard component
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ChallengeCard } from './ChallengeCard'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const baseChallenge = {
  id: 'ch-1',
  type: 'race' as const,
  title: 'Carrera épica',
  status: 'active' as const,
  startsAt: new Date('2024-01-01').toISOString(),
  endsAt: new Date('2024-02-01').toISOString(),
  targetSec: 3600,
  targetDays: undefined,
  prizeWinner: 'El ganador paga',
  prizeLoser: undefined,
  participantCount: 3,
}

function renderCard(props = {}) {
  const challenge = { ...baseChallenge, ...props }
  return render(
    <BrowserRouter>
      <ChallengeCard challenge={challenge} />
    </BrowserRouter>
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ChallengeCard', () => {
  it('renders the challenge title', () => {
    renderCard()
    expect(screen.getByText('Carrera épica')).toBeInTheDocument()
  })

  it('renders the participant count', () => {
    renderCard({ participantCount: 5 })
    expect(screen.getByText(/5/)).toBeInTheDocument()
  })

  it('renders "Activo" badge for active challenges', () => {
    renderCard({ status: 'active' })
    expect(screen.getByText('Activo')).toBeInTheDocument()
  })

  it('renders "Pendiente" badge for pending challenges', () => {
    renderCard({ status: 'pending' })
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
  })

  it('renders "Finalizado" badge for completed challenges', () => {
    renderCard({ status: 'completed' })
    expect(screen.getByText('Finalizado')).toBeInTheDocument()
  })

  it('renders "Cancelado" badge for cancelled challenges', () => {
    renderCard({ status: 'cancelled' })
    expect(screen.getByText('Cancelado')).toBeInTheDocument()
  })

  it('links to the challenge detail page', () => {
    renderCard({ id: 'ch-42' })
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/challenges/ch-42')
  })

  it('renders the challenge type label for race', () => {
    renderCard({ type: 'race' })
    // "Carrera" is the type label; title "Carrera épica" also matches, so use exact
    expect(screen.getByText('Carrera')).toBeInTheDocument()
  })

  it('renders the challenge type label for group_streak', () => {
    renderCard({ type: 'group_streak' })
    expect(screen.getByText(/Racha/i)).toBeInTheDocument()
  })
})
