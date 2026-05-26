import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiUrl } from '../utils/apiConfig';

const AuthContext = createContext();
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(localStorage.getItem('access_token') || null);
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refresh_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore user from localStorage on mount
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        setAccessToken(token);
        setRefreshToken(localStorage.getItem('refresh_token'));
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error('Error restoring auth state:', err);
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, token, refresh) => {
    setUser(userData);
    setAccessToken(token);
    setRefreshToken(refresh);
    localStorage.setItem('access_token', token);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = async () => {
    // Optional: Call logout endpoint on backend
    try {
      if (accessToken) {
        await fetch(apiUrl('/auth/logout/'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    }

    // Clear local state
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  };

  const value = {
    user,
    accessToken,
    refreshToken,
    loading,
    login,
    logout,
    isAuthenticated: !!accessToken && !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};


