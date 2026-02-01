// Service Worker registration and PWA utilities
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered successfully:', registration.scope);

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, notify user
              showUpdateNotification();
            }
          });
        }
      });

      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  } else {
    console.log('Service Worker not supported');
    return null;
  }
};

const showUpdateNotification = () => {
  // Create a simple update notification
  const updateBanner = document.createElement('div');
  updateBanner.id = 'pwa-update-banner';
  updateBanner.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #1976d2;
      color: white;
      padding: 12px 16px;
      text-align: center;
      z-index: 10000;
      font-family: 'Roboto', sans-serif;
    ">
      <span>A new version is available!</span>
      <button id="update-btn" style="
        margin-left: 16px;
        padding: 6px 12px;
        background: white;
        color: #1976d2;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
      ">Update</button>
      <button id="dismiss-btn" style="
        margin-left: 8px;
        padding: 6px 12px;
        background: transparent;
        color: white;
        border: 1px solid white;
        border-radius: 4px;
        cursor: pointer;
      ">Later</button>
    </div>
  `;

  document.body.appendChild(updateBanner);

  document.getElementById('update-btn')?.addEventListener('click', () => {
    window.location.reload();
  });

  document.getElementById('dismiss-btn')?.addEventListener('click', () => {
    updateBanner.remove();
  });
};

export const unregisterServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.unregister();
    console.log('Service Worker unregistered');
  }
};

// Check if app is running as PWA
export const isPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

// Send notification (for testing)
export const sendTestNotification = async () => {
  if ('serviceWorker' in navigator && 'Notification' in window) {
    const registration = await navigator.serviceWorker.ready;

    registration.showNotification('Test Notification', {
      body: 'This is a test notification from The Grassroots Scout',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: { url: '/' }
    });
  }
};

// Check online status
export const isOnline = () => {
  return navigator.onLine;
};

// Listen for online/offline events
export const onNetworkChange = (callback: (online: boolean) => void) => {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};
