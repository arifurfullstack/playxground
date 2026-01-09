
export const MOCK_CONFESSIONS_CREATOR = {
    id: "mc1",
    username: "SecretKeeper",
    display_name: "The Secret Keeper",
    avatar_url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150"
};

export const MOCK_CONFESSIONS: any[] = [
    { id: "c1", creator_id: "mc1", tier: "Soft", type: "Text", title: "My First Crush", preview_text: "I never told anyone this...", content_url: "It was my teacher!", price: 5, status: "active" },
    { id: "c2", creator_id: "mc1", tier: "Spicy", type: "Voice", title: "Midnight Thoughts", preview_text: "Listen to what I do when alone...", content_url: null, price: 10, status: "active" },
    { id: "c3", creator_id: "mc1", tier: "Forbidden", type: "Video", title: "The Forbidden Tape", preview_text: "You shouldn't watch this.", content_url: null, price: 50, status: "active" },
];
