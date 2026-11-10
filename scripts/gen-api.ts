/**
 * Generates src/api/schema.gen.d.ts from the docboo-backend OpenAPI document.
 *
 * Source (first match):
 *   1. OPENAPI_SOURCE (URL or file path), e.g. ../docboo-backend/Backend/openapi/openapi.json
 *   2. The running API: http://localhost:5248/openapi/v1.json
 *
 * Usage: bun run gen:api
 */
import { spawnSync } from 'node:child_process'

const source =
  process.env.OPENAPI_SOURCE ?? 'http://localhost:5248/openapi/v1.json'
const output = 'src/api/schema.gen.d.ts'

console.log(`openapi source: ${source}`)

const result = spawnSync('bunx', ['openapi-typescript', source, '-o', output], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

if (result.status !== 0) {
  console.error(
    '\nCould not generate API types. Start the API (docboo-backend) or set OPENAPI_SOURCE.',
  )
  process.exit(result.status ?? 1)
}
