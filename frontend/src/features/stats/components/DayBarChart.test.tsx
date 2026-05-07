// DayBarChart.test.tsx — RED → GREEN tests for DayBarChart SVG component
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DayBarChart } from './DayBarChart'

const CHART_LABEL = 'Gráfico de minutos por día'

describe('DayBarChart', () => {
  it('renders an svg element', () => {
    const data = [
      { date: '2024-01-10', sec: 3600 },
      { date: '2024-01-11', sec: 1800 },
    ]

    render(<DayBarChart data={data} maxSec={3600} />)

    const svg = screen.getByRole('img', { name: CHART_LABEL })
    expect(svg.tagName.toLowerCase()).toBe('svg')
  })

  it('renders one rect per data point', () => {
    const data = [
      { date: '2024-01-10', sec: 3600 },
      { date: '2024-01-11', sec: 1800 },
      { date: '2024-01-12', sec: 900 },
    ]

    const { container } = render(<DayBarChart data={data} maxSec={3600} />)

    const rects = container.querySelectorAll('rect')
    expect(rects.length).toBe(3)
  })

  it('gives the tallest bar full height when it equals maxSec', () => {
    const data = [{ date: '2024-01-10', sec: 3600 }]
    const CHART_HEIGHT = 80 // must match implementation constant

    const { container } = render(<DayBarChart data={data} maxSec={3600} />)

    const rect = container.querySelector('rect')
    // The rect height should be the full chart height (or very close)
    const height = parseFloat(rect?.getAttribute('height') ?? '0')
    expect(height).toBe(CHART_HEIGHT)
  })

  it('gives a zero-sec bar a height of 0', () => {
    const data = [{ date: '2024-01-10', sec: 0 }]

    const { container } = render(<DayBarChart data={data} maxSec={3600} />)

    const rect = container.querySelector('rect')
    const height = parseFloat(rect?.getAttribute('height') ?? '1')
    expect(height).toBe(0)
  })

  it('renders nothing when data array is empty', () => {
    const { container } = render(<DayBarChart data={[]} maxSec={3600} />)

    const rects = container.querySelectorAll('rect')
    expect(rects.length).toBe(0)
  })
})
