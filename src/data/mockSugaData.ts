
export const MOCK_CREATORS_SUGA: any[] = [
    { id: "1", username: "NovaHeat", display_name: "Nova Heat", avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", is_verified: true, subscription_price: 9.99 },
    { id: "2", username: "LexiVibe", display_name: "Lexi Vibe", avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150", is_verified: true, subscription_price: 14.99 },
];

export const MOCK_REQUESTS: any[] = [
    { id: "r1", message: "Say my name?", tip_amount: 5, status: "completed", response: "Video sent!", created_at: new Date().toISOString() },
    { id: "r2", message: "Special dance?", tip_amount: 20, status: "pending", response: null, created_at: new Date().toISOString() },
];
