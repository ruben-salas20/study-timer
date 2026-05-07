// TimerDisplay.test.tsx — RED tests for TimerDisplay component
// Tests written BEFORE TimerDisplay.tsx is implemented (TDD cycle).
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

// RED: TimerDisplay does not exist yet — import will fail until implemented
// import { TimerDisplay } from './TimerDisplay'

describe('TimerDisplay', () => {
  it('formats seconds under 1 hour as MM:SS', async () => {
    const { TimerDisplay } = await import('./TimerDisplay')
    render(<TimerDisplay seconds={90} />)
    // 90 seconds = 1 minute 30 seconds → "01:30"
    expect(screen.getByText('01:30')).toBeInTheDocument()
  })

  it('formats seconds over 1 hour as HH:MM:SS', async () => {
    const { TimerDisplay } = await import('./TimerDisplay')
    render(<TimerDisplay seconds={3661} />)
    // 3661 seconds = 1h 1m 1s → "01:01:01"
    expect(screen.getByText('01:01:01')).toBeInTheDocument()
  })

  it('formats exactly 0 seconds as 00:00', async () => {
    const { TimerDisplay } = await import('./TimerDisplay')
    render(<TimerDisplay seconds={0} />)
    expect(screen.getByText('00:00')).toBeInTheDocument()
  })

  it('formats exactly 1 hour as 01:00:00', async () => {
    const { TimerDisplay } = await import('./TimerDisplay')
    render(<TimerDisplay seconds={3600} />)
    expect(screen.getByText('01:00:00')).toBeInTheDocument()
  })
})
