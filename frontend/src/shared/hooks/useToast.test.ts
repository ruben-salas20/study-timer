// useToast.test.ts — TDD tests for useToast hook
// Tests: queue management, manual dismiss, auto-dismiss after 4s.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with an empty toast queue', async () => {
    const { useToast } = await import('./useToast')
    const { result } = renderHook(() => useToast())

    expect(result.current.toasts).toHaveLength(0)
  })

  it('adds a toast to the queue when toast() is called', async () => {
    const { useToast } = await import('./useToast')
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ message: 'Operación exitosa', type: 'success' })
    })

    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].message).toBe('Operación exitosa')
    expect(result.current.toasts[0].type).toBe('success')
  })

  it('can add multiple toasts to the queue', async () => {
    const { useToast } = await import('./useToast')
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ message: 'First', type: 'success' })
      result.current.toast({ message: 'Second', type: 'error' })
    })

    expect(result.current.toasts).toHaveLength(2)
    expect(result.current.toasts[0].message).toBe('First')
    expect(result.current.toasts[1].message).toBe('Second')
  })

  it('removes a toast when dismiss() is called with its id', async () => {
    const { useToast } = await import('./useToast')
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ message: 'To be removed', type: 'success' })
    })

    const toastId = result.current.toasts[0].id

    act(() => {
      result.current.dismiss(toastId)
    })

    expect(result.current.toasts).toHaveLength(0)
  })

  it('auto-dismisses a toast after 4 seconds', async () => {
    const { useToast } = await import('./useToast')
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ message: 'Auto dismiss', type: 'info' })
    })

    expect(result.current.toasts).toHaveLength(1)

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(result.current.toasts).toHaveLength(0)
  })

  it('does not dismiss toasts before 4 seconds', async () => {
    const { useToast } = await import('./useToast')
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ message: 'Stay alive', type: 'info' })
    })

    act(() => {
      vi.advanceTimersByTime(3999)
    })

    expect(result.current.toasts).toHaveLength(1)
  })
})
