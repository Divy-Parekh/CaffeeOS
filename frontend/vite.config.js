import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        host: true,
        port: 5173,
        allowedHosts: [
            'unfrilly-electrolytically-sherise.ngrok-free.dev',
            '.ngrok-free.dev',
            '.ngrok-free.app'
        ],
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/socket.io': {
                target: 'http://localhost:3000',
                ws: true,
            },
        },
    },
})
