// schemas.test.ts — RED → GREEN tests for profile validation schemas
import { describe, it, expect } from 'vitest'
import { displayNameSchema, weeklyGoalSchema, passwordChangeSchema } from './schemas'

// ── displayNameSchema ─────────────────────────────────────────────────────────

describe('displayNameSchema', () => {
  it('accepts a valid display name of 2+ characters', () => {
    const result = displayNameSchema.safeParse('Jo')

    expect(result.success).toBe(true)
  })

  it('accepts a name at the max boundary of 100 characters', () => {
    const name = 'A'.repeat(100)
    const result = displayNameSchema.safeParse(name)

    expect(result.success).toBe(true)
  })

  it('rejects names shorter than 2 characters', () => {
    const result = displayNameSchema.safeParse('J')

    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toMatch(/2/)
  })

  it('rejects names longer than 100 characters', () => {
    const name = 'A'.repeat(101)
    const result = displayNameSchema.safeParse(name)

    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toMatch(/100/)
  })

  it('rejects empty string', () => {
    const result = displayNameSchema.safeParse('')

    expect(result.success).toBe(false)
  })
})

// ── weeklyGoalSchema ──────────────────────────────────────────────────────────

describe('weeklyGoalSchema', () => {
  it('accepts the minimum boundary of 30 minutes', () => {
    const result = weeklyGoalSchema.safeParse(30)

    expect(result.success).toBe(true)
  })

  it('accepts the maximum boundary of 4200 minutes', () => {
    const result = weeklyGoalSchema.safeParse(4200)

    expect(result.success).toBe(true)
  })

  it('rejects values below 30', () => {
    const result = weeklyGoalSchema.safeParse(29)

    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toMatch(/30/)
  })

  it('rejects values above 4200', () => {
    const result = weeklyGoalSchema.safeParse(4201)

    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toMatch(/4200/)
  })

  it('rejects non-integer values', () => {
    const result = weeklyGoalSchema.safeParse(60.5)

    expect(result.success).toBe(false)
  })
})

// ── passwordChangeSchema ──────────────────────────────────────────────────────

describe('passwordChangeSchema', () => {
  it('accepts valid inputs where new passwords match', () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: 'myOldPass1',
      newPassword: 'myNewPass1',
      confirmPassword: 'myNewPass1',
    })

    expect(result.success).toBe(true)
  })

  it('rejects when confirmPassword does not match newPassword', () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: 'myOldPass1',
      newPassword: 'myNewPass1',
      confirmPassword: 'differentPass',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toMatch(/coincid/i)
  })

  it('rejects when newPassword is shorter than 8 characters', () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: 'myOldPass1',
      newPassword: 'short',
      confirmPassword: 'short',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toMatch(/8/)
  })

  it('rejects when currentPassword is empty', () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: '',
      newPassword: 'myNewPass1',
      confirmPassword: 'myNewPass1',
    })

    expect(result.success).toBe(false)
  })
})
