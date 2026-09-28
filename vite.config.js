import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from gintong.dev/opengreenbook/ (built into the portfolio deploy).
export default defineConfig({
  plugins: [react()],
  base: '/opengreenbook/',
  // KaTeX and the card data are the bulk of the bundle; one chunk is fine for a static study site.
  build: { chunkSizeWarningLimit: 2000 },
})
