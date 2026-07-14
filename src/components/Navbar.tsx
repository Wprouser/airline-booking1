import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, PlaneTakeoff, X } from "lucide-react";
import { signOut, useSession } from "../lib/auth-client";
import { ThemeToggle } from "./ui/ThemeToggle";
import { Button } from "./ui/Button";
import { cn } from "../lib/cn";

function navLinkClasses({ isActive }: { isActive: boolean }) {
  return cn(
    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
  );
}

export function Navbar() {
  const { data } = useSession();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    setMenuOpen(false);
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          to="/"
          onClick={() => setMenuOpen(false)}
          className="flex items-center gap-2 text-lg font-bold text-brand-700 dark:text-brand-400"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white dark:bg-brand-500">
            <PlaneTakeoff className="h-4 w-4" aria-hidden="true" />
          </span>
          SkyBook
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <NavLink to="/" end className={navLinkClasses}>
            Search Flights
          </NavLink>
          {data && (
            <NavLink to="/my-bookings" className={navLinkClasses}>
              My Bookings
            </NavLink>
          )}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          <ThemeToggle />
          {data ? (
            <>
              <span className="max-w-[12rem] truncate text-sm text-slate-500 dark:text-slate-400">{data.user.email}</span>
              <Button variant="secondary" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <NavLink to="/sign-in" className={navLinkClasses}>
                Sign in
              </NavLink>
              <Link to="/sign-up">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 sm:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="animate-slide-up border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 sm:hidden">
          <div className="flex flex-col gap-1">
            <NavLink to="/" end className={navLinkClasses} onClick={() => setMenuOpen(false)}>
              Search Flights
            </NavLink>
            {data && (
              <NavLink to="/my-bookings" className={navLinkClasses} onClick={() => setMenuOpen(false)}>
                My Bookings
              </NavLink>
            )}
            {data ? (
              <>
                <span className="px-3 py-1 text-xs text-slate-400 dark:text-slate-500">{data.user.email}</span>
                <Button variant="secondary" size="sm" className="mx-3" onClick={handleSignOut}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <NavLink to="/sign-in" className={navLinkClasses} onClick={() => setMenuOpen(false)}>
                  Sign in
                </NavLink>
                <Link to="/sign-up" onClick={() => setMenuOpen(false)} className="px-3 py-1">
                  <Button size="sm" className="w-full">
                    Sign up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
