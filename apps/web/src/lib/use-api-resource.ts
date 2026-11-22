import { useCallback, useEffect, useState } from 'react'
import { errorMessage } from './backend-api'

export function useApiResource<T>(load: ((signal: AbortSignal) => Promise<T>) | null, invalidation = 0) {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<{ load: typeof load; revision: number; invalidation: number; data?: T; error?: string }>()
  const retry = useCallback(() => setRevision((value) => value + 1), [])

  useEffect(() => {
    if (!load) return
    const controller = new AbortController()
    void load(controller.signal).then(
      (data) => { if (!controller.signal.aborted) setResult({ load, revision, invalidation, data }) },
      (error) => { if (!controller.signal.aborted) setResult({ load, revision, invalidation, error: errorMessage(error) }) },
    )
    return () => controller.abort()
  }, [load, revision, invalidation])

  const current = result?.load === load && result.revision === revision && result.invalidation === invalidation ? result : undefined
  return { data: current?.data, error: current?.error, loading: Boolean(load && !current), retry }
}
