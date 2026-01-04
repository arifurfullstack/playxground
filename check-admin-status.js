import { createClient } from '@supabase/supabase-js';

const NEW_URL = "https://nrqxadhiruhyttzvysjn.supabase.co";
const NEW_KEY = "sb_publishable_fvijhc_ndsew7i74oEX5sg_RZQPlc-K";

const supabase = createClient(NEW_URL, NEW_KEY);

async function checkAdmin() {
    console.log("🔍 Checking Admin Status for myadmin@gmail.com...");

    // 1. Login
    const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'myadmin@gmail.com',
        password: 'password123' // Assuming default password or whatever user set
    });

    if (loginError) {
        console.log("❌ Login failed:", loginError.message);
        console.log("   (If you used a different password, this script fails to login, but we can still check public visibility)");
    } else {
        console.log("✅ Logged in as:", user.id);

        // 2. Check Role
        const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', user.id);

        if (roleError) {
            console.log("❌ Failed to read user_roles:", roleError.message);
        } else {
            console.log("✅ Role Data:", roleData);
            if (roleData.length === 0) {
                console.log("⚠️  User has NO roles assigned.");
            } else {
                console.log("🎉 User Roles:", roleData.map(r => r.role));
            }
        }
    }
}

checkAdmin();
