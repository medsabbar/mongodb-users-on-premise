import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/connect': 'http://localhost:3001',
      '/disconnect': 'http://localhost:3001',
      '/validate-uri': 'http://localhost:3001',
      '/users': 'http://localhost:3001',
      '/roles': 'http://localhost:3001'
    }
  }
});

