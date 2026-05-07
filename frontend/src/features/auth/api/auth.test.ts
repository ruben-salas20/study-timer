// T06 — RED tests for auth API
// These tests FAIL until auth.ts (T08) is implemented.
// vi.mock('@/shared/pb') stubs the PocketBase SDK.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock PocketBase singleton before importing auth functions
vi.mock('@/shared/pb', () => {
  const mockAuthStore = {
    model: null as Record<string, unknown> | null,
    clear: vi.fn(),
    onChange: vi.fn(() => () => {}),
  }

  const mockCreate = vi.fn()
  const mockAuthWithPassword = vi.fn()

  const mockCollection = vi.fn().mockReturnValue({
    create: mockCreate,
    authWithPassword: mockAuthWithPassword,
  })

  return {
    default: {
      collection: mockCollection,
      authStore: mockAuthStore,
    },
  }
})

// Import AFTER mock setup
describe('auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('register()', () => {
    it('calls pb.collection("users").create() with user data', async () => {
      const { register } = await import('./auth')
      const pb = (await import('@/shared/pb')).default

      const mockRecord = { id: '123', email: 'test@test.com', displayName: 'Test User' }
      const mockAuth = { record: mockRecord, token: 'token123' }
      const mockCreate = vi.fn().mockResolvedValue(mockRecord)
      const mockAuthWithPassword = vi.fn().mockResolvedValue(mockAuth)
      vi.mocked(pb.collection).mockReturnValue({
        create: mockCreate,
        authWithPassword: mockAuthWithPassword,
      } as ReturnType<typeof pb.collection>)

      await register({ displayName: 'Test User', email: 'test@test.com', password: 'password123' })

      expect(pb.collection).toHaveBeenCalledWith('users')
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@test.com',
          displayName: 'Test User',
          password: 'password123',
        })
      )
    })

    it('calls authWithPassword after create for auto-login', async () => {
      const { register } = await import('./auth')
      const pb = (await import('@/shared/pb')).default

      const mockCreate = vi.fn().mockResolvedValue({ id: '123' })
      const mockAuthWithPassword = vi.fn().mockResolvedValue({ record: { id: '123' }, token: 'tok' })
      vi.mocked(pb.collection).mockReturnValue({
        create: mockCreate,
        authWithPassword: mockAuthWithPassword,
      } as ReturnType<typeof pb.collection>)

      await register({ displayName: 'Test', email: 'a@b.com', password: 'pass1234' })

      expect(mockAuthWithPassword).toHaveBeenCalledWith('a@b.com', 'pass1234')
    })
  })

  describe('login()', () => {
    it('calls pb.collection("users").authWithPassword() with credentials', async () => {
      const { login } = await import('./auth')
      const pb = (await import('@/shared/pb')).default

      const mockAuth = { record: { id: '123', email: 'a@b.com' }, token: 'tok' }
      const mockAuthWithPassword = vi.fn().mockResolvedValue(mockAuth)
      vi.mocked(pb.collection).mockReturnValue({
        create: vi.fn(),
        authWithPassword: mockAuthWithPassword,
      } as ReturnType<typeof pb.collection>)

      const result = await login({ email: 'a@b.com', password: 'pass1234' })

      expect(pb.collection).toHaveBeenCalledWith('users')
      expect(mockAuthWithPassword).toHaveBeenCalledWith('a@b.com', 'pass1234')
      expect(result).toEqual(mockAuth)
    })
  })

  describe('logout()', () => {
    it('calls pb.authStore.clear()', async () => {
      const { logout } = await import('./auth')
      const pb = (await import('@/shared/pb')).default

      logout()

      expect(pb.authStore.clear).toHaveBeenCalled()
    })
  })

  describe('getCurrentUser()', () => {
    it('returns pb.authStore.model', async () => {
      const { getCurrentUser } = await import('./auth')
      const pb = (await import('@/shared/pb')).default

      const fakeUser = { id: '123', email: 'a@b.com', displayName: 'Test' }
      Object.defineProperty(pb.authStore, 'model', { value: fakeUser, configurable: true })

      const result = getCurrentUser()

      expect(result).toEqual(fakeUser)
    })

    it('returns null when not authenticated', async () => {
      const { getCurrentUser } = await import('./auth')
      const pb = (await import('@/shared/pb')).default

      Object.defineProperty(pb.authStore, 'model', { value: null, configurable: true })

      const result = getCurrentUser()

      expect(result).toBeNull()
    })
  })
})
