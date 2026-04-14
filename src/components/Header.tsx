"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const NAV_LINKS = [
  { href: "/locations/sydney/cabbage-tree-bay", label: "Cabbage Tree Bay" },
  { href: "/locations/sydney/cabbage-tree-bay?tab=species", label: "All Species" },
  { href: "/id", label: "Identify" },
  { href: "/locations/sydney/cabbage-tree-bay/community", label: "Community" },
];

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const loginHref = pathname && pathname !== "/" ? `/login?redirectTo=${encodeURIComponent(pathname)}` : "/login";
  const signupHref = pathname && pathname !== "/" ? `/signup?redirectTo=${encodeURIComponent(pathname)}` : "/signup";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase
          .from("users")
          .select("username")
          .eq("id", user.id)
          .single();
        setUsername(data?.username ?? null);
      }
      setLoading(false);
    }

    loadUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setUsername(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menu on resize
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  const displayName =
    user?.user_metadata?.display_name || user?.email?.split("@")[0];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
        scrolled || menuOpen
          ? "bg-deep/95 backdrop-blur-md shadow-lg shadow-black/10"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          {/* Wave mark */}
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            className="text-teal-400 group-hover:text-teal-300 transition-colors"
          >
            <path
              d="M4 18c2-3 4-5 7-5s5 4 7 4 4-2 6-4"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M4 12c2-3 4-5 7-5s5 4 7 4 4-2 6-4"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.5"
            />
          </svg>
          <span className="font-display text-xl font-semibold text-white tracking-tight">
            Salt Safari
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-white/70 hover:text-white transition-colors text-[15px] tracking-wide"
            >
              {link.label}
            </Link>
          ))}

          {!loading && (
            <>
              <Link
                href="/log"
                className="text-white/70 hover:text-white text-sm transition-colors"
              >
                My Swim Log
              </Link>
              {user ? (
                <div className="flex items-center gap-4">
                  <Link
                    href="/alerts"
                    className="text-white/70 hover:text-white text-sm transition-colors flex items-center gap-1"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    Alerts
                  </Link>
                  <Link
                    href={username ? `/u/${username}` : "/log"}
                    className="text-white/70 hover:text-white text-sm transition-colors"
                  >
                    My Profile
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="text-white/50 hover:text-white text-sm transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    href={loginHref}
                    className="text-white/70 hover:text-white text-sm transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    href={signupHref}
                    className="bg-coral hover:bg-coral-dark text-white px-5 py-2 rounded-full text-sm font-medium transition-colors"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        {/* Mobile alerts + hamburger */}
        <div className="md:hidden flex items-center gap-3">
        <Link
          href="/alerts"
          className="relative w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          aria-label="Alerts"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </Link>
        <button
          className="relative w-8 h-8 flex items-center justify-center"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          <span
            className={`absolute block h-0.5 w-5 bg-white transition-all duration-300 ${
              menuOpen ? "rotate-45" : "-translate-y-1.5"
            }`}
          />
          <span
            className={`absolute block h-0.5 w-5 bg-white transition-all duration-300 ${
              menuOpen ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`absolute block h-0.5 w-5 bg-white transition-all duration-300 ${
              menuOpen ? "-rotate-45" : "translate-y-1.5"
            }`}
          />
        </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          menuOpen ? "max-h-[32rem] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-6 pt-2 pb-8 space-y-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block py-3 text-white/80 hover:text-white text-lg border-b border-white/10 last:border-0"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          {!loading && (
            <>
              <Link
                href="/log"
                className="block py-3 text-white/80 hover:text-white text-lg border-b border-white/10"
                onClick={() => setMenuOpen(false)}
              >
                My Swim Log
              </Link>
              {user ? (
                <>
                  <Link
                    href="/alerts"
                    className="block py-3 text-white/80 hover:text-white text-lg border-b border-white/10"
                    onClick={() => setMenuOpen(false)}
                  >
                    Alerts
                  </Link>
                  <Link
                    href={username ? `/u/${username}` : "/log"}
                    className="block py-3 text-white/80 hover:text-white text-lg border-b border-white/10"
                    onClick={() => setMenuOpen(false)}
                  >
                    My Profile
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left py-3 text-white/80 hover:text-white text-lg"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href={loginHref}
                    className="block py-3 text-white/80 hover:text-white text-lg border-b border-white/10"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    href={signupHref}
                    className="block mt-4 bg-coral hover:bg-coral-dark text-white text-center px-5 py-3 rounded-full font-medium transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign up
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
