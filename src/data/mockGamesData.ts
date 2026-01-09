
export const MOCK_GAME_ROOMS: any[] = [
    { id: "g1", creator_id: "c1", status: "waiting", card_price: 10, creator: { username: "NeonQueen", avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" } },
    { id: "g2", creator_id: "c2", status: "waiting", card_price: 25, creator: { username: "VibeMaster", avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150" } },
    { id: "g3", creator_id: "c3", status: "waiting", card_price: 5, creator: { username: "ChillGamer", avatar_url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150" } },
];

export const MOCK_LEADERBOARD: any[] = [
    { user_id: "u1", username: "BigSpender", avatar_url: null, total_earnings: 500, games_played: 12 },
    { user_id: "u2", username: "LuckyStrike", avatar_url: null, total_earnings: 340, games_played: 8 },
    { user_id: "u3", username: "DareDevil", avatar_url: null, total_earnings: 150, games_played: 25 },
];
