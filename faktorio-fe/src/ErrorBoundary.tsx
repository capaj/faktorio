import React from 'react'

export class ErrorBoundary extends React.Component {
  state: Readonly<{ error: any }> = { error: null }
  // @ts-expect-error
  props: Readonly<{ children: React.ReactNode }>

  constructor(props: any) {
    super(props)

    this.state = { error: null }
  }
  static getDerivedStateFromError(error: any) {
    return { error: error }
  }
  componentDidCatch(error: any, errorInfo: any) {
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
