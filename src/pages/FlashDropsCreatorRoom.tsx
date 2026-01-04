import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, ChevronDown } from "lucide-react";

// ---- Helpers (replicated from HomeMock for consistency) ----
function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function NeonCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cx("rounded-2xl border border-pink-500/25 bg-black shadow-[0_0_22px_rgba(236,72,153,0.14),0_0_52px_rgba(59,130,246,0.08)] transition-all overflow-hidden", className)}>
            {children}
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

// ---- Main Component ----
export default function FlashDropsCreatorRoom() {
    const navigate = useNavigate();

    type DropKind = "Photo Set" | "Video" | "Live Replay" | "DM Pack" | "Vault";
    type Rarity = "Common" | "Rare" | "Epic" | "Legendary";
    type DropStatus = "Scheduled" | "Live" | "Ended";

    type DropRow = {
        id: string;
        title: string;
        kind: DropKind;
        rarity: Rarity;
        price: number;
        endsInMin: number;
        status: DropStatus;
        inventoryTotal?: number;
        inventoryRemaining?: number;
        grossPreview: number;
        unlocksPreview: number;
    };

    const creator = { handle: "@NovaHeat", level: "Star" as const };

    const [toast, setToast] = useState<string | null>(null);
    const [selected, setSelected] = useState<string>("d3");

    const [drops, setDrops] = useState<DropRow[]>([
        {
            id: "d1",
            title: "After Hours — Tease Set",
            kind: "Photo Set",
            rarity: "Common",
            price: 25,
            endsInMin: 28,
            status: "Live",
            inventoryTotal: 999,
            inventoryRemaining: 812,
            grossPreview: 1275,
            unlocksPreview: 51,
        },
        {
            id: "d2",
            title: "Neon Confetti — Clip",
            kind: "Video",
            rarity: "Rare",
            price: 60,
            endsInMin: 22,
            status: "Live",
            inventoryTotal: 400,
            inventoryRemaining: 244,
            grossPreview: 4380,
            unlocksPreview: 73,
        },
        {
            id: "d3",
            title: "VIP Backstage — Full Reel",
            kind: "Live Replay",
            rarity: "Epic",
            price: 250,
            endsInMin: 15,
            status: "Live",
            inventoryTotal: 120,
            inventoryRemaining: 33,
            grossPreview: 18750,
            unlocksPreview: 75,
        },
        {
            id: "d4",
            title: "Private DMs — 10 Pack",
            kind: "DM Pack",
            rarity: "Epic",
            price: 400,
            endsInMin: 12,
            status: "Scheduled",
            inventoryTotal: 80,
            inventoryRemaining: 80,
            grossPreview: 0,
            unlocksPreview: 0,
        },
        {
            id: "d5",
            title: "Vault Drop — Uncut",
            kind: "Vault",
            rarity: "Legendary",
            price: 1000,
            endsInMin: 7,
            status: "Scheduled",
            inventoryTotal: 25,
            inventoryRemaining: 25,
            grossPreview: 0,
            unlocksPreview: 0,
        },
    ]);

    const [formTitle, setFormTitle] = useState("New Flash Drop");
    const [formKind, setFormKind] = useState<DropKind>("Video");
    const [formRarity, setFormRarity] = useState<Rarity>("Rare");
    const [formPrice, setFormPrice] = useState(250);
    const [formEnds, setFormEnds] = useState(15);
    const [formInv, setFormInv] = useState(100);
    const [formNote, setFormNote] = useState("Short teaser for fans…");

    const selectedDrop = drops.find((d) => d.id === selected) ?? drops[0];

    const pushToast = (msg: string) => {
        setToast(msg);
        window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 1400);
    };

    const setStatus = (id: string, status: DropStatus) => {
        setDrops((rows) => rows.map((r) => (r.id === id ? { ...r, status } : r)));
    };

    const quickCreate = () => {
        const id = `new_${Math.random().toString(16).slice(2)}`;
        const row: DropRow = {
            id,
            title: formTitle.trim() || "Untitled Drop",
            kind: formKind,
            rarity: formRarity,
            price: Math.max(1, Math.floor(formPrice)),
            endsInMin: Math.max(1, Math.floor(formEnds)),
            status: "Scheduled",
            inventoryTotal: Math.max(1, Math.floor(formInv)),
            inventoryRemaining: Math.max(1, Math.floor(formInv)),
            grossPreview: 0,
            unlocksPreview: 0,
        };
        setDrops((rows) => [row, ...rows]);
        setSelected(id);
        pushToast("✅ Drop created (Scheduled)");
    };

    const simulateUnlockBurst = (id: string, n: number) => {
        setDrops((rows) =>
            rows.map((r) => {
                if (r.id !== id) return r;
                const invRem = typeof r.inventoryRemaining === "number" ? r.inventoryRemaining : 999999;
                const taken = Math.max(0, Math.min(invRem, n));
                return {
                    ...r,
                    inventoryRemaining:
                        typeof r.inventoryRemaining === "number" ? r.inventoryRemaining - taken : r.inventoryRemaining,
                    unlocksPreview: r.unlocksPreview + taken,
                    grossPreview: r.grossPreview + taken * r.price,
                };
            })
        );
    };

    const rarityTone = (rarity: Rarity) =>
        rarity === "Legendary" ? "yellow" : rarity === "Epic" ? "purple" : rarity === "Rare" ? "blue" : "pink";

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 pt-20 overflow-x-hidden">
            <div className="max-w-7xl mx-auto">
                {toast && (
                    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] rounded-2xl border border-white/10 bg-black/75 px-4 py-2 text-sm text-gray-100 shadow-[0_0_40px_rgba(255,215,0,0.16)] backdrop-blur-md">
                        {toast}
                    </div>
                )}

                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate("/home-mock")}
                            className="p-2 hover:bg-white/10 rounded-full transition border border-white/10"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <button
                            onClick={() => navigate(`/flash-drops/${creator.handle.replace('@', '')}`)}
                            className="rounded-xl border border-blue-500/25 bg-black/40 px-3 py-2 text-sm text-blue-200 hover:bg-white/5 inline-flex items-center gap-2"
                            title="Switch to Fan room preview"
                        >
                            <Sparkles className="w-4 h-4" /> Fan View
                        </button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">
                                Flash Drops — Creator Console
                            </h1>
                            <p className="text-[11px] text-gray-400">Schedule drops, control live status, and monitor spend</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="rounded-2xl border border-blue-500/20 bg-black/35 px-4 py-2">
                            <div className="text-[10px] text-gray-400">Creator</div>
                            <div className="text-sm text-gray-100 font-semibold">
                                {creator.handle} <span className="text-[11px] text-blue-200">• {creator.level}</span>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-yellow-400/30 bg-yellow-500/10 px-4 py-2 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
                            <div className="text-[10px] text-gray-400">Today (preview)</div>
                            <div className="text-sm text-yellow-100 font-semibold">
                                Gross: ${drops.reduce((s, d) => s + d.grossPreview, 0).toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <NeonCard className="lg:col-span-7 p-6 relative">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <Sparkles className="w-5 h-5 text-yellow-400" />
                                <h2 className="text-lg font-semibold text-yellow-100">Drop Control Board</h2>
                            </div>
                            <button
                                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
                                onClick={() => pushToast("🔄 Refreshed metrics")}
                            >
                                Refresh
                            </button>
                        </div>

                        <div className="space-y-4">
                            {drops.map((d) => {
                                const t = toneClasses(rarityTone(d.rarity) as any);
                                const active = selected === d.id;
                                const inv = typeof d.inventoryRemaining === "number" ? `${d.inventoryRemaining}/${d.inventoryTotal}` : "—";
                                return (
                                    <button
                                        key={d.id}
                                        onClick={() => setSelected(d.id)}
                                        className={cx(
                                            "w-full text-left rounded-2xl border bg-black/35 p-4 transition-all duration-300",
                                            t.border,
                                            active ? "ring-2 ring-yellow-400 bg-yellow-400/5" : "hover:bg-white/5"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <div className={cx("text-base font-bold", t.text)}>{d.title}</div>
                                                <div className="mt-2 flex flex-wrap gap-2 items-center">
                                                    <span className="text-[11px] font-medium text-gray-400">{d.kind}</span>
                                                    <span className={cx("text-[10px] px-2 py-[2px] rounded-full border bg-black/40 font-bold", t.border, t.text)}>
                                                        {d.rarity}
                                                    </span>
                                                    <span className={cx(
                                                        "text-[10px] px-2 py-[2px] rounded-full border border-white/10 bg-black/40 font-bold uppercase tracking-wider",
                                                        d.status === 'Live' ? "text-emerald-400 border-emerald-400/30" : d.status === 'Ended' ? "text-rose-400 border-rose-400/30" : "text-blue-400 border-blue-400/30"
                                                    )}>
                                                        {d.status}
                                                    </span>
                                                </div>
                                                <div className="mt-3 text-[11px] text-gray-500 font-medium">Ends in {d.endsInMin}m • Inventory {inv}</div>
                                            </div>

                                            <div className="shrink-0 text-right">
                                                <div className="text-lg text-yellow-400 font-extrabold font-mono">${d.price.toLocaleString()}</div>
                                                <div className="mt-1 text-[11px] text-gray-400">Unlocks: {d.unlocksPreview.toLocaleString()}</div>
                                                <div className="mt-1 text-[11px] text-gray-400 font-semibold">Gross: ${d.grossPreview.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </NeonCard>

                    <div className="lg:col-span-5 space-y-8">
                        <NeonCard className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-blue-100">Drop Controls</h3>
                                <span className={cx(
                                    "text-[10px] px-3 py-1 rounded-full border border-white/10 bg-black/40 font-black uppercase tracking-widest",
                                    selectedDrop.status === 'Live' ? "text-emerald-400 border-emerald-400/30 shadow-[0_0_10px_rgba(52,211,153,0.2)]" : "text-gray-400"
                                )}>
                                    {selectedDrop.status}
                                </span>
                            </div>

                            <div className="rounded-2xl border border-white/5 bg-white/5 p-4 mb-6">
                                <div className="text-sm text-white font-black">{selectedDrop.title}</div>
                                <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
                                    <span className="font-mono text-yellow-400">${selectedDrop.price.toLocaleString()}</span>
                                    <span>•</span>
                                    <span>Ends in {selectedDrop.endsInMin}m</span>
                                </div>
                                <div className="mt-2 text-[11px] text-gray-400">
                                    Inventory:{" "}
                                    <span className="text-blue-200">
                                        {typeof selectedDrop.inventoryRemaining === "number"
                                            ? `${selectedDrop.inventoryRemaining}/${selectedDrop.inventoryTotal}`
                                            : "Unlimited"}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-8">
                                <button
                                    className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 py-3 text-xs font-bold text-emerald-100 hover:bg-emerald-500/20 transition-all active:scale-95"
                                    onClick={() => {
                                        setStatus(selectedDrop.id, "Live");
                                        pushToast("🟢 Drop set LIVE");
                                    }}
                                >
                                    Go Live
                                </button>
                                <button
                                    className="rounded-xl border border-blue-400/30 bg-blue-500/10 py-3 text-xs font-bold text-blue-100 hover:bg-blue-500/20 transition-all active:scale-95"
                                    onClick={() => {
                                        setStatus(selectedDrop.id, "Scheduled");
                                        pushToast("🗓️ Drop Scheduled");
                                    }}
                                >
                                    Schedule
                                </button>
                                <button
                                    className="rounded-xl border border-rose-400/30 bg-rose-500/10 py-3 text-xs font-bold text-rose-100 hover:bg-rose-500/20 transition-all active:scale-95"
                                    onClick={() => {
                                        setStatus(selectedDrop.id, "Ended");
                                        pushToast("⛔ Drop ended");
                                    }}
                                >
                                    End Now
                                </button>
                            </div>

                            <div className="rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4 mb-6">
                                <div className="text-[11px] text-blue-300 font-bold uppercase tracking-wider mb-3">Simulate Demand</div>
                                <div className="grid grid-cols-3 gap-2">
                                    {[5, 25, 100].map((n) => (
                                        <button
                                            key={n}
                                            className="rounded-xl border border-white/10 bg-black/40 py-2 text-xs font-bold hover:bg-white/10 transition-all active:scale-95"
                                            onClick={() => {
                                                simulateUnlockBurst(selectedDrop.id, n);
                                                pushToast(`⚡ +${n} unlocks simulated`);
                                            }}
                                        >
                                            +{n}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-2">Creator Teaser Note</div>
                                <textarea
                                    value={formNote}
                                    onChange={(e) => setFormNote(e.target.value)}
                                    className="w-full min-h-[100px] rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-gray-200 outline-none focus:border-blue-500/40 transition-all resize-none"
                                    placeholder="Tell your fans why this drop is essential..."
                                />
                                <button
                                    className="mt-3 w-full rounded-xl bg-white text-black py-2.5 text-xs font-black hover:bg-gray-200 transition-all active:scale-95"
                                    onClick={() => pushToast("💾 Teaser note saved")}
                                >
                                    SAVE NOTE
                                </button>
                            </div>
                        </NeonCard>

                        <NeonCard className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-yellow-100">Create New Drop</h3>
                                <span className="text-[10px] text-gray-500 font-bold">DEFAULT: SCHEDULED</span>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="text-[11px] text-gray-500 font-bold uppercase">Title</div>
                                    <input
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-yellow-500/40 transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <div className="text-[11px] text-gray-500 font-bold uppercase">Kind</div>
                                        <select
                                            value={formKind}
                                            onChange={(e) => setFormKind(e.target.value as DropKind)}
                                            className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-yellow-500/40 appearance-none"
                                        >
                                            {(["Photo Set", "Video", "Live Replay", "DM Pack", "Vault"] as DropKind[]).map((k) => (
                                                <option key={k} value={k}>
                                                    {k}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-[11px] text-gray-500 font-bold uppercase">Rarity</div>
                                        <select
                                            value={formRarity}
                                            onChange={(e) => setFormRarity(e.target.value as Rarity)}
                                            className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-yellow-500/40 appearance-none"
                                        >
                                            {(["Common", "Rare", "Epic", "Legendary"] as Rarity[]).map((r) => (
                                                <option key={r} value={r}>
                                                    {r}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <div className="text-[11px] text-gray-500 font-bold uppercase">Price ($)</div>
                                        <input
                                            type="number"
                                            value={formPrice}
                                            onChange={(e) => setFormPrice(Number(e.target.value))}
                                            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-yellow-500/40"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-[11px] text-gray-500 font-bold uppercase">Time (min)</div>
                                        <input
                                            type="number"
                                            value={formEnds}
                                            onChange={(e) => setFormEnds(Number(e.target.value))}
                                            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-yellow-500/40"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-[11px] text-gray-500 font-bold uppercase">Inventory</div>
                                        <input
                                            type="number"
                                            value={formInv}
                                            onChange={(e) => setFormInv(Number(e.target.value))}
                                            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-yellow-500/40"
                                        />
                                    </div>
                                </div>

                                <button
                                    className="w-full mt-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-black py-4 text-sm font-black hover:from-yellow-400 hover:to-amber-500 transition-all shadow-[0_4px_20px_rgba(234,179,8,0.2)] active:scale-95 uppercase tracking-tighter"
                                    onClick={quickCreate}
                                >
                                    CREATE FLASH DROP
                                </button>

                                <div className="text-[9px] text-gray-600 font-medium text-center leading-tight">
                                    PREVIEW MODE: ALL METRICS ARE LOCAL STATE. PRODUCTION REQUIRES ATOMIC TRANSACTION LOGS.
                                </div>
                            </div>
                        </NeonCard>
                    </div>
                </div>
            </div>
        </div>
    );
}
