
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole } from '@/types/User';

interface AuthContextType {
  user: User | null;
  login: (role: UserRole, phone?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = (role: UserRole, phone?: string) => {
    console.log('User logging in with role:', role);
    const newUser: User = {
      id: `user_${Date.now()}`,
      name: role === 'consumer' ? 'Consumer User' : role === 'supplier' ? 'Supplier User' : 'Pickup Point Manager',
      role,
      phone,
      pickupPoint: role === 'consumer' ? 'Roma' : undefined,
    };
    setUser(newUser);
  };

  const logout = () => {
    console.log('User logging out');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
