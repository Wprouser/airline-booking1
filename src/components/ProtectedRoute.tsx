import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "../lib/auth-client";
import { Spinner } from "./ui/Spinner";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { data, isPending } = useSession();
  const location = useLocation();

  // Wait for the session check, don't flash a redirect.
  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6 text-brand-500" />
      </div>
    );
  }
  if (!data) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/sign-in?redirect=${redirect}`} replace />;
  }
  return <>{children}</>;
}
