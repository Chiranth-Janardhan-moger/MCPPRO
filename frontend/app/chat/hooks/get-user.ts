import { createSupabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Resolve the authenticated Supabase user for the current request.
 * Returns null (never throws) when auth is unconfigured or the session is
 * invalid, so API routes can respond with a clean 401.
 */
export const getUser = async (req?: Request) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        return null;
    }

    // 1. Check Authorization Bearer header if passed
    if (req) {
        try {
            const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
            if (authHeader?.startsWith("Bearer ")) {
                const token = authHeader.slice(7).trim();
                if (token) {
                    const client = createClient(url, anonKey, {
                        auth: { persistSession: false, autoRefreshToken: false },
                    });
                    const {
                        data: { user },
                    } = await client.auth.getUser(token);
                    if (user) return user;
                }
            }
        } catch (bearerErr) {
            console.warn("getUser bearer extraction notice:", bearerErr);
        }
    }

    // 2. Check standard cookies
    try {
        const supabase = await createSupabaseServer();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        return user;
    } catch (error) {
        console.error("getUser failed:", error);
        return null;
    }
};
