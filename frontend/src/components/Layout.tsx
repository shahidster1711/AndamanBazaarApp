import { Link, NavLink } from "react-router-dom";
import type { PropsWithChildren } from "react";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-sky-600 text-white"
      : "text-slate-700 hover:bg-sky-50 hover:text-sky-700"
  }`;

export const Layout = ({ children }: PropsWithChildren) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🐚</span>
            <div className="leading-tight">
              <span className="text-lg font-extrabold tracking-tight text-sky-700">
                AndamanBazaar
                <span className="text-sky-400">.in</span>
              </span>
              <p className="hidden text-xs text-slate-400 sm:block">
                Andaman's #1 Water Adventures Marketplace
              </p>
            </div>
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/activities" className={navLinkClass}>
              Activities
            </NavLink>
            <NavLink
              to="/admin/leads"
              className={navLinkClass}
            >
              Admin
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <p className="font-bold text-sky-700">
                AndamanBazaar<span className="text-sky-400">.in</span>
              </p>
              <p className="text-sm text-slate-500">
                Connecting travellers with the best water adventures in the
                Andaman Islands.
              </p>
            </div>
            <p className="text-sm text-slate-400">
              © {new Date().getFullYear()} AndamanBazaar.in · All rights
              reserved
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
