import { useLocation, useSearch } from 'wouter'
import queryString from 'query-string'
import { useEffect, useState } from 'react'

export function useQueryParamState(name: string, defaultValue: string = '') {
  const [location, navigate] = useLocation()

  const query = queryString.parse(useSearch())
  const [search, setSearch] = useState((query[name] as string) ?? defaultValue)

  useEffect(() => {
    const locationWithoutSearch = location.split('?')[0]

    const newUrl =
      locationWithoutSearch +
      '?' +
      queryString.stringify({ ...query, [name]: search })
    navigate(
      newUrl,

      { replace: true }
    )
    console.log({ newUrl })
  }, [search])

  return [search, setSearch] as const
}
