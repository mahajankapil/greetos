import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, TOKEN_KEY, apiError } from '../lib/api';
import type { AdminUser } from '../types';

interface AuthState {
  user: AdminUser | null;
  loading: boolean;
  /** Resolves with the signed-in user so the caller can route by role. */
  login: (email: string, password: string) => Promise<AdminUser>;
  logout: () => void;
}

/** Roles that can sign in to this panel. Kept in sync with the API's login route. */
// Creator/partner sign-in was removed from this panel. The creator API and
// its data are untouched in the database — only the admin-side UI is gone.
export const PANEL_ROLES = ['admin'];

/** Where each role lands after signing in, and where stray URLs redirect to. */
export function homePathFor(_role: string | undefined): string {
  return '/products';
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, if a token exists, verify it via /auth/me.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => {
        const u: AdminUser = res.data.user;
        // Only admins sign in here; the panel then shows
        // each of them a different set of pages. Anyone else is not a panel user.
        if (PANEL_ROLES.includes(u.role)) setUser(u);
        else localStorage.removeItem(TOKEN_KEY);
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string): Promise<AdminUser> {
    try {
      const res = await api.post('/auth/admin/login', { email, password });
      localStorage.setItem(TOKEN_KEY, res.data.token);
      const u: AdminUser = res.data.user;
      setUser(u);
      return u;
    } catch (e) {
      throw new Error(apiError(e, 'Login failed'));
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
