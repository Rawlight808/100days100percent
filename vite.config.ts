import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteUrl = env.VITE_SITE_URL || 'http://localhost:5173'

  return {
    plugins: [
      react(),
      {
        name: 'inject-site-url',
        transformIndexHtml(html) {
          return html.replaceAll('%VITE_SITE_URL%', siteUrl)
        },
      },
    ],
  }
})
