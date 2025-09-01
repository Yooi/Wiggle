import { defineConfig } from "vite";
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
  plugins: [
    react(),
    nodePolyfills({
      // To add only specific polyfills, add them here. If no option is passed, adds all polyfills
      include: ['buffer', 'process', 'util', 'stream', 'crypto', 'events'],
      // To exclude specific polyfills, add them to this list. Note: if include is provided, this has no effect
      exclude: [
        'http', // Excludes the polyfill for `http` and `node:http`.
      ],
      // Whether to polyfill specific globals.
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  base: mode === 'production' && process.env.GITHUB_PAGES ? '/Wiggle/' : '/',
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['simple-peer']
  },
  server: {
    port: 3000,
    host: true
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      external: [],
    }
  }
}))
