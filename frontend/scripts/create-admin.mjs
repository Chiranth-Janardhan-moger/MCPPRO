import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ADMIN ||
  process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('SUPABASE_URL and SERVICE_KEY must be provided via environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  const email = process.argv[2] || process.env.ADMIN_EMAIL || 'chiranth@gmail.com';
  const password = process.argv[3] || process.env.ADMIN_PASSWORD || '123456789';

  console.log(`Checking if user ${email} already exists...`);

  // 1. List users to see if already registered
  const { data: userList, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('Error listing users:', listErr.message);
  }

  const existingUser = userList?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  let userId;

  if (existingUser) {
    console.log(`User found with ID ${existingUser.id}. Updating password and admin metadata...`);
    const { data: updated, error: updateErr } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      {
        password: password,
        email_confirm: true,
        user_metadata: {
          role: 'admin',
          is_admin: true,
          display_name: 'Chiranth (Admin)',
        },
        app_metadata: {
          role: 'admin',
          is_admin: true,
        },
      }
    );

    if (updateErr) {
      console.error('Failed to update user:', updateErr.message);
      process.exit(1);
    }

    userId = updated.user.id;
    console.log('Successfully updated existing user to admin!');
  } else {
    console.log(`Creating new admin user ${email}...`);
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        is_admin: true,
        display_name: 'Chiranth (Admin)',
      },
      app_metadata: {
        role: 'admin',
        is_admin: true,
      },
    });

    if (createErr) {
      console.error('Failed to create user:', createErr.message);
      process.exit(1);
    }

    userId = created.user.id;
    console.log(`Successfully created new user ${email} with ID ${userId}!`);
  }

  // 2. Also register/update in app_system_settings table
  try {
    const { data: currentSettings } = await supabase
      .from('app_system_settings')
      .select('value')
      .eq('key', 'global')
      .maybeSingle();

    const existingEmails = currentSettings?.value?.admin_emails || [];
    const newEmails = Array.from(new Set([...existingEmails, email.toLowerCase()]));

    const updatedValue = {
      ...(currentSettings?.value || {}),
      admin_emails: newEmails,
    };

    await supabase.from('app_system_settings').upsert({
      key: 'global',
      value: updatedValue,
      updated_at: new Date().toISOString(),
      updated_by: 'system_admin_creation',
    });

    console.log('Successfully added to app_system_settings.admin_emails list.');
  } catch (settingsErr) {
    console.warn('Notice updating app_system_settings:', settingsErr.message);
  }

  console.log('\n--- ADMIN ACCOUNT PROVISIONED ---');
  console.log(`Email: ${email}`);
  console.log(`Role: admin`);
  console.log(`Status: Confirmed & Active`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
