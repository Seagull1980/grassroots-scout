import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import './index.css'
import { unregisterServiceWorker } from './utils/pwa';

// Global error handler for debugging - suppress harmless extension errors
window.addEventListener('error', (event) => {
  // Suppress "Attempting to use a disconnected port object" from browser extensions
  if (event.message?.includes('disconnected port object')) {
    console.debug('[Extension Port Disconnect - Ignored]', event.message);
    event.preventDefault();
    return;
  }
  
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
  // Suppress harmless port disconnection errors
  if (event.reason?.message?.includes('disconnected port object')) {
    console.debug('[Extension Port Disconnect - Ignored]', event.reason.message);
    event.preventDefault();
    return;
  }
  
  console.error('[Unhandled Rejection]', {
    reason: event.reason,
    promise: event.promise,
  });
});

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );
} else {
  console.error('Root element not found');
}

// Temporarily disable service worker registration to prevent stale app-shell caches.
unregisterServiceWorker().catch(() => undefined);

