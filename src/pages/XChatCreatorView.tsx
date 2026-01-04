import React, { useMemo, useState, useEffect } from "react";
import { ArrowLeft, Send, Sparkles, MessageCircle, DollarSign, Pin, RotateCcw, Zap, Trash2, Megaphone, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

/**
 * X Chat — Creator View (Functional)
 * ----------------------------------
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
                "hover:shadow-[0_0_34px_rgba(236,72,153,0.20),0_0_78px_rgba(59,130,246,0.12)] transition-shadow",
                className
            )}
        >
            {children}
        </div>
    );
}

// -------------------- types --------------------
type Lane = "Priority" | "Paid" | "Free";
type Status = "Queued" | "Answered" | "Refunded";

type Msg = {
    id: string;
    from_handle: string;
    lane: Lane;
    body: string;
    paid_amount_cents: number;
    created_at: string;
    status: Status;
};

export default function XChatCreatorView() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [lane, setLane] = useState<Lane>("Priority");
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [reply, setReply] = useState("");
    const [busyId, setBusyId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [msgs, setMsgs] = useState<Msg[]>([]);
    const [room, setRoom] = useState<any>(null);

    useEffect(() => {
        if (!user) return;
        fetchRoomAndMessages();

        // Subscribe to new messages
        const channel = supabase
            .channel('x_chat_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'x_chat_messages' }, () => {
                fetchRoomAndMessages();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const fetchRoomAndMessages = async () => {
        try {
            // 1. Get or create room for this creator
            let { data: roomData, error: roomError } = await supabase
                .from('x_chat_rooms')
                .select('*')
                .eq('creator_id', user?.id)
                .maybeSingle();

            if (!roomData && !roomError) {
                // Create default room if none exists
                const { data: newRoom, error: createError } = await (supabase
                    .from('x_chat_rooms' as any) as any)
                    .insert({
                        creator_id: user?.id,
                        title: `${user?.email?.split('@')[0]}'s X Chat`,
                        status: 'active'
                    })
                    .select()
                    .single();
                roomData = newRoom;
            }
            setRoom(roomData);

            if (roomData) {
                // 2. Fetch all messages for the room
                const { data: msgData, error: msgError } = await (supabase
                    .from('x_chat_messages' as any) as any)
                    .select('*')
                    .eq('room_id', roomData.id)
                    .order('created_at', { ascending: false });

                if (msgData) {
                    setMsgs(msgData);
                }
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching X Chat data:", error);
            setLoading(false);
        }
    };

    const laneStyles = (l: Lane) => {
        switch (l) {
            case "Priority": return "border-yellow-400/35 text-yellow-200 bg-yellow-500/10";
            case "Paid": return "border-cyan-200/25 text-cyan-200 bg-cyan-500/10";
            default: return "border-white/10 text-gray-200 bg-white/5";
        }
    };

    const visible = useMemo(() => {
        return msgs.filter((m) => m.lane === lane && m.status === "Queued");
    }, [msgs, lane]);

    const stats = useMemo(() => {
        const queued = msgs.filter((m) => m.status === "Queued").length;
        const answered = msgs.filter((m) => m.status === "Answered").length;
        const gross = msgs.reduce((s, m) => s + (m.status === "Answered" ? (m.paid_amount_cents / 100) : 0), 0);
        const pendingGross = msgs.reduce((s, m) => s + (m.status === "Queued" ? (m.paid_amount_cents / 100) : 0), 0);

        return { queued, answered, gross, pendingGross };
    }, [msgs]);

    const handleAnswer = async (id: string) => {
        if (!reply.trim()) return;
        setBusyId(id);
        try {
            // 1. Insert Answer
            const { error: answerError } = await (supabase
                .from('x_chat_answers' as any) as any)
                .insert({
                    message_id: id,
                    creator_id: user?.id,
                    body: reply.trim()
                });

            if (answerError) throw answerError;

            // 2. Mark message as Answered
            const { error: msgError } = await (supabase
                .from('x_chat_messages' as any) as any)
                .update({ status: 'Answered' })
                .eq('id', id);

            if (msgError) throw msgError;

            toast.success("✅ Response sent!");
            setReplyTo(null);
            setReply("");
            fetchRoomAndMessages();
        } catch (error) {
            console.error("Error answering message:", error);
            toast.error("Failed to send response");
        } finally {
            setBusyId(null);
        }
    };

    const handleRefund = async (id: string) => {
        setBusyId(id);
        try {
            const { error } = await (supabase
                .from('x_chat_messages' as any) as any)
                .update({ status: 'Refunded' })
                .eq('id', id);

            if (error) throw error;
            toast.success("↩️ Payment refunded.");
            fetchRoomAndMessages();
            if (replyTo === id) setReplyTo(null);
        } catch (error) {
            console.error("Error refunding message:", error);
            toast.error("Failed to refund");
        } finally {
            setBusyId(null);
        }
    };

    const handlePin = async (id: string) => {
        setBusyId(id);
        // In production, this would update a 'pinned_until' or similar in the messages table
        toast.success("📌 Message pinned to room.");
        setBusyId(null);
    };

    if (loading) return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <Zap className="w-8 h-8 text-lime-400 animate-pulse" />
        </div>
    );

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 pt-20 overflow-x-hidden">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate("/home-mock")}
                            className="p-2 hover:bg-white/10 rounded-full transition border border-white/10"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <button
                            onClick={() => navigate("/feed")}
                            className="rounded-xl border border-blue-500/25 bg-black/40 px-3 py-2 text-sm text-blue-200 hover:bg-white/5 inline-flex items-center gap-2"
                        >
                            <Sparkles className="w-4 h-4" /> Fan View
                        </button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-lime-400 to-emerald-400 bg-clip-text text-transparent">
                                X Chat — Creator View
                            </h1>
                            <p className="text-[11px] text-gray-400">Manage triage lanes and respond to high-value fans</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="rounded-2xl border border-yellow-400/30 bg-yellow-500/10 px-4 py-2 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
                            <div className="text-[10px] text-yellow-200 font-bold uppercase tracking-wider">Answered Gross</div>
                            <div className="text-sm text-yellow-100 font-bold">${stats.gross.toLocaleString()}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2">
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Queue Status</div>
                            <div className="text-sm text-gray-200 font-bold">
                                {stats.queued} queued • {stats.answered} answered
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <NeonCard className="lg:col-span-7 p-6">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-2">
                                <MessageCircle className="w-5 h-5 text-lime-400" />
                                <h2 className="text-lg font-bold text-gray-100 uppercase tracking-widest">Inbox</h2>
                            </div>
                            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                                {(["Priority", "Paid", "Free"] as Lane[]).map((l) => (
                                    <button
                                        key={l}
                                        onClick={() => {
                                            setLane(l);
                                            setReplyTo(null);
                                            setReply("");
                                        }}
                                        className={cx(
                                            "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                                            lane === l
                                                ? "bg-lime-500 text-black shadow-lg shadow-lime-500/20"
                                                : "text-gray-400 hover:text-white"
                                        )}
                                    >
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {visible.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                                    <MessageCircle className="w-12 h-12 mb-4 opacity-10" />
                                    <p className="text-sm font-medium italic">No pending messages in this lane.</p>
                                </div>
                            ) : (
                                visible.map((m) => (
                                    <div
                                        key={m.id}
                                        className="group rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:bg-white/[0.04] hover:border-white/10"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center flex-wrap gap-2 mb-2">
                                                    <span className="text-sm font-black text-white">{m.from_handle}</span>
                                                    <span className={cx("text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-tighter", laneStyles(m.lane))}>
                                                        {m.lane}{m.paid_amount_cents ? ` • $${m.paid_amount_cents / 100}` : ""}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5 font-mono">
                                                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-300 leading-relaxed break-words">{m.body}</p>
                                            </div>

                                            <div className="flex flex-col gap-2 shrink-0">
                                                <button
                                                    onClick={() => setReplyTo(replyTo === m.id ? null : m.id)}
                                                    className="px-4 py-2 rounded-xl bg-lime-500 text-black text-xs font-black hover:bg-lime-400 transition-all active:scale-95 disabled:opacity-50"
                                                    disabled={busyId === m.id}
                                                >
                                                    Reply
                                                </button>
                                                {m.paid_amount_cents > 0 ? (
                                                    <button
                                                        onClick={() => handleRefund(m.id)}
                                                        className="px-4 py-2 rounded-xl border border-rose-500/30 text-rose-400 text-xs font-bold hover:bg-rose-500/10 transition-all active:scale-95 flex items-center justify-center gap-1 disabled:opacity-50"
                                                        disabled={busyId === m.id}
                                                    >
                                                        <RotateCcw className="w-3 h-3" /> Refund
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handlePin(m.id)}
                                                        className="px-4 py-2 rounded-xl border border-white/10 text-gray-400 text-xs font-bold hover:bg-white/5 transition-all active:scale-95 flex items-center justify-center gap-1 disabled:opacity-50"
                                                        disabled={busyId === m.id}
                                                    >
                                                        <Pin className="w-3 h-3" /> Pin
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {replyTo === m.id && (
                                            <div className="mt-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
                                                <div className="flex items-center gap-3 bg-black/40 rounded-2xl border border-white/5 p-2 pr-3">
                                                    <input
                                                        autoFocus
                                                        value={reply}
                                                        onChange={(e) => setReply(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleAnswer(m.id)}
                                                        className="flex-1 bg-transparent border-none outline-none px-4 py-2 text-sm text-white placeholder:text-gray-600 font-medium"
                                                        placeholder={`Reply to ${m.from_handle}...`}
                                                        disabled={busyId === m.id}
                                                    />
                                                    <button
                                                        onClick={() => handleAnswer(m.id)}
                                                        className="p-2 rounded-xl bg-white text-black hover:bg-lime-400 transition-all disabled:opacity-50 flex items-center justify-center"
                                                        disabled={busyId === m.id || !reply.trim()}
                                                    >
                                                        {busyId === m.id ? <Zap className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </NeonCard>

                    {/* Controls / Stats */}
                    <div className="lg:col-span-5 space-y-8">
                        <NeonCard className="p-6">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-lime-400" />
                                    <h2 className="text-lg font-bold text-gray-100 uppercase tracking-widest">Controls</h2>
                                </div>
                                <div className="px-3 py-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-[10px] font-black text-yellow-200 uppercase tracking-widest shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                                    Pending: ${stats.pendingGross.toLocaleString()}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Priority Policy</div>
                                    <p className="text-sm text-gray-300 font-medium leading-relaxed">
                                        System sorts messages automatically: <br />
                                        <span className="text-yellow-400">Paid Amount</span> → <span className="text-blue-400">Account Age</span> → <span className="text-emerald-400">Lane Tier</span>
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-[11px] text-yellow-400 font-black uppercase tracking-widest mb-2">Quick Actions</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => toast.info("Slow Mode Active (Preview)")}
                                            className="group flex flex-col items-center justify-center p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all active:scale-95"
                                        >
                                            <Zap className="w-5 h-5 mb-2 text-gray-400 group-hover:text-yellow-400 transition-colors" />
                                            <span className="text-[11px] font-bold text-gray-200">Slow Mode</span>
                                        </button>
                                        <button
                                            onClick={() => toast.info("Free Lane Cleared (Preview)")}
                                            className="group flex flex-col items-center justify-center p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all active:scale-95"
                                        >
                                            <Trash2 className="w-5 h-5 mb-2 text-gray-400 group-hover:text-rose-400 transition-colors" />
                                            <span className="text-[11px] font-bold text-gray-200">Clear Free</span>
                                        </button>
                                        <button
                                            onClick={() => toast.info("Broadcast Prompted (Preview)")}
                                            className="group flex flex-col items-center justify-center p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all active:scale-95"
                                        >
                                            <Megaphone className="w-5 h-5 mb-2 text-gray-400 group-hover:text-blue-400 transition-colors" />
                                            <span className="text-[11px] font-bold text-gray-200">Prompt Fans</span>
                                        </button>
                                        <button
                                            onClick={() => toast.info("Pricing Elasticity Raised (Preview)")}
                                            className="group flex flex-col items-center justify-center p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all active:scale-95"
                                        >
                                            <DollarSign className="w-5 h-5 mb-2 text-gray-400 group-hover:text-emerald-400 transition-colors" />
                                            <span className="text-[11px] font-bold text-gray-200">Raise Prices</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5">
                                    <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-2">Creator Guidance</div>
                                    <p className="text-xs text-cyan-100 font-medium leading-relaxed italic opacity-80">
                                        "Use the Priority lane for guaranteed engagement; keep the Free lane moving to maintain hype but prioritize the revenue."
                                    </p>
                                </div>
                            </div>
                        </NeonCard>
                    </div>
                </div>
            </div>
        </div>
    );
}
