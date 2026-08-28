import type { SupabaseClient, User } from "@supabase/supabase-js";

declare global {
  namespace Express {
    interface Request {
      auth: {
        accessToken: string;
        user: User;
        supabase: SupabaseClient;
      };
    }
  }
}

export {};
