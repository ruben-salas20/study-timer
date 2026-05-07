// ModeBreakdown.test.tsx — RED → GREEN tests for ModeBreakdown component
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModeBreakdown } from './ModeBreakdown'

describe('ModeBreakdown', () => {
  it('renders the three mode labels', () => {
    const byMode = { pomodoro: 3600, stopwatch: 1800, countdown: 900 }

    render(<ModeBreakdown byMode={byMode} />)

    expect(screen.getByText(/pomodoro/i)).toBeInTheDocument()
    expect(screen.getByText(/cronómetro/i)).toBeInTheDocument()
    expect(screen.getByText(/regresivo/i)).toBeInTheDocument()
  })

  it('shows 100% for the only active mode when others are zero', () => {
    const byMode = { pomodoro: 3600, stopwatch: 0, countdown: 0 }

    render(<ModeBreakdown byMode={byMode} />)

    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('shows 0% for all modes when all are zero', () => {
    const byMode = { pomodoro: 0, stopwatch: 0, countdown: 0 }

    render(<ModeBreakdown byMode={byMode} />)

    const pcts = screen.getAllByText('0%')
    expect(pcts.length).toBe(3)
  })

  it('calculates correct percentage for each mode', () => {
    // total = 6000; pomodoro = 3000 → 50%; stopwatch = 2000 → 33%; countdown = 1000 → 17%
    const byMode = { pomodoro: 3000, stopwatch: 2000, countdown: 1000 }

    render(<ModeBreakdown byMode={byMode} />)

    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('33%')).toBeInTheDocument()
    expect(screen.getByText('17%')).toBeInTheDocument()
  })
})
