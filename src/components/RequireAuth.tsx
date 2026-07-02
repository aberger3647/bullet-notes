import type { ReactNode } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { LoginScreen } from './LoginScreen';
import { OutlineLoadingSkeleton } from './OutlineLoadingSkeleton';

type Props = {
  children: ReactNode;
};

export function RequireAuth({ children }: Props) {
  const { session, loading } = useAuth();

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
        <p>Supabase is not configured.</p>
        <p className="text-sm text-muted-foreground">Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild.</p>
      </div>
    );
  }

  if (loading) {
    return <OutlineLoadingSkeleton />;
  }

  if (!session) {
    return <LoginScreen />;
  }

  return children;
}
