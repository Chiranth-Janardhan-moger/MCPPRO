import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('Supabase URL and Anon Key must be provided.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function test() {
  const email = process.argv[2] || 'chiranth@gmail.com';
  const password = process.argv[3] || '123456789';

  console.log(`Testing authentication for ${email}...`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Authentication test failed:', error.message);
    process.exit(1);
  }

  console.log('Authentication SUCCESSFUL');
  console.log('User ID:', data.user.id);
  console.log('Email:', data.user.email);
}

test().catch(console.error);
