import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Crown,
    MessageCircle,
    Heart,
    Star,
    Lock,
    Mic,
    Image as ImageIcon,
    Timer,
    Sparkles,
    Flame,
    Gift,
    ChevronDown,
    Search,
    Home,
    Users,
    Settings,
    CreditCard,
    LogOut,
    User,
    Bell,
    Video,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import logoImg from "@/assets/logo.png";
import { MOCK_CREATORS, MOCK_FEED } from "@/data/mockHomeData";

// Local fallback icon so the preview never breaks due to a missing lucide icon export
function BarDrinkIcon({ className = "" }: { className?: string }) {
    return (
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
    );
}

/**
 * PlayGroundX — Preview Build (Home + Suga4U)
 * ------------------------------------------------
 * UI mockup only.
 *
 * NOTE: This file is intentionally self-contained for easy preview.
 */

// ---- Shared helpers --------------------------------------------------------
function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function formatMMSS(totalSeconds: number) {
    const s = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

// ---- Configuration & Types -------------------------------------------------
type Route = "home" | "suga4u";

// Types matching our Supabase profiles + UI needs
interface CreatorCard {
    id: string;
    name: string; // display_name || username
    level: "Rookie" | "Rising" | "Star" | "Elite";
    tags: string[];
    avatar_url?: string;
}

interface FeedPost {
    id: string;
    creator: {
        username: string;
        avatar_url: string | null;
    };
    type: "Video" | "Photo";
    caption: string;
    is_locked: boolean;
    tags: string[];
}

type BadgeTier = "Bronze" | "Silver" | "Gold" | "Platinum" | "VIP";

type CreatorGender = "male" | "female";

type FavTier = "cute" | "luxury" | "dream";

type Secret = {
    id: string;
    title: string;
    price: number;
    reveal: string;
};

type OfferDrop = {
    id: string;
    title: string;
    description: string;
    price: number;
    totalSlots: number;
    endsInSeconds: number;
};

type PaidRequest = {
    id: string;
    label: string;
    price: number;
    hint: string;
};

type FavoriteItem = {
    name: string;
    price: number;
    linkLabel: string;
    linkUrl: string;
    revealFee: number;
};

// ---- Config (Suga4U monetization rules) ------------------------------------
const ENTRY_FEE = 10;
const PAY_TO_STAY_FREE_SECONDS = 10 * 60;
const PAY_TO_STAY_RATE_PER_MIN = 2;

// ---- Mock Data REPLACED by Fetching ---------------------------------------
// We'll keep these strictly for the Suga4U Room preview which doesn't have a backend yet.
const GIFTS = [
    { label: "Rose", amount: 5 },
    { label: "Coffee", amount: 10 },
    { label: "Perfume", amount: 25 },
    { label: "Bag", amount: 50 },
    { label: "Yacht", amount: 100 },
];

const FAVORITES: Record<FavTier, { unlock: number; items: FavoriteItem[] }> = {
    cute: {
        unlock: 10,
        items: [
            { name: "My Fav Color", linkLabel: "Amazon", linkUrl: "https://amazon.com/...", revealFee: 5, price: 20 },
            { name: "Plushie", linkLabel: "Amazon", linkUrl: "https://amazon.com/...", revealFee: 5, price: 35 },
        ],
    },
    luxury: {
        unlock: 50,
        items: [
            { name: "Gucci Bag", linkLabel: "Gucci", linkUrl: "https://gucci.com/...", revealFee: 25, price: 1500 },
        ],
    },
    dream: {
        unlock: 250,
        items: [
            { name: "Trip to Bali", linkLabel: "Expedia", linkUrl: "https://expedia.com/...", revealFee: 50, price: 3000 },
        ],
    },
};

const CREATOR_SECRETS: Secret[] = [
    { id: "s1", title: "My real type…", price: 8, reveal: "I love confident talk + kindness." },
    { id: "s2", title: "What I wear to bed", price: 12, reveal: "Silk set + perfume. Sometimes nothing." },
    { id: "s3", title: "My wildest fantasy", price: 20, reveal: "A private night where you lead." },
    { id: "s4", title: "My private photo drop", price: 25, reveal: "(Unlocked in DMs)" },
];

const OFFER_DROPS: OfferDrop[] = [
    {
        id: "o1",
        title: "Limited Voice Note Drop",
        description: "First 10 buyers get a personalized 30s voice note.",
        price: 15,
        totalSlots: 10,
        endsInSeconds: 12 * 60,
    },
    {
        id: "o2",
        title: "Outfit Pick (Tonight)",
        description: "Vote by paying — top outfit wins (private reveal).",
        price: 10,
        totalSlots: 25,
        endsInSeconds: 8 * 60,
    },
];

const PAID_REQUESTS: PaidRequest[] = [
    { id: "r1", label: "Pose Request", price: 10, hint: "Ask for a pose / angle" },
    { id: "r2", label: "Name Shoutout", price: 15, hint: "She says your name on cam" },
    { id: "r3", label: "Quick Tease", price: 25, hint: "Short premium tease" },
    { id: "r4", label: "Custom Clip", price: 50, hint: "Custom 30–60s clip" },
];

// ---- Branding --------------------------------------------------------------
function Logo({ onClick }: { onClick?: () => void }) {
    return (
        <div onClick={onClick} className="relative cursor-pointer z-10 w-32">
            <img
                src={logoImg}
                alt="PlayGroundX"
                // Add a neon glow filter via drop-shadow
                className="w-full h-auto object-contain drop-shadow-[0_0_15px_rgba(255,0,200,0.6)]"
            />
            <div className="absolute -bottom-2 -right-2 px-1.5 py-0.5 rounded-md bg-pink-600/20 border border-pink-500/30 backdrop-blur-sm">
                <span className="text-[8px] font-medium tracking-wider text-pink-200 uppercase">
                    Preview
                </span>
            </div>
        </div>
    );
}

// NOTE: NeonCard is used heavily across the app.
// Requirement: left sidebar rectangle (NeonCard) must be pitch black.
function NeonCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={cx(
                "rounded-2xl border border-pink-500/25 bg-black",
                // toned-down outer neon glow (cleaner edges, less bleed)
                "shadow-[0_0_24px_rgba(236,72,153,0.14),0_0_56px_rgba(59,130,246,0.08)]",
                "hover:shadow-[0_0_38px_rgba(236,72,153,0.22),0_0_86px_rgba(59,130,246,0.14)] transition-shadow",
                className
            )}
        >
            {children}
        </div>
    );
}

