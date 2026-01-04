import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Sparkles, MessageCircle, DollarSign, Lock, Zap, Clock, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

/**
 * X Chat — Fan Room
 * ----------------------------------
 * Fans can:
 *  - Send messages in Priority, Paid, or Free lanes
 *  - View creator's the room and current queue (conceptual)
 *  - See answered messages
 */

// -------------------- helpers --------------------
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
                "rounded-2xl border border-pink-500/25 bg-black overflow-hidden",
                "shadow-[0_0_22px_rgba(236,72,153,0.14),0_0_52px_rgba(59,130,246,0.08)]",
                className
            )}
        >
            {children}
        </div>
    );
}

export default function XChatRoom() {
    const { creatorId } = useParams();
    const navigate = useNavigate();
    const { user, role } = useAuth();
    const [lane, setLane] = useState<"Priority" | "Paid" | "Free">("Free");
    const [msg, setMsg] = useState("");
    const [amount, setAmount] = useState(5);
    const [busy, setBusy] = useState(false);
    const [room, setRoom] = useState<any>(null);
    const [creator, setCreator] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (role === 'creator') {
            navigate('/xchat-creator');
            return;
        }
        fetchData();
        const channel = supabase
            .channel('x_chat_fan_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'x_chat_messages' }, () => {
                fetchData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'x_chat_answers' }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [creatorId, role]);

    const fetchData = async () => {
        try {
            // 1. Fetch Creator
            const { data: creatorData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', creatorId)
                .single();
            setCreator(creatorData);

            // 2. Fetch Room
            const { data: roomData } = await (supabase
                .from('x_chat_rooms' as any) as any)
                .select('*')
                .eq('creator_id', creatorId)
                .maybeSingle();
            setRoom(roomData);

            if (roomData) {
                // 3. Fetch recent answered messages + replies
                const { data: msgs } = await (supabase
                    .from('x_chat_messages' as any) as any)
                    .select(`
            *,
            x_chat_answers (*)
          `)
                    .eq('room_id', roomData.id)
                    .order('created_at', { ascending: false })
                    .limit(20);

                setMessages(msgs || []);
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching room data:", error);
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!user) {
            toast.error("Please sign in to message");
            return;
        }
        if (!msg.trim()) return;
        if (!room) {
            toast.error("Room not active");
            return;
        }

        setBusy(true);
        try {
            const paidAmount = lane !== "Free" ? amount : 0;

            const { error } = await (supabase
                .from('x_chat_messages' as any) as any)
                .insert({
                    room_id: room.id,
                    from_user_id: user.id,
                    from_handle: user.email?.split('@')[0] || 'Anonymous',
                    lane,
                    body: msg.trim(),
                    paid_amount_cents: paidAmount * 100,
                    status: 'Queued'
                });

            if (error) throw error;

            toast.success(lane === "Free" ? "Message sent to queue!" : `Priority message sent with $${paidAmount}!`);
            setMsg("");
            fetchData();
        } catch (error) {
            console.error("Error sending message:", error);
            toast.error("Failed to send message");
        } finally {
            setBusy(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-lime-400"><Zap className="animate-pulse" /></div>;

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 pt-20">
            <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-8">

                {/* Left: Feed & Creator Info */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full border border-white/10">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full overflow-hidden border border-lime-400/30">
                                <img src={creator?.avatar_url || "https://api.dicebear.com/7/x/svg"} className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-white">{creator?.display_name || creator?.username}'s X Chat</h1>
                                <p className="text-xs text-lime-400 flex items-center gap-1"><Zap className="w-3 h-3" /> Live & Responding</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4 scrollbar-hide">
                        {messages.length === 0 ? (
                            <div className="py-20 text-center text-gray-500 italic">No messages yet. Be the first!</div>
                        ) : (
                            messages.map((m) => (
                                <div key={m.id} className="space-y-3">
                                    <div className={cx(
                                        "p-4 rounded-2xl border bg-white/[0.03]",
                                        m.lane === 'Priority' ? "border-yellow-400/20" : m.lane === 'Paid' ? "border-cyan-400/20" : "border-white/5"
                                    )}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-gray-400">{m.from_handle}</span>
                                            <span className="text-[10px] text-gray-600 font-mono">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-sm text-white">{m.body}</p>
                                        {m.lane !== 'Free' && (
                                            <div className="mt-2 flex items-center gap-1 text-[10px] font-black text-yellow-400 uppercase">
                                                <Sparkles className="w-3 h-3" /> {m.lane} Message • ${m.paid_amount_cents / 100}
                                            </div>
                                        )}
                                    </div>

                                    {m.x_chat_answers?.map((ans: any) => (
                                        <div key={ans.id} className="ml-8 p-4 rounded-2xl border border-lime-400/30 bg-lime-400/5 relative">
                                            <div className="absolute -left-4 top-4 w-4 h-[1px] bg-lime-400/30" />
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-[10px] font-black text-lime-400 uppercase tracking-widest">Creator Response</span>
                                            </div>
                                            <p className="text-sm text-lime-50 leading-relaxed font-medium">{ans.body}</p>
                                        </div>
                                    ))}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right: Composer */}
                <div className="lg:col-span-4">
                    <NeonCard className="p-6 sticky top-24">
                        <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-lime-400" /> Message
                        </h3>

                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
                                {(['Free', 'Paid', 'Priority'] as const).map(l => (
                                    <button
                                        key={l}
                                        onClick={() => setLane(l)}
                                        className={cx(
                                            "py-2 rounded-lg text-[10px] font-black uppercase transition-all",
                                            lane === l ? "bg-white text-black" : "text-gray-500 hover:text-white"
                                        )}
                                    >
                                        {l}
                                    </button>
                                ))}
                            </div>

                            {lane !== "Free" && (
                                <div className="animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-gray-400 uppercase">Boost Amount</span>
                                        <span className="text-sm font-black text-yellow-400 font-mono">${amount}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={lane === "Priority" ? 25 : 5}
                                        max={100}
                                        step={5}
                                        value={amount}
                                        onChange={(e) => setAmount(Number(e.target.value))}
                                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-lime-400"
                                    />
                                    <p className="mt-2 text-[10px] text-gray-500 leading-tight">
                                        {lane === "Priority" ? "Guarantees top shelf placement and faster consideration." : "Bypass the free queue with a direct tip."}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-3">
                                <textarea
                                    value={msg}
                                    onChange={(e) => setMsg(e.target.value)}
                                    placeholder={lane === "Free" ? "Say something..." : "Ask your question or send a prompt..."}
                                    className="w-full min-h-[120px] bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-gray-600 outline-none focus:border-lime-500/50 transition-all resize-none"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={busy || !msg.trim()}
                                    className={cx(
                                        "w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl",
                                        lane === "Free" ? "bg-white text-black hover:bg-gray-200" : "bg-gradient-to-r from-yellow-400 to-amber-500 text-black hover:scale-[1.02] shadow-yellow-500/10"
                                    )}
                                >
                                    {busy ? <Zap className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    {lane === "Free" ? "Send Message" : `Send & Pay $${amount}`}
                                </button>
                            </div>

                            <div className="pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium">
                                    <Clock className="w-3 h-3" />
                                    Avg Choice response: ~2 mins
                                </div>
                            </div>
                        </div>
                    </NeonCard>
                </div>

            </div>
        </div>
    );
}
