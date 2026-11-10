import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Where the dev server forwards /api calls (the docboo-backend API).
// In docker-compose.dev.yml this is the API published on the Docker host.
const apiTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:5248'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  server: {
    port: 3000,
    // Bind mounts from Windows hosts do not emit inotify events inside containers.
    watch: process.env.VITE_USE_POLLING
      ? { usePolling: true, interval: 300 }
      : undefined,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
  plugins: [
    devtools(),
    tailwindcss(),
    // SPA mode: no SSR at runtime. The build emits a static shell (dist/client) served by nginx.
    tanstackStart({ spa: { enabled: true } }),
    viteReact(),
  ],
})

export default config
