import { createClient } from '@supabase/supabase-js';

const NEW_URL = "https://nrqxadhiruhyttzvysjn.supabase.co";
const NEW_KEY = "sb_publishable_fvijhc_ndsew7i74oEX5sg_RZQPlc-K";

const supabase = createClient(NEW_URL, NEW_KEY);

async function checkRooms() {
    console.log("🔍 Checking 'td_rooms'...");

    // Check td_rooms
    const { data: rooms, error } = await supabase
        .from('td_rooms')
        .select('*');

    if (error) {
        console.log("❌ Error fetching td_rooms:", error.message);
    } else {
        console.log(`✅ Found ${rooms.length} rooms in td_rooms:`);
        console.log(rooms);
    }

    // Also check game_rooms just in case
    console.log("\n🔍 Checking 'game_rooms'...");
    const { data: games, error: gameError } = await supabase
        .from('game_rooms')
        .select('*');

    if (gameError) {
        console.log("❌ Error fetching game_rooms:", gameError.message);
    } else {
        console.log(`✅ Found ${games.length} rooms in game_rooms:`);
        console.log(games);
    }
}

checkRooms();
