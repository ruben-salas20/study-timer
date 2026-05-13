// heatmap.test.ts — Pure tests for the year-heatmap grid builder.
import { describe, it, expect } from 'vitest'
import { buildYearHeatmap, formatSecForTooltip } from './heatmap'

const TZ = 'UTC'

function makeToday(iso: string): Date {
  // Build a fixed "today" anchored at noon UTC so tz math is deterministic.
  return new Date(`${iso}T12:00:00.000Z`)
}

describe('buildYearHeatmap', () => {
  it('returns 53 columns of 7 days each', () => {
    const data = buildYearHeatmap(new Map(), TZ, makeToday('2026-05-13'))
    expect(data.columns).toHaveLength(53)
    for (const col of data.columns) {
      expect(col.days).toHaveLength(7)
    }
  })

  it('last column ends on today and pads future cells with null', () => {
    // 2026-05-13 is a Wednesday → row index 2 in Mon-based ordering.
    const data = buildYearHeatmap(new Map(), TZ, makeToday('2026-05-13'))
    const last = data.columns[data.columns.length - 1]
    expect(last.days[2]?.date).toBe('2026-05-13')
    expect(last.days[2]?.isToday).toBe(true)
    expect(last.days[3]).toBeNull()
    expect(last.days[6]).toBeNull()
  })

  it('places activity into the correct cell', () => {
    const byDay = new Map([['2026-05-12', 1800]]) // Tuesday → row 1
    const data = buildYearHeatmap(byDay, TZ, makeToday('2026-05-13'))
    const last = data.columns[data.columns.length - 1]
    expect(last.days[1]?.date).toBe('2026-05-12')
    expect(last.days[1]?.sec).toBe(1800)
    expect(last.days[1]?.level).toBeGreaterThan(0)
  })

  it('zero activity returns level 0 for every visible cell', () => {
    const data = buildYearHeatmap(new Map(), TZ, makeToday('2026-05-13'))
    for (const col of data.columns) {
      for (const cell of col.days) {
        if (cell) expect(cell.level).toBe(0)
      }
    }
    expect(data.maxSec).toBe(0)
  })

  it('caps level at 4 for the busiest day', () => {
    const byDay = new Map([
      ['2026-05-13', 7200], // 2h on today — the max
      ['2026-05-12', 1800], // 30min the day before — should fall below 4
    ])
    const data = buildYearHeatmap(byDay, TZ, makeToday('2026-05-13'))
    const last = data.columns[data.columns.length - 1]
    expect(last.days[2]?.level).toBe(4) // today
    expect(last.days[1]?.level).toBeLessThan(4) // yesterday
  })

  it('first column has a month label', () => {
    const data = buildYearHeatmap(new Map(), TZ, makeToday('2026-05-13'))
    expect(data.columns[0].monthLabel).not.toBe('')
  })
})

describe('formatSecForTooltip', () => {
  it('shows "Sin actividad" for zero', () => {
    expect(formatSecForTooltip(0)).toBe('Sin actividad')
  })

  it('formats minutes under an hour', () => {
    expect(formatSecForTooltip(1500)).toBe('25 min')
  })

  it('formats hours + minutes', () => {
    expect(formatSecForTooltip(3900)).toBe('1h 5m')
  })
})
