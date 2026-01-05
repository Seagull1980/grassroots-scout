import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { storage } from '../utils/storage';

// Get WebSocket URL based on environment
const getWebSocketUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  return 'ws://localhost:8080';
};

const WS_URL = getWebSocketUrl();

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read?: boolean;
  data?: any;
  action?: {
    type: 'NAVIGATE' | 'FUNCTION';
    url?: string;
    function?: string;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  sendNotification: (type: string, data: any) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  subscribeToArea: (latitude: number, longitude: number, radius: number) => void;
  subscribeToLeague: (league: string, ageGroup: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const maxReconnectAttempts = 5;
  const reconnectDelay = [1000, 2000, 5000, 10000, 30000]; // Progressive delays

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = storage.getItem('notifications');
    if (savedNotifications) {
      try {
        setNotifications(JSON.parse(savedNotifications));
      } catch (error) {
        console.error('Failed to load saved notifications:', error);
      }
    }
  }, []);

  // Save notifications to localStorage when they change
  useEffect(() => {
    if (notifications.length > 0) {
      storage.setItem('notifications', JSON.stringify(notifications));
    }
  }, [notifications]);

  const connectWebSocket = useCallback(() => {
    if (!user) return;

    // Skip WebSocket connection if using external URLs (production deployment)
    if (import.meta.env.VITE_API_URL?.includes('railway') || 
        import.meta.env.VITE_API_URL?.includes('render') ||
        import.meta.env.VITE_API_URL?.includes('vercel')) {
      console.log('🔔 WebSocket disabled for production deployment');
      setConnectionStatus('disconnected');
      return;
    }

    const token = storage.getItem('token');
    if (!token) {
      console.log('🔑 No token available for WebSocket connection');
      return;
    }

    try {
      setConnectionStatus('connecting');
      const websocket = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);

      websocket.onopen = () => {
        console.log('🔔 Connected to notification server');
        setConnectionStatus('connected');
        setReconnectAttempts(0);
        
        // Request browser notification permission
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission().then(permission => {
            console.log('Notification permission:', permission);
          });
        }
      };

      websocket.onmessage = (event) => {
        try {
          const notification: Notification = JSON.parse(event.data);
          handleIncomingNotification(notification);
        } catch (error) {
          console.error('Failed to parse notification:', error);
        }
      };

      websocket.onerror = (error) => {
        console.error('🔌 WebSocket error:', error);
        setConnectionStatus('error');
      };

      websocket.onclose = (event) => {
        console.log('🔌 WebSocket connection closed:', event.code, event.reason);
        setConnectionStatus('disconnected');
        setWs(null);

        // Authentication failed - likely expired token
        // Code 1006: Abnormal closure (connection failed before handshake)
        // Code 1008: Policy violation (authentication failed)
        if (event.code === 1006 || event.code === 1008) {
          console.warn('⚠️ WebSocket authentication failed - Your session may have expired.');
          console.log('💡 Try refreshing the page or logging in again to restore notifications.');
          setConnectionStatus('error');
          // Don't attempt reconnection on auth failures
          return;
        }

        // Attempt to reconnect if not intentionally closed and we have retry attempts left
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          const delay = reconnectDelay[Math.min(reconnectAttempts, reconnectDelay.length - 1)];
          console.log(`🔄 Attempting to reconnect in ${delay}ms... (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
          
          setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connectWebSocket();
          }, delay);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          console.warn('⚠️ Max reconnection attempts reached. Notifications disabled.');
        }
      };

      websocket.onerror = (error) => {
        console.error('🚨 WebSocket error:', error);
        setConnectionStatus('error');
      };

      setWs(websocket);

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
    }
  }, [user, reconnectAttempts]);

  const handleIncomingNotification = useCallback((notification: Notification) => {
    console.log('📬 New notification:', notification);

    // Filter out connection/welcome notifications - only show actionable notifications
    if (notification.type === 'WELCOME') {
      console.log('🔕 Filtered out welcome notification');
      return;
    }

    // Add to notifications list
    setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50 notifications

    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/logo.jpg',
        badge: '/logo.jpg',
        tag: notification.id, // Prevent duplicate notifications
      });

      // Handle notification click
      browserNotification.onclick = () => {
        window.focus();
        if (notification.action?.type === 'NAVIGATE' && notification.action.url) {
          window.location.href = notification.action.url;
        }
        browserNotification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => {
        browserNotification.close();
      }, 5000);
    }

    // Play notification sound (optional)
    if (storage.getItem('notificationSound') !== 'false') {
      try {
        const audio = new Audio('/notification-sound.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {
          // Ignore audio play errors (browser restrictions)
        });
      } catch (error) {
        // Ignore audio errors
      }
    }
  }, []);

  // Connect when user is authenticated
  useEffect(() => {
    if (user && !ws) {
      connectWebSocket();
    } else if (!user && ws) {
      ws.close(1000, 'User logged out');
      setWs(null);
      setConnectionStatus('disconnected');
    }

    return () => {
      if (ws) {
        ws.close(1000, 'Component unmounting');
      }
    };
  }, [user, connectWebSocket]);

  // Send message to server
  const sendMessage = useCallback((type: string, data: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, data }));
    }
  }, [ws]);

  // API methods
  const sendNotification = useCallback((type: string, data: any) => {
    sendMessage(type, data);
  }, [sendMessage]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    sendMessage('MARK_READ', { notificationId });
  }, [sendMessage]);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    storage.removeItem('notifications');
  }, []);

  const subscribeToArea = useCallback((latitude: number, longitude: number, radius: number) => {
    sendMessage('SUBSCRIBE_TO_AREA', { latitude, longitude, radius });
  }, [sendMessage]);

  const subscribeToLeague = useCallback((league: string, ageGroup: string) => {
    sendMessage('SUBSCRIBE_TO_LEAGUE', { league, ageGroup });
  }, [sendMessage]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const isConnected = connectionStatus === 'connected';

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isConnected,
    connectionStatus,
    sendNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    subscribeToArea,
    subscribeToLeague,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};