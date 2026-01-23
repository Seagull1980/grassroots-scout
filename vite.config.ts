import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    // setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'charts-vendor': ['chart.js', 'react-chartjs-2'],
          'maps-vendor': ['@googlemaps/js-api-loader', '@googlemaps/react-wrapper'],

          // Feature chunks
          'admin-features': [
            'src/pages/AdminPage.tsx',
            'src/pages/LeagueRequestsAdmin.tsx',
            'src/pages/AboutManagementPage.tsx'
          ],
          'analytics-features': [
            'src/pages/PerformanceAnalyticsPage.tsx',
            'src/pages/EnhancedDashboardPage.tsx'
          ],
          'maps-features': [
            'src/pages/MapsPage.tsx',
            'src/components/MapSearch.tsx',
            'src/components/GoogleMapsWrapper.tsx'
          ],
          'messaging-features': [
            'src/pages/MessagesPage.tsx'
          ],
          'team-features': [
            'src/pages/TeamProfilePage.tsx',
            'src/pages/TeamRosterPage.tsx'
          ]
        }
      }
    },
    // Chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Enable minification for smaller bundles
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    },
    // Enable source maps for debugging but compress them
    sourcemap: false,
    // Optimize CSS
    cssCodeSplit: true,
    // Preload modules for better performance
    modulePreload: {
      polyfill: false
    }
  },
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173,
    strictPort: false, // Allow port fallback
    allowedHosts: [
      'localhost',
      'e9fa3ed15b6e.ngrok-free.app',
      '.ngrok-free.app', // Allow any ngrok-free.app subdomain
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
