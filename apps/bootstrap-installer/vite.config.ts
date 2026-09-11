import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// Hermes Setup — Tauri-targeted Vite config.
//
// Port 5175 keeps us out of the way of:
//   web       (vite default 5173)
//   apps/desktop dev     (5174 per its package.json)
//
// `clearScreen: false` is the Tauri convention — they spawn vite as a child
// process and want our errors to stay visible.

const host = process.env.TAURI_DEV_HOST
const installerBrand = String(process.env.HERMES_INSTALLER_BRAND || '').trim().toLowerCase()

const installerProductTitle = installerBrand === 'lemon' ? 'Lemon AI Setup' : 'Hermes'

export default defineConfig({
  define: {
    __LEMON_INSTALLER__: JSON.stringify(installerBrand === 'lemon')
  },
  plugins: [
    {
      name: 'bootstrap-installer-title',
      transformIndexHtml: html => html.replace('<title>Hermes</title>', `<title>${installerProductTitle}</title>`)
    },
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  clearScreen: false,
  server: {
    port: 5175,
    strictPort: true,
    host: host || '127.0.0.1',
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 5176
        }
      : undefined,
    watch: {
      // Don't watch the Rust side — tauri-cli handles it.
      ignored: ['**/src-tauri/**']
    }
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    emptyOutDir: true
  }
})
