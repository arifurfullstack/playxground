
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Link as LinkIcon, Edit, Copy, Archive, CheckCircle, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { NeonCard } from "@/components/ui/neon-card"; // Fallback to standard div if needed but preferred
import { GlassCard } from "@/components/ui/glass-card";

// Types
type ConfTier = "Soft" | "Spicy" | "Dirty" | "Dark" | "Forbidden";
type ConfType = "Text" | "Voice" | "Video";
type ConfStatus = "Draft" | "Published" | "Archived";

interface ConfessionItem {
    id: string;
    creator_id: string;
    tier: ConfTier;
    type: ConfType;
    title: string;
    preview_text: string;
    content_url: string | null;
    price: number;
    status: ConfStatus;
    created_at: string;
    updated_at: string;
}

const TIER_META: Record<ConfTier, { price: number; tone: string }> = {
    Soft: { price: 5, tone: "border-pink-500/25 text-pink-200" },
    Spicy: { price: 10, tone: "border-rose-400/30 text-rose-200" },
    Dirty: { price: 20, tone: "border-red-400/30 text-red-200" },
    Dark: { price: 35, tone: "border-violet-300/30 text-violet-200" },
    Forbidden: { price: 60, tone: "border-yellow-400/30 text-yellow-200" },
};

export default function ConfessionsStudio() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<ConfessionItem[]>([]);
    const [filter, setFilter] = useState<ConfStatus>("Published");

    // Editor State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [type, setType] = useState<ConfType>("Text");
    const [tier, setTier] = useState<ConfTier>("Spicy");
    const [title, setTitle] = useState("");
    const [teaser, setTeaser] = useState(""); // preview_text
    const [fullText, setFullText] = useState(""); // content_url (stored as text for Text type)
    const [fileName, setFileName] = useState<string | null>(null); // For mock file upload

    useEffect(() => {
        if (user) {
            fetchItems();
        }
    }, [user]);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("confessions")
                .select("*")
                .eq("creator_id", user?.id)
                .order("created_at", { ascending: false });

            if (error) throw error;

            // Cast data to ensure status is typed correctly (migration helper)
            const formatted = (data || []).map(d => ({
                ...d,
                status: (d.status === 'active' ? 'Published' : d.status === 'hidden' ? 'Draft' : d.status === 'deleted' ? 'Archived' : d.status) as ConfStatus
            }));

            setItems(formatted);
        } catch (error: any) {
            console.error("Error fetching items:", error);
            toast.error("Failed to load confessions");
        } finally {
            setLoading(false);
        }
    };

    const visibleItems = useMemo(() => items.filter(i => i.status === filter), [items, filter]);

    // Editor Actions
    const resetEditor = () => {
        setEditingId(null);
        setType("Text");
        setTier("Spicy");
        setTitle("");
        setTeaser("");
        setFullText("");
        setFileName(null);
    };

    const loadItem = (item: ConfessionItem) => {
        setEditingId(item.id);
        setType(item.type);
        setTier(item.tier);
        setTitle(item.title);
        setTeaser(item.preview_text);
        if (item.type === 'Text') {
            setFullText(item.content_url || "");
            setFileName(null);
        } else {
            setFullText("");
            setFileName(item.content_url || "Existing File");
        }
    };

    const handleSave = async (targetStatus: ConfStatus) => {
        if (!user) return;
        if (!title.trim() || !teaser.trim()) {
            toast.error("Title and Teaser are required");
            return;
        }

        try {
            const payload = {
                creator_id: user.id,
                title: title.trim(),
                preview_text: teaser.trim(),
                tier,
                type,
                price: TIER_META[tier].price,
                status: targetStatus,
                content_url: type === 'Text' ? fullText : (fileName || 'placeholder_asset_id'),
                updated_at: new Date().toISOString()
            };

            let error;
            if (editingId) {
                const { error: upError } = await supabase
                    .from("confessions")
                    .update(payload)
                    .eq("id", editingId);
                error = upError;
            } else {
                const { error: insError } = await supabase
                    .from("confessions")
                    .insert(payload);
                error = insError;
            }

            if (error) throw error;

            toast.success(editingId ? `Updated (${targetStatus})` : `Created (${targetStatus})`);
            fetchItems(); // Refresh
            if (targetStatus === 'Published' || targetStatus === 'Draft') {
                resetEditor(); // Clear only on clean save/publish
            }

        } catch (err: any) {
            console.error(err);
            toast.error("Failed to save confession");
        }
    };

    const handleDuplicate = async (item: ConfessionItem) => {
        try {
            const { error } = await supabase
                .from("confessions")
                .insert({
                    creator_id: user?.id,
                    title: `${item.title} (Copy)`,
                    preview_text: item.preview_text,
                    tier: item.tier,
                    type: item.type,
                    price: item.price,
                    content_url: item.content_url,
                    status: 'Draft'
                });

            if (error) throw error;
            toast.success("Duplicated to Drafts");
            fetchItems();
        } catch (err) {
            toast.error("Failed to duplicate");
        }
    };

    const handleArchive = async (id: string) => {
        try {
            const { error } = await supabase
                .from("confessions")
                .update({ status: 'Archived' })
                .eq("id", id);

            if (error) throw error;
            toast.success("Archived item");
            fetchItems();
        } catch (err) {
            toast.error("Failed to archive");
        }
    };

    return (
        <div className="min-h-screen bg-black text-white pb-20">
            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="rounded-xl border border-pink-500/25 bg-black/40 px-3 py-2 text-sm text-pink-200 hover:bg-white/5 inline-flex items-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                        <button
                            onClick={() => navigate(`/confessions/${user?.id}`)}
                            className="rounded-xl border border-rose-400/30 bg-rose-600/20 px-3 py-2 text-sm text-rose-100 hover:bg-rose-600/30 inline-flex items-center gap-2"
                        >
                            <Sparkles className="w-4 h-4" /> Fan View
                        </button>
                        <div>
                            <div className="text-rose-200 text-sm font-display">Confessions Studio — Creator View</div>
                            <div className="text-[11px] text-gray-400">Create locked confessions for the fan Confession Wall</div>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-3 py-2">
                        <div className="text-[10px] text-rose-200">Pricing</div>
                        <div className="text-sm text-rose-100 font-semibold">Fixed by Tier</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Editor Column */}
                    <GlassCard className="lg:col-span-5 p-4 border-rose-500/20 bg-black/40">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-rose-200 text-sm font-display">{editingId ? "Edit Confession" : "New Confession"}</div>
                            <span className={cn("text-[10px] px-2 py-[2px] rounded-full border bg-black/40", TIER_META[tier].tone)}>
                                {tier} • ${TIER_META[tier].price}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {/* Type Selector */}
                            <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                                <div className="text-[11px] text-gray-400 mb-2">Type</div>
                                <div className="grid grid-cols-3 gap-2">
                                    {["Text", "Voice", "Video"].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setType(t as ConfType)}
                                            className={cn(
                                                "rounded-xl border py-2 text-sm transition-all",
                                                type === t ? "border-rose-400/40 bg-rose-600/20 text-white" : "border-white/10 bg-black/20 text-gray-400 hover:bg-white/5"
                                            )}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tier Selector */}
                            <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                                <div className="text-[11px] text-gray-400 mb-2">Tier</div>
                                <div className="grid grid-cols-5 gap-1">
                                    {(Object.keys(TIER_META) as ConfTier[]).map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setTier(t)}
                                            className={cn(
                                                "rounded-xl border py-2 text-[10px] sm:text-xs transition-all",
                                                tier === t
                                                    ? cn("bg-black/40", TIER_META[t].tone)
                                                    : "border-white/10 bg-black/20 hover:bg-white/5 text-gray-400"
                                            )}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Inputs */}
                            <div className="rounded-2xl border border-white/10 bg-black/30 p-3 space-y-3">
                                <div>
                                    <div className="text-[11px] text-gray-400 mb-1">Title</div>
                                    <input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full rounded-xl border border-rose-400/20 bg-black/40 px-3 py-2 text-sm outline-none text-white focus:border-rose-500/50"
                                        placeholder="Confession title..."
                                    />
                                </div>
                                <div>
                                    <div className="text-[11px] text-gray-400 mb-1">Teaser (Locked preview)</div>
                                    <input
                                        value={teaser}
                                        onChange={(e) => setTeaser(e.target.value)}
                                        className="w-full rounded-xl border border-rose-400/20 bg-black/40 px-3 py-2 text-sm outline-none text-white focus:border-rose-500/50"
                                        placeholder="What fans see before unlocking..."
                                    />
                                </div>
                                <div>
                                    <div className="text-[11px] text-gray-400 mb-1">Content (Unlocked)</div>
                                    {type === 'Text' ? (
                                        <textarea
                                            value={fullText}
                                            onChange={(e) => setFullText(e.target.value)}
                                            className="w-full min-h-[100px] rounded-xl border border-rose-400/20 bg-black/40 px-3 py-2 text-sm outline-none text-white focus:border-rose-500/50"
                                            placeholder="The full secret..."
                                        />
                                    ) : (
                                        <div className="flex items-center justify-between gap-2 border border-rose-400/20 rounded-xl p-3 bg-black/40">
                                            <span className="text-sm text-gray-300 truncate max-w-[150px]">{fileName || "No file selected"}</span>
                                            <button
                                                onClick={() => setFileName(`upload_${Date.now()}.${type === 'Voice' ? 'm4a' : 'mp4'}`)}
                                                className="flex items-center gap-2 text-xs text-rose-200 hover:text-white"
                                            >
                                                <LinkIcon className="w-3 h-3" /> Select File
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => handleSave('Draft')}
                                    className="flex-1 rounded-xl border border-rose-400/25 bg-black/40 py-2 text-sm hover:bg-white/5 transition-colors"
                                >
                                    Save Draft
                                </button>
                                <button
                                    onClick={() => handleSave('Published')}
                                    className="flex-1 rounded-xl border border-rose-400/30 bg-rose-600 py-2 text-sm hover:bg-rose-700 transition-colors font-medium"
                                >
                                    Publish
                                </button>
                                <button
                                    onClick={resetEditor}
                                    className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>

                        </div>
                    </GlassCard>

                    {/* Library Column */}
                    <GlassCard className="lg:col-span-7 p-4 border-rose-500/20 bg-black/40">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-rose-200 text-sm font-display">Library</div>
                            <div className="flex items-center gap-2">
                                {["Draft", "Published", "Archived"].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setFilter(s as ConfStatus)}
                                        className={cn(
                                            "rounded-xl border px-3 py-1.5 text-xs transition-colors",
                                            filter === s ? "border-rose-400/35 bg-rose-600/15 text-white" : "border-white/10 bg-black/20 text-gray-400 hover:bg-white/5 hover:text-white"
                                        )}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                            {visibleItems.length === 0 ? (
                                <div className="text-center py-10 text-gray-500 text-sm">No {filter.toLowerCase()} items found.</div>
                            ) : visibleItems.map(item => (
                                <div key={item.id} className="rounded-2xl border border-white/10 bg-black/30 p-3 hover:border-white/20 transition-colors">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className="font-medium text-gray-200 truncate">{item.title}</span>
                                                <span className={cn("text-[10px] px-2 py-[2px] rounded-full border bg-black/40", TIER_META[item.tier].tone)}>
                                                    {item.tier} • ${item.price}
                                                </span>
                                                <span className="text-[10px] px-2 py-[2px] rounded-full border border-white/10 text-gray-300 bg-black/40">
                                                    {item.type}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-400 truncate">{item.preview_text}</div>
                                            <div className="mt-2 text-[10px] text-gray-500 flex items-center gap-2">
                                                Last updated: {new Date(item.updated_at).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 shrink-0">
                                            <button
                                                onClick={() => loadItem(item)}
                                                className="p-2 rounded-lg border border-white/10 hover:bg-white/10 text-gray-300 transition-colors"
                                                title="Edit"
                                            >
                                                <Edit className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDuplicate(item)}
                                                className="p-2 rounded-lg border border-white/10 hover:bg-white/10 text-gray-300 transition-colors"
                                                title="Duplicate"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                            {item.status !== 'Archived' && (
                                                <button
                                                    onClick={() => handleArchive(item.id)}
                                                    className="p-2 rounded-lg border border-white/10 hover:bg-white/10 text-gray-300 transition-colors"
                                                    title="Archive"
                                                >
                                                    <Archive className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                </div>
            </div>
        </div>
    );
}
