import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // expose on the LAN / Tailscale so other devices can reach it
    // Allow access through a Cloudflare quick tunnel (random *.trycloudflare.com
    // host) — Vite blocks unknown hosts by default. localhost/LAN IPs stay allowed.
    allowedHosts: ['.trycloudflare.com'],
    // Proxy API calls through Vite to the backend, so the app is a SINGLE origin
    // from any device (no CORS, no need to point the client at a backend IP).
    proxy: {
      '/api': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        // The backend's CORS only allows a localhost Origin. When the app is
        // reached via the LAN IP or a tunnel the browser sends that host as the
        // Origin, which the backend rejects (500). Rewrite it to localhost on the
        // proxied request so the backend accepts it. The browser sees a
        // same-origin request, so it never does a CORS check itself.
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => proxyReq.setHeader('origin', 'http://localhost:5173'));
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/test/**/*.test.{js,jsx,ts,tsx}'],
    exclude: ['backend/**', 'node_modules/**'],
  }
})
