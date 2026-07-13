import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { signIn, useSession } from "../lib/auth-client";

export function SignInPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const { refetch: refetchSession } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await signIn.email({ email, password });
    if (signInError) {
      setError(signInError.message ?? "Sign in failed");
      setSubmitting(false);
      return;
    }
    // signIn.email() resolves before Better Auth's shared session store updates. Force a
    // refetch before navigating so a route guard reading the session right after doesn't
    // still see "signed out" and bounce back to sign-in.
    await refetchSession();
    navigate(redirectTo, { replace: true });
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-center text-2xl font-bold text-slate-900">Sign in</h1>
      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="mb-1 block text-xs font-semibold text-slate-600">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          required
        />
        <label className="mb-1 block text-xs font-semibold text-slate-600">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          required
        />
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
        <p className="mt-4 text-center text-sm text-slate-500">
          No account?{" "}
          <Link to={`/sign-up?redirect=${encodeURIComponent(redirectTo)}`} className="text-brand-600 underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
