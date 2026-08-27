const { createClient } = require('@supabase/supabase-js');
const url = 'https://nvjtypcbeoclrizscgik.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52anR5cGNiZW9jbHJpenNjZ2lrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzI5OTk4OSwiZXhwIjoyMTAyODc1OTg5fQ.eJlJqsdVEI2hiupgoQchmqThayP-_LdluETyXTyWPoE';

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const accounts = [
    { email: 'chiranth@gmail.com', role: 'admin', isAdmin: true },
    { email: 'chiranthmoger7@gmail.com', role: 'admin', isAdmin: true },
    { email: 'demo@mcppro.com', role: 'user', isAdmin: false },
    { email: 'user@mcppro.com', role: 'user', isAdmin: false },
  ];

  for (const acc of accounts) {
    const { data: userList } = await supabase.auth.admin.listUsers();
    const existing = userList?.users?.find(u => u.email?.toLowerCase() === acc.email.toLowerCase());
    
    if (existing) {
      await supabase.auth.admin.updateUserById(existing.id, {
        password: '123456789',
        email_confirm: true,
        user_metadata: { role: acc.role, is_admin: acc.isAdmin, display_name: acc.email.split('@')[0] },
        app_metadata: { role: acc.role, is_admin: acc.isAdmin }
      });
      console.log(`Updated existing user: ${acc.email} (Role: ${acc.role})`);
    } else {
      await supabase.auth.admin.createUser({
        email: acc.email,
        password: '123456789',
        email_confirm: true,
        user_metadata: { role: acc.role, is_admin: acc.isAdmin, display_name: acc.email.split('@')[0] },
        app_metadata: { role: acc.role, is_admin: acc.isAdmin }
      });
      console.log(`Created new user: ${acc.email} (Role: ${acc.role})`);
    }
  }
}
run();