import type { ReactNode } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthProvider';
import { LoginScreen } from './LoginScreen';

type Props = {
  children: ReactNode;
};

export function RequireAuth({ children }: Props) {
  const { session, loading } = useAuth();

  if (!isSupabaseConfigured()) {
    return (
      <div className="loading-screen">
        <p>Supabase is not configured.</p>
        <p className="hint">Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <p>Loading…</p>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return children;
}
