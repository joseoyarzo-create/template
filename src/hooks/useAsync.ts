import { useCallback, useEffect, useState } from 'react'
import { toAppError } from '@/lib/errors'

/**
 * Hook genérico para cargar datos asíncronos con estado de carga y error.
 * `deps` controla cuándo se vuelve a ejecutar la consulta.
 */
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
  options: { enabled?: boolean } = {},
) {
  const enabled = options.enabled ?? true
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await loader()
      setData(result)
    } catch (err) {
      setError(toAppError(err).message)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps])

  useEffect(() => {
    void run()
  }, [run])

  return { data, loading, error, reload: run, setData }
}
