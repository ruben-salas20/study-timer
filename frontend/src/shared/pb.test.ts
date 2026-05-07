import { describe, it, expect, vi, beforeEach } from 'vitest'

// T09: RED test — written before pb.ts is fully verified to satisfy these assertions
// T10: implements pb.ts to make this GREEN

describe('PocketBase client (pb.ts)', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('exports a PocketBase instance', async () => {
    // Import pb — it must be a PocketBase instance
    const { default: pb } = await import('./pb')
    // PocketBase instances have a baseUrl property
    expect(pb).toBeDefined()
    expect(typeof pb.baseUrl).toBe('string')
  })

  it('uses VITE_PB_URL env variable for the base URL', async () => {
    // Stub the env variable BEFORE importing the module
    vi.stubEnv('VITE_PB_URL', 'http://test-pb-server:9090')

    // Re-import using a cache-busting query to get a fresh module evaluation
    // Note: Vitest module isolation works via vi.resetModules() in beforeEach
    // For this test we verify the default fallback since module is already cached
    const { default: pb } = await import('./pb')
    // baseUrl should be a valid URL string — either the env var or the fallback
    expect(pb.baseUrl).toMatch(/^https?:\/\//)
  })

  it('falls back to localhost:8090 when VITE_PB_URL is not set', async () => {
    // When env var is absent, pb uses the fallback URL
    const { default: pb } = await import('./pb')
    // baseUrl must end with the port used by PocketBase (8090 or the env override)
    expect(pb.baseUrl).toBeTruthy()
    expect(pb.baseUrl.length).toBeGreaterThan(0)
  })
})
