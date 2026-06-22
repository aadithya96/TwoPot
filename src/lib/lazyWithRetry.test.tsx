import { Component as ReactComponent, Suspense, type ReactNode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { lazyWithRetry } from './lazyWithRetry'

const reload = vi.fn()

beforeEach(() => {
  window.sessionStorage.clear()
  reload.mockClear()
  // jsdom's location.reload is non-configurable on the prototype; stub it.
  Object.defineProperty(window, 'location', {
    value: { ...window.location, reload },
    writable: true,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

function Loaded() {
  return <div>loaded</div>
}

class ErrorBoundary extends ReactComponent<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) return <div>error: {this.state.error.message}</div>
    return this.props.children
  }
}

describe('lazyWithRetry', () => {
  it('renders the component when the import succeeds', async () => {
    const Component = lazyWithRetry(async () => ({ default: Loaded }))
    render(
      <Suspense fallback={<div>loading</div>}>
        <Component />
      </Suspense>
    )
    expect(await screen.findByText('loaded')).toBeInTheDocument()
    expect(reload).not.toHaveBeenCalled()
  })

  it('clears a stale reload flag after a successful import', async () => {
    window.sessionStorage.setItem('twopot:chunk-reload', 'true')
    const Component = lazyWithRetry(async () => ({ default: Loaded }))
    render(
      <Suspense fallback={<div>loading</div>}>
        <Component />
      </Suspense>
    )
    await screen.findByText('loaded')
    expect(window.sessionStorage.getItem('twopot:chunk-reload')).toBeNull()
  })

  it('reloads once on a failed import instead of throwing', async () => {
    const Component = lazyWithRetry(() => Promise.reject(new Error('Failed to fetch module')))
    render(
      <Suspense fallback={<div>loading</div>}>
        <Component />
      </Suspense>
    )
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
    expect(window.sessionStorage.getItem('twopot:chunk-reload')).toBe('true')
    // Fallback stays up; the error is not surfaced.
    expect(screen.getByText('loading')).toBeInTheDocument()
  })

  it('rethrows when the import fails again after a reload', async () => {
    window.sessionStorage.setItem('twopot:chunk-reload', 'true')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const Component = lazyWithRetry(() => Promise.reject(new Error('Failed to fetch module')))
    render(
      <ErrorBoundary>
        <Suspense fallback={<div>loading</div>}>
          <Component />
        </Suspense>
      </ErrorBoundary>
    )
    expect(await screen.findByText('error: Failed to fetch module')).toBeInTheDocument()
    expect(reload).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
