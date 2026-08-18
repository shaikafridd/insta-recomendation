import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/reels': 'http://localhost:3000',
      '/interactions': 'http://localhost:3000',
      '/recommendations': 'http://localhost:3000',
      '/interest-profile': 'http://localhost:3000',
      '/health': 'http://localhost:3000'
    }
  }
});
