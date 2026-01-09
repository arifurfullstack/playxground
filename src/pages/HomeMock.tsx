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
} from "lucide-react";

// ---- Helpers --------------------------------------------------------------
function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

const noop = () => { };

// Minimal dev-time sanity checks (no UI impact)
function useDevSanityTests() {
    useEffect(() => {
        // Tests elided for brevity
    }, []);
}

// ---- Local icon (bar/drink) ----------------------------------------------
function BarDrinkIcon({ className = "" }: { className?: string }) {
    return (<>
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path
                d="M7 3h10l-1 7a4 4 0 0 1-4 3H12a4 4 0 0 1-4-3L7 3Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
            />
            <path d="M10 21h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M12 13v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M9 6h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    </>);
}

// ---- Types ----------------------------------------------------------------
type Route = "home" | "suga4u" | "bar_lounge" | "confessions" | "creator_confessions";
type CreatorLevel = "All" | "Rookie" | "Rising" | "Star" | "Elite";
type SortBy = "Recommended" | "Rookie→Elite" | "Elite→Rookie";
type RoomTag = "All" | "Flash Drops" | "Confessions" | "X Chat" | "Bar Lounge" | "Truth or Dare" | "Suga 4 U";

type CreatorCard = {
    id: string;
    name: string;
    level: Exclude<CreatorLevel, "All">;
    tags: Array<Exclude<RoomTag, "All">>;
};

// ---- Mock Data ------------------------------------------------------------
const CREATORS: CreatorCard[] = [
    { id: "c1", name: "NeonNyla", level: "Elite", tags: ["Suga 4 U", "Flash Drops"] },
    { id: "c2", name: "PinkVibe", level: "Star", tags: ["Truth or Dare", "Bar Lounge"] },
    { id: "c3", name: "BlueMuse", level: "Rising", tags: ["X Chat", "Confessions"] },
    { id: "c4", name: "LunaLux", level: "Elite", tags: ["Suga 4 U", "Confessions"] },
    { id: "c5", name: "NovaHeat", level: "Star", tags: ["Flash Drops", "Bar Lounge"] },
    { id: "c6", name: "RoxyRave", level: "Rookie", tags: ["Truth or Dare", "X Chat"] },
    { id: "c7", name: "VelvetX", level: "Rising", tags: ["Bar Lounge", "Confessions"] },
    { id: "c8", name: "Sapphire", level: "Star", tags: ["Suga 4 U", "Truth or Dare"] },
];

const CREATOR_LEVELS: CreatorLevel[] = ["All", "Rookie", "Rising", "Star", "Elite"];

const ROOM_TAGS: RoomTag[] = [
    "All",
    "Flash Drops",
    "Confessions",
    "X Chat",
    "Bar Lounge",
    "Truth or Dare",
    "Suga 4 U",
];

// ---- Branding & Helper Components P1 ---------------------------------------
// ---- Branding --------------------------------------------------------------
function Logo() {
    return (
        <div className="flex items-center gap-3 select-none">
            <div className="text-2xl leading-none">
                <span className="pgx-logo">PlayGround</span>
                <span className="pgx-logo-x">X</span>
            </div>
            <span className="ml-1 text-[10px] px-2 py-[2px] rounded-full border border-pink-500/40 text-pink-200 bg-black/40">
                Preview
            </span>
        </div>
    );
}

// ---- Reusable UI -----------------------------------------------------------
function NeonCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={cx(
                "rounded-2xl border border-pink-500/25 bg-black",
                "shadow-[0_0_22px_rgba(236,72,153,0.14),0_0_52px_rgba(59,130,246,0.08)]",
                "hover:shadow-[0_0_34px_rgba(236,72,153,0.20),0_0_78px_rgba(59,130,246,0.12)] transition-shadow",
                className
            )}
        >
            {children}
        </div>
    );
}

