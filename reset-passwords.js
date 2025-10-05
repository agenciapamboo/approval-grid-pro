// Script to reset all user passwords to D024m002*
const { createClient } = require('@supabase/supabase-js');

// You'll need to provide these values
const SUPABASE_URL = 'https://sgarwrreywadxsodnxng.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'YOUR_SERVICE_ROLE_KEY'; // You need to get this from Supabase dashboard
const ADMIN_TASK_TOKEN = 'YOUR_ADMIN_TASK_TOKEN'; // You need to set this in Supabase dashboard

async function resetAllPasswords() {
  try {
    console.log('Starting password reset for all users...');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get all users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }

    console.log(`Found ${users.length} users to update`);

    const newPassword = 'D024m002*';
    const results = {
      success: [],
      failed: []
    };

    for (const user of users) {
      try {
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          user.id,
          { password: newPassword }
        );

        if (updateError) {
          console.error(`Failed to update password for ${user.email}:`, updateError);
          results.failed.push({ email: user.email, error: updateError.message });
        } else {
          console.log(`Successfully updated password for ${user.email}`);
          results.success.push(user.email);
        }
      } catch (error) {
        console.error(`Exception updating password for ${user.email}:`, error);
        results.failed.push({ email: user.email, error: error.message });
      }
    }

    console.log('Password reset completed');
    console.log(`Success: ${results.success.length}, Failed: ${results.failed.length}`);
    console.log('Results:', results);

  } catch (error) {
    console.error('Error in password reset:', error);
  }
}

// Call the function
resetAllPasswords();
