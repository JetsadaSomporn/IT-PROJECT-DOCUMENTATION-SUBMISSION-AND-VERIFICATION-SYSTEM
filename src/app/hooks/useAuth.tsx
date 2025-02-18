'use client';

import { useSession } from 'next-auth/react';
import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Session } from 'next-auth';

interface UserType {
  id: string;
  email: string;
  name?: string;
  type: string[];
  userType: string[];
}

interface AuthContextType {
  user: UserType | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: session, status } = useSession();
  const router = useRouter();

  console.log('AuthProvider - Session Data:', {
    session,
    status,
    user: session?.user,
    userType: (session?.user as UserType)?.userType,
  });

  useEffect(() => {
    if (status === 'loading') {
      console.log('Session is loading...');
      return;
    }

    if (status === 'authenticated') {
      console.log('Session is authenticated:', session?.user);
    }

    if (status === 'unauthenticated' && window.location.pathname !== '/auth/register') {
      console.log('Session is unauthenticated, redirecting to login');
      router.push('/auth/login');
    }
  }, [status, session, router]);

  const value = {
    user: session?.user
      ? ({
          id: (session.user as any).id || '',
          email: session.user.email || '',
          name: session.user.name || '',
          type: (session.user as any).type || [],
          userType: (session.user as any).userType || [],
        } as UserType)
      : null,
    isLoading: status === 'loading',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
