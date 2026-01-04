import React, { useEffect, useMemo, useState } from "react";
import {
    Crown,
    MessageCircle,
    Star,
    Lock,
    Sparkles,
    ChevronDown,
    Search,
    Users,
    Settings,
    CreditCard,
    LogOut,
    User,
    Bell,
    Video,
    Image as ImageIcon,
    ArrowLeft,
    Send,
    Heart,
    Link as LinkIcon,
    Eye
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";

/**
 * PlayGroundX — FUNCTIONAL HOME
 * ------------------------------------------------
 * Functional version of the mockup:
 *  - Real auth context for header/personalization
 *  - Real creator data from Supabase Profiles
 *  - Real feed data from Supabase Posts
 *  - Real navigation to production rooms
 *  - Maintains interactive previews as "Demos"
 */

// ---- Helpers --------------------------------------------------------------
function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

// ---- Local icon (bar/drink) ----------------------------------------------
function BarDrinkIcon({ className = "" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 3h10l-1 7a4 4 0 0 1-4 3H12a4 4 0 0 1-4-3L7 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M10 21h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M12 13v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M9 6h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );
}

// ---- Types ----------------------------------------------------------------
type Route = "home" | "suga4u_demo" | "bar_lounge_demo" | "confessions_demo" | "creator_confessions_demo" | "truth_or_dare_demo";
type CreatorLevel = "All" | "Rookie" | "Rising" | "Star" | "Elite";
type RoomTag = "All" | "Flash Drops" | "Confessions" | "X Chat" | "Bar Lounge" | "Truth or Dare" | "Suga 4 U";

interface Profile {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    categories: string[] | null;
    is_verified: boolean | null;
}

interface Post {
    id: string;
    title: string | null;
    content: string | null;
    content_url: string | null;
    is_locked: boolean | null;
    likes_count: number | null;
    creator_id: string;
    creator: {
        username: string;
        display_name: string | null;
    };
}

// ---- Formatting -----------------------------------------------------------
const CAT_TO_TAG: Record<string, RoomTag> = {
    drops: "Flash Drops",
    conf: "Confessions",
    xchat: "X Chat",
    bar: "Bar Lounge",
    truth: "Truth or Dare",
    suga4u: "Suga 4 U",
};

// ---- Branding --------------------------------------------------------------
function Logo() {
    return (
        <div className="flex items-center gap-3 select-none">
            <div className="text-2xl leading-none">
                <span className="pgx-logo">PlayGround</span>
                <span className="pgx-logo-x">X</span>
            </div>
            <span className="ml-1 text-[10px] px-2 py-[2px] rounded-full border border-pink-500/40 text-pink-200 bg-black/40">Home</span>
        </div>
    );
}

// ---- Reusable UI -----------------------------------------------------------
function NeonCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cx("rounded-2xl border border-pink-500/25 bg-black shadow-[0_0_22px_rgba(236,72,153,0.14),0_0_52px_rgba(59,130,246,0.08)] transition-all overflow-hidden", className)}>
            {children}
        </div>
    );
}

