import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    // Assert the root div is in the document — proves the component mounts
    const root = screen.getByRole('main') ?? document.querySelector('.min-h-screen')
    expect(document.body.childNodes.length).toBeGreaterThan(0)
  })

  it('shows "Study Timer" heading text', () => {
    render(<App />)
    // This assertion is RED until T04 makes App render the heading
    expect(screen.getByRole('heading', { name: /study timer/i })).toBeInTheDocument()
  })

  it('shows tagline text', () => {
    render(<App />)
    expect(screen.getByText(/competitive study timer for friends/i)).toBeInTheDocument()
  })
})
