import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  // Electron carga la app desde file:// → rutas relativas. Web/Vercel → '/'.
  base: process.env.ELECTRON_BUILD ? './' : '/',
  plugins: [
    react(),
    tailwindcss(),
    // HTTPS local con certificado autofirmado — necesario para que el navegador
    // permita acceso a la cámara USB (la API getUserMedia exige un
    // "contexto seguro": HTTPS o localhost).
    basicSsl(),
  ],
  server: {
    host: true,
    proxy: {
      // El Toque no envía cabeceras CORS — el navegador bloquea el fetch directo.
      // Proxy del servidor dev: el navegador llama a /eltoque-api (mismo origen),
      // Vite reenvía la petición server-to-server (sin restricción CORS).
      '/eltoque-api': {
        target: 'https://tasas.eltoque.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/eltoque-api/, ''),
      },
    },
  },
})
