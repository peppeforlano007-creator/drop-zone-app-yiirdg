/**
 * NotificationContext — native no-op stub.
 *
 * OneSignal has been removed. This file mirrors the web stub so Metro
 * resolves the same interface on iOS/Android without importing react-native-onesignal.
 */

import React, { createContext, useContext, ReactNode } from "react";

interface NotificationContextType {
  hasPermission: boolean;
  permissionDenied: boolean;
  loading: boolean;
  isWeb: boolean;
  requestPermission: () => Promise<boolean>;
  sendTag: (key: string, value: string) => void;
  deleteTag: (key: string) => void;
  lastNotification: Record<string, unknown> | null;
}

const NotificationContext = createContext<NotificationContextType>({
  hasPermission: false,
  permissionDenied: false,
  loading: false,
  isWeb: true,
  requestPermission: async () => false,
  sendTag: () => {},
  deleteTag: () => {},
  lastNotification: null,
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  return (
    <NotificationContext.Provider
      value={{
        hasPermission: false,
        permissionDenied: false,
        loading: false,
        isWeb: true,
        requestPermission: async () => false,
        sendTag: () => {},
        deleteTag: () => {},
        lastNotification: null,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
