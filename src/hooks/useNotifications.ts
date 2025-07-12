import { useCallback, useEffect, useState } from 'react';

// Define custom notification action for our implementation
interface NotificationAction {
  action: string;
  title: string;
}

// Our custom notification options for the hook
interface CustomNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
  actions?: NotificationAction[];
  timestamp?: number;
}

/**
 * Hook to handle push notifications registration and sending
 */
export function useNotifications() {
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if notifications are supported
  const isSupported = useCallback(() => {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  }, []);

  // Register the service worker
  useEffect(() => {
    const registerServiceWorker = async () => {
      if (!isSupported()) {
        setPermissionState('unsupported');
        return;
      }
      
      try {
        // Register service worker
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        setServiceWorkerRegistration(registration);
        
        // Update permission state
        setPermissionState(Notification.permission);
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };
    
    registerServiceWorker();
  }, [isSupported]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported()) return false;
    
    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  // Send a notification
  const sendNotification = useCallback(async (options: CustomNotificationOptions): Promise<boolean> => {
    if (!isSupported() || permissionState !== 'granted') {
      return false;
    }
    
    try {
      // For immediate notifications when the app is open
      new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icon-192x192.png',
        tag: options.tag
        // Standard Web Notification API doesn't support timestamp
      });
      
      // For background notifications via push API if service worker is registered
      if (serviceWorkerRegistration) {
        // In a real implementation, this would send to a push service
        // which would then trigger the push event in the service worker
        console.log('Would send push notification via service worker:', options);
        
        // Simulate background notification for demo purposes
        if ('Notification' in window && 'serviceWorker' in navigator) {
          // The ServiceWorkerRegistration.showNotification has different options than standard Notification
          // It supports more features like actions and timestamp
          serviceWorkerRegistration.showNotification(options.title, {
            body: options.body,
            icon: options.icon || '/icon-192x192.png',
            badge: '/badge-96x96.png',
            data: {
              url: options.url || window.location.href
            },
            // Using type assertion to handle custom notification options
            // that aren't in the standard NotificationOptions interface
            ...(options.actions ? { actions: options.actions } : {}),
            ...(options.timestamp ? { timestamp: options.timestamp } : {})
          } as NotificationOptions);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }, [isSupported, permissionState, serviceWorkerRegistration]);

  // Schedule a notification for future delivery
  const scheduleNotification = useCallback(async (options: CustomNotificationOptions, delayMs: number): Promise<boolean> => {
    if (!isSupported() || permissionState !== 'granted') {
      return false;
    }
    
    // For demo purposes, we'll use setTimeout
    // In a production app, we might use a more reliable method
    setTimeout(() => {
      sendNotification(options);
    }, delayMs);
    
    return true;
  }, [isSupported, permissionState, sendNotification]);

  return {
    isSupported: isSupported(),
    permissionState,
    requestPermission,
    sendNotification,
    scheduleNotification
  };
}
