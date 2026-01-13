import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://txxjbzsicazixmcukxzr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4eGpienNpY2F6aXhtY3VreHpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk2MjEyMiwiZXhwIjoyMDgzNTM4MTIyfQ.hQR_9zUO6PvEJUXXlkbaz2rhXc4-hyGM7EG0Hs6X_xU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  // Check user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, company_id, email_account_status')
    .limit(1)
    .single();

  console.log('User:', JSON.stringify(user, null, 2));
  if (userError) console.log('User Error:', userError);

  if (user?.company_id) {
    // Check company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, domain, use_temp_domain, temp_subdomain, cpanel_username')
      .eq('id', user.company_id)
      .single();

    console.log('Company:', JSON.stringify(company, null, 2));
    if (companyError) console.log('Company Error:', companyError);
  }
}

check();
