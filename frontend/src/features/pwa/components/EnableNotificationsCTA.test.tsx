// EnableNotificationsCTA.test.tsx — render based on permission state
//
// Tests:
//   1. permission = 'default' → CTA is rendered with "Activar" button
//   2. permission = 'granted' → CTA is NOT rendered (user already subscribed)
//   3. permission = 'denied'  → CTA is NOT rendered (NotificationsDeniedBadge shows instead)
//   4. Clicking "Activar" calls the request() function from usePushPermission

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRequest = vi.fn()
const mockSubscribe = vi.fn()

vi.mock('../hooks/usePushPermission', () => ({
  usePushPermission: vi.fn(),
}))

vi.mock('../hooks/usePushSubscription', () => ({
  usePushSubscription: vi.fn(() => ({
    isSubscribed: false,
    isLoading: false,
    subscription: null,
    subscribe: mockSubscribe,
    unsubscribe: vi.fn(),
    error: null,
  })),
}))

// ── Import after mocks ────────────────────────────────────────────────────────

import { EnableNotificationsCTA } from './EnableNotificationsCTA'
import { usePushPermission } from '../hooks/usePushPermission'

const mockUsePushPermission = vi.mocked(usePushPermission)

function renderCTA() {
  return render(
    <MemoryRouter>
      <EnableNotificationsCTA />
    </MemoryRouter>
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EnableNotificationsCTA', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the CTA with an Activar button when permission is default', () => {
    mockUsePushPermission.mockReturnValue({
      permission: 'default',
      request: mockRequest,
    })

    renderCTA()

    expect(screen.getByRole('region', { name: /activar notificaciones/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /activar/i })).toBeInTheDocument()
    expect(screen.getByText('Activar notificaciones')).toBeInTheDocument()
  })

  it('renders nothing when permission is already granted', () => {
    mockUsePushPermission.mockReturnValue({
      permission: 'granted',
      request: mockRequest,
    })

    const { container } = renderCTA()

    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when permission is denied (CTA is moot)', () => {
    mockUsePushPermission.mockReturnValue({
      permission: 'denied',
      request: mockRequest,
    })

    const { container } = renderCTA()

    expect(container.firstChild).toBeNull()
  })

  it('calls request() when the Activar button is clicked', async () => {
    mockRequest.mockResolvedValue('granted')
    mockSubscribe.mockResolvedValue(undefined)
    mockUsePushPermission.mockReturnValue({
      permission: 'default',
      request: mockRequest,
    })

    renderCTA()

    fireEvent.click(screen.getByRole('button', { name: /activar/i }))

    // request() is async — verify it was called
    expect(mockRequest).toHaveBeenCalledOnce()
  })
})
