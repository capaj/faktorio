import React from 'react'
import { Spinner } from './ui/spinner'

export function SpinnerContainer({
  loading,
  children
}: {
  loading: boolean
  children?: React.ReactNode
}) {
  return (
    <>
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </div>
      ) : (
        children ?? null
      )}
    </>
  )
}
