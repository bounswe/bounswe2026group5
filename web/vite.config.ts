/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

const config = defineConfig({
  envDir: path.resolve(__dirname, '..'),
  plugins: [
    devtools(),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackRouter({ target: 'react', autoCodeSplitting: true, routeFileIgnorePattern: '\\.test\\.tsx$' }),
    viteReact(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false, // Speeds up tests by not parsing CSS
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'e2e/**'],
  }, 
  server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        }
      },
    allowedHosts: ['www.neighborship.app','neighborship.app','mentorhood.app','www.mentorhood.app'],
    host: '0.0.0.0',
    port: 3000,
    watch: {
      usePolling: true,
    },
  },
})

export default config
