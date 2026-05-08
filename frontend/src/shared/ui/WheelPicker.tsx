// WheelPicker.tsx — iOS-style scroll wheel value selector.
//
// Behavior:
//   - Renders a fixed-height window with N visible items (5 by default)
//   - The middle item is the "selected" one
//   - User scrolls vertically; snap-to-center keeps values aligned
//   - When scroll settles, the closest value fires onChange
//
// Usage:
//   <WheelPicker values={[1,2,...,90]} value={25} onChange={setValue} suffix="min" />
import { useEffect, useRef, useCallback } from 'react'

const ITEM_HEIGHT = 40
const VISIBLE_ITEMS = 5

interface WheelPickerProps {
  values: number[]
  value: number
  onChange: (next: number) => void
  /** Optional small label rendered next to the selected number */
  suffix?: string
  /** Optional aria-label for accessibility */
  ariaLabel?: string
}

export function WheelPicker({
  values,
  value,
  onChange,
  suffix,
  ariaLabel,
}: WheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const valuesRef = useRef(values)
  valuesRef.current = values
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isProgrammaticScroll = useRef(false)

  // Sync scrollTop to value when prop changes
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const idx = values.indexOf(value)
    if (idx < 0) return
    isProgrammaticScroll.current = true
    el.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'auto' })
    // Reset flag on next frame so user scrolls register normally
    requestAnimationFrame(() => { isProgrammaticScroll.current = false })
  }, [value, values])

  // Debounced scroll-end detection: snap to nearest, call onChange
  const handleScroll = useCallback(() => {
    if (isProgrammaticScroll.current) return
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => {
      const el = containerRef.current
      if (!el) return
      const idx = Math.round(el.scrollTop / ITEM_HEIGHT)
      const clamped = Math.max(0, Math.min(valuesRef.current.length - 1, idx))
      const nextValue = valuesRef.current[clamped]
      if (nextValue !== undefined && nextValue !== value) {
        onChangeRef.current(nextValue)
      }
    }, 120)
  }, [value])

  return (
    <div
      role="listbox"
      aria-label={ariaLabel}
      className="relative"
      style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}
    >
      {/* Center selection band */}
      <div
        className="pointer-events-none absolute inset-x-0 z-10"
        style={{
          top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
          height: ITEM_HEIGHT,
          borderTop: '1px solid color-mix(in oklch, currentColor 15%, transparent)',
          borderBottom: '1px solid color-mix(in oklch, currentColor 15%, transparent)',
        }}
      />

      {/* Top fade */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10"
        style={{
          height: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
          background: 'linear-gradient(to bottom, var(--color-background) 30%, transparent)',
        }}
      />
      {/* Bottom fade */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
        style={{
          height: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
          background: 'linear-gradient(to top, var(--color-background) 30%, transparent)',
        }}
      />

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="overflow-y-scroll no-scrollbar h-full snap-y snap-mandatory"
        style={{
          // Padding so first and last items can reach the center band
          paddingTop: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
          paddingBottom: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
          scrollbarWidth: 'none',
        }}
      >
        {values.map((v) => {
          const selected = v === value
          return (
            <div
              key={v}
              className={[
                'flex items-center justify-center snap-center transition-opacity',
                selected ? 'opacity-100 font-bold' : 'opacity-40',
              ].join(' ')}
              style={{ height: ITEM_HEIGHT, fontSize: selected ? '24px' : '17px' }}
              role="option"
              aria-selected={selected}
            >
              <span className="tabular-nums">{v}</span>
              {suffix && <span className="ml-1 text-sm opacity-60">{suffix}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
