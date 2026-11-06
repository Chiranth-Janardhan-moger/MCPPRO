import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowser() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
	if (!browserClient && url && anonKey) {
		browserClient = createBrowserClient(url, anonKey);
	}
	return browserClient || createBrowserClient(url || "https://placeholder.supabase.co", anonKey || "placeholder-anon-key");
}
