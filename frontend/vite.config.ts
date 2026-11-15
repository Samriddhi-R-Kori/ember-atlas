import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// Ports are configurable so several checkouts can run side by side (see .env.example).
const apiUrl = process.env.EMBER_ATLAS_API_URL ?? `http://127.0.0.1:${process.env.API_PORT ?? '8000'}`
export default defineConfig({plugins:[react(),tailwindcss()],resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))}},server:{port:Number(process.env.WEB_PORT ?? 5173),strictPort:true,proxy:{'/api':apiUrl}},build:{chunkSizeWarningLimit:1300,rollupOptions:{output:{manualChunks:{plotly:['plotly.js-basic-dist-min']}}}}})
