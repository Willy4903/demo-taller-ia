import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// En GitHub Pages la app vive en /<repositorio>/. El workflow define BASE_PATH.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
