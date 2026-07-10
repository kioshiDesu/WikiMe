import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 text-center">
          <p className="text-sm text-red-500 font-medium mb-2">Something went wrong</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-teal-500 active:bg-teal-600 transition-colors"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
