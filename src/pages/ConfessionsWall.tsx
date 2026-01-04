import React, { useEffect, useState, useMemo } from "react";
import {
    ArrowLeft,
    Lock,
    Unlock,
    FileText,
    Mic,
    Video,
    Sparkles,
    Heart,
    Crown,
    ChevronRight,
    Send,
    CreditCard,
    Eye,
    Plus
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/glass-card";
import { motion, AnimatePresence } from "framer-motion";

// ---- Types ----------------------------------------------------------------
type ConfTier = "Soft" | "Spicy" | "Dirty" | "Dark" | "Forbidden";
type ConfType = "Text" | "Voice" | "Video";

const TIER_PRICE: Record<ConfTier, number> = {
    Soft: 5,
    Spicy: 10,
    Dirty: 20,
    Dark: 35,
    Forbidden: 60,
};

const tierTone: Record<ConfTier, string> = {
    Soft: "border-pink-500/25 text-pink-200",
    Spicy: "border-rose-400/30 text-rose-200",
    Dirty: "border-red-400/30 text-red-200",
    Dark: "border-violet-300/30 text-violet-200",
    Forbidden: "border-yellow-400/30 text-yellow-200",
};

interface ConfessionItem {
    id: string;
    creator_id: string;
    title: string;
    teaser: string;
    full_text: string | null;
    tier: ConfTier;
    type: ConfType;
    status: "Draft" | "Published" | "Archived";
    created_at: string;
    updated_at?: string;
    published_at?: string | null;
    archived_at?: string | null;
    media_asset_id: string | null;
}

export default function ConfessionsWall() {
    const { creatorId } = useParams();
    const navigate = useNavigate();
    const { user, profile, refreshProfile } = useAuth();

    const [items, setItems] = useState<ConfessionItem[]>([]);
    const [entitlements, setEntitlements] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [creatorProfile, setCreatorProfile] = useState<any>(null);
    const [activeItem, setActiveItem] = useState<ConfessionItem | null>(null);
    const [isUnlocking, setIsUnlocking] = useState(false);

    useEffect(() => {
        if (creatorId) {
            fetchData();
        }
    }, [creatorId, user]);

    const fetchData = async () => {
        setLoading(true);

        // Fetch Creator Profile
        const { data: cProf } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", creatorId)
            .single();
        if (cProf) setCreatorProfile(cProf);

        // Fetch Published Confessions
        const { data: confs } = await (supabase
            .from("confession_items" as any) as any)
            .select("*")
            .eq("creator_id", creatorId)
            .eq("status", "Published")
            .order("created_at", { ascending: false });

        if (confs) setItems(confs as any);

        // Fetch Entitlements
        if (user) {
            const { data: ents } = await (supabase
                .from("confession_entitlements" as any) as any)
                .select("confession_id")
                .eq("user_id", user.id);

            if (ents) {
                setEntitlements(new Set((ents as any[]).map(e => e.confession_id)));
            }
        }
        setLoading(false);
    };

    const handleUnlock = async (item: ConfessionItem) => {
        if (!user || !profile) {
            toast.error("Please login to unlock content");
            return;
        }

        const price = TIER_PRICE[item.tier];
        if (profile.wallet_balance < price) {
            toast.error("Insufficient balance. Please top up your wallet.");
            return;
        }

        setIsUnlocking(true);
        try {
            // 1. Deduct from wallet
            const { error: walletError } = await supabase
                .from("profiles")
                .update({ wallet_balance: profile.wallet_balance - price })
                .eq("id", user.id);

            if (walletError) throw walletError;

            // 2. Create entitlement
            const { error: entError } = await (supabase
                .from("confession_entitlements" as any) as any)
                .insert([{
                    user_id: user.id,
                    confession_id: item.id,
                    price_paid: price
                }]);

            if (entError) throw entError;

            // 3. Create transaction record
            const { error: transError } = await supabase
                .from("transactions")
                .insert([{
                    sender_id: user.id,
                    receiver_id: item.creator_id,
                    amount: price,
                    type: "game", // Using game as placeholder for feature unlock
                    description: `Unlocked Confession: ${item.title}`
                }]);

            if (transError) throw transError;

            toast.success("Content unlocked!");
            setEntitlements(prev => new Set([...prev, item.id]));
            setActiveItem(item);
            refreshProfile();
        } catch (e) {
            console.error(e);
            toast.error("Unlock failed. Please try again.");
        } finally {
            setIsUnlocking(false);
        }
    };

    const isUnlocked = (itemId: string) => entitlements.has(itemId);

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 pt-20">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-5">
                        <button
                            onClick={() => navigate("/")}
                            className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
                        >
                            <ArrowLeft className="w-6 h-6 text-pink-400" />
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl border-2 border-pink-500/30 overflow-hidden bg-black p-0.5 shadow-lg shadow-pink-500/20">
                                <img
                                    src={creatorProfile?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=creator"}
                                    className="w-full h-full object-cover rounded-xl"
                                    alt="Avatar"
                                />
                            </div>
                            <div>
                                <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                                    {creatorProfile?.display_name || "Creator"}'s Confessions
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/20 font-bold uppercase tracking-widest">Live</span>
                                </h1>
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Sparkles className="w-3.5 h-3.5 text-pink-400" /> Step into my secret garden...
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <GlassCard className="px-5 py-3 border-pink-500/20 bg-pink-500/5 flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-[10px] text-pink-300 font-bold uppercase tracking-wider">Wallet Balance</p>
                                <p className="text-lg font-bold text-white">${profile?.wallet_balance?.toFixed(2) || "0.00"}</p>
                            </div>
                            <button onClick={() => navigate("/wallet")} className="p-2 rounded-xl bg-pink-500 text-white hover:bg-pink-400 transition shadow-lg shadow-pink-500/30">
                                <Plus className="w-5 h-5" />
                            </button>
                        </GlassCard>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Confession Wall */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-rose-300">
                                <FileText className="w-6 h-6" /> Confession Wall
                            </h2>
                            <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">{items.length} items shared</span>
                        </div>

                        {loading ? (
                            <div className="py-20 text-center animate-pulse text-muted-foreground">Opening the secret vault...</div>
                        ) : items.length === 0 ? (
                            <GlassCard className="p-16 text-center text-muted-foreground">
                                No confessions shared yet. Come back soon!
                            </GlassCard>
                        ) : (
                            <div className="space-y-4">
                                {items.map((item) => {
                                    const unlocked = isUnlocked(item.id);
                                    return (
                                        <motion.div
                                            key={item.id}
                                            whileHover={{ scale: 1.01 }}
                                            className="cursor-pointer"
                                            onClick={() => unlocked ? setActiveItem(item) : null}
                                        >
                                            <GlassCard className={`p-5 relative overflow-hidden transition-all ${unlocked ? "border-pink-500/40 bg-pink-500/5" : "hover:border-white/20"}`}>
                                                {!unlocked && (
                                                    <div className="absolute top-0 right-0 p-4 opacity-10 blur-sm group-hover:blur-0 transition-all pointer-events-none">
                                                        <Lock className="w-12 h-12 text-pink-200" />
                                                    </div>
                                                )}

                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="space-y-3 flex-1 min-w-0">
                                                        <div className="flex items-center flex-wrap gap-2">
                                                            <h3 className="font-bold text-white text-lg">{item.title}</h3>
                                                            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-widest bg-black ${tierTone[item.tier]}`}>
                                                                {item.tier} • ${TIER_PRICE[item.tier]}
                                                            </span>
                                                            <span className="px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1">
                                                                {item.type === "Voice" ? <Mic className="w-3 h-3" /> : item.type === "Video" ? <Video className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                                                {item.type}
                                                            </span>
                                                        </div>

                                                        <p className={`text-sm ${unlocked ? "text-pink-100" : "text-muted-foreground line-clamp-2 blur-[1px]"}`}>
                                                            {unlocked ? "Unlocked content ready to view." : item.teaser}
                                                        </p>

                                                        <div className="flex items-center gap-6">
                                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                                                <Heart className="w-3 h-3 text-pink-500" /> 12 Hearts
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                                                Shared {new Date(item.created_at).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="w-32 shrink-0 flex flex-col gap-2">
                                                        {unlocked ? (
                                                            <button
                                                                className="w-full py-2 rounded-xl bg-pink-500/20 border border-pink-500/30 text-pink-200 text-sm font-bold hover:bg-pink-500/30 transition flex items-center justify-center gap-2"
                                                            >
                                                                <Unlock className="w-4 h-4" /> View
                                                            </button>
                                                        ) : (
                                                            <button
                                                                disabled={isUnlocking}
                                                                onClick={(e) => { e.stopPropagation(); handleUnlock(item); }}
                                                                className="w-full py-2 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-500 transition shadow-lg shadow-rose-900/30 flex items-center justify-center gap-2"
                                                            >
                                                                <Lock className="w-4 h-4" /> Unlock
                                                            </button>
                                                        )}
                                                        <button className="w-full py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition">
                                                            Tip Creator
                                                        </button>
                                                    </div>
                                                </div>
                                            </GlassCard>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Viewer Panel */}
                    <div className="lg:col-span-5">
                        <GlassCard border="pink" className="p-6 sticky top-24 min-h-[400px]">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-rose-300 mb-6 border-b border-white/5 pb-4">
                                <Sparkles className="w-6 h-6 text-pink-400" /> Unlocked Content
                            </h2>

                            <AnimatePresence mode="wait">
                                {!activeItem ? (
                                    <motion.div
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="flex flex-col items-center justify-center py-20 text-center gap-4"
                                    >
                                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-muted-foreground">
                                            <Lock className="w-10 h-10 opacity-30" />
                                        </div>
                                        <p className="text-sm text-muted-foreground max-w-[200px]">Select an unlocked confession to reveal its secrets.</p>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key={activeItem.id}
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                        className="space-y-6"
                                    >
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-bold text-white">{activeItem.title}</h3>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full border border-pink-500/20 bg-pink-500/10 text-pink-400 font-bold uppercase">Revealed</span>
                                        </div>

                                        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-sm leading-relaxed text-gray-200 min-h-[200px]">
                                            {activeItem.type === "Text" ? (
                                                <div className="whitespace-pre-wrap">{activeItem.full_text}</div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
                                                    {activeItem.type === "Video" ? <Video className="w-12 h-12 text-pink-400" /> : <Mic className="w-12 h-12 text-pink-400" />}
                                                    <p className="text-muted-foreground">Protected {activeItem.type} stream authorized.</p>
                                                    <div className="w-full h-40 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center">
                                                        <span className="text-[10px] uppercase font-bold text-white/20 tracking-widest">Media Player Placeholder</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-2xl p-4 border border-pink-500/20">
                                            <h4 className="flex items-center gap-2 font-bold mb-2 text-sm">
                                                <Crown className="w-4 h-4 text-yellow-500" /> Creator Special message
                                            </h4>
                                            <p className="text-xs text-muted-foreground">Thank you for supporting my vault. I hope you found what you were looking for... 💋</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </GlassCard>

                        {/* Upsell */}
                        <div className="mt-8">
                            <GlassCard className="p-6 border-cyan-500/30 bg-cyan-500/5">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="font-bold text-cyan-100 italic">Want more details?</h3>
                                        <p className="text-xs text-muted-foreground">Subscribe to @{creatorProfile?.username} for $19.99/mo</p>
                                    </div>
                                    <button className="px-6 py-2 rounded-xl bg-cyan-600 text-white font-bold text-sm shadow-lg shadow-cyan-900/30 hover:bg-cyan-500 transition">
                                        Join VIP
                                    </button>
                                </div>
                            </GlassCard>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
