import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const vars = loadEnv(mode, process.cwd(), '');
  if (mode === 'production' && !vars.VITE_API_URL?.trim()) {
    throw new Error('VITE_API_URL must be set to the deployed backend API URL for a production build.');
  }
  return {
    plugins: [react()],
    server: { port: 5173, host: true, strictPort: true },
    build: {
      rollupOptions: {
        output: { manualChunks: { 'react-vendor': ['react', 'react-dom', 'react-router-dom'], charts: ['recharts'] } },
      },
    },
  };
});
