import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "../lib/auth-client";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { data, isPending } = useSession();
  const location = useLocation();

  if (isPending) return null; // wait for the session check, don't flash a redirect
  if (!data) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/sign-in?redirect=${redirect}`} replace />;
  }
  return <>{children}</>;
}
