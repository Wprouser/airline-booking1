import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PlaneTakeoff, UserPlus } from "lucide-react";
import { signUp, useSession } from "../lib/auth-client";
import { Card } from "../components/ui/Card";
import { FormField } from "../components/ui/FormField";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";

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
    <div className="mx-auto max-w-sm animate-slide-up">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white dark:bg-brand-500">
          <PlaneTakeoff className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create an account</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Book flights and track your trips</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Full Name" required>
            {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} required autoFocus />}
          </FormField>
          <FormField label="Email" required>
            {(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />}
          </FormField>
          <FormField label="Password" required hint="At least 8 characters">
            {(id) => (
              <Input
                id={id}
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            )}
          </FormField>

          {error && <Alert variant="error">{error}</Alert>}

          <Button type="submit" loading={submitting} className="w-full">
            {!submitting && <UserPlus className="h-4 w-4" />}
            {submitting ? "Creating account…" : "Sign up"}
          </Button>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{" "}
            <Link
              to={`/sign-in?redirect=${encodeURIComponent(redirectTo)}`}
              className="font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              Sign in
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
