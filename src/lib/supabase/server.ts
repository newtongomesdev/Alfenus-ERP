import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env, hasSupabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

export async function getSupabaseServerClient() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot set cookies; Server Actions and Route Handlers can.
          }
        },
      },
    },
  );
}
