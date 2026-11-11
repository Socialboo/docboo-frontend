import { queryOptions } from '@tanstack/react-query'
import { api } from './client'

/** Thrown for unexpected API responses; carries the HTTP status. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

export const healthQuery = queryOptions({
  queryKey: ['health'],
  queryFn: async () => {
    const { data, error, response } = await api.GET('/api/health')
    // A 503 still carries a HealthResponse body describing which check failed;
    // anything that is not JSON (e.g. a proxy error page) means the API is unreachable.
    if (!response.headers.get('content-type')?.includes('application/json')) {
      throw new ApiError(`HTTP ${response.status}`, response.status)
    }
    return data ?? error
  },
  refetchInterval: 15_000,
})

export const profilesQuery = queryOptions({
  queryKey: ['profiles'],
  queryFn: async () => {
    const { data, response } = await api.GET('/api/profiles')
    if (!data) throw new ApiError(`HTTP ${response.status}`, response.status)
    return data
  },
  staleTime: Infinity,
})

export const worksQuery = queryOptions({
  queryKey: ['works'],
  queryFn: async () => {
    const { data, response } = await api.GET('/api/works')
    if (!data) throw new ApiError(`HTTP ${response.status}`, response.status)
    return data
  },
})

export const workQuery = (workId: string) =>
  queryOptions({
    queryKey: ['works', workId],
    queryFn: async () => {
      const { data, response } = await api.GET('/api/works/{id}', { params: { path: { id: workId } } })
      if (!data) throw new ApiError(response.status === 404 ? 'Trabalho não encontrado.' : `HTTP ${response.status}`, response.status)
      return data
    },
    // The editor owns the document while it is open; never refetch it behind the user's back.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

export const exportsQuery = (workId: string) =>
  queryOptions({
    queryKey: ['works', workId, 'exports'],
    queryFn: async () => {
      const { data, response } = await api.GET('/api/works/{workId}/exports', { params: { path: { workId } } })
      if (!data) throw new ApiError(`HTTP ${response.status}`, response.status)
      return data
    },
    // Poll while any job is still being generated.
    refetchInterval: (query) =>
      query.state.data?.some((j) => j.status === 'queued' || j.status === 'running') ? 1000 : false,
  })
