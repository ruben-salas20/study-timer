// schemas.test.ts — RED tests for friendCodeSchema
// Validates 6-character uppercase alphanumeric codes.
// Transform: lowercase input is normalised to uppercase.
import { describe, it, expect } from 'vitest'
import { friendCodeSchema } from './schemas'

describe('friendCodeSchema', () => {
  it('accepts a valid 6-char uppercase alphanumeric code', () => {
    const result = friendCodeSchema.safeParse('ABC123')
    expect(result.success).toBe(true)
    expect(result.data).toBe('ABC123')
  })

  it('accepts all-digit code', () => {
    const result = friendCodeSchema.safeParse('123456')
    expect(result.success).toBe(true)
    expect(result.data).toBe('123456')
  })

  it('accepts all-letter code', () => {
    const result = friendCodeSchema.safeParse('ZZZZZZ')
    expect(result.success).toBe(true)
    expect(result.data).toBe('ZZZZZZ')
  })

  it('transforms lowercase letters to uppercase', () => {
    const result = friendCodeSchema.safeParse('abc123')
    expect(result.success).toBe(true)
    expect(result.data).toBe('ABC123')
  })

  it('transforms mixed case to uppercase', () => {
    const result = friendCodeSchema.safeParse('AbC1d2')
    expect(result.success).toBe(true)
    expect(result.data).toBe('ABC1D2')
  })

  it('rejects codes shorter than 6 characters', () => {
    const result = friendCodeSchema.safeParse('ABC12')
    expect(result.success).toBe(false)
  })

  it('rejects codes longer than 6 characters', () => {
    const result = friendCodeSchema.safeParse('ABC1234')
    expect(result.success).toBe(false)
  })

  it('rejects empty string', () => {
    const result = friendCodeSchema.safeParse('')
    expect(result.success).toBe(false)
  })

  it('rejects codes with special characters', () => {
    const result = friendCodeSchema.safeParse('ABC!23')
    expect(result.success).toBe(false)
  })

  it('rejects codes with spaces', () => {
    const result = friendCodeSchema.safeParse('ABC 23')
    expect(result.success).toBe(false)
  })
})
