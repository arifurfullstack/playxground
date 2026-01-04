import React, { useState, useEffect } from "react";
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
 *  - Public Chat
 *  - Virtual Drinks / Gifting
 *  - Music Request (Conceptual)
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
    const [msg, setMsg] = useState("");
    const [messages, setMessages] = useState<any[]>([]);
    const [creator, setCreator] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [onlineCount, setOnlineCount] = useState(Math.floor(Math.random() * 50) + 12);

    useEffect(() => {
        fetchData();
        // Using x_chat_messages for now as a shared message pool, or we could create lounge_messages
        const channel = supabase
            .channel('lounge_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'x_chat_messages' }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [creatorId]);

    const fetchData = async () => {
        try {
            const { data: creatorData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', creatorId)
                .single();
            setCreator(creatorData);

            // Fetch "Free" lane messages as lounge chat
            const { data: msgs } = await (supabase
                .from('x_chat_messages' as any) as any)
                .select('*')
                .eq('from_handle', user?.email?.split('@')[0] || 'Anonymous') // Mocking for now
                .limit(20)
                .order('created_at', { ascending: false });

            setMessages(msgs || []);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching lounge data:", error);
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!user) return toast.error("Sign in to join the chat");
        if (!msg.trim()) return;

        try {
            // Simulate sending a message
            const newMessage = {
                id: Math.random().toString(),
                from_handle: user.email?.split('@')[0] || 'Anonymous',
                body: msg.trim(),
                created_at: new Date().toISOString()
            };
            setMessages([newMessage, ...messages]);
            setMsg("");
            toast.success("Message sent to the lounge!");
        } catch (error) {
            toast.error("Failed to send");
        }
    };

    const sendGift = (item: string, price: number) => {
        toast.success(`Sent a ${item} to ${creator?.display_name || creator?.username}! ($${price})`);
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-purple-400"><Coffee className="animate-bounce" /></div>;

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
                                <h3 className="text-sm font-black truncate">{creator?.display_name || creator?.username}</h3>
                                <p className="text-[10px] text-purple-400 font-bold flex items-center gap-1"><Users className="w-3 h-3" /> {onlineCount} Fans Online</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Buy a Drink</p>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => sendGift("Coffee", 5)} className="p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition flex flex-col items-center gap-1 group">
                                    <Coffee className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
                                    <span className="text-[9px] font-black">$5</span>
                                </button>
                                <button onClick={() => sendGift("Tequila", 10)} className="p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition flex flex-col items-center gap-1 group">
                                    <GlassWater className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                                    <span className="text-[9px] font-black">$10</span>
                                </button>
                                <button onClick={() => sendGift("Craft Beer", 15)} className="p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition flex flex-col items-center gap-1 group">
                                    <Beer className="w-5 h-5 text-yellow-500 group-hover:scale-110 transition-transform" />
                                    <span className="text-[9px] font-black">$15</span>
                                </button>
                                <button onClick={() => sendGift("Champagne", 50)} className="p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition flex flex-col items-center gap-1 group">
                                    <GlassWater className="w-5 h-5 text-pink-400 group-hover:scale-110 transition-transform" />
                                    <span className="text-[9px] font-black">$50</span>
                                </button>
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
                    <div className="flex-1 overflow-y-auto space-y-4 pr-4 scrollbar-hide py-4">
                        {messages.map((m, idx) => (
                            <div key={m.id || idx} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-gray-500">
                                        {m.from_handle?.[1]?.toUpperCase() || 'A'}
                                    </div>
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-3 max-w-[85%]">
                                        <span className="text-[10px] font-black text-purple-400 mb-1 block">{m.from_handle}</span>
                                        <p className="text-sm text-gray-200 leading-relaxed">{m.body}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 bg-black/40 rounded-2xl border border-white/10 p-2 pr-3 flex items-center gap-3">
                        <input
                            value={msg}
                            onChange={(e) => setMsg(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-sm placeholder:text-gray-600 font-medium"
                            placeholder="Join the lounge conversation..."
                        />
                        <button
                            onClick={handleSend}
                            disabled={!msg.trim()}
                            className="p-3 rounded-xl bg-purple-600 text-white hover:bg-purple-500 transition-all disabled:opacity-50 active:scale-95"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Desktop Sidebar: Online Fans */}
                <div className="lg:col-span-3 hidden lg:block">
                    <NeonCard className="p-5 h-[80vh] flex flex-col">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6">Online Now</h4>
                        <div className="flex-1 overflow-y-auto space-y-4 pr-4 scrollbar-hide">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/5" />
                                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-black rounded-full" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-bold text-gray-300 truncate">fan_member_{i + 100}</p>
                                        <p className="text-[9px] text-gray-600">Active</p>
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
