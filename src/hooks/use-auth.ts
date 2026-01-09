'use client';

import { useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { getClient } from '@/lib/supabase/client';
import type { SessionUser, UserRole } from '@/types/database';

interface AuthState {
  user: User | null;
  sessionUser: SessionUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    sessionUser: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const supabase = getClient();

  const fetchSessionUser = useCallback(async (userId: string) => {
    const { data, error } = await (supabase.rpc as Function)(
      'get_user_with_company',
      { user_id: userId }
    );

    if (error || !data || data.length === 0) {
      console.error('Failed to fetch session user:', error);
      return null;
    }

    return data[0] as SessionUser;
  }, [supabase]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const sessionUser = await fetchSessionUser(user.id);
          setState({
            user,
            sessionUser,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          setState({
            user: null,
            sessionUser: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      } catch (error) {
        console.error('Auth init error:', error);
        setState({
          user: null,
          sessionUser: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const sessionUser = await fetchSessionUser(session.user.id);
          setState({
            user: session.user,
            sessionUser,
            isLoading: false,
            isAuthenticated: true,
          });
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            sessionUser: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchSessionUser]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  const refreshUser = useCallback(async () => {
    if (state.user) {
      const sessionUser = await fetchSessionUser(state.user.id);
      setState(prev => ({ ...prev, sessionUser }));
    }
  }, [state.user, fetchSessionUser]);

  return {
    ...state,
    signOut,
    refreshUser,
  };
}

// Role checking utilities
export function hasRole(sessionUser: SessionUser | null, roles: UserRole[]): boolean {
  if (!sessionUser) return false;
  return roles.includes(sessionUser.role);
}

export function isSuperAdmin(sessionUser: SessionUser | null): boolean {
  return hasRole(sessionUser, ['super_admin']);
}

export function isCompanyAdmin(sessionUser: SessionUser | null): boolean {
  return hasRole(sessionUser, ['company_admin', 'super_admin']);
}

export function isEmployee(sessionUser: SessionUser | null): boolean {
  return hasRole(sessionUser, ['employee', 'company_admin', 'super_admin']);
}
