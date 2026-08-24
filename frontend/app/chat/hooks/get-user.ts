import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * Resolve the authenticated Supabase user for the current request.
 * Returns null (never throws) when auth is unconfigured or the session is
 * invalid, so API routes can respond with a clean 401.
 */
export const getUser = async () => {
    if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
        return null;
    }

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