function Dropdown({
    label,
    items,
    tone = "pink",
}: {
    label: React.ReactNode;
    items: Array<{ icon?: React.ReactNode; text: string; onClick?: () => void }>;
    tone?: "pink" | "blue";
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="w-full">
            <button
                onClick={() => setOpen((o) => !o)}
                className={cx(
                    "w-full flex items-center justify-between gap-2 rounded-2xl px-4 py-3",
                    "border bg-black/40 transition",
                    tone === "pink"
                        ? "border-pink-500/35 text-pink-200 hover:bg-pink-600/10"
                        : "border-blue-500/35 text-blue-200 hover:bg-blue-600/10"
                )}
            >
                <span className="inline-flex items-center gap-2">{label}</span>
                <ChevronDown className={cx("w-4 h-4 transition", open && "rotate-180")} />
            </button>

            {open && (
                <div
                    className={cx(
                        "mt-2 w-full rounded-2xl border bg-black/75",
                        tone === "pink" ? "border-pink-500/25" : "border-blue-500/25"
                    )}
                >
                    <div className="py-2 flex flex-col items-center text-center">
                        {items.map((it, idx) => (
                            <button
                                key={`${it.text}-${idx}`}
                                onClick={() => {
                                    setOpen(false);
                                    it.onClick?.();
                                }}
                                className="w-full px-4 py-2 text-sm flex items-center justify-center gap-2 hover:bg-white/5"
                            >
                                <span className="opacity-90">{it.icon}</span>
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
        case "green":
            return {
                text: "text-emerald-300 drop-shadow-[0_0_28px_rgba(0,255,170,1)] neon-deep",
                icon: "text-emerald-300 drop-shadow-[0_0_34px_rgba(0,255,170,1)]",
                border: "border-emerald-300/90",
                glow: "shadow-[0_0_16px_rgba(0,255,170,0.72),0_0_48px_rgba(0,255,170,0.36)] hover:shadow-[0_0_22px_rgba(0,255,170,0.86),0_0_72px_rgba(0,255,170,0.50)]",
                hover: "hover:bg-emerald-500/8",
            };
        case "purple":
            return {
                text: "text-violet-300 drop-shadow-[0_0_28px_rgba(170,80,255,1)] neon-deep",
                icon: "text-violet-300 drop-shadow-[0_0_34px_rgba(170,80,255,1)]",
                border: "border-violet-300/90",
                glow: "shadow-[0_0_16px_rgba(170,80,255,0.72),0_0_48px_rgba(170,80,255,0.36)] hover:shadow-[0_0_22px_rgba(170,80,255,0.86),0_0_72px_rgba(170,80,255,0.50)]",
                hover: "hover:bg-violet-500/8",
            };
        case "red":
            return {
                text: "text-rose-300 drop-shadow-[0_0_28px_rgba(255,55,95,1)] neon-deep",
                icon: "text-rose-300 drop-shadow-[0_0_34px_rgba(255,55,95,1)]",
                border: "border-rose-300/90",
                glow: "shadow-[0_0_16px_rgba(255,55,95,0.72),0_0_48px_rgba(255,55,95,0.36)] hover:shadow-[0_0_22px_rgba(255,55,95,0.86),0_0_72px_rgba(255,55,95,0.50)]",
                hover: "hover:bg-rose-500/8",
            };
        case "blue":
            return {
                text: "text-cyan-200 drop-shadow-[0_0_28px_rgba(0,230,255,1)] neon-deep",
                icon: "text-cyan-200 drop-shadow-[0_0_34px_rgba(0,230,255,1)]",
                border: "border-cyan-200/90",
                glow: "shadow-[0_0_16px_rgba(0,230,255,0.72),0_0_48px_rgba(0,230,255,0.36)] hover:shadow-[0_0_22px_rgba(0,230,255,0.86),0_0_72px_rgba(0,230,255,0.50)]",
                hover: "hover:bg-cyan-500/8",
            };
        case "yellow":
            return {
                text: "text-lime-200 drop-shadow-[0_0_28px_rgba(200,255,0,1)] neon-deep",
                icon: "text-lime-200 drop-shadow-[0_0_34px_rgba(200,255,0,1)]",
                border: "border-lime-200/90",
                glow: "shadow-[0_0_16px_rgba(200,255,0,0.70),0_0_48px_rgba(200,255,0,0.34)] hover:shadow-[0_0_22px_rgba(200,255,0,0.85),0_0_72px_rgba(200,255,0,0.48)]",
                hover: "hover:bg-lime-500/8",
            };
        default:
            return {
                text: "text-fuchsia-300 drop-shadow-[0_0_30px_rgba(255,0,200,1)] neon-deep",
                icon: "text-fuchsia-300 drop-shadow-[0_0_36px_rgba(255,0,200,1)]",
                border: "border-fuchsia-300/90",
                glow: "shadow-[0_0_18px_rgba(255,0,200,0.72),0_0_54px_rgba(255,0,200,0.38)] hover:shadow-[0_0_26px_rgba(255,0,200,0.86),0_0_86px_rgba(255,0,200,0.54)]",
                hover: "hover:bg-fuchsia-500/8",
            };
    }
}

function CreatorTile({ creator }: { creator: CreatorCard }) {
    const tags = creator.tags.slice(0, 2);
    while (tags.length < 2) tags.push("Flash Drops");

    return (
        <button
            className={cx(
                "h-full rounded-2xl border border-pink-500/25 bg-black/40 overflow-hidden",
                "hover:border-pink-500/45 transition flex flex-col"
            )}
            title="Preview tile"
        >
            <div className="h-36 w-full bg-gradient-to-b from-pink-500/18 via-black to-blue-500/10" />

            <div className="p-3 text-left flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-2 min-h-[22px]">
                    <div className="text-sm text-fuchsia-300 font-semibold truncate drop-shadow-[0_0_46px_rgba(255,0,200,1)]">
                        {creator.name}
                    </div>
                    <span className="shrink-0 text-[10px] px-2 py-[2px] rounded-full border border-blue-500/25 text-blue-200">
                        {creator.level}
                    </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-1 min-h-[28px]">
                    {tags.map((t, idx) => (
                        <span
                            key={`${creator.id}-${t}-${idx}`}
                            className="text-[10px] px-2 py-[2px] rounded-full border border-pink-500/20 text-pink-200"
                        >
                            {t}
                        </span>
                    ))}
                </div>

                <div className="flex-1" />
            </div>
        </button>
    );
}

// ---- Home Screen ----------------------------------------------------------
function HomeScreen({
    query,
    setQuery,
    onOpenSuga4U,
    onOpenConfessions,
    onOpenBarLounge,
}: {
    query: string;
    setQuery: (v: string) => void;
    onOpenSuga4U: () => void;
    onOpenConfessions: () => void;
    onOpenBarLounge: () => void;
}) {
    const [levelFilter, setLevelFilter] = useState<CreatorLevel>("All");
    const [activeCat, setActiveCat] = useState<string>("suga4u");
    const [tagFilter, setTagFilter] = useState<RoomTag>("Suga 4 U");
    const [sortBy, setSortBy] = useState<SortBy>("Recommended");

    const CAT_TO_TAG: Record<string, RoomTag> = {
        drops: "Flash Drops",
        conf: "Confessions",
        xchat: "X Chat",
        bar: "Bar Lounge",
        truth: "Truth or Dare",
        suga4u: "Suga 4 U",
    };

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        let rows = CREATORS.slice();

        if (q) {
            rows = rows.filter((c) => [c.name, c.level, ...c.tags].some((t) => t.toLowerCase().includes(q)));
        }

        if (levelFilter !== "All") rows = rows.filter((c) => c.level === levelFilter);
        if (tagFilter !== "All") rows = rows.filter((c) => c.tags.includes(tagFilter as any));

        const rank: Record<CreatorCard["level"], number> = { Rookie: 1, Rising: 2, Star: 3, Elite: 4 };
        if (sortBy === "Rookie→Elite") rows.sort((a, b) => rank[a.level] - rank[b.level]);
        if (sortBy === "Elite→Rookie") rows.sort((a, b) => rank[b.level] - rank[a.level]);

        return rows;
    }, [query, levelFilter, tagFilter, sortBy]);

    const CATS: Array<{
        label: string;
        key: string;
        icon: React.ReactNode;
        tone: "pink" | "green" | "purple" | "red" | "blue" | "yellow";
        primary?: boolean;
    }> = [
            { label: "Flash Drops", key: "drops", icon: <Sparkles className="w-4 h-4" />, tone: "blue" },
            { label: "Confessions", key: "conf", icon: <Lock className="w-4 h-4" />, tone: "red" },
            { label: "X Chat", key: "xchat", icon: <MessageCircle className="w-4 h-4" />, tone: "yellow" },
            { label: "Bar Lounge", key: "bar", icon: <BarDrinkIcon className="w-4 h-4" />, tone: "purple" },
            { label: "Truth or Dare", key: "truth", icon: <MessageCircle className="w-4 h-4" />, tone: "green" },
            { label: "Suga 4 U", key: "suga4u", icon: <Crown className="w-4 h-4" />, tone: "pink", primary: true },
        ];

    const canEnter = tagFilter === "Suga 4 U" || tagFilter === "Confessions" || tagFilter === "Bar Lounge";

    return (
        <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left sidebar */}
                <NeonCard className="relative overflow-hidden p-4 lg:col-span-2">
                    <div className="pointer-events-none absolute inset-0 opacity-50">
                        <div className="absolute -inset-12 blur-3xl bg-[radial-gradient(circle_at_22%_18%,rgba(255,0,200,0.26),transparent_55%),radial-gradient(circle_at_80%_40%,rgba(0,230,255,0.18),transparent_60%)]" />
                    </div>

                    <div className="relative">
                        <div className="neon-smoke" aria-hidden="true" />

                        <div className="text-fuchsia-300 text-sm mb-3 neon-flicker drop-shadow-[0_0_58px_rgba(255,0,200,1)]">
                            Browse
                        </div>

                        <div>
                            <div className="text-xs text-fuchsia-300 inline-flex items-center gap-2 drop-shadow-[0_0_58px_rgba(255,0,200,1)]">
                                <Search className="w-4 h-4 text-fuchsia-300 drop-shadow-[0_0_62px_rgba(255,0,200,1)]" />
                                Categories
                            </div>

                            <div className="mt-3 space-y-2">
                                {CATS.map((cat) => {
                                    const t = toneClasses(cat.tone);
                                    const isPrimary = !!cat.primary;
                                    return (
                                        <button
                                            key={cat.key}
                                            onClick={() => {
                                                setActiveCat(cat.key);
                                                setTagFilter(CAT_TO_TAG[cat.key] ?? "All");
                                            }}
                                            className={cx(
                                                "w-full text-left px-3 py-2 rounded-xl border text-sm transition",
                                                "bg-black/55",
                                                t.border,
                                                t.glow,
                                                t.hover,
                                                isPrimary && "ring-1 ring-cyan-200/30",
                                                activeCat === cat.key && "neon-pulse"
                                            )}
                                            title={isPrimary ? "Primary category" : "Category"}
                                        >
                                            <span className={cx("inline-flex items-center gap-2", t.text, "neon-flicker")}>
                                                <span className={t.icon}>{cat.icon}</span>
                                                <span className="truncate neon-deep" style={{ fontFamily: "cursive" }}>
                                                    {cat.label}
                                                </span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Quick enter bar (preview) */}
                            <button
                                onClick={() => {
                                    if (tagFilter === "Suga 4 U") onOpenSuga4U();
                                    if (tagFilter === "Confessions") onOpenConfessions();
                                    if (tagFilter === "Bar Lounge") onOpenBarLounge();
                                }}
                                className={cx(
                                    "mt-2 w-full rounded-xl border px-3 py-2 text-sm",
                                    canEnter ? "border-pink-500/30 bg-pink-600 hover:bg-pink-700" : "border-white/10 bg-black/40 opacity-60 cursor-not-allowed"
                                )}
                                title={
                                    tagFilter === "Suga 4 U"
                                        ? "Open Suga 4 U room preview"
                                        : tagFilter === "Confessions"
                                            ? "Open Confessions room preview"
                                            : tagFilter === "Bar Lounge"
                                                ? "Open Bar Lounge room preview"
                                                : "Select a room category to enter"
                                }
                                disabled={!canEnter}
                            >
                                {tagFilter === "Confessions"
                                    ? "Enter Confessions"
                                    : tagFilter === "Bar Lounge"
                                        ? "Enter Bar Lounge"
                                        : "Enter Suga 4 U"}
                            </button>

                            <div className="mt-2 text-[10px] text-gray-400">Home is browse-only. Rooms open from dedicated previews.</div>
                        </div>

                        <div className="mt-6 text-fuchsia-200 text-sm drop-shadow-[0_0_44px_rgba(255,0,200,0.75)]">Account</div>

                        <div className="mt-2 space-y-3">
                            <div className="grid grid-cols-1 gap-2">
                                <button className="w-full rounded-xl border border-cyan-200/90 bg-black px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/10 inline-flex items-center gap-2 justify-center shadow-[0_0_22px_rgba(0,230,255,0.75),0_0_120px_rgba(0,230,255,0.55)] hover:shadow-[0_0_34px_rgba(0,230,255,0.92),0_0_170px_rgba(0,230,255,0.75)]">
                                    <MessageCircle className="w-4 h-4" /> Messages
                                </button>
                                <button className="w-full rounded-xl border border-fuchsia-300/90 bg-black px-3 py-2 text-sm text-fuchsia-200 hover:bg-fuchsia-500/10 inline-flex items-center gap-2 justify-center shadow-[0_0_22px_rgba(255,0,200,0.72),0_0_130px_rgba(255,0,200,0.58)] hover:shadow-[0_0_36px_rgba(255,0,200,0.92),0_0_180px_rgba(255,0,200,0.78)]">
                                    <Bell className="w-4 h-4" /> Notifications
                                </button>
                                <button className="w-full rounded-xl border border-violet-300/90 bg-black px-3 py-2 text-sm text-violet-200 hover:bg-violet-500/10 inline-flex items-center gap-2 justify-center shadow-[0_0_20px_rgba(170,80,255,0.70),0_0_110px_rgba(170,80,255,0.55)] hover:shadow-[0_0_32px_rgba(170,80,255,0.92),0_0_170px_rgba(170,80,255,0.76)]">
                                    <Star className="w-4 h-4" /> Collections
                                </button>
                            </div>

                            <div className="border-t border-pink-500/15 pt-3" />
                            <button className="w-full rounded-xl border border-pink-500/25 bg-black/40 px-3 py-2 text-sm text-pink-200 hover:bg-white/5 inline-flex items-center gap-2 justify-center">
                                <LogOut className="w-4 h-4" /> Log Out
                            </button>
                        </div>
                    </div>
                </NeonCard>

                {/* Center column */}
                <div className="lg:col-span-6">
                    <div className="flex flex-col gap-3 mb-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="rounded-2xl border border-pink-500/20 bg-black/35 px-3 py-2">
                                <div className="text-[10px] text-gray-400 mb-1">Creator Level</div>
                                <select
                                    value={levelFilter}
                                    onChange={(e) => setLevelFilter(e.target.value as CreatorLevel)}
                                    className="w-full bg-black/40 border border-pink-500/25 rounded-xl px-3 py-2 text-sm"
                                >
                                    {CREATOR_LEVELS.map((lvl) => (
                                        <option key={lvl} value={lvl}>
                                            {lvl}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="rounded-2xl border border-blue-500/20 bg-black/35 px-3 py-2">
                                <div className="text-[10px] text-gray-400 mb-1">Room / Category</div>
                                <select
                                    value={tagFilter}
                                    onChange={(e) => setTagFilter(e.target.value as RoomTag)}
                                    className="w-full bg-black/40 border border-blue-500/25 rounded-xl px-3 py-2 text-sm"
                                >
                                    {ROOM_TAGS.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="rounded-2xl border border-pink-500/20 bg-black/35 px-3 py-2">
                                <div className="text-[10px] text-gray-400 mb-1">Sort</div>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                                    className="w-full bg-black/40 border border-pink-500/25 rounded-xl px-3 py-2 text-sm"
                                >
                                    <option value="Recommended">Recommended</option>
                                    <option value="Rookie→Elite">Rookie → Elite</option>
                                    <option value="Elite→Rookie">Elite → Rookie</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-fr">
                        {filtered.map((c) => (
                            <CreatorTile key={c.id} creator={c} />
                        ))}
                    </div>
                </div>

                {/* Right rail */}
                <NeonCard className="p-4 lg:col-span-4">
                    <div className="text-pink-200 text-sm mb-3">Creator Feed</div>
                    <div className="space-y-4">
                        {[0, 1, 2, 3].map((i) => {
                            const isVideo = i % 2 === 0;
                            return (
                                <div key={i} className="rounded-2xl border border-pink-500/15 bg-black/40 p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs text-gray-300">@NeonNyla</div>
                                        <span
                                            className={cx(
                                                "text-[10px] px-2 py-[2px] rounded-full border",
                                                isVideo ? "border-blue-500/25 text-blue-200" : "border-pink-500/20 text-pink-200"
                                            )}
                                        >
                                            {isVideo ? "Video" : "Photo"}
                                        </span>
                                    </div>

                                    <div className="mt-1 text-sm text-gray-100">
                                        {isVideo ? "New clip just dropped. Unlock to watch." : "New pics tonight. VIP gets first look."}
                                    </div>

                                    <div className="mt-3 rounded-2xl overflow-hidden border border-white/10 bg-black/30">
                                        <div className="relative aspect-video bg-gradient-to-b from-pink-500/15 via-black to-blue-500/10 flex items-center justify-center">
                                            {isVideo ? (
                                                <div className="flex items-center gap-2 text-blue-200">
                                                    <Video className="w-5 h-5" />
                                                    <span className="text-sm">Video preview</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-pink-200">
                                                    <ImageIcon className="w-5 h-5" />
                                                    <span className="text-sm">Photo preview</span>
                                                </div>
                                            )}
                                            <span className="absolute top-2 left-2 text-[10px] px-2 py-[2px] rounded-full border border-white/10 text-gray-200 bg-black/40">
                                                {isVideo ? "Tap to unlock" : "Tap to view"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex items-center gap-2">
                                        <span className="text-[10px] px-2 py-[2px] rounded-full border border-blue-500/25 text-blue-200">
                                            Flash Drop
                                        </span>
                                        <span className="text-[10px] px-2 py-[2px] rounded-full border border-pink-500/20 text-pink-200">
                                            Suga 4 U
                                        </span>
                                    </div>

                                    <div className="mt-3 flex gap-2">
                                        <button className="flex-1 rounded-xl border border-pink-500/25 bg-black/40 py-2 text-sm hover:bg-white/5">
                                            Like
                                        </button>
                                        <button className="flex-1 rounded-xl border border-pink-500/30 bg-pink-600 py-2 text-sm hover:bg-pink-700">
                                            Unlock
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </NeonCard>
            </div>
        </div>
    );
}

// ---- Bar Lounge Room (Preview) ------------------------------------------
function BarLoungeRoomPreview({ onBack }: { onBack: () => void }) {
    const ENTRY_FEE = 10;
    const FREE_MINS = 10;
    const PER_MIN = 2;

    // Billing model: NO charge until the fan interacts (send message / react / buy drink / VIP / spin)
    const [billingActive, setBillingActive] = useState(false);
    const [minsInRoom, setMinsInRoom] = useState(0);
    const [chat, setChat] = useState("");

    // We intentionally do NOT display “total spent” to avoid anchoring/limiting spend.
    // Still used internally for effects + preview behaviors.
    const [spentHidden, setSpentHidden] = useState(32);

    const billableMins = Math.max(0, minsInRoom - FREE_MINS);
    const shownBillableMins = billingActive ? billableMins : 0;
    const runningCharge = (billingActive ? ENTRY_FEE : 0) + (billingActive ? shownBillableMins * PER_MIN : 0);

    const activateBilling = () => {
        if (!billingActive) {
            setBillingActive(true);
            if (minsInRoom === 0) setMinsInRoom(1);
        }
    };

    // --- Effects (champagne / VIP bottle) ---------------------------------
    type FX = { id: string; kind: "confetti" | "spotlight"; createdAt: number };
    const [fx, setFx] = useState<FX[]>([]);
    const [toast, setToast] = useState<string | null>(null);

    const pushFx = (kinds: Array<FX["kind"]>, toastMsg?: string) => {
        const now = Date.now();
        const items: FX[] = kinds.map((k) => ({ id: `${k}_${now}_${Math.random().toString(16).slice(2)}`, kind: k, createdAt: now }));
        setFx((rows) => [...rows, ...items]);
        if (toastMsg) setToast(toastMsg);

        // Auto-clear
        window.setTimeout(() => {
            setFx((rows) => rows.filter((x) => now - x.createdAt < 1800));
            setToast((t) => (t === toastMsg ? null : t));
        }, 1600);
    };

    const playPop = () => {
        // “Sound cue” via WebAudio (safe: only on user gesture + guarded).
        try {
            if (typeof window === "undefined") return;
            const AC = (window.AudioContext || (window as any).webkitAudioContext) as any;
            if (!AC) return;
            const ctx = new AC();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = "triangle";
            o.frequency.setValueAtTime(520, ctx.currentTime);
            o.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.11);
            g.gain.setValueAtTime(0.0001, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
            o.connect(g);
            g.connect(ctx.destination);
            o.start();
            o.stop(ctx.currentTime + 0.15);
            window.setTimeout(() => ctx.close?.(), 240);
        } catch {
            // ignore
        }
    };

    const onChampagneEffect = (tier: "champagne" | "vipbottle") => {
        // Champagne: confetti + spotlight + sound cue.
        playPop();
        if (tier === "champagne") pushFx(["confetti", "spotlight"], "🍾 Champagne popped");
        if (tier === "vipbottle") pushFx(["confetti", "spotlight"], "👑 VIP bottle served");
    };

    type DrinkTone = "pink" | "purple" | "blue" | "green" | "yellow" | "red";
    type Drink = {
        id: string;
        name: string;
        price: number;
        icon: React.ReactNode;
        tone: DrinkTone;
        onSpecial?: () => void;
    };

    const drinks: Drink[] = [
        {
            id: "d1",
            name: "Whiskey Shot",
            price: 8,
            icon: "🥃",
            tone: "red",
        },
        {
            id: "d2",
            name: "Neon Martini",
            price: 25,
            icon: "🍸",
            tone: "pink",
        },
        {
            id: "d3",
            name: "Blue Lagoon",
            price: 25,
            icon: "🧊",
            tone: "blue",
        },
        {
            id: "d6",
            name: "Tequila Shots",
            price: 35,
            icon: "🥃",
            tone: "green",
        },
        {
            id: "d4",
            name: "Champagne Bottle",
            price: 100,
            icon: "🍾",
            tone: "yellow",
            onSpecial: () => onChampagneEffect("champagne"),
        },
        {
            id: "d5",
            name: "VIP Bottle",
            price: 250,
            icon: "👑",
            tone: "purple",
            onSpecial: () => onChampagneEffect("vipbottle"),
        },
    ];

    const reactions = [
        { id: "r1", label: "🍻 Cheers", price: 2 },
        { id: "r2", label: "🔥 Heat", price: 5 },
        { id: "r3", label: "💎 Ice", price: 10 },
        { id: "r4", label: "💖 Heart", price: 15 },
    ];

    // --- Spin the Bottle (pay upfront per spin) ----------------------------
    type SpinOutcome = {
        id: string;
        label: string;
        odds: number; // percent
        note: string;
    };

    const SPIN_PRICE = 25;
    const spinOutcomes: SpinOutcome[] = [
        { id: "o1", label: "Pinned Message (1 min)", odds: 30, note: "Your next message pins above chat." },
        { id: "o2", label: "Priority Cam (2 min)", odds: 20, note: "Your badge glows; creator sees you first." },
        { id: "o3", label: "VIP Booth Discount $50", odds: 12, note: "Applies to VIP Booth unlock." },
        { id: "o4", label: "Free +2 Minutes", odds: 18, note: "Adds 2 minutes of free time." },
        { id: "o5", label: "Creator Dares You", odds: 10, note: "Unlocks a spicy prompt." },
        { id: "o6", label: "Try Again", odds: 10, note: "No perk, but you get a hype shoutout." },
    ];

    const spinOddsTotal = spinOutcomes.reduce((s, x) => s + x.odds, 0);
    const [spinning, setSpinning] = useState(false);
    const [spinResult, setSpinResult] = useState<SpinOutcome | null>(null);

    const pickOutcome = () => {
        // Weighted random by odds.
        let r = Math.random() * spinOddsTotal;
        for (const o of spinOutcomes) {
            r -= o.odds;
            if (r <= 0) return o;
        }
        return spinOutcomes[spinOutcomes.length - 1];
    };

    const doSpin = () => {
        if (spinning) return;
        activateBilling();
        setSpentHidden((s) => s + SPIN_PRICE);

        const out = pickOutcome();
        setSpinResult(null);
        setSpinning(true);
        window.setTimeout(() => {
            setSpinning(false);
            setSpinResult(out);
            // Subtle celebration for certain outcomes
            if (out.id === "o2" || out.id === "o1") pushFx(["spotlight"], `🎰 ${out.label}`);
            if (out.id === "o5") pushFx(["confetti"], `🎰 ${out.label}`);
        }, 1100);
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-6">
            {/* Effects overlay */}
            {fx.length > 0 && (
                <div className="fixed inset-0 pointer-events-none z-[60]">
                    {fx.some((x) => x.kind === "spotlight") && <div className="absolute inset-0 bl-spotlight" />}
                    {fx.some((x) => x.kind === "confetti") && (
                        <div className="absolute inset-0 overflow-hidden">
                            {Array.from({ length: 42 }).map((_, i) => (
                                <span
                                    key={i}
                                    className="bl-confetti"
                                    style={{
                                        left: `${Math.random() * 100}%`,
                                        top: `-12px`,
                                        animationDelay: `${Math.random() * 0.35}s`,
                                        animationDuration: `${1.1 + Math.random() * 0.6}s`,
                                        opacity: 0.9,
                                        transform: `translateY(0) rotate(${Math.random() * 360}deg)`,
                                    }}
                                />
                            ))}
                        </div>
                    )}
                    {toast && (
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 rounded-2xl border border-white/10 bg-black/70 px-4 py-2 text-sm text-gray-100 shadow-[0_0_40px_rgba(255,0,200,0.25)]">
                            {toast}
                        </div>
                    )}
                </div>
            )}

            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="rounded-xl border border-pink-500/25 bg-black/40 px-3 py-2 text-sm text-pink-200 hover:bg-white/5 inline-flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <div>
                        <div className="text-violet-200 text-sm">Bar Lounge — Fan View (Preview)</div>
                        <div className="text-[11px] text-gray-400">Entry + per-minute billing starts only after interaction</div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className={cx(
                        "rounded-2xl border px-3 py-2",
                        billingActive ? "border-emerald-300/25 bg-emerald-500/10" : "border-white/10 bg-black/30"
                    )}>
                        <div className="text-[10px] text-gray-400">Billing status</div>
                        <div className={cx("text-sm font-semibold", billingActive ? "text-emerald-100" : "text-gray-200")}>{billingActive ? "Active" : "Not started"}</div>
                    </div>

                    <div className="rounded-2xl border border-yellow-400/30 bg-yellow-500/10 px-3 py-2 vip-glow">
                        <div className="text-[10px] text-yellow-200">Pricing</div>
                        <div className="text-sm text-yellow-100 font-semibold">Entry ${ENTRY_FEE} • Free {FREE_MINS}m • ${PER_MIN}/m</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <NeonCard className="lg:col-span-8 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="text-violet-200 text-sm">Live Lounge</div>
                            <span className="text-[10px] px-2 py-[2px] rounded-full border border-violet-300/35 text-violet-200 bg-black/40">Music • Vibes</span>
                        </div>
                    </div>

                    <div className="rounded-2xl overflow-hidden border border-violet-300/15 bg-black/40">
                        <div className="relative aspect-video bg-[radial-gradient(circle_at_25%_20%,rgba(170,80,255,0.18),transparent_55%),radial-gradient(circle_at_70%_35%,rgba(0,230,255,0.14),transparent_55%),radial-gradient(circle_at_45%_90%,rgba(255,0,200,0.10),transparent_60%)] flex items-center justify-center">
                            <div className="flex items-center gap-2 text-cyan-200">
                                <Video className="w-5 h-5" />
                                <span className="text-sm">DJ/Creator stream (preview)</span>
                            </div>
                            <div className="absolute bottom-3 left-3 text-xs text-gray-200 bg-black/45 border border-white/10 rounded-full px-3 py-1">
                                @PinkVibe • Star
                            </div>
                            <div className="absolute bottom-3 right-3 text-xs text-yellow-200 bg-black/45 border border-yellow-400/30 rounded-full px-3 py-1 vip-glow">
                                {billingActive ? `Current: $${runningCharge}` : "Interact to start billing"}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-violet-300/15 bg-black/30 p-3">
                        <div className="text-[11px] text-gray-400">Minutes since interaction (preview)</div>
                        <div className="mt-1 flex items-center justify-between gap-4">
                            <div className="text-sm text-gray-100">
                                <span className="text-gray-300">Billable:</span> {shownBillableMins} • <span className="text-gray-300">Current:</span> <span className="text-yellow-200">${runningCharge}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    className="px-2 py-1 rounded-lg border border-white/10 bg-black/30 text-xs hover:bg-white/5"
                                    onClick={() => setMinsInRoom((m) => Math.max(0, m - 1))}
                                    disabled={!billingActive}
                                    title={!billingActive ? "Billing starts after first interaction" : ""}
                                >
                                    −
                                </button>
                                <div className="text-sm text-gray-100 w-10 text-center">{minsInRoom}</div>
                                <button
                                    className="px-2 py-1 rounded-lg border border-white/10 bg-black/30 text-xs hover:bg-white/5"
                                    onClick={() => setMinsInRoom((m) => m + 1)}
                                    disabled={!billingActive}
                                    title={!billingActive ? "Billing starts after first interaction" : ""}
                                >
                                    +
                                </button>
                            </div>
                        </div>
                        <div className="mt-2 text-[11px] text-gray-400">Billing begins only after you message, react, buy a drink, spin, or unlock VIP.</div>
                    </div>

                    {/* DRINKS (first) */}
                    <div className="mt-5">
                        <div className="flex items-center justify-between">
                            <div className="text-violet-200 text-sm">Buy Drinks</div>
                            <div className="text-[10px] text-gray-400">Icons + neon glow (impulse)</div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {drinks.map((d) => {
                                const t = toneClasses(d.tone === "yellow" ? "yellow" : d.tone === "green" ? "green" : d.tone === "blue" ? "blue" : d.tone === "red" ? "red" : d.tone === "purple" ? "purple" : "pink");
                                return (
                                    <div
                                        key={d.id}
                                        className={cx(
                                            "rounded-2xl border bg-black/35 p-3",
                                            t.border,
                                            t.glow
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className={cx("text-sm font-semibold flex items-center gap-2", t.text)}>
                                                    <span className="text-lg" aria-hidden="true">{d.icon}</span>
                                                    <span className="truncate">{d.name}</span>
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">${d.price}</div>
                                                {(d.price === 100 || d.price === 250) && (
                                                    <div className="mt-2 text-[10px] text-gray-300">Includes: confetti • spotlight • sound cue</div>
                                                )}
                                            </div>
                                            <button
                                                className={cx(
                                                    "shrink-0 rounded-xl border px-3 py-2 text-sm",
                                                    t.border,
                                                    "bg-black/40 hover:bg-white/5"
                                                )}
                                                onClick={() => {
                                                    activateBilling();
                                                    setSpentHidden((s) => s + d.price);
                                                    d.onSpecial?.();
                                                }}
                                            >
                                                Buy
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* VIP BOOTH (second) */}
                    <div className="mt-5 rounded-2xl border border-yellow-400/40 bg-yellow-500/10 p-4 vip-glow">
                        <div className="flex items-center justify-between mb-1">
                            <div className="text-yellow-200 text-sm">VIP Booth</div>
                            <span className="text-[10px] text-yellow-200">Upgrade</span>
                        </div>
                        <div className="text-[11px] text-gray-200 mb-3">Pinned message · Priority cam · Badge</div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                className="rounded-xl border border-yellow-400/40 bg-yellow-500/20 py-2 text-sm hover:bg-yellow-500/30"
                                onClick={() => {
                                    activateBilling();
                                    setSpentHidden((s) => s + 150);
                                    pushFx(["spotlight"], "👑 VIP Booth unlocked");
                                }}
                            >
                                VIP Booth $150
                            </button>
                            <button
                                className="rounded-xl border border-yellow-400/60 bg-yellow-600/30 py-2 text-sm hover:bg-yellow-600/40"
                                onClick={() => {
                                    activateBilling();
                                    setSpentHidden((s) => s + 400);
                                    pushFx(["confetti", "spotlight"], "👑 Ultra VIP unlocked");
                                    playPop();
                                }}
                            >
                                Ultra VIP $400
                            </button>
                        </div>
                    </div>

                    {/* Spin the Bottle (third) */}
                    <div className="mt-5 rounded-2xl border border-violet-300/30 bg-black/45 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-violet-200 text-sm">Spin the Bottle</div>
                            <span className="text-[10px] text-gray-400">Pay upfront • ${SPIN_PRICE}/spin</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                            <div className="md:col-span-5">
                                <div className="rounded-2xl border border-violet-300/20 bg-black/30 p-4 flex items-center justify-center min-h-[170px]">
                                    <div className={cx("bl-bottle", spinning && "bl-bottle-spin")}>🍾</div>
                                </div>
                                <button
                                    className={cx(
                                        "mt-3 w-full rounded-xl border border-violet-300/40 bg-violet-600/30 py-3 text-sm hover:bg-violet-600/40",
                                        spinning && "opacity-80 cursor-not-allowed"
                                    )}
                                    onClick={doSpin}
                                    disabled={spinning}
                                >
                                    {spinning ? "Spinning…" : `Spin Bottle — $${SPIN_PRICE}`}
                                </button>
                                {spinResult && (
                                    <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3">
                                        <div className="text-sm text-gray-100 font-semibold">Result: {spinResult.label}</div>
                                        <div className="mt-1 text-[11px] text-gray-300">{spinResult.note}</div>
                                    </div>
                                )}
                            </div>

                            <div className="md:col-span-7">
                                <div className="text-[11px] text-gray-400">Odds (preview)</div>
                                <div className="mt-2 rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
                                    <div className="divide-y divide-white/10">
                                        {spinOutcomes.map((o) => (
                                            <div key={o.id} className="px-3 py-2 flex items-center justify-between">
                                                <div className="text-sm text-gray-100">{o.label}</div>
                                                <div className="text-[11px] text-gray-300">{o.odds}%</div>
                                            </div>
                                        ))}
                                        <div className="px-3 py-2 flex items-center justify-between bg-black/35">
                                            <div className="text-[11px] text-gray-400">Total</div>
                                            <div className={cx("text-[11px]", spinOddsTotal === 100 ? "text-emerald-200" : "text-rose-200")}>{spinOddsTotal}%</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-2 text-[10px] text-gray-400">Odds are illustrative; production should be server-authoritative.</div>
                            </div>
                        </div>
                    </div>

                    {/* Reactions */}
                    <div className="mt-5">
                        <div className="flex items-center justify-between">
                            <div className="text-violet-200 text-sm">Reactions</div>
                            <div className="text-[10px] text-gray-400">Fast-click spend</div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {reactions.map((r) => (
                                <button
                                    key={r.id}
                                    className="rounded-xl border border-violet-300/25 bg-black/40 py-2 text-sm hover:bg-white/5 shadow-[0_0_18px_rgba(170,80,255,0.18)]"
                                    onClick={() => {
                                        activateBilling();
                                        setSpentHidden((s) => s + r.price);
                                    }}
                                >
                                    {r.label} <span className="text-gray-300">${r.price}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </NeonCard>

                <div className="lg:col-span-4 space-y-6">
                    <NeonCard className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-violet-200 text-sm">Lounge Chat</div>
                            <span className="text-[10px] px-2 py-[2px] rounded-full border border-white/10 text-gray-200 bg-black/40">Room</span>
                        </div>

                        {/* Extended chat (double-size) */}
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-3 h-[420px] overflow-auto">
                            {[
                                "Welcome to Bar Lounge. Buy a drink to get noticed.",
                                "Who’s live tonight?",
                                "VIP bottles get priority attention.",
                                "Spin the bottle for perks.",
                            ].map((m, idx) => (
                                <div key={idx} className="text-sm text-gray-200 mb-2">
                                    <span className="text-violet-200">@fan{idx + 1}</span>: {m}
                                </div>
                            ))}
                            <div className="text-sm text-gray-200 mb-2">
                                <span className="text-fuchsia-300">@PinkVibe</span>: Keep the drinks coming.
                            </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                            <input
                                value={chat}
                                onChange={(e) => setChat(e.target.value)}
                                className="flex-1 rounded-xl border border-violet-300/20 bg-black/40 px-3 py-2 text-sm outline-none"
                                placeholder="Type message…"
                            />
                            <button
                                className="rounded-xl border border-violet-300/30 bg-violet-600 px-3 py-2 text-sm hover:bg-violet-700 inline-flex items-center gap-2"
                                onClick={() => {
                                    if (chat.trim()) activateBilling();
                                    setChat("");
                                }}
                            >
                                <Send className="w-4 h-4" /> Send
                            </button>
                        </div>

                        <div className="mt-4 rounded-2xl border border-violet-300/15 bg-black/35 p-3">
                            <div className="text-[11px] text-gray-400">Billing rules</div>
                            <div className="mt-1 text-sm text-gray-100">
                                Entry: <span className="text-violet-200">${ENTRY_FEE}</span> • First {FREE_MINS} min free • Then ${PER_MIN}/min
                            </div>
                            <div className="mt-2 text-[11px] text-gray-300">Charges start only after your first interaction.</div>
                            <div className="mt-1 text-[11px] text-gray-300">Drinks, spin, reactions, and VIP are separate add-ons.</div>
                        </div>
                    </NeonCard>
                </div>
            </div>
        </div>
    );
}

// ---- Confessions Room (Fan) ----------------------------------------------
function ConfessionsRoomPreview({
    onBack,
    onCreatorView,
    onFanView,
}: {
    onBack: () => void;
    onCreatorView: () => void;
    onFanView?: () => void;
}) {
    const [messages, setMessages] = useState<
        Array<{ id: string; user: string; text: string; role: "fan" | "creator" | "system" }>
    >([
        { id: "m1", user: "PlayGroundX", text: "Welcome to the Confessions Room. Speak freely.", role: "system" },
    ]);
    const [input, setInput] = useState("");
    const [price, setPrice] = useState(10); // Dynamic pricing for confession intensity
    const [camBlur, setCamBlur] = useState(20); // Starts blurred, clears with tips

    // Mock incoming messages
    useEffect(() => {
        const t = setTimeout(() => {
            setMessages((prev) => [
                ...prev,
                { id: "m2", user: "SecretAdmirer", text: "I've always wondered...", role: "fan" },
            ]);
        }, 2000);
        return () => clearTimeout(t);
    }, []);

    const sendConfession = () => {
        if (!input.trim()) return;
        setMessages((prev) => [
            ...prev,
            { id: Date.now().toString(), user: "You", text: input, role: "fan" },
        ]);
        setInput("");
        // Simulate slight blur reduction
        setCamBlur((b) => Math.max(0, b - 5));
    };

    return (
        <div className="max-w-5xl mx-auto px-6 py-6 h-[calc(100vh-80px)] flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={onBack}
                    className="rounded-xl border border-pink-500/25 bg-black/40 px-3 py-2 text-sm text-pink-200 hover:bg-white/5 inline-flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" /> Exit Room
                </button>
                <div className="flex gap-3">
                    {onFanView && (
                        <button
                            onClick={onFanView}
                            className="rounded-xl border border-blue-500/25 bg-black/40 px-3 py-2 text-sm text-blue-200 hover:bg-white/5"
                        >
                            Fan View
                        </button>
                    )}
                    <button
                        onClick={onCreatorView}
                        className="rounded-xl border border-purple-500/25 bg-black/40 px-3 py-2 text-sm text-purple-200 hover:bg-white/5"
                    >
                        Creator Studio
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Left: Video Feed */}
                <div className="lg:col-span-2 flex flex-col">
                    <div className="relative flex-1 rounded-2xl overflow-hidden border border-red-500/20 bg-black">
                        {/* Cam simulation */}
                        <div
                            className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center transition-all duration-1000"
                            style={{ filter: `blur(${camBlur}px)` }}
                        >
                            <div className="text-gray-600">Creator Cam</div>
                        </div>
                        <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] px-2 py-1 rounded-full animate-pulse">
                            LIVE
                        </div>
                        <div className="absolute bottom-4 left-4 right-4">
                            <div className="text-white text-shadow-sm font-medium">@LunaLux is listening...</div>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-between items-center bg-black/40 p-3 rounded-2xl border border-white/10">
                        <div className="text-sm text-gray-300">
                            Blur Level: <span className="text-red-300">{(camBlur / 20) * 100}%</span>
                        </div>
                        <button
                            onClick={() => setCamBlur(Math.max(0, camBlur - 5))}
                            className="text-xs bg-red-900/40 text-red-200 px-3 py-1.5 rounded-lg border border-red-500/30 hover:bg-red-900/60 transition"
                        >
                            Tip to Clear Focus ($5)
                        </button>
                    </div>
                </div>

                {/* Right: Confession Log */}
                <div className="flex flex-col bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
                    <div className="p-3 bg-white/5 border-b border-white/5 text-sm text-center text-gray-300 font-medium">
                        Confession Log
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((m) => (
                            <div
                                key={m.id}
                                className={cx(
                                    "p-3 rounded-xl text-sm max-w-[90%]",
                                    m.role === "system"
                                        ? "mx-auto bg-white/5 text-gray-400 text-xs italic"
                                        : m.user === "You"
                                            ? "ml-auto bg-red-900/20 text-red-100 border border-red-500/20 rounded-tr-none"
                                            : "mr-auto bg-gray-800/40 text-gray-200 border border-white/10 rounded-tl-none"
                                )}
                            >
                                {m.role !== "system" && (
                                    <div className="text-[10px] opacity-50 mb-1">{m.user}</div>
                                )}
                                {m.text}
                            </div>
                        ))}
                    </div>

                    <div className="p-3 border-t border-white/10 bg-black/40">
                        <div className="flex gap-2 mb-2">
                            {[10, 25, 50].map(amt => (
                                <button key={amt} onClick={() => setPrice(amt)} className={cx("text-xs px-2 py-1 rounded-lg border", price === amt ? "bg-red-500/20 border-red-500 text-red-200" : "bg-black/40 border-white/10 text-gray-400")}>
                                    ${amt}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type your confession..."
                                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-red-500/50 outline-none transition"
                                onKeyDown={(e) => e.key === "Enter" && sendConfession()}
                            />
                            <button
                                onClick={sendConfession}
                                className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 flex items-center justify-center transition"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---- Confessions Studio (Creator) ----------------------------------------
function CreatorConfessionsStudioPreview({
    onBack,
    onFanView,
}: {
    onBack: () => void;
    onFanView: () => void;
}) {
    const [activeTab, setActiveTab] = useState<"inbox" | "live">("inbox");
    const [requests] = useState([
        { id: 1, user: "Fan123", amount: 50, text: "Tell me a secret about your first crush.", status: "pending" },
        { id: 2, user: "MysteryMan", amount: 100, text: "Wear the red dress.", status: "completed" },
    ]);

    return (
        <div className="max-w-6xl mx-auto px-6 py-6 min-h-screen">
            <div className="flex items-center justify-between mb-6">
                <button onClick={onBack} className="text-gray-400 hover:text-white flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </button>
                <button onClick={onFanView} className="text-sm px-4 py-2 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-xl hover:bg-blue-600/30 transition">
                    View as Fan
                </button>
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* Sidebar */}
                <div className="col-span-3 space-y-2">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-2 mb-2">Studio</div>
                    <button
                        onClick={() => setActiveTab("inbox")}
                        className={cx("w-full text-left px-4 py-2 rounded-xl text-sm transition flex items-center justify-between", activeTab === "inbox" ? "bg-purple-500/20 text-purple-200 border border-purple-500/30" : "text-gray-400 hover:bg-white/5")}
                    >
                        <span>Inbox Requests</span>
                        <span className="bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">3</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("live")}
                        className={cx("w-full text-left px-4 py-2 rounded-xl text-sm transition", activeTab === "live" ? "bg-red-500/20 text-red-200 border border-red-500/30" : "text-gray-400 hover:bg-white/5")}
                    >
                        Go Live
                    </button>
                    <div className="mt-8 p-4 bg-gradient-to-br from-purple-900/20 to-black rounded-2xl border border-purple-500/10">
                        <div className="text-2xl font-bold text-white mb-1">$1,250</div>
                        <div className="text-xs text-purple-300">Earnings this week</div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="col-span-9">
                    {activeTab === "inbox" ? (
                        <div className="bg-black/30 border border-white/10 rounded-2xl p-6">
                            <h2 className="text-lg font-semibold text-white mb-4">Confession Requests</h2>
                            <div className="space-y-3">
                                {requests.map(r => (
                                    <div key={r.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-gray-200">{r.user}</span>
                                                <span className="text-green-400 text-xs bg-green-900/30 px-2 py-0.5 rounded-full border border-green-500/20">${r.amount}</span>
                                            </div>
                                            <p className="text-sm text-gray-400">{r.text}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {r.status === 'pending' ? (
                                                <>
                                                    <button className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition text-gray-300">Decline</button>
                                                    <button className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 rounded-lg transition text-white">Reply</button>
                                                </>
                                            ) : (
                                                <span className="text-xs text-gray-500 italic px-3 py-1.5">Completed</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-black border border-red-500/20 rounded-2xl aspect-video flex items-center justify-center relative overflow-hidden group">
                            {/* Placeholder Webcam */}
                            <div className="text-center">
                                <div className="w-16 h-16 bg-red-600/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30 group-hover:scale-110 transition">
                                    <Video className="w-8 h-8" />
                                </div>
                                <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full font-medium shadow-lg shadow-red-900/20 transition">
                                    Start Streaming
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ---- Suga 4 U Room (Preview) ---------------------------------------------
function Suga4URoomPreview({ onBack }: { onBack: () => void }) {
    const [wishlist, setWishlist] = useState([
        { id: "w1", item: "Gucci Bag", price: 2500, funded: 1200, backers: 14 },
        { id: "w2", item: "Spa Day", price: 300, funded: 300, backers: 5, completed: true },
        { id: "w3", item: "New Camera", price: 1800, funded: 450, backers: 8 },
    ]);

    return (
        <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-8">
                <button onClick={onBack} className="text-pink-200 hover:text-white flex items-center gap-2 transition">
                    <ArrowLeft className="w-4 h-4" /> Exit Room
                </button>
                <div className="flex items-center gap-3">
                    <div className="bg-pink-950/30 border border-pink-500/20 px-4 py-1.5 rounded-full text-sm text-pink-200">
                        <span className="opacity-70 mr-2">Your Sugar:</span>
                        <span className="font-semibold text-white">5,000 🍬</span>
                    </div>
                    <button className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:brightness-110 transition shadow-lg shadow-pink-600/20">
                        Get More
                    </button>
                </div>
            </div>

            {/* Hero / Creator Profile */}
            <div className="relative rounded-3xl overflow-hidden bg-black border border-white/10 mb-12">
                <div className="h-48 bg-gradient-to-r from-pink-900/40 via-purple-900/40 to-blue-900/40" />
                <div className="absolute top-0 bottom-0 left-0 right-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />

                <div className="px-8 pb-8 relative -mt-16 flex items-end justify-between">
                    <div className="flex items-end gap-6">
                        <div className="w-32 h-32 rounded-2xl bg-black border-4 border-black overflow-hidden shadow-2xl relative">
                            <div className="w-full h-full bg-gray-800 flex items-center justify-center text-3xl">👸</div>
                            <div className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 border-2 border-black rounded-full" title="Online" />
                        </div>
                        <div className="mb-2">
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                QueenBee
                                <span className="bg-yellow-500/20 text-yellow-200 text-xs px-2 py-1 rounded-md border border-yellow-500/30 font-normal tracking-wide">ELITE CREATOR</span>
                            </h1>
                            <p className="text-gray-400 mt-1 flex items-center gap-2">
                                <span className="text-pink-400">@queen_b</span> •
                                <span>Fashion & Lifestyle</span> •
                                <span className="flex items-center gap-1 text-gray-400"><Users className="w-3 h-3" /> 12.5k</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3 mb-2">
                        <button className="p-3 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 transition">
                            <Bell className="w-5 h-5" />
                        </button>
                        <button className="px-6 py-3 rounded-full bg-white text-black font-semibold hover:bg-gray-200 transition">
                            Follow
                        </button>
                    </div>
                </div>
            </div>

            {/* Wishlist Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlist.map(w => {
                    const progress = Math.min(100, (w.funded / w.price) * 100);
                    return (
                        <NeonCard key={w.id} className="p-5 flex flex-col relative overflow-hidden group">
                            {w.completed && (
                                <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                                    <div className="bg-green-500 text-black font-bold px-4 py-2 rounded-full transform -rotate-12 shadow-[0_0_20px_rgba(34,197,94,0.6)]">
                                        FULFILLED!
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-xl border border-white/10 group-hover:border-pink-500/30 transition-colors">
                                    🎁
                                </div>
                                <div className="text-right">
                                    <div className="text-white font-bold text-lg">${w.price}</div>
                                    <div className="text-xs text-gray-400">Target</div>
                                </div>
                            </div>

                            <h3 className="text-white font-semibold text-lg mb-1">{w.item}</h3>
                            <div className="text-xs text-gray-400 mb-4">{w.backers} backers so far</div>

                            <div className="mt-auto">
                                <div className="flex justify-between text-xs mb-2">
                                    <span className={cx(w.completed ? "text-green-400" : "text-pink-300")}>
                                        ${w.funded} raised
                                    </span>
                                    <span className="text-gray-500">{Math.round(progress)}%</span>
                                </div>
                                <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className={cx("h-full transition-all duration-500 rounded-full", w.completed ? "bg-green-500" : "bg-gradient-to-r from-pink-600 to-purple-600")}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <button
                                    disabled={!!w.completed}
                                    className="w-full mt-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 hover:border-white/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Contribute Sugar
                                </button>
                            </div>
                        </NeonCard>
                    );
                })}
            </div>
        </div>
    );
}

// ---- App Shell -------------------------------------------------------------
export default function PlaygroundxMockup() {
    const [route, setRoute] = useState<Route>("home");
    const [query, setQuery] = useState("");

    const content = (() => {
        switch (route) {
            case "suga4u":
                return <Suga4URoomPreview onBack={() => setRoute("home")} />;
            case "bar_lounge":
                return <BarLoungeRoomPreview onBack={() => setRoute("home")} />;
            case "confessions":
                return <ConfessionsRoomPreview onBack={() => setRoute("home")} onCreatorView={() => setRoute("creator_confessions")} />;
            case "creator_confessions":
                return <CreatorConfessionsStudioPreview onBack={() => setRoute("home")} onFanView={() => setRoute("confessions")} />;
            case "home":
            default:
                return (
                    <HomeScreen
                        query={query}
                        setQuery={setQuery}
                        onOpenSuga4U={() => setRoute("suga4u")}
                        onOpenConfessions={() => setRoute("confessions")}
                        onOpenBarLounge={() => setRoute("bar_lounge")}
                    />
                );
        }
    })();

    return (
        <div className="min-h-screen bg-black text-gray-100 font-sans selection:bg-pink-500/30">
            {/* Global Nav (Mock) */}
            <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Logo />
                    <div className="hidden md:flex items-center gap-6">
                        <button onClick={() => setRoute("home")} className={cx("text-sm hover:text-white transition", route === "home" ? "text-white font-medium" : "text-gray-400")}>Discover</button>
                        <button className="text-sm text-gray-400 hover:text-white transition">Trending</button>
                        <button className="text-sm text-gray-400 hover:text-white transition">Creators</button>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative hidden sm:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search..."
                                className="bg-white/5 border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-sm focus:bg-white/10 outline-none w-64 transition"
                            />
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 ring-2 ring-black" />
                    </div>
                </div>
            </nav>

            {content}
        </div>
    );
}
