import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// /api and /uploads (product photos) go to the backend on port 5000
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:5000', '/uploads': 'http://localhost:5000' } }
});
