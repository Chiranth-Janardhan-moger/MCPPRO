import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of readFileSync(new URL('../../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_ADMIN, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = 'demo@mcppro.local';
const password = 'Demo1234!';

// Idempotent: create or update password + confirm.
const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
const existing = list?.users?.find((u) => u.email === email);

if (existing) {
  const { error } = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
  });
  if (error) throw error;
  console.log('demo user updated + confirmed:', existing.id);
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Demo User' },
  });
  if (error) throw error;
  console.log('demo user created + confirmed:', data.user.id);
}
console.log(`login -> ${email} / ${password}`);
