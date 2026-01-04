import React, { useEffect, useMemo, useState } from "react";
import {
    Crown,
    Video,
    Users,
    DollarSign,
    Star,
    Zap,
    Timer,
    Eye,
    MessageCircle,
    CreditCard,
    UserPlus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Navigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRoomBilling } from "@/hooks/useRoomBilling";
import { useCameraSlots } from "@/hooks/useCameraSlots";
import { InviteModal } from "@/components/game/InviteModal";
import { toast } from "sonner";

/**
 * PlayGroundX — Truth or Dare Room
 * -------------------------------------------------
 * Baseline features:
 * - Bronze / Silver / Gold purchase (auto prompt tiers)
 * - Custom Truth ($25) and Custom Dare ($35) (fan-written)
 * - Pay & Submit flow
 * - Tipping always available
 * - Gold repeats generate new prompts
 * - Supports up to 4 creators and up to 10 fans on camera
 *
 * Add-ons:
 * 1) Crowd Vote: Escalate Tier (paid)
 * 2) Crowd Vote: Truth vs Dare (paid)
 * 3) Double Dare
 * 4) Camera Angle Unlocks
 * 5) Dare King / Queen
 * 6) Time Extension per Dare
 * 8) Creator Safe-Word / Decline system
 * 9) Dare Replays (limited time)
 *
 * Pricing:
 * - Entry: $10; first 10 mins free then $2/min
 * - Crowd Vote tier fees: Bronze $5, Silver $10, Gold $15
 * - Crowd Vote Truth vs Dare fees: Truth $5, Dare $10
 * - Tip split: 90/10 (creator/platform)
 */

const TIERS = [
    { id: "bronze", label: "Bronze", price: 5, desc: "Light & playful" },
    { id: "silver", label: "Silver", price: 10, desc: "Spicy" },
    { id: "gold", label: "Gold", price: 20, desc: "Very explicit" },
] as const;

type TierId = (typeof TIERS)[number]["id"];
type Votes = { truth: number; dare: number };

const CROWD_TIER_FEES: Record<TierId, number> = {
    bronze: 5,
    silver: 10,
    gold: 15,
};

const CROWD_TV_FEES = { truth: 5, dare: 10 } as const;

const ENTRY_FEE = 10;
const FREE_MINUTES = 10;
const PER_MIN_FEE = 2;

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

const TIP_AMOUNTS = [5, 10, 25, 50] as const;

