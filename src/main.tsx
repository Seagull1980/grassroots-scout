import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css'
import { registerServiceWorker } from './utils/pwa';

// Global error handler for debugging
window.addEventListener('error', (event) => {
  console.error('[Global Error Handler]', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
  });
});

// Global unhandled rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Rejection]', {
    reason: event.reason,
    promise: event.promise,
  });
});

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <App />
  );
} else {
  console.error('Root element not found');
}

// Register service worker for PWA functionality
registerServiceWorker();

