// ErrorBoundary.tsx — Class-based React error boundary
// Catches render errors in the subtree and displays a friendly fallback.
// Wraps around main <Outlet /> in routes to prevent app crashes.
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Optional custom fallback — if not provided, shows the default "Algo salió mal" UI */
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console — a real app would send to Sentry or similar
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground gap-6 px-6">
          <div className="text-5xl">⚠️</div>
          <div className="text-center flex flex-col gap-2">
            <h1 className="text-xl font-bold">Algo salió mal</h1>
            <p className="text-sm opacity-60 max-w-xs">
              Ha ocurrido un error inesperado. Podés intentar recargar la página.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-5 py-2.5 rounded-xl bg-(--color-primary) text-white text-sm font-semibold"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl border border-current/20 text-sm font-medium opacity-70"
            >
              Recargar
            </button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <pre className="text-xs opacity-40 max-w-full overflow-auto text-left bg-black/20 p-3 rounded-xl">
              {this.state.error.message}
            </pre>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
