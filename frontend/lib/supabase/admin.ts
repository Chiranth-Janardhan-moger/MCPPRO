import { createClient } from "@supabase/supabase-js";

export default function supabaseAdmin() {
	const serviceKey =
		process.env.SUPABASE_SERVICE_ROLE_KEY ||
		process.env.SUPABASE_ADMIN ||
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

	return createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		serviceKey,
		{
			auth: {
				autoRefreshToken: false,
				persistSession: false,
			},
		}
	);
}
