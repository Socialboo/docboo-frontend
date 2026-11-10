import createClient from 'openapi-fetch'
import type { components, paths } from './schema.gen'

/**
 * Typed API client. Types come from the backend OpenAPI document
 * (`bun run gen:api`); never declare request/response types by hand.
 * Requests are same-origin: Vite proxies /api in dev, nginx in production.
 */
export const api = createClient<paths>({ baseUrl: '/' })

export type Schemas = components['schemas']
