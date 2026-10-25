import { createClient } from "@supabase/supabase-js";

export default function supabaseAdmin() {
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ADMIN ||
    process.env.SUPABASE_SERVICE_KEY;

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  if (!serviceKey || !url) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL must be configured in environment variables."
    );
  }

  return createClient(
    url,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
