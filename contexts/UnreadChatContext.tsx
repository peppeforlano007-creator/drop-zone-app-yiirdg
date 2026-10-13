import React, { createContext, useContext } from 'react';
import { useUnreadChatMessages } from '@/hooks/useUnreadChatMessages';
import { useAuth } from '@/contexts/AuthContext';

interface UnreadChatContextValue {
  unreadByGroup: Record<string, number>;
  totalUnread: number;
  markGroupAsRead: (groupId: string) => void;
}

const UnreadChatContext = createContext<UnreadChatContextValue>({
  unreadByGroup: {},
  totalUnread: 0,
  markGroupAsRead: () => {},
});

export function UnreadChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const value = useUnreadChatMessages(user?.id);
  return (
    <UnreadChatContext.Provider value={value}>
      {children}
    </UnreadChatContext.Provider>
  );
}

export function useUnreadChat() {
  return useContext(UnreadChatContext);
}
