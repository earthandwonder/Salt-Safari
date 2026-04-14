"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type NavItem = {
  label: string;
  href: string;
  matchPaths: string[];
  icon: (active: boolean) => React.ReactNode;
};

export default function BottomNav() {
  const pathname = usePathname();
  const [username, setUsername] = useState<string | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("users")
          .select("username")
          .eq("id", user.id)
          .single();
        setUsername(data?.username ?? null);
      }
      setAuthLoaded(true);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUsername(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Hide on login/signup pages
  if (pathname?.startsWith("/login") || pathname?.startsWith("/signup")) {
    return null;
  }

  // Don't link to login until we've confirmed the user isn't signed in
  const profileHref = username
    ? `/u/${username}`
    : authLoaded
      ? "/login?redirectTo=%2Fu"
      : "#";

  const navItems: NavItem[] = [
    {
      label: "All Species",
      href: "/locations/sydney/cabbage-tree-bay?tab=species",
      matchPaths: ["/species"],
      icon: (active) => (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill={active ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={active ? 0 : 1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 12c0-4-3-7-7.5-7C6 5 3 8.5 3 12s3 7 7.5 7c4.5 0 7.5-3 7.5-7z" />
          <path d="M18 12l4-4v8l-4-4z" />
          <circle cx="7.5" cy="11" r="1" fill={active ? "#062133" : "currentColor"} stroke="none" />
        </svg>
      ),
    },
    {
      label: "ID Tool",
      href: "/id?location=cabbage-tree-bay",
      matchPaths: ["/id"],
      icon: (active) => (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
    },
    {
      label: "Spot",
      href: "/locations/sydney/cabbage-tree-bay?tab=spotted",
      matchPaths: ["/spotted"],
      icon: () => (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      ),
    },
    {
      label: "Swims",
      href: "/log",
      matchPaths: ["/log", "/swims"],
      icon: (active) => (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.8}
          strokeLinecap="round"
        >
          <path d="M2 10c2-2.5 4-4 7-4s5 3 7 3 4-1.5 6-3" />
          <path d="M2 16c2-2.5 4-4 7-4s5 3 7 3 4-1.5 6-3" opacity={active ? 1 : 0.5} />
        </svg>
      ),
    },
    {
      label: "Profile",
      href: profileHref,
      matchPaths: ["/u/"],
      icon: (active) => (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill={active ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={active ? 0 : 1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="9" r="4" stroke="currentColor" strokeWidth={active ? 0 : 1.8} />
          <path
            d="M4 20c0-4 3.5-6 8-6s8 2 8 6"
            stroke="currentColor"
            strokeWidth={active ? 0 : 1.8}
          />
        </svg>
      ),
    },
  ];

  function isActive(item: NavItem): boolean {
    if (!pathname) return false;
    if (item.href === "/" && pathname === "/") return true;
    if (item.href === "/") return false;
    return item.matchPaths.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[100] md:hidden bg-deep/90 backdrop-blur-xl border-t border-white/[0.06]"
    >
      {/* Subtle top edge glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-400/20 to-transparent" />

      <div>
        <div className="flex items-end justify-around px-2 h-16">
          {navItems.map((item) => {
            const active = isActive(item);
            const isLogButton = item.label === "Spot";

            if (isLogButton) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex flex-col items-center justify-center -mt-4 group"
                >
                  <div className="relative">
                    {/* Glow behind FAB */}
                    <div className="absolute inset-0 rounded-full bg-coral/30 blur-lg scale-125" />
                    <div className="relative w-12 h-12 rounded-full bg-coral flex items-center justify-center shadow-lg shadow-coral/25 group-active:scale-95 transition-transform">
                      <span className="text-white">{item.icon(false)}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-white/50 mt-1">
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex flex-col items-center justify-center w-16 h-full group"
              >
                <span
                  className={`transition-colors duration-200 ${
                    active ? "text-coral" : "text-white/50 group-active:text-white/70"
                  }`}
                >
                  {item.icon(active)}
                </span>
                <span
                  className={`text-[10px] font-medium mt-1 transition-colors duration-200 ${
                    active ? "text-coral" : "text-white/40"
                  }`}
                >
                  {item.label}
                </span>

                {/* Active indicator dot */}
                {active && (
                  <div className="w-1 h-1 rounded-full bg-coral mt-0.5" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
      {/* Safe area spacer — background extends behind this */}
      <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
    </nav>
  );
}
