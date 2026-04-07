import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import { defineConfig, loadEnv } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Même racine que le fichier de config (évite un .env introuvable si `cwd` ≠ projet).
  const env = loadEnv(mode, __dirname, '')
  const apiProxyTarget =
    env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8787'

  const apiProxy = {
    target: apiProxyTarget,
    changeOrigin: true,
    /** Flux IA longs : évite 502 côté proxy dev (timeouts par défaut trop courts). */
    timeout: 600_000,
    proxyTimeout: 600_000,
  }

  return {
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': apiProxy,
    },
  },
  preview: {
    proxy: {
      '/api': apiProxy,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  }
})
