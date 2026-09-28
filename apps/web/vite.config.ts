import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@trending-studio/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@trending-studio/utils': path.resolve(__dirname, '../../packages/utils/src'),
      '@trending-studio/validation': path.resolve(__dirname, '../../packages/validation/src'),
      '@trending-studio/gst-engine': path.resolve(__dirname, '../../packages/gst-engine/src'),
      '@trending-studio/pricing-engine': path.resolve(__dirname, '../../packages/pricing-engine/src'),
      '@trending-studio/billing-engine': path.resolve(__dirname, '../../packages/billing-engine/src'),
      '@trending-studio/sync-engine': path.resolve(__dirname, '../../packages/sync-engine/src'),
    },
  },
  server: {
    port: 5173,
    host: true, // Exposes server on local network (e.g. http://192.168.0.101:5173) for mobile devices
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