function NeonButton({
    children,
    onClick,
    className = "",
    variant = "pink",
    disabled,
    title,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    variant?: "pink" | "blue" | "ghost";
    disabled?: boolean;
    title?: string;
}) {
    const base =
        "px-3 py-2 rounded-xl text-sm transition border disabled:opacity-50 disabled:cursor-not-allowed";
    const styles =
        variant === "pink"
            ? "bg-pink-600 hover:bg-pink-700 border-pink-500/30"
            : variant === "blue"
                ? "bg-blue-600 hover:bg-blue-700 border-blue-500/30"
                : "bg-black/40 hover:bg-white/5 border-pink-500/25";

    return (
        <button title={title} disabled={disabled} onClick={onClick} className={cx(base, styles, className)}>
            {children}
        </button>
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
                        "mt-2 w-full rounded-2xl border bg-black/70",
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

function fanTierClasses(tier: BadgeTier) {
    switch (tier) {
        case "Bronze":
            return "border-yellow-700/70 text-yellow-500";
        case "Silver":
            return "border-gray-400/70 text-gray-200";
        case "Gold":
            return "border-yellow-400/70 text-yellow-300";
        case "Platinum":
            return "border-indigo-300/70 text-indigo-200";
        case "VIP":
            return "border-yellow-400/80 text-yellow-300";
        default:
            return "border-gray-600 text-gray-200";
    }
}

function fanTierBg(tier: BadgeTier) {
    switch (tier) {
        case "Bronze":
            return "bg-yellow-900/15";
        case "Silver":
            return "bg-gray-500/10";
        case "Gold":
            return "bg-yellow-500/10";
        case "Platinum":
            return "bg-indigo-500/10";
        case "VIP":
            return "bg-yellow-500/15";
        default:
            return "bg-white/5";
    }
}

function creatorBabyClasses(gender: CreatorGender) {
    return gender === "male" ? "border-blue-400/70 text-blue-300" : "border-pink-400/70 text-pink-300";
}

function isEntryRequired(tier: BadgeTier) {
    return tier !== "VIP";
}

function isHighTier(tier: BadgeTier) {
    return tier === "Gold" || tier === "Platinum" || tier === "VIP";
}

function SugaTierLogo({ tier, className = "" }: { tier: BadgeTier; className?: string }) {
    // Placeholder tier-logo for Suga tier badges.
    // Replace this SVG with final asset while keeping tier tinting.
    return (
        <span
            className={cx(
                "inline-flex items-center justify-center w-5 h-5 rounded-md border",
                fanTierClasses(tier),
                fanTierBg(tier),
                className
            )}
            aria-label={`Suga tier logo ${tier}`}
            title={`${tier} tier badge logo`}
        >
            <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="opacity-90"
            >
                <path
                    d="M12 2l2.2 4.6L19 7.7l-3.6 3.5.9 5L12 14.9 7.7 16.2l.9-5L5 7.7l4.8-1.1L12 2z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                />
                <path d="M7.5 20.5h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
        </span>
    );
}

// ---- Neon palette helpers --------------------------------------------------
function toneClasses(tone: "pink" | "green" | "purple" | "red" | "blue" | "yellow") {
    // Deep nightclub neon palette (strong core, controlled outer glow)
    switch (tone) {
        case "green":
            return {
                text: "text-emerald-400 drop-shadow-[0_0_22px_rgba(0,255,170,1)] neon-deep",
                icon: "text-emerald-400 drop-shadow-[0_0_26px_rgba(0,255,170,1)]",
                border: "border-emerald-400/90",
                glow:
                    "shadow-[0_0_18px_rgba(0,255,170,0.85),0_0_60px_rgba(0,255,170,0.45)] hover:shadow-[0_0_26px_rgba(0,255,170,0.95),0_0_90px_rgba(0,255,170,0.65)]",
                hover: "hover:bg-emerald-500/8",
            };
        case "purple":
            return {
                text: "text-violet-400 drop-shadow-[0_0_22px_rgba(170,80,255,1)] neon-deep",
                icon: "text-violet-400 drop-shadow-[0_0_26px_rgba(170,80,255,1)]",
                border: "border-violet-400/90",
                glow:
                    "shadow-[0_0_18px_rgba(170,80,255,0.85),0_0_60px_rgba(170,80,255,0.45)] hover:shadow-[0_0_26px_rgba(170,80,255,0.95),0_0_90px_rgba(170,80,255,0.65)]",
                hover: "hover:bg-violet-500/8",
            };
        case "red":
            return {
                text: "text-rose-400 drop-shadow-[0_0_22px_rgba(255,55,95,1)] neon-deep",
                icon: "text-rose-400 drop-shadow-[0_0_26px_rgba(255,55,95,1)]",
                border: "border-rose-400/90",
                glow:
                    "shadow-[0_0_18px_rgba(255,55,95,0.85),0_0_60px_rgba(255,55,95,0.45)] hover:shadow-[0_0_26px_rgba(255,55,95,0.95),0_0_90px_rgba(255,55,95,0.65)]",
                hover: "hover:bg-rose-500/8",
            };
        case "blue":
            return {
                text: "text-cyan-300 drop-shadow-[0_0_22px_rgba(0,230,255,1)] neon-deep",
                icon: "text-cyan-300 drop-shadow-[0_0_26px_rgba(0,230,255,1)]",
                border: "border-cyan-300/90",
                glow:
                    "shadow-[0_0_18px_rgba(0,230,255,0.85),0_0_60px_rgba(0,230,255,0.45)] hover:shadow-[0_0_26px_rgba(0,230,255,0.95),0_0_90px_rgba(0,230,255,0.65)]",
                hover: "hover:bg-cyan-500/8",
            };
        case "yellow":
            return {
                text: "text-lime-300 drop-shadow-[0_0_22px_rgba(200,255,0,1)] neon-deep",
                icon: "text-lime-300 drop-shadow-[0_0_26px_rgba(200,255,0,1)]",
                border: "border-lime-300/90",
                glow:
                    "shadow-[0_0_18px_rgba(200,255,0,0.85),0_0_60px_rgba(200,255,0,0.45)] hover:shadow-[0_0_26px_rgba(200,255,0,0.95),0_0_90px_rgba(200,255,0,0.65)]",
                hover: "hover:bg-lime-500/8",
            };
        default:
            return {
                text: "text-fuchsia-400 drop-shadow-[0_0_24px_rgba(255,0,200,1)] neon-deep",
                icon: "text-fuchsia-400 drop-shadow-[0_0_28px_rgba(255,0,200,1)]",
                border: "border-fuchsia-400/90",
                glow:
                    "shadow-[0_0_20px_rgba(255,0,200,0.85),0_0_70px_rgba(255,0,200,0.5)] hover:shadow-[0_0_30px_rgba(255,0,200,0.95),0_0_100px_rgba(255,0,200,0.7)]",
                hover: "hover:bg-fuchsia-500/8",
            };
    }
}

function CreatorTile({ creator, onOpen }: { creator: CreatorCard; onOpen: () => void }) {
    const tags = creator.tags.slice(0, 2);
    // Pad to preserve consistent tag area height
    while (tags.length < 2) tags.push("");

    return (
        <button
            onClick={onOpen}
            className={cx(
                "h-full rounded-2xl border border-pink-500/25 bg-black/40 overflow-hidden",
                "hover:border-pink-500/45 transition",
                "flex flex-col"
            )}
            title={creator.tags.includes("Suga 4 U") ? "Open Suga4U (preview)" : "Open creator profile (preview)"}
        >
            {/* Media area (fixed) */}
            <div className="h-32 w-full bg-gradient-to-b from-pink-500/20 via-black to-blue-500/10 overflow-hidden relative">
                {creator.avatar_url ? (
                    <img
                        src={creator.avatar_url}
                        alt={creator.name}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-pink-500/20">
                        <User className="w-12 h-12" />
                    </div>
                )}
            </div>

            {/* Body (fixed rhythm) */}
            <div className="p-3 text-left flex-1 flex flex-col">
                {/* Row: name + level (fixed baseline) */}
                <div className="flex items-center justify-between gap-2 min-h-[22px]">
                    <div className="text-sm text-fuchsia-300 font-semibold truncate drop-shadow-[0_0_42px_rgba(255,0,200,1)]">
                        {creator.name}
                    </div>
                    <span className="shrink-0 text-[10px] px-2 py-[2px] rounded-full border border-blue-500/25 text-blue-200">
                        {creator.level}
                    </span>
                </div>

                {/* Row: tags (consistent height) */}
                <div className="mt-2 flex flex-wrap gap-1 min-h-[28px]">
                    {tags.map((t, idx) =>
                        t ? (
                            <span
                                key={`${creator.id}-${t}`}
                                className="text-[10px] px-2 py-[2px] rounded-full border border-pink-500/20 text-pink-200"
                            >
                                {t}
                            </span>
                        ) : (
                            <span
                                key={`${creator.id}-pad-${idx}`}
                                className="text-[10px] px-2 py-[2px] rounded-full border border-transparent text-transparent select-none"
                            >
                                pad
                            </span>
                        )
                    )}
                </div>

                {/* Spacer to keep tiles identical even when tags vary */}
                <div className="flex-1" />
            </div>
        </button>
    );
}

// ---- Home Screen -----------------------------------------------------------
function HomeScreen({
    onEnterSuga4U,
    query,
    setQuery,
    creators,
    feedPosts,
    loading,
    userId,
    userRole
}: {
    onEnterSuga4U: () => void;
    query: string;
    setQuery: React.Dispatch<React.SetStateAction<string>>;
    creators: CreatorCard[];
    feedPosts: FeedPost[];
    loading: boolean;
    userId?: string;
    userRole?: string;
}) {
    const navigate = useNavigate();
    const [levelFilter, setLevelFilter] = useState<CreatorCard["level"] | "All">("All");
    const [activeCat, setActiveCat] = useState<string>("all");
    const [tagFilter, setTagFilter] = useState<string | "All">("All");
    const [sortBy, setSortBy] = useState<"Recommended" | "Rookie→Elite" | "Elite→Rookie">("Recommended");

    const filtered = useMemo(() => {
        let rows = creators.slice();

        // 1. Text search
        const q = query.trim().toLowerCase();
        if (q) {
            rows = rows.filter((c) =>
                [c.name, c.level, ...c.tags].some((t) => t.toLowerCase().includes(q))
            );
        }

        // 2. Filters
        if (levelFilter !== "All") {
            rows = rows.filter((c) => c.level === levelFilter);
        }

        // Note: For now, ignoring tagFilter logic for "All" to strictly show everyone.
        // If specific logic is needed, ensure tags exist.
        if (tagFilter !== "All" && tagFilter !== "all") {
            rows = rows.filter((c) => c.tags.includes(tagFilter));
        }

        // 3. Sorting
        const rank: Record<CreatorCard["level"], number> = { Rookie: 1, Rising: 2, Star: 3, Elite: 4 };
        if (sortBy === "Rookie→Elite") rows.sort((a, b) => rank[a.level] - rank[b.level]);
        if (sortBy === "Elite→Rookie") rows.sort((a, b) => rank[b.level] - rank[a.level]);

        return rows;
    }, [query, levelFilter, tagFilter, sortBy, creators]);

    const CATS: Array<{
        label: string;
        key: string;
        icon: React.ReactNode;
        tone: "pink" | "green" | "purple" | "red" | "blue" | "yellow";
        primary?: boolean;
    }> = [
            { label: "Home", key: "home", icon: <Home className="w-4 h-4" />, tone: "pink" },
            { label: "Flash Drops", key: "drops", icon: <Sparkles className="w-4 h-4" />, tone: "blue" },
            { label: "Confessions", key: "conf", icon: <Lock className="w-4 h-4" />, tone: "red" },
            { label: "X Chat", key: "xchat", icon: <MessageCircle className="w-4 h-4" />, tone: "yellow" },
            { label: "Bar Lounge", key: "bar", icon: <BarDrinkIcon className="w-4 h-4" />, tone: "purple" },
            { label: "Truth or Dare", key: "truth", icon: <MessageCircle className="w-4 h-4" />, tone: "green" },
            { label: "Suga 4 U", key: "suga4u", icon: <Crown className="w-4 h-4" />, tone: "pink", primary: true },
        ];

    return (
        <div className="max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-6">
            {/* Layout:
        - Sidebar narrower: 2/12 columns
        - Creator Feed wider: 4/12 columns
      */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left rail (always-expanded categories) */}
                <NeonCard className="hidden lg:block relative overflow-hidden p-4 lg:col-span-2 sticky top-[80px] self-start">
                    {/* Pitch-black base; ambient smoke sits behind tiles */}
                    <div className="pointer-events-none absolute inset-0 opacity-55">
                        <div className="absolute -inset-12 blur-3xl bg-[radial-gradient(circle_at_25%_20%,rgba(255,0,200,0.30),transparent_55%),radial-gradient(circle_at_80%_35%,rgba(0,230,255,0.22),transparent_60%)]" />
                    </div>

                    <div className="relative">
                        <div className="neon-smoke" aria-hidden="true" />
                        <div className="text-fuchsia-300 text-sm mb-3 neon-flicker drop-shadow-[0_0_58px_rgba(255,0,200,1)]">
                            Browse
                        </div>

                        <div>
                            <div className="flex items-center justify-between">
                                <div className="text-xs text-fuchsia-300 inline-flex items-center gap-2 drop-shadow-[0_0_58px_rgba(255,0,200,1)]">
                                    <Search className="w-4 h-4 text-fuchsia-300 drop-shadow-[0_0_62px_rgba(255,0,200,1)]" />
                                    Categories
                                </div>
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
                                                if (cat.key === "home") navigate("/");
                                                else if (cat.key === "suga4u") navigate("/suga4u");
                                                else if (cat.key === "drops") {
                                                    console.log("Navigating drops. Role:", userRole, "ID:", userId);
                                                    // Debug toast to help user see what's happening
                                                    if (!userRole) console.warn("Role is missing/undefined");

                                                    if (userRole === "creator") navigate("/flash-drops-creator");
                                                    else if (userId) navigate(`/flash-drops/${userId}`);
                                                    else navigate("/flash-drops-creator");
                                                }
                                                else if (cat.key === "conf") navigate("/confessions-studio");
                                                else if (cat.key === "xchat") navigate("/xchat-creator");
                                                else if (cat.key === "bar") navigate("/discover"); // Bar Lounge creator view not yet available
                                                else if (cat.key === "truth") navigate("/games/truth-or-dare");
                                            }}
                                            className={cx(
                                                "w-full text-left px-3 py-2 rounded-xl border text-sm transition",
                                                "bg-black/55",
                                                t.border,
                                                t.glow,
                                                t.hover,
                                                isPrimary && "ring-1 ring-cyan-300/35",
                                                activeCat === cat.key && "neon-pulse"
                                            )}
                                            title={isPrimary ? "Enter Suga4U" : "Coming next"}
                                        >
                                            <span
                                                className={cx(
                                                    "inline-flex items-center gap-2",
                                                    t.text,
                                                    "neon-flicker",
                                                    isPrimary && "animate-pulse"
                                                )}
                                            >
                                                <span className={t.icon}>{cat.icon}</span>
                                                <span className="truncate neon-deep">{cat.label}</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-6 text-fuchsia-200 text-sm drop-shadow-[0_0_44px_rgba(255,0,200,0.75)]">Account</div>
                        <div className="mt-2 space-y-3">
                            <div className="grid grid-cols-1 gap-2">
                                <button
                                    onClick={() => navigate("/messages")}
                                    className="w-full rounded-xl border border-cyan-300/90 bg-black px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/10 inline-flex items-center gap-2 justify-center shadow-[0_0_28px_rgba(0,230,255,0.98),0_0_160px_rgba(0,230,255,0.78)] hover:shadow-[0_0_54px_rgba(0,230,255,1),0_0_220px_rgba(0,230,255,0.95)] drop-shadow-[0_0_54px_rgba(0,230,255,1)]"
                                    title="Messages"
                                >
                                    <MessageCircle className="w-4 h-4" /> Messages
                                </button>
                                <button
                                    onClick={() => navigate("/notifications")}
                                    className="w-full rounded-xl border border-fuchsia-300/90 bg-black px-3 py-2 text-sm text-fuchsia-300 hover:bg-fuchsia-500/10 inline-flex items-center gap-2 justify-center shadow-[0_0_30px_rgba(255,0,200,0.98),0_0_180px_rgba(255,0,200,0.82)] hover:shadow-[0_0_58px_rgba(255,0,200,1),0_0_240px_rgba(255,0,200,0.96)] drop-shadow-[0_0_58px_rgba(255,0,200,1)]"
                                    title="Notifications"
                                >
                                    <Bell className="w-4 h-4" /> Notifications
                                </button>
                                <button
                                    onClick={() => navigate("/bookmarks")}
                                    className="w-full rounded-xl border border-violet-300/90 bg-black px-3 py-2 text-sm text-violet-300 hover:bg-violet-500/10 inline-flex items-center gap-2 justify-center shadow-[0_0_26px_rgba(170,80,255,0.98),0_0_150px_rgba(170,80,255,0.82)] hover:shadow-[0_0_46px_rgba(170,80,255,1),0_0_220px_rgba(170,80,255,0.95)] drop-shadow-[0_0_54px_rgba(170,80,255,1)]"
                                    title="Collections"
                                >
                                    <Star className="w-4 h-4" /> Collections
                                </button>
                            </div>

                            <div className="border-t border-pink-500/15 pt-3" />
                            <NeonButton onClick={() => navigate("/auth")} variant="ghost" className="w-full justify-start flex items-center gap-2" title="Log Out">
                                <LogOut className="w-4 h-4" /> Log Out
                            </NeonButton>
                        </div>
                    </div>
                </NeonCard>

                {/* Main grid */}
                <div className="lg:col-span-6">
                    <div className="flex flex-col gap-3 mb-4">
                        {/* Mobile Category Nav (Horizontal Scroll) */}
                        <div className="lg:hidden w-full overflow-x-auto pb-2 scrollbar-none">
                            <div className="flex gap-2 min-w-max">
                                {CATS.map((cat) => {
                                    const t = toneClasses(cat.tone);
                                    const isActive = activeCat === cat.key;
                                    return (
                                        <button
                                            key={cat.key}
                                            onClick={() => {
                                                setActiveCat(cat.key);
                                                if (cat.key === "home") navigate("/");
                                                else if (cat.key === "suga4u") navigate("/suga4u");
                                                else if (cat.key === "drops") {
                                                    console.log("Mobile Nav drops. Role:", userRole, "ID:", userId);
                                                    if (userRole === "creator") navigate("/flash-drops-creator");
                                                    else if (userId) navigate(`/flash-drops/${userId}`);
                                                    else navigate("/flash-drops-creator");
                                                }
                                                else if (cat.key === "conf") navigate("/confessions-studio");
                                                else if (cat.key === "xchat") navigate("/xchat-creator");
                                                else if (cat.key === "bar") navigate("/discover");
                                                else if (cat.key === "truth") navigate("/games/truth-or-dare");
                                            }}
                                            className={cx(
                                                "px-3 py-1.5 rounded-full border text-xs whitespace-nowrap transition flex items-center gap-1.5",
                                                "bg-black/60 backdrop-blur-md",
                                                t.border,
                                                isActive ? t.text + " bg-white/10" : "text-gray-400"
                                            )}
                                        >
                                            <span className={isActive ? t.icon : "opacity-50"}>{cat.icon}</span>
                                            {cat.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="rounded-2xl border border-pink-500/20 bg-black/35 px-3 py-2">
                                <div className="text-[10px] text-gray-400 mb-1">Creator Level</div>
                                <select
                                    value={levelFilter}
                                    onChange={(e) => setLevelFilter(e.target.value as any)}
                                    className="w-full bg-black/40 border border-pink-500/25 rounded-xl px-3 py-2 text-sm"
                                >
                                    <option value="All">All</option>
                                    <option value="Rookie">Rookie</option>
                                    <option value="Rising">Rising</option>
                                    <option value="Star">Star</option>
                                    <option value="Elite">Elite</option>
                                </select>
                            </div>

                            <div className="rounded-2xl border border-blue-500/20 bg-black/35 px-3 py-2">
                                <div className="text-[10px] text-gray-400 mb-1">Room / Category</div>
                                <select
                                    value={tagFilter}
                                    onChange={(e) => setTagFilter(e.target.value)}
                                    className="w-full bg-black/40 border border-blue-500/25 rounded-xl px-3 py-2 text-sm"
                                >
                                    <option value="All">All</option>
                                    <option value="Flash Drops">Flash Drops</option>
                                    <option value="Confessions">Confessions</option>
                                    <option value="Bar Lounge">Bar Lounge</option>
                                    <option value="Truth or Dare">Truth or Dare</option>
                                    <option value="Suga 4 U">Suga 4 U</option>
                                    <option value="X Chat">X Chat</option>
                                </select>
                            </div>

                            <div className="rounded-2xl border border-pink-500/20 bg-black/35 px-3 py-2">
                                <div className="text-[10px] text-gray-400 mb-1">Sort</div>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="w-full bg-black/40 border border-pink-500/25 rounded-xl px-3 py-2 text-sm"
                                >
                                    <option value="Recommended">Recommended</option>
                                    <option value="Rookie→Elite">Rookie → Elite</option>
                                    <option value="Elite→Rookie">Elite → Rookie</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Creator tiles */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 auto-rows-fr">
                        {filtered.map((c) => (
                            <CreatorTile
                                key={c.id}
                                creator={c}
                                onOpen={() => {
                                    if (c.tags.includes("Suga 4 U")) onEnterSuga4U();
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Right rail (Locked Content) - Sticky */}
                <div className="hidden lg:block lg:col-span-4 sticky top-[80px] self-start space-y-6">
                    <div className="text-pink-200 text-sm mb-3">Locked Content for You</div>
                    <div className="space-y-4">
                        {loading && <div className="text-gray-500 text-xs">Loading feed...</div>}
                        {!loading && feedPosts.length === 0 && <div className="text-gray-500 text-xs">No locked posts available.</div>}
                        {feedPosts
                            .filter(post => post.is_locked) // Filter only locked content
                            .map((post) => {
                                const isVideo = post.type === "Video";
                                return (
                                    <div key={post.id} className="rounded-2xl border border-pink-500/15 bg-black/40 p-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {post.creator.avatar_url && <img src={post.creator.avatar_url} className="w-5 h-5 rounded-full" />}
                                                <div className="text-xs text-gray-300">@{post.creator.username}</div>
                                            </div>
                                            <span
                                                className={cx(
                                                    "text-[10px] px-2 py-[2px] rounded-full border",
                                                    isVideo ? "border-blue-500/25 text-blue-200" : "border-pink-500/20 text-pink-200"
                                                )}
                                            >
                                                {post.type}
                                            </span>
                                        </div>

                                        <div className="mt-1 text-sm text-gray-100">
                                            {post.caption}
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
                                                {post.is_locked && (
                                                    <span className="absolute top-2 left-2 text-[10px] px-2 py-[2px] rounded-full border border-white/10 text-gray-200 bg-black/40">
                                                        Unlock to view
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {/* Actions */}
                                        <div className="mt-3 flex gap-2">
                                            <NeonButton variant="ghost" className="flex-1 justify-center" onClick={() => navigate(`/post/${post.id}`)}>
                                                View
                                            </NeonButton>
                                            <NeonButton variant="pink" className="flex-1 justify-center" onClick={() => navigate(`/post/${post.id}`)}>
                                                Unlock
                                            </NeonButton>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---- Suga4U Room (Preview) -------------------------------------------------
function Suga4URoomPreview({
    fanTier,
    creatorGender,
    onBackHome,
}: {
    fanTier: BadgeTier;
    creatorGender: CreatorGender;
    onBackHome: () => void;
}) {
    const [hasPaidEntry, setHasPaidEntry] = useState<boolean>(false);
    const [secondsInRoom, setSecondsInRoom] = useState(0);
    const [paidMinutes, setPaidMinutes] = useState(0);
    const timerRef = useRef<number | null>(null);

    const [chat, setChat] = useState<string[]>(["Welcome to Suga4U 💖"]);
    const [chatInput, setChatInput] = useState("");
    const [reaction, setReaction] = useState<string | null>(null);

    const [totalSuga, setTotalSuga] = useState(0);
    const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});

    const [dropEnds, setDropEnds] = useState<Record<string, number>>(() => {
        const init: Record<string, number> = {};
        OFFER_DROPS.forEach((d) => (init[d.id] = d.endsInSeconds));
        return init;
    });
    const [dropSlots, setDropSlots] = useState<Record<string, number>>(() => {
        const init: Record<string, number> = {};
        OFFER_DROPS.forEach((d) => (init[d.id] = d.totalSlots));
        return init;
    });

    const [unlocked, setUnlocked] = useState<Record<FavTier, boolean>>({
        cute: false,
        luxury: false,
        dream: false,
    });
    const [activeTier, setActiveTier] = useState<FavTier | null>(null);
    const [revealedLinks, setRevealedLinks] = useState<Record<string, boolean>>({});

    const [requestText, setRequestText] = useState("");

    useEffect(() => {
        // Reset session when tier changes (preview behavior)
        if (fanTier === "VIP") setHasPaidEntry(true);
        if (fanTier !== "VIP") setHasPaidEntry(false);
        setSecondsInRoom(0);
        setPaidMinutes(0);
    }, [fanTier]);

    const goalPct = useMemo(() => Math.min((totalSuga / 100) * 100, 100), [totalSuga]);
    const fanBadgeLabel = `${fanTier}${fanTier === "VIP" ? " VIP" : ""}`;

    const freeRemaining = Math.max(0, PAY_TO_STAY_FREE_SECONDS - secondsInRoom);
    const inPaidZone = secondsInRoom >= PAY_TO_STAY_FREE_SECONDS;
    const paidSecondsRemaining = paidMinutes * 60 - Math.max(0, secondsInRoom - PAY_TO_STAY_FREE_SECONDS);
    const payToStayNeeded = hasPaidEntry && inPaidZone && paidSecondsRemaining <= 0;

    function pushChat(msg: string) {
        setChat((c) => [...c, msg]);
    }

    function addToSuga(amount: number, context: string) {
        setTotalSuga((s) => s + amount);
        pushChat(`${context} ($${amount})`);
    }

    function payEntryFee() {
        if (hasPaidEntry) return;
        setHasPaidEntry(true);
        addToSuga(ENTRY_FEE, "🚪 Room entry");
    }

    function sendGift(label: string, amount: number) {
        setReaction(label);
        addToSuga(amount, `🎁 ${label} sent`);
        window.setTimeout(() => setReaction(null), 1100);
    }

    function sendMessage() {
        const t = chatInput.trim();
        if (!t) return;
        pushChat(t);
        setChatInput("");
    }

    function unlockFavoritesTier(t: FavTier) {
        setUnlocked((u) => ({ ...u, [t]: true }));
        setActiveTier(t);
        addToSuga(FAVORITES[t].unlock, `🔓 Unlocked ${t} favorites`);
    }

    function revealFavoriteLink(tier: FavTier, itemName: string, fee: number) {
        const key = `${tier}:${itemName}`;
        if (revealedLinks[key]) return;
        setRevealedLinks((m) => ({ ...m, [key]: true }));
        addToSuga(fee, `🔍 Revealed link for ${itemName}`);
    }

    function buyForHer(price: number, name: string) {
        addToSuga(price, `🛍️ Buy-for-her: ${name}`);
    }

    function revealSecret(secret: Secret) {
        if (revealedSecrets[secret.id]) return;
        setRevealedSecrets((m) => ({ ...m, [secret.id]: true }));
        addToSuga(secret.price, `🔓 Secret unlocked: ${secret.title}`);
    }

    function claimDrop(d: OfferDrop) {
        const slots = dropSlots[d.id] ?? 0;
        const ends = dropEnds[d.id] ?? 0;
        if (slots <= 0 || ends <= 0) return;
        setDropSlots((m) => ({ ...m, [d.id]: Math.max(0, (m[d.id] ?? 0) - 1) }));
        addToSuga(d.price, `✨ Claimed: ${d.title}`);
    }

    function submitRequest(r: PaidRequest) {
        const t = requestText.trim();
        if (!t) {
            pushChat("⚠️ Add a request note first.");
            return;
        }
        addToSuga(r.price, `📩 Request sent: ${r.label}`);
        pushChat(`📝 Note: ${t}`);
        setRequestText("");
    }

    function payToStayOneMinute() {
        setPaidMinutes((m) => m + 1);
        addToSuga(PAY_TO_STAY_RATE_PER_MIN, "⏱️ Pay-to-stay +1 min");
    }

    useEffect(() => {
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => {
            setSecondsInRoom((s) => s + 1);
        }, 1000);

        return () => {
            if (timerRef.current) window.clearInterval(timerRef.current);
        };
    }, []);

    useEffect(() => {
        const id = window.setInterval(() => {
            setDropEnds((m) => {
                const next: Record<string, number> = { ...m };
                Object.keys(next).forEach((k) => {
                    next[k] = Math.max(0, next[k] - 1);
                });
                return next;
            });
        }, 1000);

        return () => window.clearInterval(id);
    }, []);

    return (
        <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <NeonButton variant="ghost" onClick={onBackHome} className="inline-flex items-center gap-2">
                        <Home className="w-4 h-4" /> Home
                    </NeonButton>
                    <div className="text-pink-200 text-sm inline-flex items-center gap-2">
                        <Crown className="w-4 h-4" /> Suga4U Room
                    </div>
                </div>

                <div className="text-pink-300 text-sm flex items-center gap-2">
                    <span
                        className={cx(
                            "px-2 py-[2px] rounded-full text-[10px] border",
                            creatorBabyClasses(creatorGender)
                        )}
                        title="Creator badge"
                    >
                        Suga Baby
                    </span>

                    <span
                        className={cx(
                            "px-2 py-[2px] rounded-full text-[10px] border inline-flex items-center gap-1",
                            fanTierClasses(fanTier),
                            fanTierBg(fanTier)
                        )}
                        title="Fan tier badge"
                    >
                        <SugaTierLogo tier={fanTier} />
                        {fanBadgeLabel}
                    </span>

                    <span className="px-2 py-[2px] rounded-full text-[10px] border border-pink-500/30 text-pink-200 inline-flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        {freeRemaining > 0
                            ? `Free ${formatMMSS(freeRemaining)}`
                            : `Time ${formatMMSS(Math.max(0, paidSecondsRemaining))}`}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {!hasPaidEntry && isEntryRequired(fanTier) && (
                    <div className="lg:col-span-4">
                        <NeonCard className="p-4 flex items-center justify-between">
                            <div className="text-pink-200 text-sm">Enter Suga4U</div>
                            <NeonButton onClick={payEntryFee} variant="pink">
                                Enter $10
                            </NeonButton>
                        </NeonCard>
                    </div>
                )}

                <div className="lg:col-span-2 flex flex-col gap-4">
                    <NeonCard className="relative overflow-hidden">
                        <div className="relative aspect-video flex items-center justify-center">
                            <div className="pointer-events-none absolute inset-0 opacity-20 animate-pulse bg-gradient-to-b from-pink-500/30 via-transparent to-blue-500/20" />
                            {reaction && <div className="absolute text-4xl text-pink-400 animate-pulse">{reaction}</div>}
                            <span className="text-pink-300">Creator Spotlight</span>

                            <div className="absolute bottom-3 left-3 right-3">
                                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-pink-500" style={{ width: `${goalPct}%` }} />
                                </div>
                                <div className="text-xs text-pink-300 mt-1">Suga Goal: ${totalSuga} / $100</div>
                            </div>
                        </div>
                    </NeonCard>

                    <NeonCard className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-blue-300 flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> Pinned Offer Drops
                            </h2>
                            <div className="text-[10px] text-gray-400">Limited + timed</div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {OFFER_DROPS.map((d) => {
                                const ends = dropEnds[d.id] ?? 0;
                                const slots = dropSlots[d.id] ?? 0;
                                const disabled = ends <= 0 || slots <= 0;
                                return (
                                    <div key={d.id} className="rounded-xl border border-blue-500/25 bg-black/40 p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="text-sm text-blue-200 font-medium">{d.title}</div>
                                                <div className="text-[11px] text-gray-400 mt-1">{d.description}</div>
                                            </div>
                                            <div className="text-[10px] text-gray-300 whitespace-nowrap">{formatMMSS(ends)}</div>
                                        </div>

                                        <div className="flex items-center justify-between mt-3">
                                            <div className="text-[11px] text-gray-300">
                                                Slots: {slots}/{d.totalSlots}
                                            </div>
                                            <button
                                                onClick={() => claimDrop(d)}
                                                disabled={disabled}
                                                className={cx(
                                                    "px-3 py-1.5 rounded-lg text-xs border",
                                                    disabled
                                                        ? "border-gray-700 text-gray-500"
                                                        : "border-blue-400/50 text-blue-200 hover:bg-blue-600/10"
                                                )}
                                            >
                                                Unlock ${d.price}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </NeonCard>

                    <NeonCard className="p-4">
                        <h2 className="text-pink-300 mb-3 flex items-center gap-2">
                            <Flame className="w-4 h-4" /> Creator Secrets
                            <span className="text-[10px] text-gray-400">Blurred until unlocked</span>
                        </h2>

                        <div className="space-y-2">
                            {CREATOR_SECRETS.map((s) => {
                                const isRevealed = !!revealedSecrets[s.id];
                                return (
                                    <div
                                        key={s.id}
                                        className="flex items-center justify-between border border-pink-500/20 rounded-xl p-3 bg-black/30"
                                    >
                                        <div className="min-w-0">
                                            <div className="text-sm text-pink-200">{s.title}</div>
                                            <div className={cx("text-[11px] mt-1", isRevealed ? "text-gray-200" : "text-gray-500")}>
                                                {isRevealed ? s.reveal : "████████████████████"}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => revealSecret(s)}
                                            disabled={isRevealed}
                                            className={cx(
                                                "ml-3 px-3 py-1.5 rounded-lg text-xs border",
                                                isRevealed
                                                    ? "border-gray-700 text-gray-500"
                                                    : "border-pink-400/50 text-pink-200 hover:bg-pink-600/10"
                                            )}
                                        >
                                            {isRevealed ? "Unlocked" : `Unlock $${s.price}`}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </NeonCard>

                    <NeonCard className="p-4">
                        <h2 className="text-pink-300 mb-3 flex items-center gap-2">
                            <Gift className="w-4 h-4" /> Creator Favorites
                            <span className="text-[10px] text-gray-400">Reveal links, then Buy sends funds</span>
                        </h2>

                        <div className="grid grid-cols-3 gap-2 mb-3">
                            {(Object.keys(FAVORITES) as FavTier[]).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => unlockFavoritesTier(t)}
                                    className={cx(
                                        "rounded-lg border py-2 text-xs hover:bg-pink-600/10",
                                        unlocked[t] ? "border-pink-500" : "border-pink-500/30"
                                    )}
                                >
                                    {unlocked[t] ? `Unlocked ${t}` : `Unlock ${t} ($${FAVORITES[t].unlock})`}
                                </button>
                            ))}
                        </div>

                        {!activeTier ? (
                            <div className="text-[11px] text-gray-500">Select a tier to view items.</div>
                        ) : (
                            <div className="space-y-2">
                                {FAVORITES[activeTier].items.map((it) => {
                                    const key = `${activeTier}:${it.name}`;
                                    const linkRevealed = !!revealedLinks[key];
                                    return (
                                        <div key={it.name} className="border border-pink-500/20 rounded-xl p-3 bg-black/30">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="text-sm text-gray-100">{it.name}</div>
                                                    <div className="text-[11px] mt-1 text-gray-400">
                                                        {it.linkLabel}:{" "}
                                                        {linkRevealed ? (
                                                            <a
                                                                className="text-blue-300 underline"
                                                                href={it.linkUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                {it.linkUrl}
                                                            </a>
                                                        ) : (
                                                            <span className="text-gray-500">███████████████</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2 items-end">
                                                    <button
                                                        onClick={() => revealFavoriteLink(activeTier, it.name, it.revealFee)}
                                                        disabled={linkRevealed}
                                                        className={cx(
                                                            "px-3 py-1.5 rounded-lg text-xs border",
                                                            linkRevealed
                                                                ? "border-gray-700 text-gray-500"
                                                                : "border-blue-400/40 text-blue-200 hover:bg-blue-600/10"
                                                        )}
                                                    >
                                                        {linkRevealed ? "Link revealed" : `Reveal $${it.revealFee}`}
                                                    </button>
                                                    <button
                                                        onClick={() => buyForHer(it.price, it.name)}
                                                        className="px-3 py-1.5 rounded-lg text-xs bg-pink-600 hover:bg-pink-700"
                                                    >
                                                        Buy ${it.price}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="text-[10px] text-gray-400">
                                    Buy-for-her sends the amount to the creator as a tip (fan assumes item is purchased).
                                </div>
                            </div>
                        )}
                    </NeonCard>
                </div>

                <NeonCard className="p-4 lg:col-span-1 flex flex-col">
                    <h3 className="text-pink-300 mb-2 flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" /> Live Chat
                    </h3>
                    <div className="flex-1 overflow-y-auto text-xs space-y-1 mb-2">
                        {chat.map((m, i) => (
                            <div key={`${i}-${m.slice(0, 10)}`}>{m}</div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            className="flex-1 bg-black border border-pink-500/30 rounded-lg px-2 py-1 text-xs"
                            placeholder="Say something sweet…"
                        />
                        <NeonButton onClick={sendMessage} variant="pink" className="px-3 py-1 rounded-lg text-xs">
                            Send
                        </NeonButton>
                    </div>
                </NeonCard>

                <NeonCard className="p-4 lg:col-span-1 space-y-4">
                    {payToStayNeeded && (
                        <div className="rounded-xl border border-pink-500/25 bg-black/40 p-3">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-pink-200 flex items-center gap-2">
                                    <Timer className="w-4 h-4" /> Time Expired
                                </div>
                                <div className="text-[10px] text-gray-400">Add time to stay</div>
                            </div>
                            <NeonButton onClick={payToStayOneMinute} variant="pink" className="mt-3 w-full justify-center">
                                Pay to Stay +1 min
                            </NeonButton>
                        </div>
                    )}

                    <div className="rounded-xl border border-blue-500/20 bg-black/40 p-3">
                        <div className="flex items-center justify-between">
                            <div className="text-blue-200 text-sm flex items-center gap-2">
                                <Mic className="w-4 h-4" /> Request Menu
                            </div>
                            <div className="text-[10px] text-gray-400">Paid requests</div>
                        </div>

                        <textarea
                            value={requestText}
                            onChange={(e) => setRequestText(e.target.value)}
                            className="mt-2 w-full bg-black border border-blue-500/20 rounded-lg px-2 py-2 text-xs"
                            rows={3}
                            placeholder="Write what you want her to do…"
                        />

                        <div className="mt-2 grid grid-cols-2 gap-2">
                            {PAID_REQUESTS.map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => submitRequest(r)}
                                    title={r.hint}
                                    className="border border-blue-400/30 rounded-xl py-2 hover:bg-blue-600/10 text-xs text-blue-200"
                                >
                                    {r.label} · ${r.price}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-pink-300">Send Suga</h3>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            {GIFTS.map((g) => (
                                <button
                                    key={g.label}
                                    onClick={() => sendGift(g.label, g.amount)}
                                    className="border border-pink-500/30 rounded-xl py-2 hover:bg-pink-600/10"
                                >
                                    {g.label} · ${g.amount}
                                </button>
                            ))}
                        </div>
                    </div>

                    <NeonButton variant="pink" className="w-full justify-center">
                        Say My Name ($15)
                    </NeonButton>
                    <NeonButton variant="ghost" className="w-full justify-center">
                        Sponsor Room ($100)
                    </NeonButton>

                    <div className="grid grid-cols-2 gap-2">
                        <button className="border border-pink-500/40 py-2 rounded-xl text-xs flex items-center justify-center gap-1 hover:bg-pink-600/10">
                            <Mic className="w-4 h-4" /> Voice $10
                        </button>
                        <button className="border border-pink-500/40 py-2 rounded-xl text-xs flex items-center justify-center gap-1 hover:bg-pink-600/10">
                            <ImageIcon className="w-4 h-4" /> Photo $15
                        </button>
                    </div>

                    <button className="w-full bg-pink-600 py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-pink-700 border border-pink-500/30">
                        <Lock className="w-4 h-4" /> Private 1-on-1 ($10/min)
                    </button>

                    <div className="text-xs text-gray-400">
                        <p className="flex items-center gap-1">
                            <Star className="w-3 h-3" /> Spending triggers reactions and visibility
                        </p>
                        <p className="flex items-center gap-1">
                            <Heart className="w-3 h-3" /> Buy-for-her sends funds to creator
                        </p>
                    </div>
                </NeonCard>
            </div>

            <div className="mt-6">
                <NeonCard className="p-3 text-[11px] text-gray-400 flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                        <Timer className="w-4 h-4 text-pink-300" /> Session time: {formatMMSS(secondsInRoom)}
                    </span>
                    <span className="inline-flex items-center gap-2">
                        {freeRemaining > 0 ? (
                            <>
                                <span className="text-pink-200">Free time remaining</span>
                                <span className="text-gray-200">{formatMMSS(freeRemaining)}</span>
                            </>
                        ) : (
                            <>
                                <span className="text-pink-200">Paid time remaining</span>
                                <span className="text-gray-200">{formatMMSS(Math.max(0, paidSecondsRemaining))}</span>
                            </>
                        )}
                    </span>
                </NeonCard>
            </div>
        </div>
    );
}

// ---- App shell -------------------------------------------------------------
export default function PlaygroundxMockup() {
    const { user, profile, role } = useAuth();
    const navigate = useNavigate();

    const [route, setRoute] = useState<Route>("home");
    const [homeQuery, setHomeQuery] = useState("");

    const [creators, setCreators] = useState<CreatorCard[]>(MOCK_CREATORS as any);
    const [feedPosts, setFeedPosts] = useState<FeedPost[]>(MOCK_FEED as any);
    const [loading, setLoading] = useState(false); // Optimistic UI: Start "loaded" with mocks

    useEffect(() => {
        async function loadData() {
            try {
                // 1. Fetch Creators (Profiles) - Non-blocking
                const { data: creatorRows } = await supabase
                    .from("profiles")
                    .select("*")
                    .limit(100);

                // Only replace Mock if we got real rows
                if (creatorRows && creatorRows.length > 0) {
                    const mapped: CreatorCard[] = creatorRows.map((c: any) => ({
                        id: c.id,
                        name: c.display_name || c.username || "Unknown",
                        level: "Rising" as any, // Cast to avoid literal type mismatch
                        tags: c.categories || ["New"],
                        avatar_url: c.avatar_url || undefined,
                    }));
                    setCreators(mapped);
                }

                // 2. Fetch Feed - Non-blocking
                const { data: postRows } = await supabase
                    .from("posts")
                    .select(`
                        id,
                        title,
                        is_locked,
                        creator:profiles!posts_creator_id_fkey(username, avatar_url)
                    `)
                    .order("created_at", { ascending: false })
                    .limit(10);

                if (postRows && postRows.length > 0) {
                    const mappedPosts: FeedPost[] = postRows.map((p: any) => ({
                        id: p.id,
                        creator: {
                            username: p.creator?.username || "unknown",
                            avatar_url: p.creator?.avatar_url || null,
                        },
                        type: "Photo" as any, // Cast to avoid literal type mismatch
                        caption: p.title || "Check out my new content!",
                        is_locked: !!p.is_locked,
                        tags: [],
                    }));
                    setFeedPosts(mappedPosts);
                }
            } catch (err) {
                console.warn("Home data background fetch failed. Keeping Mock data.", err);
            }
        }

        loadData();
    }, []);

    // NOTE: no fan-tier selector on Home per requirements; retained for Suga4U preview behavior.
    const [fanTier] = useState<BadgeTier>("Gold");
    const [creatorGender] = useState<CreatorGender>("female");

    // Greeting / top-bar personalization
    const firstName = profile?.display_name?.split(" ")[0] || user?.email?.split("@")[0] || "Guest";
    const [revealWelcome, setRevealWelcome] = useState(false);
    useEffect(() => {
        const t = window.setTimeout(() => setRevealWelcome(true), 120);
        return () => window.clearTimeout(t);
    }, []);
    const showTierBadge = isHighTier(fanTier);
    const tierLabel = fanTier === "VIP" ? "VIP" : fanTier;

    return (
        <div className="min-h-screen bg-black text-white">
            <style>{`
        @keyframes neonFlicker {
          0%, 100% { opacity: 1; filter: saturate(1.55) contrast(1.06); }
          42% { opacity: 0.95; }
          43% { opacity: 0.78; }
          44% { opacity: 1; }
          68% { opacity: 0.93; }
          69% { opacity: 0.72; }
          70% { opacity: 0.99; }
        }
        @keyframes neonPulse {
          0%, 100% { transform: translateZ(0) scale(1); }
          50% { transform: translateZ(0) scale(1.02); }
        }
        @keyframes smokeDrift {
          0% { transform: translate3d(-6%, -2%, 0) scale(1); opacity: .20; }
          50% { transform: translate3d(4%, 3%, 0) scale(1.10); opacity: .34; }
          100% { transform: translate3d(-6%, -2%, 0) scale(1); opacity: .20; }
        }

        /* Neon handwriting reveal */
        @keyframes writeReveal {
          0% { clip-path: inset(0 100% 0 0); opacity: 0.2; }
          15% { opacity: 1; }
          100% { clip-path: inset(0 0 0 0); opacity: 1; }
        }
        @keyframes writeCaret {
          0%, 45% { opacity: 1; }
          46%, 100% { opacity: 0; }
        }

        .neon-flicker { animation: neonFlicker 7.5s infinite; }
        .neon-pulse { animation: neonPulse 2.2s ease-in-out infinite; }
        .neon-deep { filter: saturate(1.65) contrast(1.08); }

        .neon-write {
          position: relative;
          display: inline-block;
          clip-path: inset(0 100% 0 0);
          animation: writeReveal 1.1s ease-out forwards;
        }
        .neon-write::after {
          content: "";
          position: absolute;
          right: -8px;
          top: 50%;
          width: 10px;
          height: 10px;
          transform: translateY(-50%);
          border-radius: 999px;
          background: rgba(255, 0, 200, 0.95);
          box-shadow: 0 0 18px rgba(255,0,200,1), 0 0 54px rgba(255,0,200,0.55);
          animation: writeCaret 1.1s ease-out forwards;
        }
        .neon-write-stroke {
          color: rgba(255, 0, 200, 0.92);
          text-shadow:
            0 0 10px rgba(255,0,200,0.95),
            0 0 26px rgba(255,0,200,0.75),
            0 0 62px rgba(0,230,255,0.25);
          filter: saturate(1.7) contrast(1.15);
        }
        .vip-glow {
          box-shadow:
            0 0 16px rgba(255, 215, 0, 0.55),
            0 0 44px rgba(255, 215, 0, 0.28),
            0 0 22px rgba(255, 0, 200, 0.22);
        }
        .neon-smoke {
          pointer-events: none;
          position: absolute;
          inset: -46px;
          filter: blur(18px);
          background:
            radial-gradient(circle at 18% 20%, rgba(255,0,200,.26), transparent 55%),
            radial-gradient(circle at 74% 38%, rgba(0,230,255,.22), transparent 60%),
            radial-gradient(circle at 35% 82%, rgba(0,255,170,.14), transparent 58%),
            radial-gradient(circle at 85% 85%, rgba(170,80,255,.18), transparent 58%),
            radial-gradient(circle at 58% 62%, rgba(200,255,0,.10), transparent 56%);
          mix-blend-mode: screen;
          animation: smokeDrift 9s ease-in-out infinite;
        }
      `}</style>

            <div className="px-6 py-4 border-b border-pink-500/20 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <Logo onClick={() => setRoute("home")} />

                    {/* Animated neon handwriting welcome (reveals on load) */}
                    <div className={cx("flex items-center gap-3", revealWelcome ? "" : "opacity-0")}
                    >
                        <div
                            className={cx(
                                "text-sm",
                                "neon-write",
                                "drop-shadow-[0_0_44px_rgba(255,0,200,0.95)]"
                            )}
                            aria-label={`Welcome ${firstName}`}
                        >
                            <span className="neon-write-stroke">Welcome</span>
                            <span className="mx-2" />
                            <span className="font-semibold neon-write-stroke">{firstName}</span>
                        </div>

                        {showTierBadge && (
                            <span
                                className={cx(
                                    "inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[10px] border",
                                    fanTierClasses(fanTier),
                                    fanTierBg(fanTier),
                                    "vip-glow"
                                )}
                                title="High tier badge"
                            >
                                <Crown className="w-3 h-3" />
                                {tierLabel}
                            </span>
                        )}
                    </div>
                </div>

                {/* Top-right: Search + My Profile only */}
                <div className="flex items-center gap-3">
                    {route === "home" && (
                        <div className="flex items-center gap-2 rounded-2xl border border-pink-500/20 bg-black/35 px-3 py-2">
                            <Search className="w-4 h-4 text-pink-300" />
                            <input
                                value={homeQuery}
                                onChange={(e) => setHomeQuery(e.target.value)}
                                className="bg-transparent outline-none text-sm w-44"
                                placeholder="Search creators…"
                            />
                        </div>
                    )}

                    <div className="w-[220px]">
                        <Dropdown
                            tone="pink"
                            label={
                                <span className="inline-flex items-center gap-2">
                                    <User className="w-4 h-4" /> My Profile
                                </span>
                            }
                            items={[
                                { icon: <User className="w-4 h-4" />, text: "Profile", onClick: () => navigate("/profile") },
                                { icon: <CreditCard className="w-4 h-4" />, text: "Wallet", onClick: () => navigate("/wallet") },
                                { icon: <Users className="w-4 h-4" />, text: "Bookmarks", onClick: () => navigate("/bookmarks") }, // Assuming "Subscription" meant Bookmarks or similar
                                { icon: <Settings className="w-4 h-4" />, text: "Settings", onClick: () => navigate("/settings") },
                                { icon: <LogOut className="w-4 h-4" />, text: "Log Out", onClick: () => navigate("/auth") }, // Simple redirect for now
                            ]}
                        />
                    </div>
                </div>
            </div>

            {route === "home" ? (
                <HomeScreen onEnterSuga4U={() => setRoute("suga4u")} query={homeQuery} setQuery={setHomeQuery} creators={creators} feedPosts={feedPosts} loading={loading} userId={user?.id} userRole={role ?? undefined} />
            ) : (
                <Suga4URoomPreview fanTier={fanTier} creatorGender={creatorGender} onBackHome={() => setRoute("home")} />
            )}
        </div>
    );
}

