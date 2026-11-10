import { createStart } from '@tanstack/react-start'

/**
 * SPA mode (docs/adr/0001-spa-tanstack-start.md): routes never render (nor run loaders) during the build-time
 * shell prerender; everything route-level happens in the browser.
 * See also RootComponent in routes/__root.tsx, which mounts the outlet after hydration.
 */
export const startInstance = createStart(() => ({
  defaultSsr: false,
}))
