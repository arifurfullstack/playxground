
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Video, Lock, Play, Mic, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/glass-card";
import { MOCK_CONFESSIONS, MOCK_CONFESSIONS_CREATOR } from "@/data/mockConfessionsData";
// NeonCard fallback
function NeonCard({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "rounded-2xl border border-rose-500/25 bg-black overflow-hidden",
                "shadow-[0_0_22px_rgba(244,63,94,0.14),0_0_52px_rgba(59,130,246,0.08)]",
                className
            )}
        >
            {children}
        </div>
    );
}

// Types matching DB
type ConfTier = "Soft" | "Spicy" | "Dirty" | "Dark" | "Forbidden";
type ConfType = "Text" | "Voice" | "Video";

interface Confession {
    id: string;
    creator_id: string;
    tier: ConfTier;
    type: ConfType;
    title: string;
    preview_text: string;
    content_url: string | null;
    price: number;
    status: string;
}

interface CreatorProfile {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
}

const TIER_META: Record<ConfTier, { label: string; tone: string }> = {
    Soft: { label: "Soft", tone: "border-pink-500/25 text-pink-200" },
    Spicy: { label: "Spicy", tone: "border-rose-400/30 text-rose-200" },
    Dirty: { label: "Dirty", tone: "border-red-400/30 text-red-200" },
    Dark: { label: "Dark", tone: "border-violet-300/30 text-violet-200" },
    Forbidden: { label: "Forbidden", tone: "border-yellow-400/30 text-yellow-200" },
};

