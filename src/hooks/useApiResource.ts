import { useCallback, useEffect, useState } from 'react'
import { apiMessage } from '../api/client'

export function useApiResource<T>(loader: () => Promise<T>, initial: T) {
  const [data, setData] = useState(initial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => { setLoading(true); setVersion(value => value + 1) }, [])

  useEffect(() => {
    let active = true
    loader().then(value => {
      if (active) { setData(value); setError('') }
    }).catch(reason => {
      if (active) setError(apiMessage(reason))
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [loader, version])

  return { data, setData, loading, error, reload }
}
