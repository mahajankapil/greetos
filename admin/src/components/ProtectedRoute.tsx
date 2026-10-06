import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth, homePathFor } from '../context/AuthContext';

/**
 * Gates a route to a set of roles (admins only unless told otherwise).
 *
 * A signed-in user hitting a page their role can't see is sent to their own
 * home rather than to /login — bouncing a logged-in partner to the sign-in
 * screen would read as "your session broke".
 */
export default function ProtectedRoute({
  children,
  roles = ['admin'],
}: {
  children: ReactNode;
  roles?: string[];
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[#2a2a2a]">Loading…</div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to={homePathFor(user.role)} replace />;
  }
  return <>{children}</>;
}