function Dropdown({ label, items, tone = "pink" }: { label: React.ReactNode; items: Array<{ icon?: React.ReactNode; text: string; onClick?: () => void }>; tone?: "pink" | "blue" }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="w-full relative z-50">
            <button onClick={() => setOpen((o) => !o)} className={cx("w-full flex items-center justify-between gap-2 rounded-2xl px-4 py-3 border bg-black/40 transition", tone === "pink" ? "border-pink-500/35 text-pink-200 hover:bg-pink-600/10" : "border-blue-500/35 text-blue-200 hover:bg-blue-600/10")}>
                <span className="inline-flex items-center gap-2">{label}</span>
                <ChevronDown className={cx("w-4 h-4 transition", open && "rotate-180")} />
            </button>
            {open && (
                <div className={cx("absolute top-full mt-2 w-full rounded-2xl border bg-black/95 shadow-2xl overflow-hidden backdrop-blur-xl", tone === "pink" ? "border-pink-500/25" : "border-blue-500/25")}>
                    <div className="py-2 flex flex-col">
                        {items.map((it, idx) => (
                            <button key={`${it.text}-${idx}`} onClick={() => { setOpen(false); it.onClick?.(); }} className="w-full px-4 py-2 text-sm flex items-center gap-2 hover:bg-white/10 transition-colors">
                                <span className="opacity-70">{it.icon}</span>
                                <span>{it.text}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function toneClasses(tone: "pink" | "green" | "purple" | "red" | "blue" | "yellow") {
    switch (tone) {
        case "green": return { text: "text-emerald-300", border: "border-emerald-300/30", glow: "shadow-[0_0_15px_rgba(0,255,170,0.2)]", hover: "hover:bg-emerald-500/10" };
        case "purple": return { text: "text-violet-300", border: "border-violet-300/30", glow: "shadow-[0_0_15px_rgba(170,80,255,0.2)]", hover: "hover:bg-violet-500/10" };
        case "red": return { text: "text-rose-300", border: "border-rose-300/30", glow: "shadow-[0_0_15px_rgba(255,55,95,0.2)]", hover: "hover:bg-rose-500/10" };
        case "blue": return { text: "text-cyan-200", border: "border-cyan-200/30", glow: "shadow-[0_0_15px_rgba(0,230,255,0.2)]", hover: "hover:bg-cyan-500/10" };
        case "yellow": return { text: "text-lime-200", border: "border-lime-200/30", glow: "shadow-[0_0_15px_rgba(200,255,0,0.2)]", hover: "hover:bg-lime-500/10" };
        default: return { text: "text-fuchsia-300", border: "border-fuchsia-300/30", glow: "shadow-[0_0_15px_rgba(255,0,200,0.2)]", hover: "hover:bg-fuchsia-500/10" };
    }
}

function CreatorTile({ profile, onClick }: { profile: Profile; onClick: () => void }) {
    const tags = profile.categories?.slice(0, 2) || ["General"];
    return (
        <button onClick={onClick} className="h-full rounded-2xl border border-pink-500/25 bg-black/40 overflow-hidden hover:border-pink-500/45 transition flex flex-col text-left group">
            <div className="h-32 w-full bg-secondary/50 overflow-hidden">
                {profile.avatar_url ? (
                    <img src={profile.avatar_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={profile.username} />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-pink-500/10 to-blue-500/10 flex items-center justify-center">
                        <User className="w-10 h-10 text-white/10" />
                    </div>
                )}
            </div>
            <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                    <div className="text-sm text-fuchsia-300 font-semibold truncate">{profile.display_name || profile.username}</div>
                    {profile.is_verified && <Crown className="w-3 h-3 text-yellow-400" />}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                    {tags.map((t, idx) => (
                        <span key={idx} className="text-[9px] px-2 py-0.5 rounded-full border border-pink-500/20 text-pink-200">{t}</span>
                    ))}
                </div>
            </div>
        </button>
    );
}

// ---- Home Screen ----------------------------------------------------------
function HomeScreen({ query, setQuery, onOpenDemo, creators, loadingCreators }: { query: string; setQuery: (v: string) => void; onOpenDemo: (route: Route) => void; creators: Profile[]; loadingCreators: boolean; }) {
    const navigate = useNavigate();
    const [tagFilter, setTagFilter] = useState<RoomTag>("All");

    const CATS = [
        { label: "Flash Drops", key: "drops", icon: <Sparkles className="w-4 h-4" />, tone: "blue" },
        { label: "Confessions", key: "conf", icon: <Lock className="w-4 h-4" />, tone: "red" },
        { label: "Bar Lounge", key: "bar", icon: <BarDrinkIcon className="w-4 h-4" />, tone: "purple" },
        { label: "Truth or Dare", key: "truth", icon: <MessageCircle className="w-4 h-4" />, tone: "green" },
        { label: "Suga 4 U", key: "suga4u", icon: <Crown className="w-4 h-4" />, tone: "pink", primary: true },
    ];

    const filtered = useMemo(() => {
        let rows = creators;
        if (tagFilter !== "All") {
            rows = rows.filter(c => c.categories?.includes(tagFilter));
        }
        if (query.trim()) {
            const q = query.toLowerCase();
            rows = rows.filter(c => (c.display_name || c.username).toLowerCase().includes(q));
        }
        return rows;
    }, [query, tagFilter, creators]);

    const handleEnter = () => {
        if (tagFilter === "Suga 4 U") navigate("/suga4u");
        else if (tagFilter === "Truth or Dare") navigate("/games/truth-or-dare");
        else if (tagFilter === "Confessions") {
            const firstCreatorId = creators.find(c => c.categories?.includes("Confessions"))?.id || creators[0]?.id;
            if (firstCreatorId) navigate(`/confessions/${firstCreatorId}`);
            else toast.error("No creators available for confessions");
        }
        else if (tagFilter === "Flash Drops") {
            const firstCreatorId = creators.find(c => c.categories?.includes("Flash Drops"))?.id || creators[0]?.id;
            if (firstCreatorId) navigate(`/flash-drops/${firstCreatorId}`);
            else toast.error("No creators available for flash drops");
        }
        else if (tagFilter === "X Chat") {
            const firstCreatorId = creators.find(c => c.categories?.includes("X Chat"))?.id || creators[0]?.id;
            if (firstCreatorId) navigate(`/x-chat/${firstCreatorId}`);
            else toast.error("No creators available for X Chat");
        }
        else if (tagFilter === "Bar Lounge") {
            const firstCreatorId = creators.find(c => c.categories?.includes("Bar Lounge"))?.id || creators[0]?.id;
            if (firstCreatorId) navigate(`/bar-lounge/${firstCreatorId}`);
            else toast.error("No creators available for Bar Lounge");
        }
        else onOpenDemo("home");
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
            {/* Grid */}
            <div className="space-y-6">
                {loadingCreators ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="aspect-[4/5] bg-white/5 animate-pulse rounded-2xl" />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <Search className="w-10 h-10 mb-4 opacity-20" />
                        <p>No creators found matching your criteria</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {filtered.map(c => (
                            <CreatorTile
                                key={c.id}
                                profile={c}
                                onClick={() => {
                                    if (tagFilter === "Flash Drops") navigate(`/flash-drops/${c.id}`);
                                    else if (tagFilter === "Confessions") navigate(`/confessions/${c.id}`);
                                    else if (tagFilter === "X Chat") navigate(`/x-chat/${c.id}`);
                                    else if (tagFilter === "Bar Lounge") navigate(`/bar-lounge/${c.id}`);
                                    else if (tagFilter === "Truth or Dare") navigate(`/games/truth-or-dare/${c.id}`);
                                    else if (tagFilter === "Suga 4 U") navigate(`/suga4u`);
                                    else navigate(`/profile/${c.id}`);
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ---- Demos (Bar, Confessions, Suga, Truth/Dare) -----------------------------
function TruthOrDareRoomPreview({ onBack }: { onBack: () => void }) {
    const navigate = useNavigate();
    const [billing, setBilling] = useState(false);
    const [mins, setMins] = useState(0);
    const [msg, setMsg] = useState("");
    const tiers = [{ id: "b", l: "Bronze", p: 5, d: "Naughty" }, { id: "s", l: "Silver", p: 10, d: "Spicy" }, { id: "g", l: "Gold", p: 20, d: "Explicit" }];
    const cost = (billing ? 10 : 0) + Math.max(0, mins - 10) * 2;
    const act = (s: string) => { setBilling(true); setMsg(s); if (mins === 0) setMins(1); };
    return (
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></button>
                <div><h2 className="text-emerald-300 font-bold">Truth or Dare DEMO</h2><p className="text-xs text-gray-400">Interactive preview of gameplay mechanics</p></div>
                <button onClick={() => navigate("/games/truth-or-dare")} className="px-6 py-2 bg-emerald-600 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20">Go to Full Room</button>
            </div>
            <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-4">
                    <NeonCard className="p-4"><div className="grid grid-cols-2 gap-3 mb-4">{[1, 2, 3, 4].map(i => <div key={i} className="aspect-video bg-white/5 border border-white/10 rounded-xl flex items-center justify-center relative"><Video className="opacity-20" /><span className="absolute bottom-2 left-2 text-[10px] bg-black/60 px-2 py-1 rounded">Creator {i} (Demo)</span></div>)}</div></NeonCard>
                    {msg && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-200 animate-pulse flex items-center gap-2"><Sparkles className="w-4 h-4" /> {msg}</div>}
                </div>
                <div className="lg:col-span-4 space-y-4 h-fit">
                    <NeonCard className="p-4 space-y-4">
                        <p className="text-emerald-300 text-xs font-bold">Game Tiers</p>
                        {tiers.map(t => <button key={t.id} onClick={() => act(`${t.l} prompt purchased`)} className="w-full text-left p-3 rounded-xl border border-emerald-500/20 bg-black/40 hover:bg-emerald-500/10 transition-colors flex justify-between items-center"><div className="text-sm"><b>{t.l}</b><p className="text-[10px] text-gray-400">{t.d}</p></div><span className="text-emerald-300 font-bold">${t.p}</span></button>)}
                        <hr className="border-white/5" /><div className="text-xs text-center text-gray-500 pb-2">Entry: $10 • Timer: ${cost}</div>
                        <button onClick={() => act("Demo request submitted")} className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold">Submit Response</button>
                    </NeonCard>
                </div>
            </div>
        </div>
    );
}

// ---- App Shell / Main Component ------------------------------------------
export default function PlaygroundxMockup() {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const [route, setRoute] = useState<Route>("home");
    const [q, setQ] = useState("");

    // Data State
    const [creators, setCreators] = useState<Profile[]>([]);
    const [loadingCreators, setLoadingCreators] = useState(true);
    const [feedPosts, setFeedPosts] = useState<Post[]>([]);
    const [loadingFeed, setLoadingFeed] = useState(true);

    useEffect(() => {
        async function fetchData() {
            // Fetch Creators (Profiles with categories or joining user_roles if needed)
            // Since schema is flexible, we filter by Profiles that have display_name or verified
            const { data: creatorData, error: cErr } = await supabase
                .from('profiles')
                .select('*')
                .limit(20);

            if (!cErr && creatorData) setCreators(creatorData);
            setLoadingCreators(false);

            // Fetch Feed
            const { data: postData, error: pErr } = await supabase
                .from('posts')
                .select('*, creator:profiles(username, display_name)')
                .order('created_at', { ascending: false })
                .limit(5);

            if (!pErr && postData) setFeedPosts(postData as any);
            setLoadingFeed(false);
        }
        fetchData();
    }, []);

    const goH = () => setRoute("home");

    return (
        <AppLayout>
            <div className="bg-black text-white selection:bg-pink-500/30 font-sans min-h-screen">
                <style>{`.pgx-logo{font-family:cursive;font-style:italic;color:#ff00c8;text-shadow:0 0 18px #ff00c8}.pgx-logo-x{font-family:cursive;column-gap:2px;color:#00e6ff;text-shadow:0 0 18px #00e6ff}.neon-smoke{background:radial-gradient(circle at 50% 50%,#ff00c81a,#00e6ff1a);filter:blur(40px)}`}</style>

                <div className="grid lg:grid-cols-12 max-w-[1600px] mx-auto">
                    {/* Main Content */}
                    <div className={cx(route === "home" ? "lg:col-span-9" : "lg:col-span-12")}>
                        {route === "home" ? (
                            <HomeScreen query={q} setQuery={setQ} onOpenDemo={setRoute} creators={creators} loadingCreators={loadingCreators} />
                        ) : route === "truth_or_dare_demo" ? (
                            <TruthOrDareRoomPreview onBack={goH} />
                        ) : (
                            <div className="p-20 text-center space-y-5">
                                <h2 className="text-fuchsia-400 text-3xl font-bold">Room Demo</h2>
                                <p className="text-gray-400 max-w-md mx-auto">This is an interactive demo of the room features. Real rooms are active in the production application.</p>
                                <button onClick={goH} className="px-8 py-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all">Back to Home</button>
                            </div>
                        )}
                    </div>

                    {/* Right Sidebar - Dynamic Feed */}
                    {route === "home" && (
                        <div className="lg:col-span-3 p-6 border-l border-white/5 space-y-6 hidden lg:block overflow-y-auto max-h-[calc(100vh-80px)]">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-white/50">Recent Drops</h3>
                                <button onClick={() => navigate("/feed")} className="text-xs text-fuchsia-400 hover:underline">View All</button>
                            </div>

                            {loadingFeed ? (
                                [1, 2, 3].map(i => <div key={i} className="h-64 bg-white/5 rounded-2xl animate-pulse" />)
                            ) : feedPosts.length === 0 ? (
                                <div className="text-xs text-center text-gray-500 pt-10">No recent posts</div>
                            ) : (
                                feedPosts.map(post => (
                                    <NeonCard key={post.id} className="p-4 space-y-3 bg-secondary/20">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-gray-400">@{post.creator.username}</span>
                                            {post.is_locked ? <Lock className="w-3 h-3 text-pink-500" /> : <ImageIcon className="w-3 h-3 text-blue-400" />}
                                        </div>
                                        {post.content_url ? (
                                            <div className="aspect-video bg-black rounded-xl overflow-hidden relative group">
                                                <img src={post.content_url} className={cx("w-full h-full object-cover transition-all", post.is_locked && "blur-xl saturate-150")} alt="" />
                                                {post.is_locked && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Lock className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-200 line-clamp-3">{post.content}</p>
                                        )}
                                        <div className="flex items-center justify-between pt-2">
                                            <div className="flex items-center gap-1 text-[10px] text-gray-400"><Heart className="w-3 h-3" /> {post.likes_count || 0}</div>
                                            <button onClick={() => navigate(`/post/${post.id}`)} className="text-[10px] px-3 py-1 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10">Unlock</button>
                                        </div>
                                    </NeonCard>
                                ))
                            )}

                            <div className="pt-6">
                                <NeonCard className="p-5 bg-gradient-to-br from-fuchsia-600/20 to-blue-600/20 border-fuchsia-500/30">
                                    <h4 className="text-sm font-bold mb-2">Upgrade to VIP</h4>
                                    <p className="text-xs text-white/60 mb-4 leading-relaxed">Unlock all room entries, see locked photos, and get priority response from creators.</p>
                                    <button onClick={() => navigate("/wallet")} className="w-full py-2 bg-white text-black text-xs font-bold rounded-xl hover:bg-gray-100 transition-all">Go Subscription</button>
                                </NeonCard>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
