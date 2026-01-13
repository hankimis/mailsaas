import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://txxjbzsicazixmcukxzr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4eGpienNpY2F6aXhtY3VreHpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk2MjEyMiwiZXhwIjoyMDgzNTM4MTIyfQ.hQR_9zUO6PvEJUXXlkbaz2rhXc4-hyGM7EG0Hs6X_xU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fix() {
  // Update company to use temp domain
  const { data, error } = await supabase
    .from('companies')
    .update({
      domain: 'mymailtalk.com',
      use_temp_domain: true,
      temp_subdomain: 'mailtalk.mymailtalk.com'
    })
    .eq('id', 'aeb2c13f-ba1d-40c9-8e7e-5c2cdc3c19ea')
    .select();

  console.log('Updated company:', JSON.stringify(data, null, 2));
  if (error) console.log('Error:', error);
}

fix();
