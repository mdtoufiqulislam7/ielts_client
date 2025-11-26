'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCookie, hasCookie } from '@/utils/cookies';

interface User {
  id: string;
  email: string;
  username: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  setAuth: (user: User | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user is authenticated on mount
    const accessToken = getCookie('accessToken');
    const userStr = getCookie('user');
    
    if (accessToken && userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  const setAuth = (userData: User | null) => {
    setUser(userData);
    setIsAuthenticated(userData !== null);
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    // Cookies will be deleted by the logout handler
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, setAuth, logout }}>
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

