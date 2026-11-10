import { queryOptions } from '@tanstack/react-query'
import { api } from './client'

export const healthQuery = queryOptions({
  queryKey: ['health'],
  queryFn: async () => {
    const { data, error, response } = await api.GET('/api/health')
    // A 503 still carries a HealthResponse body describing which check failed;
    // anything that is not JSON (e.g. a proxy error page) means the API is unreachable.
    if (!response.headers.get('content-type')?.includes('application/json')) {
      throw new Error(`HTTP ${response.status}`)
    }
    return data ?? error
  },
  refetchInterval: 15_000,
})

export const worksQuery = queryOptions({
  queryKey: ['works'],
  queryFn: async () => {
    const { data, response } = await api.GET('/api/works')
    if (!data) throw new Error(`HTTP ${response.status}`)
    return data
  },
})
