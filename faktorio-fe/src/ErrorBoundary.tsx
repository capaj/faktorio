import React from 'react'

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: Readonly<{ error: Error | null }> = { error: null }
  // @ts-expect-error
  props: Readonly<{ children: React.ReactNode }>

  constructor(props: { children: React.ReactNode }) {
    super(props)

    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error: error }
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // logErrorToMyService(error, errorInfo) // TODO
  }
  render() {
    if (this.state.error) {
      return (
        <>
          <h1>Něco se pokazilo.</h1>
          <pre>
            {this.state.error.message}
            {this.state.error.stack}
          </pre>
        </>
      )
    }
    return this.props.children
  }
}
