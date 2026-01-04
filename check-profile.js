import { createClient } from '@supabase/supabase-js';

const NEW_URL = "https://nrqxadhiruhyttzvysjn.supabase.co";
const NEW_KEY = "sb_publishable_fvijhc_ndsew7i74oEX5sg_RZQPlc-K";

const supabase = createClient(NEW_URL, NEW_KEY);

async function checkProfile() {
    console.log("Checking for ANY visible profiles...");

    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .limit(5);

    if (profileError) {
        console.error("Profile fetch failed:", profileError.message);
    } else {
        console.log(`Found ${profiles.length} profiles:`);
        console.log(profiles);
    }
}

checkProfile();
