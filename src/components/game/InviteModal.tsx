import { useState, useEffect } from "react";
import { Search, UserPlus, X, Shield, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NeonInput } from "@/components/ui/neon-input";
import { GlassCard } from "@/components/ui/glass-card";
import { toast } from "sonner";

interface Profile {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
}

interface InviteModalProps {
    roomId: string;
    inviterRole: "creator" | "fan";
    onClose: () => void;
}

export function InviteModal({ roomId, inviterRole, onClose }: InviteModalProps) {
    const [search, setSearch] = useState("");
    const [results, setResults] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(false);
    const [invitingId, setInvitingId] = useState<string | null>(null);
    const [inviteAs, setInviteAs] = useState<"creator" | "fan">("fan");

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            if (search.trim()) {
                handleSearch();
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [search]);

    const handleSearch = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .ilike("username", `%${search}%`)
            .limit(5);

        if (!error && data) {
            setResults(data);
        }
        setLoading(false);
    };

    const handleInvite = async (receiverId: string) => {
        setInvitingId(receiverId);
        try {
            const { data, error } = await (supabase as any).rpc("invite_user", {
                p_room_id: roomId,
                p_receiver_id: receiverId,
                p_role: inviteAs,
            });

            if (error) throw error;

            toast.success("Invitation sent!");
            // Optional: Close or just keep open for more invites
        } catch (error: any) {
            toast.error(error.message || "Failed to send invitation");
        } finally {
            setInvitingId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <GlassCard border="pink" className="w-full max-w-md animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-display font-bold text-foreground">
                        Invite to <span className="neon-text-pink">Room</span>
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-6 h-6 text-muted-foreground" />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Role Selection (Only for creators) */}
                    {inviterRole === "creator" && (
                        <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
                            <button
                                onClick={() => setInviteAs("fan")}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-all ${inviteAs === "fan" ? "bg-neon-cyan text-background font-bold shadow-[0_0_10px_rgba(0,255,255,0.5)]" : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <Users className="w-4 h-4" /> Fan
                            </button>
                            <button
                                onClick={() => setInviteAs("creator")}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-all ${inviteAs === "creator" ? "bg-neon-pink text-white font-bold shadow-[0_0_10px_rgba(255,0,255,0.5)]" : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <Shield className="w-4 h-4" /> Creator
                            </button>
                        </div>
                    )}

                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <NeonInput
                            placeholder="Enter username..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                            color={inviteAs === "creator" ? "pink" : "cyan"}
                        />
                    </div>

                    {/* Results */}
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                        {loading ? (
                            <div className="text-center py-4 text-sm text-muted-foreground animate-pulse">Searching...</div>
                        ) : results.length > 0 ? (
                            results.map((profile) => (
                                <div
                                    key={profile.id}
                                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center text-sm font-bold overflow-hidden">
                                            {profile.avatar_url ? (
                                                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                profile.username.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-foreground truncate max-w-[120px]">
                                                {profile.display_name || profile.username}
                                            </p>
                                            <p className="text-xs text-muted-foreground">@{profile.username}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleInvite(profile.id)}
                                        disabled={invitingId === profile.id}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${inviteAs === "creator"
                                            ? "bg-neon-pink text-white hover:shadow-[0_0_10px_rgba(255,0,255,0.4)]"
                                            : "bg-neon-cyan text-background hover:shadow-[0_0_10px_rgba(0,255,255,0.4)]"
                                            } disabled:opacity-50`}
                                    >
                                        <UserPlus className="w-3.5 h-3.5" />
                                        {invitingId === profile.id ? "Working..." : "Invite"}
                                    </button>
                                </div>
                            ))
                        ) : search.trim() ? (
                            <div className="text-center py-4 text-sm text-muted-foreground">No users found</div>
                        ) : (
                            <div className="text-center py-8 text-xs text-muted-foreground">
                                Invite players to fill the slots!
                            </div>
                        )}
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}
