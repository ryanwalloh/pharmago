import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  hasCompletedOnboarding?: boolean;
  customer_id?: number;
  id?: number;
  user_id?: number;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  hasCompletedOnboarding: boolean;
  login: (userData: User) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on app start
  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error checking login status:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (userData: User) => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Error saving user data:', error);
      throw error;
    }
  };

  const completeOnboarding = async () => {
    try {
      if (user) {
        const updatedUser = { ...user, hasCompletedOnboarding: true };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Error updating onboarding status:', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      console.error('Error removing user data:', error);
    }
  };

  const value = {
    user,
    isLoggedIn: !!user,
    hasCompletedOnboarding: user?.hasCompletedOnboarding || false,
    login,
    completeOnboarding,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