export default function ConfessionsRoom() {
    const { creatorId } = useParams();
    const navigate = useNavigate();
    const { user, role } = useAuth();

    // OPTIMISTIC: Start with Mock Data
    const [loading, setLoading] = useState(false); // No blocking load
    const [creator, setCreator] = useState<CreatorProfile | null>(MOCK_CONFESSIONS_CREATOR as any);
    const [confessions, setConfessions] = useState<Confession[]>(MOCK_CONFESSIONS as any);
    const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
    const [activeConfessionId, setActiveConfessionId] = useState<string | null>(null);
    const [walletSpent, setWalletSpent] = useState(0); // This would come from real wallet in prod

    // Countdown State
    const GOAL_TARGET = 250;
    const [goalTotal, setGoalTotal] = useState(140);

    // Request State
    const [requestTopic, setRequestTopic] = useState("");

    const REACTIONS = [
        { id: "r1", label: "Text Reply", price: 3, type: "Text Reply" },
        { id: "r2", label: "Voice Reaction", price: 5, type: "Voice Reaction" },
        { id: "r3", label: "Mini Video Reaction", price: 10, type: "Mini Video Reaction" },
    ];

    useEffect(() => {
        if (role === 'creator') {
            navigate('/confessions-studio');
            return;
        }
        if (creatorId) {
            fetchRoomData();
        }
    }, [creatorId, user, role]);

    const fetchRoomData = async () => {
        try {
            // setLoading(true); // Don't block UI with spinner

            // 1. Fetch Creator
            const { data: creatorData, error: creatorError } = await supabase
                .from("profiles")
                .select("id, username, display_name, avatar_url")
                .eq("id", creatorId)
                .single();

            if (creatorError) throw creatorError;
            setCreator(creatorData);

            // 2. Fetch Active Confessions
            const { data: confData, error: confError } = await (supabase
                .from("confessions" as any) as any)
                .select("*")
                .eq("creator_id", creatorId)
                .eq("status", "active")
                .order("created_at", { ascending: false });

            if (confError) throw confError;
            setConfessions(confData || []);

            // 3. Fetch My Unlocks
            if (user) {
                const { data: unlocks, error: unlockError } = await (supabase
                    .from("confession_unlocks" as any) as any)
                    .select("confession_id")
                    .eq("fan_id", user.id);

                if (unlockError) throw unlockError;

                const unlockedSet = new Set((unlocks?.map((u: any) => u.confession_id) || []) as string[]);
                setUnlockedIds(unlockedSet);
            }

        } catch (error: any) {
            console.error("Error loading room:", error);
            toast.error("Failed to load room data");
        } finally {
            setLoading(false);
        }
    };

    const handleUnlock = async (confession: Confession) => {
        if (!user) {
            toast.error("Please login to unlock content");
            return;
        }

        try {
            // In a real app, we'd check wallet balance here first
            // For this demo, we just insert the unlock record

            const { error } = await (supabase
                .from("confession_unlocks" as any) as any)
                .insert({
                    fan_id: user.id,
                    confession_id: confession.id,
                    price_paid: confession.price
                });

            if (error) {
                if (error.code === '23505') { // Unique violation
                    toast.success("You already unlocked this!");
                    setUnlockedIds(prev => new Set(prev).add(confession.id));
                    return;
                }
                throw error;
            }

            toast.success(`Unlocked for $${confession.price}!`);
            setUnlockedIds(prev => new Set(prev).add(confession.id));
            setActiveConfessionId(confession.id);
            setWalletSpent(prev => prev + confession.price);

        } catch (error: any) {
            console.error("Unlock failed:", error);
            toast.error("Failed to unlock confession");
        }
    };

    const handlePay = async (amount: number, type: string) => {
        // Simulating payment for countdown or reactions
        // In real app: create transaction record
        setWalletSpent(prev => prev + amount);
        if (type === 'goal') {
            setGoalTotal(prev => prev + amount);
            toast.success(`Contributed $${amount} to goal!`);
        } else {
            toast.success(`Purchased ${type} for $${amount}`);
        }
    };

    const handleRequest = async () => {
        if (!requestTopic.trim()) return;
        // In real app: insert into topic_requests
        handlePay(10, 'Request');
        setRequestTopic("");
        toast.success("Request sent to creator!");
    }

    const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

    const activeConf = confessions.find(c => c.id === activeConfessionId);

    if (loading) return <div className="p-8 text-center text-neon-pink animate-pulse">Loading Room...</div>;
    if (!creator) return <div className="p-8 text-center text-red-500">Creator not found</div>;

    return (
        <div className="min-h-screen bg-black text-white pb-20">
            {/* Header */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="rounded-xl border border-pink-500/25 bg-black/40 px-3 py-2 text-sm text-pink-200 hover:bg-white/5 inline-flex items-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                        <div>
                            <div className="text-rose-200 text-sm font-display">Confessions — Room Preview</div>
                            <div className="text-[11px] text-gray-400">Creator-led secrets • Pay-to-unlock • Reactions • Requests</div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-3 py-2">
                        <div className="text-[10px] text-rose-200">Spent (session)</div>
                        <div className="text-sm text-rose-100 font-semibold">${walletSpent.toFixed(2)}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Creator Spotlight + Goal */}
                    <GlassCard className="lg:col-span-4 p-4 border-rose-500/20 bg-black/40">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-rose-200 text-sm font-display">Creator Spotlight</div>
                            <span className="text-[10px] px-2 py-[2px] rounded-full border border-rose-400/30 text-rose-200 bg-black/40 animate-pulse">
                                Live
                            </span>
                        </div>

                        {/* Video Placeholder */}
                        <div className="rounded-2xl overflow-hidden border border-rose-400/20 bg-black/40 mb-4">
                            <div className="relative aspect-video bg-gradient-to-b from-rose-500/10 via-black to-pink-500/5 flex items-center justify-center">
                                {creator.avatar_url ? (
                                    <img src={creator.avatar_url} className="absolute inset-0 w-full h-full object-cover opacity-50" alt="Creator" />
                                ) : null}
                                <div className="flex items-center gap-2 text-rose-200 z-10">
                                    <Video className="w-5 h-5" />
                                    <span className="text-sm">Creator Feed</span>
                                </div>
                                <div className="absolute bottom-3 left-3 text-xs text-gray-200 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-3 py-1">
                                    @{creator.username}
                                </div>
                            </div>
                        </div>

                        {/* Countdown Goal */}
                        <div className="mt-4 rounded-2xl border border-rose-400/20 bg-black/30 p-3">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-rose-200">Countdown Confession</div>
                                <span className="text-[10px] px-2 py-[2px] rounded-full border border-yellow-400/30 text-yellow-200 bg-black/40">
                                    Goal ${GOAL_TARGET}
                                </span>
                            </div>
                            <div className="mt-2 text-[11px] text-gray-400">Unlocks special content when goal is reached!</div>

                            <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                                <div
                                    className="h-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                                    style={{ width: `${clamp((goalTotal / GOAL_TARGET) * 100, 0, 100)}%` }}
                                />
                            </div>
                            <div className="mt-2 text-xs text-gray-200 flex justify-between">
                                <span>${goalTotal} raised</span>
                                <span>${GOAL_TARGET} target</span>
                            </div>

                            <div className="mt-3 grid grid-cols-3 gap-2">
                                {[5, 10, 25].map((amt) => (
                                    <button
                                        key={amt}
                                        className="rounded-xl border border-rose-400/25 bg-black/40 py-2 text-sm hover:bg-white/5 hover:border-rose-400/50 transition-all"
                                        onClick={() => handlePay(amt, 'goal')}
                                    >
                                        +${amt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </GlassCard>

                    {/* Center: Confession Wall */}
                    <GlassCard className="lg:col-span-5 p-4 border-rose-500/20 bg-black/40">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-rose-200 text-sm font-display">Confession Wall</div>
                            <span className="text-[10px] text-gray-400">Unlock is per-fan</span>
                        </div>

                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {confessions.length === 0 ? (
                                <div className="text-gray-500 text-sm text-center py-10">No confessions yet. Stay tuned!</div>
                            ) : confessions.map((c) => {
                                const meta = TIER_META[c.tier] || TIER_META['Soft'];
                                const isUnlocked = unlockedIds.has(c.id);
                                const isActive = activeConfessionId === c.id;

                                return (
                                    <div
                                        key={c.id}
                                        className={cn(
                                            "rounded-2xl border bg-black/35 p-3 transition-all duration-300",
                                            isUnlocked ? "border-rose-400/35" : "border-white/10",
                                            isActive && "shadow-[0_0_22px_rgba(255,55,95,0.22)] border-rose-500/50"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1">
                                                <div className="text-sm text-gray-100 flex items-center gap-2 flex-wrap mb-2">
                                                    {!isUnlocked && <Lock className="w-3 h-3 text-rose-200" />}
                                                    {isUnlocked && c.type === 'Text' && <FileText className="w-3 h-3 text-emerald-400" />}
                                                    {isUnlocked && c.type === 'Voice' && <Mic className="w-3 h-3 text-sky-400" />}
                                                    {isUnlocked && c.type === 'Video' && <Play className="w-3 h-3 text-purple-400" />}

                                                    <span className="font-medium">{c.title}</span>
                                                </div>

                                                <div className="flex gap-2 mb-2">
                                                    <span className={cn("text-[10px] px-2 py-[2px] rounded-full border bg-black/40", meta.tone)}>
                                                        {meta.label} • ${c.price}
                                                    </span>
                                                    <span className="text-[10px] px-2 py-[2px] rounded-full border border-white/10 text-gray-200 bg-black/40">
                                                        {c.type}
                                                    </span>
                                                </div>

                                                <div
                                                    className={cn("text-sm transition-all duration-500", !isUnlocked ? "text-gray-400 blur-[2px] select-none" : "text-white")}
                                                >
                                                    {isUnlocked ? (c.content_url || c.preview_text) : c.preview_text}
                                                </div>
                                            </div>

                                            <div className="shrink-0">
                                                {!isUnlocked ? (
                                                    <button
                                                        onClick={() => handleUnlock(c)}
                                                        className="rounded-xl border border-rose-400/30 bg-rose-600 px-4 py-2 text-sm hover:bg-rose-700 transition-colors shadow-[0_0_10px_rgba(225,29,72,0.4)]"
                                                    >
                                                        Unlock
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setActiveConfessionId(c.id)}
                                                        className="rounded-xl border border-rose-400/25 bg-black/40 px-4 py-2 text-sm hover:bg-white/5 transition-colors"
                                                    >
                                                        {isActive ? 'Open' : 'View'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </GlassCard>

                    {/* Right: Upsells */}
                    <div className="lg:col-span-3 space-y-6">
                        <GlassCard className="p-4 border-rose-500/20 bg-black/40">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-rose-200 text-sm font-display">Reactions</div>
                                <span className="text-[10px] px-2 py-[2px] rounded-full border border-white/10 text-gray-200 bg-black/40">
                                    Upsells
                                </span>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/30 p-3 mb-3">
                                <div className="text-[11px] text-gray-400">Selected confession</div>
                                <div className="mt-1 text-sm text-gray-100 font-medium truncate">
                                    {activeConf ? activeConf.title : "None selected"}
                                </div>
                            </div>

                            <div className="space-y-2">
                                {REACTIONS.map((r) => (
                                    <button
                                        key={r.id}
                                        disabled={!activeConf}
                                        onClick={() => handlePay(r.price, r.type)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all text-sm",
                                            activeConf
                                                ? "border-rose-400/25 bg-black/40 hover:bg-white/5 hover:border-rose-400/50 cursor-pointer text-gray-200"
                                                : "border-white/5 bg-black/20 opacity-50 cursor-not-allowed text-gray-500"
                                        )}
                                    >
                                        <span>{r.label}</span>
                                        <span className="text-rose-200 font-medium">${r.price}</span>
                                    </button>
                                ))}
                            </div>
                        </GlassCard>

                        <GlassCard className="p-4 border-rose-500/20 bg-black/40">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-rose-200 text-sm font-display">Request Topic</div>
                                <span className="text-[10px] text-gray-400">$10</span>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                                <div className="text-[11px] text-gray-400 mb-2">What do you want to hear?</div>
                                <input
                                    value={requestTopic}
                                    onChange={(e) => setRequestTopic(e.target.value)}
                                    className="w-full rounded-xl border border-rose-400/20 bg-black/40 px-3 py-2 text-sm outline-none text-white focus:border-rose-500/50 transition-colors"
                                    placeholder="Type a topic..."
                                />
                                <button
                                    onClick={handleRequest}
                                    disabled={!requestTopic.trim()}
                                    className="mt-3 w-full rounded-xl border border-rose-400/30 bg-rose-600 py-2 text-sm hover:bg-rose-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Send Request ($10)
                                </button>
                            </div>
                        </GlassCard>
                    </div>

                </div>
            </div>
        </div>
    );
}
