// app/admin/_hooks/useAuth.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { checkAuth, logoutAdmin } from '@/app/actions/auth';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const verifyAuth = useCallback(async () => {
    try {
      const result = await checkAuth();
      setIsAuthenticated(result.authenticated);
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutAdmin();
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  useEffect(() => {
    verifyAuth();
  }, [verifyAuth]);

  return { isAuthenticated, isLoading, login: verifyAuth, logout };
}
