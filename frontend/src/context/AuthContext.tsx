'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { fetchMe, type AuthUser } from '@/lib/authApi';

/**
 * Who is signed in.
 *
 * The token is kept in localStorage rather than a cookie because the API is a
 * separate origin and every call already sends an Authorization header. On
 * mount the token is re-checked against /auth/me: a stored token proves
 * nothing on its own — it may be expired, or the account may have been
 * deactivated — so the user object always comes from the server.
 */

const TOKEN_KEY = 'rovique_token';
/**
 * The last user the server confirmed for this token.
 *
 * Cached so a reload can show the session immediately instead of blanking it
 * while /auth/me is in flight, and so a customer stays signed in when the API
 * is unreachable. It is a convenience copy, never the source of truth — every
 * load still asks the server, and a rejection clears both.
 */
const USER_KEY = 'rovique_user';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  /** True until the stored token has been checked, so the UI can avoid flashing "Sign up". */
  loading: boolean;
  signIn: (token: string, user: AuthUser) => void;
  signOut: () => void;
  setUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const read = (k: string) => {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    };
    const stored = read(TOKEN_KEY);

    if (!stored) {
      setLoading(false);
      return;
    }

    // Show the cached session straight away. The server is still asked below;
    // this only decides what is on screen for the second it takes to answer.
    const cachedRaw = read(USER_KEY);
    if (cachedRaw) {
      try {
        setToken(stored);
        setUserState(JSON.parse(cachedRaw) as AuthUser);
      } catch {
        /* corrupt cache — the fetch below settles it */
      }
    }

    fetchMe(stored).then((res) => {
      if (cancelled) return;
      if (res.status === 'ok') {
        setToken(stored);
        setUserState(res.user);
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        } catch {
          /* storage unavailable; the session still works for this tab */
        }
      } else if (res.status === 'rejected') {
        // The server actively refused it — expired, revoked, or the account was
        // deactivated. Clear it rather than leave a token that will fail on the
        // customer's next request.
        try {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        } catch {
          /* storage unavailable; nothing to clean up */
        }
        setToken(null);
        setUserState(null);
      } else {
        // Could not reach the API. The token is probably fine, so keep it AND
        // the cached user: signing someone out because the backend restarted is
        // the bug this branch exists to prevent. A genuinely dead token is
        // cleared on the next load that does get an answer.
        setToken(stored);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback((newToken: string, newUser: AuthUser) => {
    try {
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    } catch {
      /* private mode — the session still works for this tab */
    }
    setToken(newToken);
    setUserState(newUser);
  }, []);

  /** Updates the user and keeps the cached copy in step. */
  const persistUser = useCallback((next: AuthUser) => {
    setUserState(next);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const signOut = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      /* nothing to clean up */
    }
    setToken(null);
    setUserState(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signOut, setUser: persistUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
