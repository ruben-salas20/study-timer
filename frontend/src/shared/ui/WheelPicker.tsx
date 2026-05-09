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

  // Fade the top/bottom items via mask-image rather than colored overlays.
  // Overlays (linear-gradient to var(--color-background)) leak the page bg
  // colour into any tinted parent (cards, modals, etc.) and produce a hard
  // edge where the gradient meets a different background. mask-image fades
  // the actual content, so it composites correctly on ANY background.
  const fadeMask =
    'linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)'

  return (
    <div
      role="listbox"
      aria-label={ariaLabel}
      className="relative"
      style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}
    >
      {/* Center selection band — drawn over the masked content */}
      <div
        className="pointer-events-none absolute inset-x-0 z-10"
        style={{
          top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
          height: ITEM_HEIGHT,
          borderTop: '1px solid color-mix(in oklch, currentColor 15%, transparent)',
          borderBottom: '1px solid color-mix(in oklch, currentColor 15%, transparent)',
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
          maskImage: fadeMask,
          WebkitMaskImage: fadeMask,
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
