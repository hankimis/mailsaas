import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://txxjbzsicazixmcukxzr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4eGpienNpY2F6aXhtY3VreHpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk2MjEyMiwiZXhwIjoyMDgzNTM4MTIyfQ.hQR_9zUO6PvEJUXXlkbaz2rhXc4-hyGM7EG0Hs6X_xU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fix() {
  // Fix company domain to match WHM's actual domain (mymatiltalk.com - note the typo)
  const { data, error } = await supabase
    .from('companies')
    .update({
      domain: 'mymatiltalk.com',  // WHM에 설정된 실제 도메인
      use_temp_domain: false,
      temp_subdomain: null
    })
    .eq('id', 'aeb2c13f-ba1d-40c9-8e7e-5c2cdc3c19ea')
    .select();

  console.log('Updated company:', JSON.stringify(data, null, 2));
  if (error) console.log('Error:', error);

  // Also update user email if needed
  const { data: userData, error: userError } = await supabase
    .from('users')
    .update({
      email: 'hankim@mymatiltalk.com'  // Update to match the domain
    })
    .eq('id', '3b1b4441-e7e6-4ca2-9c29-1b1e38b338ff')
    .select();

  console.log('\nUpdated user:', JSON.stringify(userData, null, 2));
  if (userError) console.log('User Error:', userError);
}

fix();
