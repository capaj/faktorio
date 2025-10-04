import { useLocation, useSearch } from 'wouter'
import queryString from 'query-string'
import { useEffect, useState } from 'react'

export function useQueryParamState(name: string, defaultValue: string = '') {
  const [location, navigate] = useLocation()

  const query = queryString.parse(useSearch())
  const [search, setSearch] = useState((query[name] as string) ?? defaultValue)

  useEffect(() => {
    const locationWithoutSearch = location.split('?')[0]

    const updatedQuery = { ...query }
    if (search) {
      updatedQuery[name] = search
    } else {
      delete updatedQuery[name]
    }

    const queryStr = queryString.stringify(updatedQuery)
    const newUrl = locationWithoutSearch + (queryStr ? '?' + queryStr : '')
    navigate(newUrl, { replace: true })

  }, [search])

  return [search, setSearch] as const
}
