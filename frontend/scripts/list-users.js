const { createClient } = require('@supabase/supabase-js');
const url = 'https://nvjtypcbeoclrizscgik.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52anR5cGNiZW9jbHJpenNjZ2lrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzI5OTk4OSwiZXhwIjoyMTAyODc1OTg5fQ.eJlJqsdVEI2hiupgoQchmqThayP-_LdluETyXTyWPoE';

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  console.log('Total users:', data.users.length);
  for (const u of data.users) {
    console.log(`Email: ${u.email} | ID: ${u.id} | Confirmed: ${!!u.email_confirmed_at}`);
  }
}
run();