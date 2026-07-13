import { Link, useNavigate } from "react-router-dom";
import { signOut, useSession } from "../lib/auth-client";

export function Navbar() {
  const { data } = useSession();
  const navigate = useNavigate();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-brand-700">
          <span aria-hidden>✈</span> SkyBook
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
          <Link to="/" className="hover:text-brand-700">
            Search Flights
          </Link>
          {data ? (
            <>
              <Link to="/my-bookings" className="hover:text-brand-700">
                My Bookings
              </Link>
              <span className="hidden text-slate-400 sm:inline">{data.user.email}</span>
              <button
                onClick={async () => {
                  await signOut();
                  navigate("/");
                }}
                className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/sign-in" className="hover:text-brand-700">
                Sign in
              </Link>
              <Link
                to="/sign-up"
                className="rounded-md bg-brand-600 px-3 py-1.5 text-white hover:bg-brand-700"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
