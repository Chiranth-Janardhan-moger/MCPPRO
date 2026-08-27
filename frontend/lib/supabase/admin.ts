import { createClient } from "@supabase/supabase-js";

export default function supabaseAdmin() {
	const serviceKey =
		process.env.SUPABASE_SERVICE_ROLE_KEY ||
		process.env.SUPABASE_ADMIN ||
		process.env.SUPABASE_SERVICE_KEY ||
		"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52anR5cGNiZW9jbHJpenNjZ2lrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzI5OTk4OSwiZXhwIjoyMTAyODc1OTg5fQ.eJlJqsdVEI2hiupgoQchmqThayP-_LdluETyXTyWPoE";

	const url =
		process.env.NEXT_PUBLIC_SUPABASE_URL ||
		process.env.SUPABASE_URL ||
		"https://nvjtypcbeoclrizscgik.supabase.co";

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
