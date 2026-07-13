import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { signUp, useSession } from "../lib/auth-client";

export function SignUpPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const { refetch: refetchSession } = useSession();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signUpError } = await signUp.email({ email, password, name });
    if (signUpError) {
      setError(signUpError.message ?? "Sign up failed");
      setSubmitting(false);
      return;
    }
    await refetchSession();
    navigate(redirectTo, { replace: true });
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-center text-2xl font-bold text-slate-900">Create an account</h1>
      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="mb-1 block text-xs font-semibold text-slate-600">Full Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          required
        />
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
          minLength={8}
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
          {submitting ? "Creating account…" : "Sign up"}
        </button>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link to={`/sign-in?redirect=${encodeURIComponent(redirectTo)}`} className="text-brand-600 underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
