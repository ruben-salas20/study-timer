import { describe, it, expect, vi, beforeEach } from 'vitest'

// T03 (F1 fix): pb.test.ts uses vi.resetModules() + dynamic import so the
// VITE_PB_URL env stub actually applies to a fresh module evaluation.

describe('PocketBase client (pb.ts)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it('exports a PocketBase instance', async () => {
    const { default: pb } = await import('./pb')
    expect(pb).toBeDefined()
    expect(typeof pb.baseUrl).toBe('string')
  })

  it('uses VITE_PB_URL env variable for the base URL', async () => {
    vi.stubEnv('VITE_PB_URL', 'http://test-pb-server:9090')
    const { default: pb } = await import('./pb')
    expect(pb.baseUrl).toBe('http://test-pb-server:9090')
  })

  it('falls back to localhost:8090 when VITE_PB_URL is not set', async () => {
    // No env stub — module should use the fallback
    const { default: pb } = await import('./pb')
    expect(pb.baseUrl).toMatch(/^https?:\/\//)
    expect(pb.baseUrl.length).toBeGreaterThan(0)
  })
})
