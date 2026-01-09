import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Sparkles, MessageCircle, DollarSign, Users, Music, Coffee, GlassWater, Beer, Zap, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";


/**
 * Bar Lounge Room
 * ----------------------------------
 * A social, multi-fan interactive room.
 * Key features:
 *  - Public Chat (Real-time via Supabase)
 *  - Virtual Drinks / Gifting (Transactions)
 *  - Mock Presence (Simulated crowds)
 */

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function NeonCard({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cx(
                "rounded-2xl border border-purple-500/25 bg-black overflow-hidden",
                "shadow-[0_0_22px_rgba(168,85,247,0.14),0_0_52px_rgba(59,130,246,0.08)]",
                className
            )}
        >
            {children}
        </div>
    );
}

export default function BarLoungeRoom() {
    const { creatorId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    // Use System Settings for Demo Mode

    const [msg, setMsg] = useState("");
    const [messages, setMessages] = useState<any[]>([]);
    const [creator, setCreator] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [onlineCount, setOnlineCount] = useState(Math.floor(Math.random() * 50) + 12);
    const [sending, setSending] = useState(false);

    // Mock Online Users Data
    const MOCK_FAN_NAMES = [
        "cool_cat_99", "pixel_pioneer", "cyber_ninja", "neon_dreamer", "vibex_fan",
        "crypto_king", "music_lover", "design_guru", "code_wizard", "sky_walker",
        "ocean_breeze", "city_lights", "midnight_rider", "solar_flare", "lunar_eclipse"
    ];

    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

    // Drink Menu Data
    const DRINK_MENU = [
        { id: 'coffee', name: 'Coffee', price: 5, icon: Coffee, color: 'text-amber-600' },
        { id: 'tequila', name: 'Tequila', price: 10, icon: GlassWater, color: 'text-cyan-400' },
        { id: 'beer', name: 'Craft Beer', price: 15, icon: Beer, color: 'text-yellow-500' },
        { id: 'champagne', name: 'Champagne', price: 50, icon: GlassWater, color: 'text-pink-400' },
        { id: 'shots', name: 'Tequila Shots', price: 35, icon: GlassWater, color: 'text-emerald-400' },
    ];

    // Derived Room ID for the Bar Lounge
    const roomId = `bar_lounge_${creatorId}`;

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Initial Mock Users Setup
    useEffect(() => {
        const initialUsers = Array.from({ length: 12 }).map((_, i) => ({
            id: `user-${i}`,
            username: MOCK_FAN_NAMES[i % MOCK_FAN_NAMES.length] + (i > 10 ? `_${i}` : ''),
            avatar_seed: `User${i}`,
            status: 'Active'
        }));
        setOnlineUsers(initialUsers);
    }, []);

    useEffect(() => {
        if (!creatorId) return;



        fetchData();

        // Subscribe to real-time chat updates
        const channel = supabase
            .channel(`bar_lounge_${creatorId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'x_chat_messages',
                    filter: `room_id=eq.${roomId}`
                },
                (payload) => {
                    const newMsg = payload.new;
                    setMessages((prev) => [newMsg, ...prev]);
                }
            )
            .subscribe();

        // Simulate presence fluctuation (Dynamic Online Users)
        const presenceInterval = setInterval(() => {
            setOnlineUsers(prev => {
                const shouldAdd = Math.random() > 0.5;
                if (shouldAdd && prev.length < 25) {
                    const newId = Date.now();
                    const randomName = MOCK_FAN_NAMES[Math.floor(Math.random() * MOCK_FAN_NAMES.length)];
                    return [{
                        id: `user-${newId}`,
                        username: `${randomName}_${Math.floor(Math.random() * 100)}`,
                        avatar_seed: `User${newId}`,
                        status: 'Just Joined'
                    }, ...prev];
                } else if (!shouldAdd && prev.length > 5) {
                    // Remove a random user
                    const indexToRemove = Math.floor(Math.random() * prev.length);
                    return prev.filter((_, i) => i !== indexToRemove);
                }
                return prev;
            });

            // Sync count
            setOnlineCount(prev => onlineUsers.length);
        }, 4000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(presenceInterval);
        };
    }, [creatorId, roomId]);

    // Mock Data for Fallback
    const MOCK_CREATOR = {
        id: 'mc1',
        display_name: 'Mock Creator 1',
        username: 'mock_creator',
        avatar_url: 'https://api.dicebear.com/7/x/svg?seed=Felix',
    };

    const MOCK_MESSAGES = [
        { id: '1', from_handle: 'Fan123', body: 'This lounge is awesome!', created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
        { id: '2', from_handle: 'CoolCat', body: 'Anyone want to play Truth or Dare?', created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString() },
    ];

    const fetchData = async () => {
        try {
            // Fetch Creator Profile
            const { data: creatorData, error: creatorError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', creatorId)
                .single();

            if (creatorError || !creatorData) {
                console.warn("Using Mock Creator due to fetch error:", creatorError);
                setCreator(MOCK_CREATOR);
            } else {
                setCreator(creatorData);
            }

            // Fetch Recent Messages
            const { data: msgs, error: msgError } = await supabase
                .from('x_chat_messages')
                .select('*')
                .eq('room_id', roomId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (msgError) {
                console.warn("Using Mock Messages due to fetch error:", msgError);
                setMessages(MOCK_MESSAGES);
            } else {
                setMessages(msgs || []);
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching lounge data:", error);
            setCreator(MOCK_CREATOR);
            setMessages(MOCK_MESSAGES);
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!msg.trim()) return;

        // Mock User if not logged in (for demo)
        const effectiveUser = user || { id: 'anon', email: 'guest@example.com' };



        setSending(true);

        try {
            const { error } = await supabase
                .from('x_chat_messages')
                .insert({
                    room_id: roomId,
                    from_user_id: effectiveUser.id,
                    from_handle: effectiveUser.email?.split('@')[0] || 'Guest',
                    lane: 'Free',
                    body: msg.trim(),
                    status: 'Live'
                });

            if (error) throw error;

            setMsg("");
        } catch (error) {
            console.error("Supabase send failed:", error);
            toast.error("Failed to send message. Please try again.");
        } finally {
            setSending(false);
        }
    };



    const sendGift = async (item: string, price: number) => {
        // Optimistic Toast
        toast.promise(
            async () => {
                const effectiveUser = user || { id: 'anon' };
                if (creatorId) {
                    const { error } = await supabase
                        .from('transactions')
                        .insert({
                            amount: price,
                            receiver_id: creatorId,
                            sender_id: effectiveUser.id,
                            type: 'gift',
                            description: `Sent ${item} in Bar Lounge`
                        });
                    if (error) throw error;
                }
            },
            {
                loading: `Ordering ${item}...`,
                success: `Sent a ${item} to ${creator?.display_name || 'Creator'}! ($${price})`,
                error: (err) => {
                    console.error("Gift failed:", err);
                    return `Failed to send ${item}. Please try again.`;
                }
            }
        );
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-purple-400"><Coffee className="animate-bounce" /> Loading Lounge...</div>;

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 pt-20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.15),transparent)] pointer-events-none" />

            <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-8 relative z-10">

                {/* Sidebar: Gifting & Room Info */}
                <div className="lg:col-span-3 space-y-6">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white transition group mb-6">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Home
                    </button>

                    <NeonCard className="p-5">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-full border-2 border-purple-500 overflow-hidden">
                                <img src={creator?.avatar_url || "https://api.dicebear.com/7/x/svg"} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-sm font-black truncate">{creator?.display_name || creator?.username || "Loading..."}</h3>
                                <p className="text-[10px] text-purple-400 font-bold flex items-center gap-1"><Users className="w-3 h-3" /> {onlineCount} Fans Online</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Buy a Drink</p>
                            <div className="grid grid-cols-2 gap-2">
                                {DRINK_MENU.map((drink) => (
                                    <button
                                        key={drink.id}
                                        onClick={() => sendGift(drink.name, drink.price)}
                                        className="p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition flex flex-col items-center gap-1 group"
                                    >
                                        <drink.icon className={`w-5 h-5 ${drink.color} group-hover:scale-110 transition-transform`} />
                                        <span className="text-[9px] font-black">${drink.price}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-white/5">
                            <div className="flex items-center gap-2 text-xs font-bold text-white/50">
                                <Music className="w-4 h-4" /> Playing: After Hours
                            </div>
                        </div>
                    </NeonCard>
                </div>

                {/* Main: Lounge Chat */}
                <div className="lg:col-span-6 flex flex-col h-[80vh]">
                    <div className="flex-1 overflow-y-auto space-y-4 pr-4 scrollbar-hide py-4 flex flex-col-reverse">
                        <div ref={messagesEndRef} />
                        {messages.length === 0 ? (
                            <div className="text-center text-gray-500 text-sm py-10">
                                No messages in the lounge yet. Start the party!
                            </div>
                        ) : messages.map((m, idx) => (
                            <div key={m.id || idx} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-gray-500 uppercase">
                                        {m.from_handle?.[0] || 'A'}
                                    </div>
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-3 max-w-[85%]">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black text-purple-400 block">{m.from_handle}</span>
                                            <span className="text-[9px] text-gray-600">
                                                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-200 leading-relaxed break-words">{m.body}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 bg-black/40 rounded-2xl border border-white/10 p-2 pr-3 flex items-center gap-3">
                        <input
                            value={msg}
                            onChange={(e) => setMsg(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !sending && handleSend()}
                            className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-sm placeholder:text-gray-600 font-medium text-white"
                            placeholder="Join the lounge conversation..."
                            disabled={sending}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!msg.trim() || sending}
                            className="p-3 rounded-xl bg-purple-600 text-white hover:bg-purple-500 transition-all disabled:opacity-50 active:scale-95"
                        >
                            {sending ? <Zap className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Desktop Sidebar: Online Fans */}
                <div className="lg:col-span-3 hidden lg:block">
                    <NeonCard className="p-5 h-[80vh] flex flex-col">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6">Online Now ({onlineUsers.length})</h4>
                        <div className="flex-1 overflow-y-auto space-y-4 pr-4 scrollbar-hide">
                            {onlineUsers.map((u) => (
                                <div key={u.id} className="animate-in fade-in slide-in-from-right-4 duration-500 flex items-center gap-3 opacity-90 hover:opacity-100 transition-opacity">
                                    <div className="relative">
                                        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/5 overflow-hidden">
                                            <img src={`https://api.dicebear.com/7/x/svg?seed=${u.avatar_seed}`} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-black rounded-full" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-bold text-gray-300 truncate">{u.username}</p>
                                        <p className="text-[9px] text-gray-600 font-medium">{u.status || 'Active'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </NeonCard>
                </div>
            </div>
        </div>
    );
}