export default function TruthOrDareRoom() {
    const { id: roomId } = useParams<{ id: string }>();
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    // Hooks (roomId might be undefined for default room, we handle that)
    const activeRoomId = roomId || "d69e8460-7067-4fdc-987a-36b3576f34e3";
    const { creatorSlots, fanSlots, isOnCamera, joinCamera, leaveCamera } = useCameraSlots(activeRoomId);
    const { isJoined, minutesInRoom, totalCost, ENTRY_FEE, FREE_MINUTES, PER_MINUTE_FEE, joinRoom } = useRoomBilling(activeRoomId);

    const [selectedTier, setSelectedTier] = useState<TierId | null>(null);
    const [customType, setCustomType] = useState<"truth" | "dare" | null>(null);
    const [customText, setCustomText] = useState("");
    const [lastAction, setLastAction] = useState<string | null>(null);

    const [votes, setVotes] = useState<Votes>({ truth: 0, dare: 0 });
    const [replayAvailable, setReplayAvailable] = useState(false);
    const [topFan] = useState("TopSuga");

    const [showInviteModal, setShowInviteModal] = useState(false);
    const [myRoomRole, setMyRoomRole] = useState<"creator" | "fan">("fan");

    useEffect(() => {
        if (user) {
            // Check if user is creator
            (supabase as any).from('user_roles').select('role').eq('user_id', user.id).eq('role', 'creator').single().then(({ data }: any) => {
                if (data) setMyRoomRole("creator");
            });
        }
    }, [user]);

    const roomTimeCost = useMemo(() => Math.max(0, minutesInRoom - FREE_MINUTES) * PER_MINUTE_FEE, [minutesInRoom, FREE_MINUTES, PER_MINUTE_FEE]);
    const truthWins = useMemo(() => votes.truth >= votes.dare, [votes]);

    const handlePurchase = async (type: string, amount: number, metadata: any = {}) => {
        if (!isJoined && myRoomRole === 'fan') {
            toast.error("You must join the room first!");
            return;
        }
        try {
            const { error } = await supabase
                .from('td_transactions' as any)
                .insert({
                    room_id: activeRoomId,
                    user_id: user?.id,
                    type,
                    amount,
                    metadata
                });

            if (error) throw error;
            toast.success("Purchase successful!");
            setLastAction(`${type.replace(/_/g, ' ')} for $${amount}`);

            // Special logic for custom or gold
            if (type === 'custom_truth' || type === 'custom_dare') {
                setCustomText("");
                setCustomType(null);
            }
        } catch (error: any) {
            toast.error(error.message || "Purchase failed. Check your wallet.");
        }
    };

    const submitBaseline = () => {
        if (customType) {
            const trimmed = customText.trim();
            if (!trimmed) {
                toast.error("Please enter your request text.");
                return;
            }
            const price = customType === 'truth' ? 25 : 35;
            handlePurchase(`custom_${customType}`, price, { text: trimmed });
            return;
        }
        if (selectedTier) {
            const tier = TIERS.find((t) => t.id === selectedTier);
            if (tier) handlePurchase('tier_purchase', tier.price, { tier: selectedTier });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-neon-pink">Loading...</div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/auth" replace />;
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neon-pink/20 glass-card">
                <div className="flex items-center gap-2">
                    <span className="text-neon-pink text-2xl font-semibold">PlayGround</span>
                    <span className="text-neon-cyan text-2xl font-extrabold">X</span>
                </div>
                <div className="flex items-center gap-3 text-neon-pink text-sm">
                    <Crown className="w-4 h-4" /> Truth or Dare Room
                    <span className="hidden sm:inline text-[10px] text-muted-foreground">
                        Entry ${ENTRY_FEE} · First {FREE_MINUTES} min free · Then ${PER_MINUTE_FEE}/min
                    </span>
                </div>
            </div>

            {/* Paywall Overlay for Fans */}
            {!isJoined && myRoomRole === 'fan' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-6">
                    <div className="max-w-md w-full glass-card border border-neon-pink/30 p-8 rounded-3xl text-center space-y-6 shadow-[0_0_50px_rgba(255,0,255,0.1)]">
                        <div className="w-20 h-20 bg-neon-pink/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-neon-pink/30">
                            <Crown className="w-10 h-10 text-neon-pink" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-2">Exclusive Truth or Dare</h2>
                            <p className="text-muted-foreground text-sm">
                                Enter the most explicit room on PlayGroundX.
                                <br />
                                4 Creators · Live Dares · Interactive Voting
                            </p>
                        </div>
                        <div className="bg-secondary/50 rounded-2xl p-4 border border-white/5 space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Entry Fee</span>
                                <span className="text-neon-pink font-bold">$10.00</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                                <span className="text-muted-foreground">First 10 Minutes</span>
                                <span className="text-neon-cyan font-bold">FREE</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                                <span className="text-muted-foreground">After free trial</span>
                                <span className="text-foreground">$2.00 / min</span>
                            </div>
                        </div>
                        <button
                            onClick={() => joinRoom()}
                            className="w-full bg-neon-pink hover:bg-neon-pink/90 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,0,255,0.3)]"
                        >
                            <DollarSign className="w-5 h-5" /> Pay $10 & Enter Room
                        </button>
                        <button
                            onClick={() => navigate('/discover')}
                            className="text-xs text-muted-foreground hover:text-neon-pink transition-colors"
                        >
                            Or go back to Discovery
                        </button>
                    </div>
                </div>
            )}

            <main className="p-8 grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                {/* Main Video Area */}
                <div className="lg:col-span-3 flex flex-col gap-4">
                    {/* Creator Grid (4 slots) */}
                    <div className="grid grid-cols-2 grid-rows-2 gap-4">
                        {creatorSlots.map((slot: any) => (
                            <div
                                key={`creator-${slot.id}`}
                                className={`relative rounded-2xl border aspect-video flex items-center justify-center bg-secondary/50 glass-card transition-all ${slot.occupied_by_user_id ? "border-neon-pink shadow-[0_0_15px_rgba(255,0,255,0.2)]" : "border-neon-pink/20"
                                    }`}
                            >
                                {slot.occupied_by_user_id ? (
                                    <>
                                        {slot.profile?.avatar_url ? (
                                            <img src={slot.profile.avatar_url} className="w-full h-full object-cover rounded-2xl" alt="" />
                                        ) : (
                                            <Video className="w-10 h-10 text-neon-pink/40" />
                                        )}
                                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-neon-pink text-white text-[10px] font-bold">LIVE</div>
                                        <span className="absolute bottom-2 left-2 text-xs font-bold text-white bg-black/60 px-2 py-0.5 rounded">
                                            {slot.profile?.username || "Creator"}
                                        </span>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setShowInviteModal(true)}
                                        className="flex flex-col items-center gap-2 text-neon-pink/40 hover:text-neon-pink transition-colors group"
                                    >
                                        <div className="p-3 rounded-full border border-dashed border-neon-pink/30 group-hover:border-neon-pink">
                                            <UserPlus className="w-6 h-6" />
                                        </div>
                                        <span className="text-xs font-medium">Invite Creator</span>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Fan Camera Strip (up to 2 in T&D rules) */}
                    <div className="flex flex-wrap gap-4 justify-start">
                        {fanSlots.map((slot: any, i: number) => (
                            <div
                                key={`fan-${slot.id}`}
                                className={`relative rounded-xl border w-48 aspect-video flex items-center justify-center bg-secondary/50 glass-card transition-all ${slot.occupied_by_user_id ? "border-neon-cyan shadow-[0_0_10px_rgba(0,255,255,0.2)]" : "border-neon-cyan/20"
                                    }`}
                            >
                                {slot.occupied_by_user_id ? (
                                    <>
                                        {slot.profile?.avatar_url ? (
                                            <img src={slot.profile.avatar_url} className="w-full h-full object-cover rounded-xl" alt="" />
                                        ) : (
                                            <Users className="w-6 h-6 text-neon-cyan/40" />
                                        )}
                                        <span className="absolute bottom-1 left-1 text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">
                                            {slot.profile?.username || `Fan ${i + 1}`}
                                        </span>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setShowInviteModal(true)}
                                        className="flex flex-col items-center gap-1 text-neon-cyan/40 hover:text-neon-cyan transition-colors group"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        <span className="text-[10px] font-medium">Invite Fan</span>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Last Action Display */}
                    {lastAction && (
                        <div className="text-xs text-neon-pink flex items-center gap-2 glass-card p-3 rounded-lg border border-neon-pink/20">
                            <MessageCircle className="w-4 h-4" /> {lastAction}
                        </div>
                    )}
                </div>

                {/* Right Sidebar - Controls */}
                <aside className="rounded-2xl border border-neon-pink/30 glass-card p-4 space-y-5">
                    {/* Room Billing Status */}
                    <div className="rounded-xl border border-neon-pink/20 bg-black/40 p-3">
                        <div className="text-xs text-neon-pink font-bold flex items-center gap-1">
                            <CreditCard className="w-3 h-3" /> Status: {isJoined ? "ACTIVE" : "GUEST"}
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground space-y-1">
                            <div className="flex justify-between">
                                <span>Time in Room:</span>
                                <span className="text-foreground">{minutesInRoom}m</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Time Cost:</span>
                                <span className="text-foreground">${roomTimeCost}</span>
                            </div>
                            <div className="flex justify-between border-t border-white/5 pt-1 mt-1">
                                <span>Entry Fee:</span>
                                <span className="text-foreground">${ENTRY_FEE}</span>
                            </div>
                        </div>
                        {isOnCamera && (
                            <div className="mt-3 p-2 bg-neon-green/10 border border-neon-green/20 rounded-lg text-[10px] text-neon-green text-center font-bold animate-pulse">
                                YOU ARE LIVE ON CAMERA
                            </div>
                        )}
                        {!isJoined && !isOnCamera && (
                            <div className="mt-3 text-[10px] text-muted-foreground italic text-center">
                                Join to interact or invite others.
                            </div>
                        )}
                        {isJoined && (
                            <button
                                onClick={isOnCamera ? leaveCamera : joinCamera}
                                className={`mt-3 w-full rounded-xl py-2 text-xs font-bold transition-all flex items-center justify-center gap-2 ${isOnCamera
                                    ? "bg-red-500/20 border border-red-500/50 text-red-500 hover:bg-red-500/30"
                                    : "bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/30"
                                    }`}
                            >
                                <Video className="w-3 h-3" />
                                {isOnCamera ? "Leave Camera" : "Join on Camera"}
                            </button>
                        )}
                    </div>

                    {/* Tier Selection */}
                    <div>
                        <h3 className="text-neon-pink mb-2">Choose a Tier (Auto Prompt)</h3>
                        <div className="space-y-2">
                            {TIERS.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setSelectedTier(t.id);
                                        setCustomType(null);
                                    }}
                                    className={`w-full rounded-xl border p-3 text-left hover:bg-neon-pink/10 transition-all ${selectedTier === t.id && !customType ? "border-neon-pink/80 bg-neon-pink/5" : "border-neon-pink/40"
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">{t.label}</span>
                                        <span className="text-sm">${t.price}</span>
                                    </div>
                                    <div className="text-xs text-neon-pink/70">{t.desc}</div>
                                </button>
                            ))}
                        </div>
                        <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Selecting Gold again serves a new Gold prompt.
                        </div>
                    </div>

                    {/* Custom Requests */}
                    <div>
                        <h3 className="text-neon-pink mb-2">Custom Requests (Fan-Written)</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => {
                                    setCustomType("truth");
                                    setSelectedTier(null);
                                }}
                                className={`rounded-xl py-2 text-sm transition-all ${customType === "truth" ? "bg-neon-pink" : "bg-neon-pink/60 hover:bg-neon-pink"
                                    }`}
                            >
                                Custom Truth ($25)
                            </button>
                            <button
                                onClick={() => {
                                    setCustomType("dare");
                                    setSelectedTier(null);
                                }}
                                className={`rounded-xl py-2 text-sm transition-all ${customType === "dare" ? "bg-neon-pink/90" : "bg-neon-pink/70 hover:bg-neon-pink/90"
                                    }`}
                            >
                                Custom Dare ($35)
                            </button>
                        </div>
                        <textarea
                            value={customText}
                            onChange={(e) => setCustomText(e.target.value)}
                            className="mt-2 w-full rounded-xl bg-black/50 border border-neon-pink/30 p-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-neon-pink/60 focus:outline-none"
                            rows={3}
                            placeholder="Write your custom Truth/Dare here…"
                        />
                        <button
                            onClick={submitBaseline}
                            className="mt-2 w-full rounded-xl border border-neon-pink/40 py-2 text-sm flex items-center justify-center gap-2 hover:bg-neon-pink/10 transition-all font-bold"
                        >
                            <CreditCard className="w-4 h-4" /> Pay & Submit
                        </button>
                        <div className="mt-1 text-[10px] text-muted-foreground">Custom requests are direct fan↔creator. No auto-approval.</div>
                    </div>

                    {/* Tips */}
                    <div>
                        <h3 className="text-neon-pink mb-2">Tip the Creators</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {TIP_AMOUNTS.map((t) => (
                                <button
                                    key={t}
                                    className="rounded-xl border border-neon-pink/30 py-2 text-sm hover:bg-neon-pink/10 transition-all font-bold"
                                    onClick={() => handlePurchase('tip', t)}
                                >
                                    ${t}
                                </button>
                            ))}
                        </div>
                        <div className="mt-1 text-[10px] text-muted-foreground">Tips split 90/10 (creator/platform).</div>
                    </div>

                    {/* Add-Ons */}
                    <div className="pt-3 border-t border-neon-pink/20">
                        <h3 className="text-neon-pink mb-2">Add-Ons (Optional)</h3>

                        {/* Crowd Vote: Escalate Tier */}
                        <div className="mb-3">
                            <div className="text-xs text-muted-foreground mb-1">Crowd Vote: Escalate Tier</div>
                            <div className="grid grid-cols-3 gap-2">
                                {TIERS.map((t) => (
                                    <button
                                        key={`vote-tier-${t.id}`}
                                        className="rounded-lg border border-neon-pink/30 py-1 text-xs hover:bg-neon-pink/10 transition-all"
                                        onClick={() => handlePurchase('crowd_vote_tier', CROWD_TIER_FEES[t.id], { tier: t.id })}
                                    >
                                        {t.label}
                                        <span className="ml-1 text-[10px] text-muted-foreground">${CROWD_TIER_FEES[t.id]}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1">
                                <Zap className="w-3 h-3" /> Paid votes contribute toward auto-escalation.
                            </div>
                        </div>

                        {/* Crowd Vote: Truth vs Dare */}
                        <div className="mb-3">
                            <div className="text-xs text-muted-foreground mb-1">Crowd Vote: Truth vs Dare</div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => {
                                        setVotes((v) => ({ ...v, truth: v.truth + 1 }));
                                        handlePurchase('crowd_vote_truth_dare', CROWD_TV_FEES.truth, { type: 'truth' });
                                    }}
                                    className={`rounded-xl border py-2 text-xs hover:bg-neon-pink/10 transition-all ${truthWins ? "border-neon-pink/60" : "border-neon-pink/30"
                                        }`}
                                >
                                    Truth ({votes.truth}) · ${CROWD_TV_FEES.truth}
                                </button>
                                <button
                                    onClick={() => {
                                        setVotes((v) => ({ ...v, dare: v.dare + 1 }));
                                        handlePurchase('crowd_vote_truth_dare', CROWD_TV_FEES.dare, { type: 'dare' });
                                    }}
                                    className={`rounded-xl border py-2 text-xs hover:bg-neon-pink/10 transition-all ${!truthWins ? "border-neon-pink/60" : "border-neon-pink/30"
                                        }`}
                                >
                                    Dare ({votes.dare}) · ${CROWD_TV_FEES.dare}
                                </button>
                            </div>
                        </div>

                        {/* Other Add-ons */}
                        <button
                            onClick={() => handlePurchase('double_dare', 15)}
                            className="w-full rounded-xl bg-neon-pink/90 hover:bg-neon-pink py-2 text-sm mb-2 transition-all font-bold"
                        >
                            Double Dare (+$15)
                        </button>

                        <div className="mb-2">
                            <div className="text-xs text-muted-foreground mb-1">Camera Views</div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handlePurchase('camera_unlock', 10, { view: 'close-up' })}
                                    className="rounded-xl border border-neon-pink/40 py-2 text-xs flex items-center justify-center gap-1 hover:bg-neon-pink/10 transition-all"
                                >
                                    <Eye className="w-4 h-4" /> Close-Up ($10)
                                </button>
                                <button
                                    onClick={() => handlePurchase('camera_unlock', 15, { view: 'full-body' })}
                                    className="rounded-xl border border-neon-pink/40 py-2 text-xs flex items-center justify-center gap-1 hover:bg-neon-pink/10 transition-all"
                                >
                                    <Eye className="w-4 h-4" /> Full Body ($15)
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => handlePurchase('time_extension', 5, { duration: '30s' })}
                            className="w-full rounded-xl border border-neon-pink/40 py-2 text-sm flex items-center justify-center gap-1 hover:bg-neon-pink/10 mb-2 transition-all"
                        >
                            <Timer className="w-4 h-4" /> +30s Dare ($5)
                        </button>

                        <div className="text-xs text-neon-pink flex items-center gap-1 mb-2">
                            <Crown className="w-4 h-4" /> Dare King: {topFan}
                        </div>

                        <div className="text-xs text-muted-foreground mb-2">
                            Creators may decline any prompt. A same-tier replacement is auto-served.
                        </div>

                        <button
                            onClick={() => handlePurchase('replay', 10)}
                            className="w-full rounded-xl border border-neon-pink/40 py-2 text-sm hover:bg-neon-pink/10 transition-all"
                        >
                            Replay Last Dare ($10)
                        </button>
                        {replayAvailable && <div className="text-xs text-neon-pink mt-1">Replay available for 2 minutes</div>}
                    </div>

                    {/* Info Footer */}
                    <div className="text-xs text-muted-foreground space-y-1">
                        <p className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> Up to 4 creators & 10 fans
                        </p>
                        <p className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> Fan entry ${ENTRY_FEE} · First {FREE_MINUTES} min free · Then ${PER_MINUTE_FEE}/min
                        </p>
                        <p className="flex items-center gap-1">
                            <Star className="w-3 h-3" /> Tips split 90/10 (creator/platform)
                        </p>
                    </div>
                </aside>
            </main>

            {showInviteModal && (
                <InviteModal
                    roomId={activeRoomId}
                    inviterRole={myRoomRole}
                    onClose={() => setShowInviteModal(false)}
                />
            )}
        </div>
    );
}
