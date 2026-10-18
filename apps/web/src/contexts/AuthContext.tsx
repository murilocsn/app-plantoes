import type { Session, User, UserAttributes } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { ProfilePassword } from "../lib/profile";
import { signupLegalMetadata, type SignupAcknowledgment } from "../lib/legal";

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, acknowledgment: SignupAcknowledgment) => Promise<void>;
  signOut: () => Promise<void>;
  updateName: (fullName: string) => Promise<void>;
  changeEmail: (email: string) => Promise<boolean>;
  changePassword: (input: ProfilePassword) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function updateAccount(attributes: UserAttributes, emailRedirectTo?: string) {
  const { data, error } = await supabase.auth.updateUser(
    attributes,
    emailRedirectTo ? { emailRedirectTo } : undefined,
  );
  if (error) throw error;
  if (!data.user) throw new Error("Account update failed.");
  return data.user;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (mounted) {
          const nextSession = error ? null : data.session;

          if (!nextSession) {
            queryClient.clear();
          }

          setSession(nextSession);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) {
        queryClient.clear();
      }

      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          throw error;
        }
      },
      async signUp(email, password, fullName, acknowledgment) {
        // Validate before contacting Auth. User-editable metadata is not authorization
        // or a protected audit record; see docs/07-privacidade-lgpd/aceite-cadastro.md.
        const legalMetadata = signupLegalMetadata(acknowledgment);
        const { profileNameSchema } = await import("../lib/profile");
        const input = profileNameSchema.safeParse({ fullName });
        if (!input.success) throw Object.assign(new Error("Invalid signup name."), { code: "signup_name_invalid" });
        const data = { full_name: input.data.fullName, ...legalMetadata };
        const { error } = await supabase.auth.signUp({ email, password, options: { data } });

        if (error) {
          throw error;
        }
      },
      async signOut() {
        const { error } = await supabase.auth.signOut();

        if (error) {
          throw error;
        }
      },
      async updateName(fullName) {
        const { profileNameSchema } = await import("../lib/profile");
        const input = profileNameSchema.parse({ fullName });
        await updateAccount({ data: { full_name: input.fullName } });
      },
      async changeEmail(email) {
        const { profileEmailSchema } = await import("../lib/profile");
        const input = profileEmailSchema.parse({ email });
        const redirect = new URL(import.meta.env.BASE_URL, window.location.origin).href;
        const updated = await updateAccount({ email: input.email }, redirect);
        return updated.email?.toLowerCase() !== input.email.toLowerCase();
      },
      async changePassword(values) {
        const { profilePasswordSchema } = await import("../lib/profile");
        const input = profilePasswordSchema.parse(values);
        const email = session?.user.email;
        if (!email) throw Object.assign(new Error("Session required."), { code: "session_not_found" });

        // Verify the current password even if the provider's optional requirement is disabled.
        // Reuse the existing client so its normal session events and storage remain consistent.
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: input.currentPassword,
        });
        if (error) throw error;
        if (data.user?.id !== session.user.id) {
          await supabase.auth.signOut({ scope: "local" });
          throw new Error("Account verification failed.");
        }
        await updateAccount({ password: input.password, current_password: input.currentPassword });
      },
    }),
    [loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth precisa ser usado dentro de AuthProvider.");
  }

  return context;
}
