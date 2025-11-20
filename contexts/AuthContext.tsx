
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, UserRole } from '@/types/User';
import { supabase } from '@/app/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { Alert } from 'react-native';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (email: string, password: string, fullName: string, phone: string, role: UserRole, pickupPointId?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  updatePickupPoint: (pickupPointId: string, pickupPointCity: string) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = useCallback(async (userId: string, retryCount = 0) => {
    try {
      console.log(`AuthProvider: Loading profile for user: ${userId} (attempt ${retryCount + 1})`);
      
      // Add a small delay to ensure the session is fully established
      if (retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // First, try to get the profile without the join
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('AuthProvider: Error loading profile:', profileError);
        console.error('AuthProvider: Error details:', {
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          code: profileError.code
        });
        
        // Retry up to 3 times with exponential backoff
        if (retryCount < 3) {
          console.log(`AuthProvider: Retrying profile load in ${(retryCount + 1) * 500}ms...`);
          await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 500));
          return loadUserProfile(userId, retryCount + 1);
        }
        
        // Show error to user after all retries failed
        Alert.alert(
          'Errore Caricamento Profilo',
          `Impossibile caricare il profilo utente: ${profileError.message}. Riprova ad accedere.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Log out the user
                supabase.auth.signOut();
              }
            }
          ]
        );
        
        setLoading(false);
        return;
      }

      if (!profile) {
        console.error('AuthProvider: Profile not found for user:', userId);
        
        // Retry if this is the first attempt
        if (retryCount < 3) {
          console.log(`AuthProvider: Profile not found, retrying in ${(retryCount + 1) * 500}ms...`);
          await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 500));
          return loadUserProfile(userId, retryCount + 1);
        }
        
        Alert.alert(
          'Profilo Non Trovato',
          'Il tuo profilo utente non è stato trovato. Contatta il supporto.',
          [
            {
              text: 'OK',
              onPress: () => {
                supabase.auth.signOut();
              }
            }
          ]
        );
        setLoading(false);
        return;
      }

      console.log('AuthProvider: Profile loaded successfully:', profile.role);

      // Special handling for pickup_point users
      if (profile.role === 'pickup_point') {
        // Check if pickup_point_id is missing
        if (!profile.pickup_point_id) {
          console.error('AuthProvider: Pickup point user missing pickup_point_id, attempting to fix...');
          
          // Try to find the pickup point by email
          const { data: pickupPoint, error: pickupError } = await supabase
            .from('pickup_points')
            .select('id, city, name')
            .eq('email', profile.email)
            .single();

          if (pickupError || !pickupPoint) {
            console.error('AuthProvider: Could not find pickup point for email:', profile.email, pickupError);
            
            Alert.alert(
              'Errore Configurazione',
              `Il tuo account punto di ritiro non è configurato correttamente. Nessun punto di ritiro trovato per l'email ${profile.email}.\n\nContatta l'amministratore per assistenza.`,
              [
                {
                  text: 'OK',
                  onPress: () => {
                    supabase.auth.signOut();
                  }
                }
              ]
            );
            setLoading(false);
            return;
          }

          // Update the profile with the correct pickup_point_id
          console.log('AuthProvider: Found pickup point, updating profile:', pickupPoint.id);
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ pickup_point_id: pickupPoint.id })
            .eq('user_id', userId);

          if (updateError) {
            console.error('AuthProvider: Error updating profile with pickup_point_id:', updateError);
            
            Alert.alert(
              'Errore Aggiornamento',
              'Impossibile aggiornare il profilo con l\'ID del punto di ritiro. Contatta l\'amministratore.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    supabase.auth.signOut();
                  }
                }
              ]
            );
            setLoading(false);
            return;
          }

          // Update the local profile data
          profile.pickup_point_id = pickupPoint.id;
          
          console.log('AuthProvider: Profile updated successfully with pickup_point_id:', pickupPoint.id);
          
          // Show success message
          Alert.alert(
            'Configurazione Completata',
            `Il tuo account è stato configurato correttamente per il punto di ritiro "${pickupPoint.name}".`,
            [{ text: 'OK' }]
          );
        }
      }

      // Now get the pickup point if it exists
      let pickupPointCity: string | undefined;
      if (profile.pickup_point_id) {
        const { data: pickupPoint, error: pickupError } = await supabase
          .from('pickup_points')
          .select('city')
          .eq('id', profile.pickup_point_id)
          .single();

        if (pickupError) {
          console.warn('AuthProvider: Error loading pickup point:', pickupError);
        } else if (pickupPoint) {
          pickupPointCity = pickupPoint.city;
        }
      }

      const userData: User = {
        id: profile.user_id,
        name: profile.full_name || 'User',
        email: profile.email,
        role: profile.role as UserRole,
        phone: profile.phone || undefined,
        pickupPoint: pickupPointCity,
        pickupPointId: profile.pickup_point_id || undefined,
      };
      
      console.log('AuthProvider: User data created:', userData.role, userData.email);
      setUser(userData);
      setLoading(false);
    } catch (error) {
      console.error('AuthProvider: Exception loading profile:', error);
      
      // Retry on exception
      if (retryCount < 3) {
        console.log(`AuthProvider: Exception occurred, retrying in ${(retryCount + 1) * 500}ms...`);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 500));
        return loadUserProfile(userId, retryCount + 1);
      }
      
      Alert.alert(
        'Errore',
        'Si è verificato un errore imprevisto durante il caricamento del profilo. Riprova.',
        [
          {
            text: 'OK',
            onPress: () => {
              supabase.auth.signOut();
            }
          }
        ]
      );
      setLoading(false);
    }
  }, []);

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
  }, [loadUserProfile]);

  const register = async (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    role: UserRole,
    pickupPointId?: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log('AuthProvider: Registering user:', email, role, 'pickup_point_id:', pickupPointId);
      
      // Sign up with Supabase Auth
      // The profile will be created automatically by the database trigger
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

      console.log('AuthProvider: User registered successfully:', authData.user.id);
      console.log('AuthProvider: Profile will be created automatically by database trigger');

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
        console.error('AuthProvider: Login error details:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
        return { success: false, message: error.message };
      }

      if (!data.user) {
        return { success: false, message: 'Errore durante il login' };
      }

      console.log('AuthProvider: User logged in successfully:', data.user.id);
      
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

  const updatePickupPoint = (pickupPointId: string, pickupPointCity: string) => {
    if (user) {
      console.log('AuthProvider: Updating pickup point to:', pickupPointCity);
      setUser({
        ...user,
        pickupPointId,
        pickupPoint: pickupPointCity,
      });
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
        updatePickupPoint,
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
