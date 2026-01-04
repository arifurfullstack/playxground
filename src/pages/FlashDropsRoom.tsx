import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft, Sparkles, Zap, Crown, Lock, Send,
    MessageCircle, Star, Bell, Gift, Pin, MousePointer2,
    Trophy, ChevronRight, Timer, DollarSign
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// --- Types ---
type DropRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';
type DropKind = 'Photo Set' | 'Video' | 'Live Replay' | 'DM Pack' | 'Vault';

interface FlashDrop {
    id: string;
    title: string;
    kind: DropKind;
    rarity: DropRarity;
    price: number;
    ends_at: string;
    status: string;
    media_path?: string;
}

interface Auction {
    id: string;
    drop_id: string;
    current_bid: number;
    ends_at: string;
    status: string;
}

interface LeaderboardEntry {
    username: string;
    total_spent: number;
    rank: number;
}

export default function FlashDropsRoom() {
    const { creatorId } = useParams();
    const navigate = useNavigate();
    const { user, role } = useAuth();
    const [drops, setDrops] = useState<FlashDrop[]>([]);
    const [selectedDropId, setSelectedDropId] = useState<string | null>(null);
    const [auction, setAuction] = useState<Auction | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [walletSpent, setWalletSpent] = useState(0);
    const [autoSnipe, setAutoSnipe] = useState(false);
    const [bidRaw, setBidRaw] = useState("500");
    const [customRaw, setCustomRaw] = useState("2500");
    const [entitlements, setEntitlements] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (role === 'creator') {
            navigate('/flash-drops-creator');
            return;
        }
        fetchData();
        const interval = setInterval(fetchData, 15000); // Polling for updates
        return () => clearInterval(interval);
    }, [creatorId, role]);

    const fetchData = async () => {
        if (!creatorId) return;
        try {
            // Fetch Drops
            const { data: dropsData } = await (supabase
                .from("flash_drops" as any) as any)
                .select("*")
                .eq("creator_id", creatorId)
                .order("ends_at", { ascending: true });

            if (dropsData) {
                setDrops(dropsData);
                if (!selectedDropId && dropsData.length > 0) {
                    setSelectedDropId(dropsData[0].id);
                }
            }

            // Fetch Active Auction
            const { data: auctionData } = await (supabase
                .from("flash_drop_auctions" as any) as any)
                .select("*, flash_drops!inner(*)")
                .eq("flash_drops.creator_id", creatorId)
                .eq("status", "Active")
                .single();

            if (auctionData) setAuction(auctionData);

            // Fetch Leaderboard (Real logic)
            const { data: unlockData } = await (supabase
                .from("flash_drop_unlocks" as any) as any)
                .select("*, profiles!inner(username)")
                .eq("drop_id", dropsData?.[0]?.id || ""); // Simplified for now

            // Group by user and sum price (this is an approximation, ideally we join with flash_drops)
            const grouped = (unlockData || []).reduce((acc: any, curr: any) => {
                const uname = curr.profiles.username;
                acc[uname] = (acc[uname] || 0) + 1; // Count unlocks for now, or join for price
                return acc;
            }, {});

            const leaderboardData = Object.entries(grouped)
                .map(([username, count]: [any, any]) => ({ username, total_spent: count * 10, rank: 0 }))
                .sort((a, b) => b.total_spent - a.total_spent)
                .slice(0, 5)
                .map((e, i) => ({ ...e, rank: i + 1 }));

            if (leaderboardData.length > 0) setLeaderboard(leaderboardData);
            else {
                setLeaderboard([
                    { username: "BigSpender", total_spent: 12500, rank: 1 },
                    { username: "NeonKing", total_spent: 9100, rank: 2 },
                    { username: "GoldRush", total_spent: 7200, rank: 3 },
                    { username: "You", total_spent: walletSpent, rank: 4 },
                ]);
            }

            setLoading(false);
        } catch (error) {
            console.error("Error fetching Flash Drops data:", error);
            setLoading(false);
        }
    };

    const handleTransaction = async (amount: number, type: string, description: string) => {
        // Simplified transaction logic matching the project's pattern
        const { error } = await (supabase
            .from("transactions" as any) as any)
            .insert({
                user_id: user?.id,
                amount: -amount,
                type: "purchase",
                description,
                status: "completed"
            });

        if (!error) {
            setWalletSpent(s => s + amount);
            return true;
        }
        toast.error("Transaction failed. Check balance.");
        return false;
    };

    const handleUnlock = async (drop: FlashDrop, mode: 'self' | 'gift') => {
        const success = await handleTransaction(
            mode === 'gift' ? drop.price * 2 : drop.price,
            "drop_unlock",
            `${mode === 'gift' ? 'Gift ' : ''}Unlock: ${drop.title}`
        );

        if (success) {
            await (supabase
                .from("flash_drop_unlocks" as any) as any)
                .insert({
                    user_id: user?.id,
                    drop_id: drop.id,
                    is_gift: mode === 'gift'
                });
            toast.success(`✅ Unlocked: ${drop.title}`);
            fetchData();
        }
    };

    const handlePin = async (drop: FlashDrop) => {
        const success = await handleTransaction(500, "pin", `Pinned Placement: ${drop.title}`);
        if (success) {
            await (supabase
                .from("flash_drop_pins" as any) as any)
                .insert({
                    user_id: user?.id,
                    drop_id: drop.id,
                    price: 500,
                    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 mins
                });
            toast.success("📌 Pinned placement active!");
        }
    };

    const handleBid = async (amount: number) => {
        if (!auction) return;
        if (amount <= auction.current_bid) {
            toast.error("Bid must be higher than current bid.");
            return;
        }

        const success = await handleTransaction(amount, "bid", `Auction Bid: ${auction.id}`);
        if (success) {
            await (supabase
                .from("flash_drop_bids" as any) as any)
                .insert({
                    auction_id: auction.id,
                    user_id: user?.id,
                    amount
                });

            // Update current bid in auction
            await (supabase
                .from("flash_drop_auctions" as any) as any)
                .update({ current_bid: amount })
                .eq("id", auction.id);

            toast.success(`🏁 Bid placed: $${amount.toLocaleString()}`);
            fetchData();
        }
    };

    const toggleAutoSnipe = async () => {
        const newState = !autoSnipe;
        if (newState) {
            const success = await handleTransaction(1500, "autosnipe", "Auto-Snipe Escrow");
            if (!success) return;
        }

        const { error } = await (supabase
            .from("flash_drop_autosnipe" as any) as any)
            .upsert({
                user_id: user?.id,
                is_enabled: newState,
                updated_at: new Date().toISOString()
            });

        if (!error) {
            setAutoSnipe(newState);
            toast.success(newState ? "🧲 Auto-Snipe armed — $1500" : "Auto-Snipe disabled");
        }
    };

    const selectedDrop = useMemo(() => drops.find(d => d.id === selectedDropId), [drops, selectedDropId]);

    const rarityColors = {
        Common: "text-pink-400 border-pink-500/30 bg-pink-500/10",
        Rare: "text-blue-400 border-blue-500/30 bg-blue-500/10",
        Epic: "text-purple-400 border-purple-500/30 bg-purple-500/10",
        Legendary: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10"
    };

    if (loading) return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-blue-500 animate-pulse" />
        </div>
    );

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 pt-20 overflow-x-hidden">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                                Flash Drops — Fan View
                            </h1>
                            <p className="text-gray-400 text-sm">Time-limited content + aggressive high-value purchase lanes</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="px-4 py-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-semibold">@NovatHeat • Star</span>
                        </div>
                        <div className="px-4 py-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm font-semibold text-emerald-100">Spent: ${walletSpent}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Drops, Focus, Bundles, Auction */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Live Drop Board */}
                        <div className="p-6 rounded-3xl border border-blue-500/20 bg-black/40 shadow-2xl relative overflow-hidden">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <Sparkles className="w-5 h-5 text-blue-400" />
                                    <h2 className="text-lg font-semibold text-blue-100">Live Drop Board</h2>
                                    <span className="px-2 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-[10px] text-blue-200">Limited Time</span>
                                </div>
                                <button onClick={fetchData} className="text-sm text-blue-400 hover:text-blue-300 transition">Refresh</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {drops.map((drop) => (
                                    <motion.button
                                        key={drop.id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setSelectedDropId(drop.id)}
                                        className={`text-left p-4 rounded-2xl border transition-all ${selectedDropId === drop.id ? 'border-cyan-400 bg-cyan-400/10 ring-1 ring-cyan-400' : 'border-white/10 bg-white/5 hover:bg-white/10'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${rarityColors[drop.rarity]}`}>
                                                {drop.rarity}
                                            </span>
                                            <span className="text-yellow-400 font-bold">${drop.price}</span>
                                        </div>
                                        <h3 className="font-semibold text-blue-50 mb-1">{drop.title}</h3>
                                        <div className="flex justify-between items-center text-[11px] text-gray-400">
                                            <span>{drop.kind}</span>
                                            <span className="flex items-center gap-1">
                                                <Timer className="w-3 h-3" />
                                                Ends in ~24m
                                            </span>
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        {/* Focused Drop Panel */}
                        {selectedDrop && (
                            <div className="p-8 rounded-3xl border border-blue-400/30 bg-black/60 shadow-[0_0_50px_rgba(34,197,94,0.1)] relative overflow-hidden">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div>
                                            <span className="text-cyan-400 text-xs font-bold tracking-widest uppercase">Focused Drop</span>
                                            <h2 className="text-3xl font-bold mt-2 text-white">{selectedDrop.title}</h2>
                                            <div className="flex items-center gap-3 mt-3">
                                                <span className={`px-3 py-1 rounded-full border text-xs font-bold ${rarityColors[selectedDrop.rarity]}`}>
                                                    {selectedDrop.rarity}
                                                </span>
                                                <span className="text-gray-400 text-sm">{selectedDrop.kind}</span>
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <Zap className="w-4 h-4 text-yellow-400" />
                                                    <span className="text-sm font-semibold">Auto-Snipe</span>
                                                </div>
                                                <motion.button
                                                    onClick={toggleAutoSnipe}
                                                    className={`w-12 h-6 rounded-full relative transition-colors ${autoSnipe ? 'bg-cyan-500' : 'bg-gray-700'}`}
                                                >
                                                    <motion.div
                                                        animate={{ x: autoSnipe ? 24 : 4 }}
                                                        className="absolute top-1 w-4 h-4 bg-white rounded-full"
                                                    />
                                                </motion.button>
                                            </div>
                                            <p className="text-[11px] text-gray-400">Guarantee priority capture on the next limited drop (escrow logic).</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <div className="text-center mb-2">
                                            <span className="text-gray-400 text-xs">Price</span>
                                            <div className="text-4xl font-bold text-yellow-400">${selectedDrop.price}</div>
                                        </div>
                                        <button
                                            onClick={() => handleUnlock(selectedDrop, 'self')}
                                            className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                                        >
                                            Unlock Now
                                        </button>
                                        <button
                                            onClick={() => handleUnlock(selectedDrop, 'gift')}
                                            className="w-full py-4 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 text-yellow-100 font-bold hover:bg-yellow-500/20 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Gift className="w-5 h-5" />
                                            Unlock + Gift (2×)
                                        </button>
                                        <button
                                            onClick={() => handlePin(selectedDrop)}
                                            className="w-full py-4 rounded-2xl border border-purple-500/40 bg-purple-500/10 text-purple-100 font-bold hover:bg-purple-500/20 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Pin className="w-5 h-5" />
                                            Pin Me $500
                                        </button>
                                    </div>
                                </div>

                                {/* Custom Spend & Chips */}
                                <div className="mt-8 pt-8 border-t border-white/10">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-semibold text-blue-200">Mega Spend & Custom</h3>
                                        <div className="flex gap-2">
                                            {[250, 500, 1000, 1500, 2500].map(amt => (
                                                <button
                                                    key={amt}
                                                    onClick={() => setCustomRaw(String(amt))}
                                                    className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] hover:bg-white/10 transition"
                                                >
                                                    ${amt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            value={customRaw}
                                            onChange={(e) => setCustomRaw(e.target.value)}
                                            className="flex-1 rounded-2xl border border-blue-500/20 bg-black/40 px-6 py-4 text-white font-mono outline-none focus:border-blue-500/50 transition"
                                            placeholder="Enter any amount..."
                                        />
                                        <button
                                            onClick={() => handleTransaction(Number(customRaw), "custom", "Custom Drop Spend")}
                                            className="px-8 rounded-2xl bg-white text-black font-bold hover:bg-blue-400 hover:text-white transition-all shadow-xl"
                                        >
                                            Drop Now
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Bundles */}
                        <div className="p-6 rounded-3xl border border-yellow-500/30 bg-yellow-500/5 shadow-[0_0_30px_rgba(234,179,8,0.05)]">
                            <div className="flex items-center gap-3 mb-6">
                                <Star className="w-5 h-5 text-yellow-400" />
                                <h2 className="text-lg font-semibold text-yellow-100">Exclusive Bundles</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { title: "Weekend Bundle", note: "3 drops + 1 DM", price: 500 },
                                    { title: "Whale Bundle", note: "All drops today + priority", price: 2500 }
                                ].map((b, i) => (
                                    <div key={i} className="p-5 rounded-2xl border border-yellow-500/20 bg-black/40 flex items-center justify-between">
                                        <div>
                                            <h3 className="font-bold text-gray-50">{b.title}</h3>
                                            <p className="text-xs text-gray-400">{b.note}</p>
                                        </div>
                                        <button
                                            onClick={() => handleTransaction(b.price, "bundle", `Bundle: ${b.title}`)}
                                            className="px-6 py-2 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-bold shadow-lg"
                                        >
                                            Buy ${b.price}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Auction */}
                        {auction && (
                            <div className="p-6 rounded-3xl border border-purple-500/30 bg-purple-500/5 relative">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <Crown className="w-5 h-5 text-purple-400" />
                                        <h2 className="text-lg font-semibold text-purple-100">Live Auction</h2>
                                    </div>
                                    <span className="text-xs text-purple-300">"One-of-One" Vault Unlock</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                    <div className="md:col-span-4 p-6 rounded-2xl border border-purple-500/20 bg-black/40 text-center">
                                        <span className="text-[10px] uppercase tracking-widest text-gray-400">Current Bid</span>
                                        <div className="text-3xl font-bold text-yellow-400 mt-1">${auction.current_bid.toLocaleString()}</div>
                                    </div>
                                    <div className="md:col-span-8 flex gap-3">
                                        <input
                                            type="text"
                                            value={bidRaw}
                                            onChange={(e) => setBidRaw(e.target.value)}
                                            className="flex-1 rounded-2xl border border-purple-500/20 bg-black/40 px-6 py-4 text-white outline-none focus:border-purple-500/50 transition"
                                            placeholder="Enter bid amount..."
                                        />
                                        <button
                                            onClick={() => handleBid(Number(bidRaw))}
                                            className="px-10 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all"
                                        >
                                            Place Bid
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Impulse, High Roller, Leaderboard */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Impulse Spend */}
                        <div className="p-6 rounded-3xl border border-blue-500/20 bg-black/40">
                            <h3 className="text-sm font-semibold text-blue-200 mb-4">Impulse Spend</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: "Quick Like", price: 5 },
                                    { label: "Hype", price: 10 },
                                    { label: "Boost", price: 25 },
                                    { label: "Flex", price: 50 }
                                ].map((item, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleTransaction(item.price, "impulse", item.label)}
                                        className="py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition flex flex-col items-center"
                                    >
                                        <span className="text-xs font-semibold">{item.label}</span>
                                        <span className="text-[10px] text-gray-400">${item.price}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* High Roller Packs */}
                        <div className="p-6 rounded-3xl border border-yellow-500/30 bg-yellow-500/5 vip-glow">
                            <h3 className="text-sm font-semibold text-yellow-200 mb-4">High Roller Packs</h3>
                            <div className="space-y-3">
                                {[
                                    { label: "Boost My Rank", price: 150 },
                                    { label: "Priority Unlock Pass", price: 300 },
                                    { label: "Golden Key", price: 750 },
                                    { label: "Diamond Patron", price: 1500 },
                                    { label: "Private Drop Sponsor", price: 2500 }
                                ].map((p, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleTransaction(p.price, "pack", p.label)}
                                        className="w-full p-4 rounded-2xl border border-yellow-500/20 bg-black/40 hover:bg-yellow-500/10 transition flex justify-between items-center"
                                    >
                                        <span className="text-sm text-gray-200">{p.label}</span>
                                        <span className="text-sm font-bold text-yellow-400">${p.price}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Whale Leaderboard */}
                        <div className="p-6 rounded-3xl border border-cyan-500/20 bg-black/40">
                            <div className="flex items-center gap-3 mb-6">
                                <Trophy className="w-5 h-5 text-cyan-400" />
                                <h3 className="text-sm font-semibold text-cyan-200">Whale Leaderboard</h3>
                            </div>
                            <div className="space-y-4">
                                {leaderboard.map((entry, i) => (
                                    <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${entry.username === 'You' ? 'bg-blue-500/20 border border-blue-500/30' : ''}`}>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-gray-500">#{i + 1}</span>
                                            <span className="text-sm font-medium">{entry.username}</span>
                                        </div>
                                        <span className="text-sm font-bold text-yellow-400">${entry.total_spent.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 grid grid-cols-1 gap-2">
                                <button className="py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-xs font-bold hover:bg-blue-500/20 transition">Boost Visibility $250</button>
                                <button className="py-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 text-xs font-bold hover:bg-purple-500/20 transition">Sponsor Slot $2,500</button>
                            </div>
                        </div>

                        {/* Subscription */}
                        <div className="p-6 rounded-3xl border border-white/10 bg-white/5 overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Crown className="w-16 h-16" />
                            </div>
                            <h3 className="text-sm font-semibold text-gray-200 mb-2">Subscription</h3>
                            <p className="text-[11px] text-gray-400 mb-4">Auto-unlock every Flash Drop and gain priority access.</p>
                            <div className="grid grid-cols-1 gap-2">
                                <button className="py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-extrabold shadow-lg">$199/mo</button>
                                <button className="py-3 rounded-xl border border-yellow-500/50 bg-yellow-500/10 text-yellow-100 text-xs font-extrabold vip-glow">VIP $499/mo</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

