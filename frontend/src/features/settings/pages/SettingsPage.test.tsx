// SettingsPage.test.tsx — RED → GREEN: verifies theme/accent DOM attribute mutation
// Uses vi.mock to isolate PocketBase and useAuth — we test the DOM side effect only.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/shared/pb', () => ({
  default: {
    collection: () => ({
      update: vi.fn().mockResolvedValue({}),
    }),
    authStore: {
      model: { id: 'user1', theme: 'auto', accentColor: 'sage' },
      isValid: true,
      onChange: vi.fn(() => vi.fn()),
    },
  },
}))

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQuery: vi.fn(() => ({
      data: { id: 'user1', theme: 'auto', accentColor: 'sage' },
      isLoading: false,
    })),
    useMutation: vi.fn(() => ({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
    })),
    useQueryClient: vi.fn(() => ({
      invalidateQueries: vi.fn(),
    })),
  }
})

// ── Import after mocks ────────────────────────────────────────────────────────

import { SettingsPage } from './SettingsPage'

function renderSettings() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SettingsPage — theme application', () => {
  beforeEach(() => {
    // Reset data-theme before each test
    document.documentElement.removeAttribute('data-theme')
  })

  it('renders theme buttons for Auto, Claro and Oscuro', () => {
    renderSettings()

    expect(screen.getByRole('button', { name: /auto/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /claro/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /oscuro/i })).toBeInTheDocument()
  })

  it('sets data-theme="dark" on <html> when Oscuro is clicked', () => {
    renderSettings()

    fireEvent.click(screen.getByRole('button', { name: /oscuro/i }))

    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('sets data-theme="" on <html> when Auto is clicked', () => {
    document.documentElement.dataset.theme = 'dark'
    renderSettings()

    fireEvent.click(screen.getByRole('button', { name: /auto/i }))

    expect(document.documentElement.dataset.theme).toBe('')
  })
})

describe('SettingsPage — accent application', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-accent')
  })

  it('renders accent swatch buttons for all 4 accents', () => {
    renderSettings()

    expect(screen.getByRole('button', { name: /sage/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /blue/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /warm/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mono/i })).toBeInTheDocument()
  })

  it('sets data-accent="blue" on <html> when blue swatch is clicked', () => {
    renderSettings()

    fireEvent.click(screen.getByRole('button', { name: /blue/i }))

    expect(document.documentElement.dataset.accent).toBe('blue')
  })
})
