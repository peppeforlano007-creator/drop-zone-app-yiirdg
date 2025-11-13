
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types/User';
import { supabase } from '@/app/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (email: string, password: string, fullName: string, phone: string, role: UserRole, pickupPointId?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthProvider: Initializing...');
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthProvider: Initial session:', session?.user?.id);
      setSession(session);
      if (session) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('AuthProvider: Auth state changed:', _event, session?.user?.id);
      setSession(session);
      if (session) {
        loadUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('AuthProvider: Loading profile for user:', userId);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          *,
          pickup_points (
            id,
            name,
            city
          )
        `)
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('AuthProvider: Error loading profile:', error);
        setLoading(false);
        return;
      }

      if (profile) {
        console.log('AuthProvider: Profile loaded:', profile.role);
        const userData: User = {
          id: profile.user_id,
          name: profile.full_name || 'User',
          email: profile.email,
          role: profile.role as UserRole,
          phone: profile.phone || undefined,
          pickupPoint: profile.pickup_points?.city || undefined,
          pickupPointId: profile.pickup_point_id || undefined,
        };
        setUser(userData);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('AuthProvider: Exception loading profile:', error);
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    role: UserRole,
    pickupPointId?: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log('AuthProvider: Registering user:', email, role);
      
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://natively.dev/email-confirmed',
          data: {
            full_name: fullName,
            phone,
            role,
            pickup_point_id: pickupPointId,
          }
        }
      });

      if (authError) {
        console.error('AuthProvider: Registration error:', authError);
        return { success: false, message: authError.message };
      }

      if (!authData.user) {
        return { success: false, message: 'Errore durante la registrazione' };
      }

      console.log('AuthProvider: User registered:', authData.user.id);

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          email,
          full_name: fullName,
          phone,
          role,
          pickup_point_id: pickupPointId,
        });

      if (profileError) {
        console.error('AuthProvider: Profile creation error:', profileError);
        return { success: false, message: 'Errore durante la creazione del profilo' };
      }

      return { 
        success: true, 
        message: 'Registrazione completata! Controlla la tua email per verificare l\'account.' 
      };
    } catch (error) {
      console.error('AuthProvider: Registration exception:', error);
      return { success: false, message: 'Errore imprevisto durante la registrazione' };
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log('AuthProvider: Logging in user:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('AuthProvider: Login error:', error);
        return { success: false, message: error.message };
      }

      if (!data.user) {
        return { success: false, message: 'Errore durante il login' };
      }

      console.log('AuthProvider: User logged in:', data.user.id);
      
      // Profile will be loaded by the auth state change listener
      return { success: true };
    } catch (error) {
      console.error('AuthProvider: Login exception:', error);
      return { success: false, message: 'Errore imprevisto durante il login' };
    }
  };

  const logout = async () => {
    try {
      console.log('AuthProvider: Logging out user');
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('AuthProvider: Logout exception:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user && !!session,
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
