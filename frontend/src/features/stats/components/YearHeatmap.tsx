// YearHeatmap.tsx — GitHub-style 53×7 grid of the last year's daily activity.
//
// Mobile: horizontally scrollable, ending pinned to the right (most recent
// week visible without scrolling). Tap a cell to surface its date + total
// in the strip below the grid (desktop also gets a native title tooltip).
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildYearHeatmap,
  formatDayLabel,
  formatSecForTooltip,
  type HeatmapCell,
  type HeatmapLevel,
} from '../lib/heatmap'

const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const
// Show only the alternating rows so labels don't crowd the tiny cells.
const VISIBLE_DAY_ROWS = new Set([0, 2, 4]) // Mon, Wed, Fri

const CELL = 12
const GAP = 2

const LEVEL_ALPHA: Record<HeatmapLevel, number> = {
  0: 0,
  1: 0.25,
  2: 0.5,
  3: 0.75,
  4: 1,
}

interface YearHeatmapProps {
  byDay: Map<string, number>
  tz: string
}

export function YearHeatmap({ byDay, tz }: YearHeatmapProps) {
  const data = useMemo(() => buildYearHeatmap(byDay, tz), [byDay, tz])
  const scrollRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<HeatmapCell | null>(null)

  // Pin scroll to the right edge on mount so the most recent week is visible.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollLeft = el.scrollWidth
  }, [])

  const totalSec = useMemo(() => {
    let total = 0
    for (const col of data.columns) {
      for (const cell of col.days) {
        if (cell) total += cell.sec
      }
    }
    return total
  }, [data])

  const hasAnyActivity = totalSec > 0

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={scrollRef}
        className="overflow-x-auto -mx-1 px-1 pb-1"
        role="img"
        aria-label="Mapa de calor de actividad del año"
      >
        <div
          className="inline-grid"
          style={{
            gridTemplateColumns: `auto repeat(${data.columns.length}, ${CELL}px)`,
            gridTemplateRows: `14px repeat(7, ${CELL}px)`,
            columnGap: `${GAP}px`,
            rowGap: `${GAP}px`,
          }}
        >
          {/* Empty top-left corner */}
          <div />

          {/* Month label row */}
          {data.columns.map((col) => (
            <div
              key={`m-${col.weekStart}`}
              className="text-[10px] leading-none opacity-50 text-left"
              style={{ minWidth: CELL }}
            >
              {col.monthLabel}
            </div>
          ))}

          {/* 7 day rows */}
          {DAY_LABELS.map((label, rowIdx) => (
            <div key={`label-${rowIdx}`} className="contents">
              <div
                className="text-[10px] leading-none opacity-50 pr-1 text-right self-center"
                style={{ visibility: VISIBLE_DAY_ROWS.has(rowIdx) ? 'visible' : 'hidden' }}
                aria-hidden="true"
              >
                {label}
              </div>
              {data.columns.map((col) => {
                const cell = col.days[rowIdx]
                if (!cell) {
                  return (
                    <div
                      key={`${col.weekStart}-${rowIdx}`}
                      style={{ width: CELL, height: CELL }}
                    />
                  )
                }
                const isSelected = selected?.date === cell.date
                const bg =
                  cell.level === 0
                    ? 'rgba(127, 127, 127, 0.15)'
                    : `color-mix(in srgb, var(--color-primary) ${
                        LEVEL_ALPHA[cell.level] * 100
                      }%, transparent)`
                return (
                  <button
                    key={`${col.weekStart}-${rowIdx}`}
                    type="button"
                    onClick={() => setSelected(cell)}
                    title={`${formatDayLabel(cell.date)} — ${formatSecForTooltip(cell.sec)}`}
                    className="rounded-[2px] transition-transform focus:outline-none focus:ring-2 focus:ring-(--color-primary)/60"
                    style={{
                      width: CELL,
                      height: CELL,
                      background: bg,
                      outline: cell.isToday
                        ? '1px solid var(--color-primary)'
                        : isSelected
                          ? '1px solid currentColor'
                          : undefined,
                      outlineOffset: cell.isToday || isSelected ? '1px' : undefined,
                    }}
                    aria-label={`${formatDayLabel(cell.date)}: ${formatSecForTooltip(cell.sec)}`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Selected cell strip + legend */}
      <div className="flex items-center justify-between text-[11px] opacity-70 px-1">
        <span className="truncate">
          {selected
            ? `${formatDayLabel(selected.date)} · ${formatSecForTooltip(selected.sec)}`
            : hasAnyActivity
              ? 'Tocá un día para ver el detalle'
              : 'Tu actividad del último año aparecerá acá'}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <span className="opacity-60">Menos</span>
          {[0, 1, 2, 3, 4].map((lvl) => (
            <span
              key={lvl}
              className="rounded-[2px]"
              style={{
                width: 10,
                height: 10,
                background:
                  lvl === 0
                    ? 'rgba(127, 127, 127, 0.15)'
                    : `color-mix(in srgb, var(--color-primary) ${
                        LEVEL_ALPHA[lvl as HeatmapLevel] * 100
                      }%, transparent)`,
              }}
            />
          ))}
          <span className="opacity-60">Más</span>
        </span>
      </div>
    </div>
  )
}
