'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAuth, hasRole, isSuperAdmin, isCompanyAdmin } from '@/hooks/use-auth';
import type { SessionUser, UserRole } from '@/types/database';

interface AuthContextType {
  user: ReturnType<typeof useAuth>['user'];
  sessionUser: SessionUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
  isSuperAdmin: () => boolean;
  isCompanyAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  const value: AuthContextType = {
    ...auth,
    hasRole: (roles: UserRole[]) => hasRole(auth.sessionUser, roles),
    isSuperAdmin: () => isSuperAdmin(auth.sessionUser),
    isCompanyAdmin: () => isCompanyAdmin(auth.sessionUser),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
