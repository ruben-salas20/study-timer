// schemas.ts — Zod schemas for timer mode configuration
// pomodoroConfig: workMin (1-90), breakMin (1-60), cycles (1-12)
// countdownConfig: targetMin (1-180)
import { z } from 'zod'

export const pomodoroConfigSchema = z.object({
  workMin: z.number().int().min(1).max(90),
  breakMin: z.number().int().min(1).max(60),
  cycles: z.number().int().min(1).max(12),
})

export const countdownConfigSchema = z.object({
  targetMin: z.number().int().min(1).max(180),
})

export type PomodoroConfig = z.infer<typeof pomodoroConfigSchema>
export type CountdownConfig = z.infer<typeof countdownConfigSchema>
