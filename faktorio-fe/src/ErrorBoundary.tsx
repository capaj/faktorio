import React from 'react'

export class ErrorBoundary extends React.Component {
  state: Readonly<{}> = { error: null }

  constructor(props: any) {
    super(props)

    this.state = { error: null }
  }
  static getDerivedStateFromError(error: any) {
    return { error }
  }
  componentDidCatch(error, errorInfo) {
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
