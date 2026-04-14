"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  username: string | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  username: null,
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        setLoading(false);
        // Fetch username in background — don't block loading state
        if (user) {
          try {
            const { data } = await supabase
              .from("users")
              .select("username")
              .eq("id", user.id)
              .single();
            setUsername(data?.username ?? null);
          } catch {
            // users table may not exist yet
          }
        }
      } catch {
        setLoading(false);
      }
    }

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const newUser = session?.user ?? null;
        setUser(newUser);
        setLoading(false);
        if (newUser) {
          try {
            const { data } = await supabase
              .from("users")
              .select("username")
              .eq("id", newUser.id)
              .single();
            setUsername(data?.username ?? null);
          } catch {
            // users table may not exist yet
          }
        } else {
          setUsername(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, username, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
