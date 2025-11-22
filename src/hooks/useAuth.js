'use client';

import { useState, useEffect } from 'react';

function decodeJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const cookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('mylogintoken='));

      if (!cookie) {
        setUser(null);
        setLoading(false);
        return;
      }

      const tokenData = JSON.parse(decodeURIComponent(cookie.split('=')[1]));
      const decodedToken = decodeJWT(tokenData.token);

      setUser({
        token: tokenData.token,
        role: tokenData.role,
        email: decodedToken?.email,
        id: decodedToken?.id,
        name: decodedToken?.name,
      });
    } catch (error) {
      console.error('Error parsing auth cookie:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    isManager: user?.role === 'manager',
    isStaff: user?.role === 'staff',
    isAuthenticated: !!user,
  };
}
