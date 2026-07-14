import {
  createServerClient,
  type CookieOptions,
} from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  const cookieStore = cookies();

  return createServerClient(
    supabaseUrl,
    publishableKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(
          name: string,
          value: string,
          options: CookieOptions,
        ) {
          try {
            cookieStore.set({
              name,
              value,
              ...options,
            });
          } catch {
            // Server Components cannot mutate cookies.
          }
        },
        remove(
          name: string,
          options: CookieOptions,
        ) {
          try {
            cookieStore.set({
              name,
              value: "",
              ...options,
            });
          } catch {
            // Server Components cannot mutate cookies.
          }
        },
      },
    },
  );
}
