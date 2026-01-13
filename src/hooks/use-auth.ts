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

  const fetchSessionUser = useCallback(async (userId: string): Promise<SessionUser | null> => {
    console.log('fetchSessionUser called with userId:', userId);

    try {
      const { data, error } = await (supabase.rpc as Function)(
        'get_user_with_company',
        { user_id: userId }
      );

      console.log('RPC get_user_with_company result:', { data, error });

      if (error) {
        console.error('Failed to fetch session user:', error);
        return null;
      }

      if (!data || data.length === 0) {
        console.error('No session user data returned for userId:', userId);
        return null;
      }

      console.log('Session user fetched:', data[0]);
      return data[0] as SessionUser;
    } catch (error) {
      console.error('fetchSessionUser error:', error);
      return null;
    }
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;

    const loadSessionUser = async (userId: string) => {
      try {
        const sessionUser = await fetchSessionUser(userId);
        if (!isMounted) return;

        setState(prev => ({
          ...prev,
          sessionUser,
          isLoading: false,
        }));
      } catch (error) {
        console.error('Load session user error:', error);
        if (!isMounted) return;
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    // onAuthStateChange를 먼저 등록하고, 초기 세션 확인
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);

        if (!isMounted) return;

        if (event === 'INITIAL_SESSION') {
          // 초기 세션 로드
          if (session?.user) {
            setState(prev => ({
              ...prev,
              user: session.user,
              isAuthenticated: true,
            }));
            loadSessionUser(session.user.id);
          } else {
            setState({
              user: null,
              sessionUser: null,
              isLoading: false,
              isAuthenticated: false,
            });
          }
        } else if (event === 'SIGNED_IN' && session?.user) {
          setState(prev => ({
            ...prev,
            user: session.user,
            isAuthenticated: true,
          }));
          loadSessionUser(session.user.id);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setState(prev => ({
            ...prev,
            user: session.user,
            isAuthenticated: true,
          }));
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
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchSessionUser]);

  const signOut = useCallback(async () => {
    try {
      // 상태 먼저 초기화
      setState({
        user: null,
        sessionUser: null,
        isLoading: false,
        isAuthenticated: false,
      });
      // 그 다음 Supabase 로그아웃
      await supabase.auth.signOut();
      // 로그인 페이지로 리다이렉트
      window.location.href = '/login';
    } catch (error) {
      console.error('Sign out error:', error);
    }
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
