
export const MOCK_XCHAT_CREATOR = {
    id: "xc1",
    username: "ChatQueen",
    display_name: "Chat Queen",
    avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
};

export const MOCK_XCHAT_MESSAGES: any[] = [
    { id: "m1", from_handle: "Fan123", created_at: new Date().toISOString(), body: "Hey! Love your content!", lane: "Free", paid_amount_cents: 0, x_chat_answers: [] },
    { id: "m2", from_handle: "BigSpender", created_at: new Date().toISOString(), body: "Can you say hi to me?", lane: "Priority", paid_amount_cents: 5000, x_chat_answers: [{ id: "a1", body: "Hi BigSpender! Thanks for the support! ❤️" }] },
    { id: "m3", from_handle: "Anon", created_at: new Date().toISOString(), body: "Question about your last video...", lane: "Paid", paid_amount_cents: 1000, x_chat_answers: [] },
];
