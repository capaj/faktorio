import { useSearchParams } from 'wouter'

export function useQueryParamState(name: string, defaultValue: string = '') {
  const [params, setParams] = useSearchParams()
  const value = params.get(name) ?? defaultValue
  const setValue = (nextValue: string) => {
    setParams(
      (current) => {
        const updated = new URLSearchParams(current)
        if (nextValue) updated.set(name, nextValue)
        else updated.delete(name)
        return updated
      },
      { replace: true }
    )
  }

  return [value, setValue] as const
}
