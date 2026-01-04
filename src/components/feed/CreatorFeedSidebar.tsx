import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Heart, Image as ImageIcon, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NeonButton } from '@/components/ui/neon-button';

interface Creator {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
}

interface FeedItem {
    id: string;
    title: string | null;
    content: string | null;
    content_url: string | null;
    is_locked: boolean;
    likes_count: number;
    creator_id: string;
    created_at: string;
    creator: Creator;
}

interface CreatorFeedSidebarProps {
    posts: FeedItem[];
    subscribedCreators: string[];
    onUnlock: (postId: string) => void;
}

const getCategoryTags = (postId: string): string[] => {
    const tagOptions = ['Flash Drop', 'Suga 4 U', 'Confessions', 'X Chat'];
    return [tagOptions[Math.floor(Math.random() * tagOptions.length)]];
};

export function CreatorFeedSidebar({ posts, subscribedCreators, onUnlock }: CreatorFeedSidebarProps) {
    const navigate = useNavigate();
    const [likedItems, setLikedItems] = useState<Set<string>>(new Set());

    const handleLike = (postId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setLikedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(postId)) {
                newSet.delete(postId);
            } else {
                newSet.add(postId);
            }
            return newSet;
        });
    };

    const handleUnlock = (postId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onUnlock(postId);
    };

    // Take only locked posts for the feed
    const lockedPosts = posts
        .filter(post => post.is_locked && !subscribedCreators.includes(post.creator_id))
        .slice(0, 10);

    return (
        <aside className="hidden xl:block w-80 h-screen sticky top-0 glass-card rounded-none border-l border-border/50 p-6 overflow-y-auto">
            <h2 className="text-lg font-bold text-foreground mb-6">Creator Feed</h2>

            <div className="space-y-4">
                {lockedPosts.map((post) => {
                    const isLiked = likedItems.has(post.id);
                    const tags = getCategoryTags(post.id);
                    const contentType = post.content_url?.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'photo';

                    return (
                        <div
                            key={post.id}
                            onClick={() => navigate(`/post/${post.id}`)}
                            className="glass-card rounded-xl overflow-hidden cursor-pointer hover:shadow-[0_0_20px_rgba(236,72,153,0.2)] transition-all duration-300 border border-border/50 hover:border-neon-pink/30"
                        >
                            {/* Header */}
                            <div className="p-4 pb-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-pink to-neon-cyan overflow-hidden">
                                        {post.creator.avatar_url ? (
                                            <img
                                                src={post.creator.avatar_url}
                                                alt={post.creator.username}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                                                {post.creator.username[0].toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-foreground truncate">
                                            @{post.creator.username}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary/50 text-xs text-muted-foreground">
                                    {contentType === 'video' ? (
                                        <>
                                            <Video className="w-3 h-3" />
                                            <span>Video</span>
                                        </>
                                    ) : (
                                        <>
                                            <ImageIcon className="w-3 h-3" />
                                            <span>Photo</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Preview Content */}
                            <div className="relative aspect-[3/4] bg-gradient-to-br from-secondary/50 to-secondary/30 overflow-hidden">
                                {post.content_url ? (
                                    contentType === 'video' ? (
                                        <video
                                            src={post.content_url}
                                            className="w-full h-full object-cover blur-2xl scale-110"
                                            muted
                                            loop
                                            playsInline
                                        />
                                    ) : (
                                        <img
                                            src={post.content_url}
                                            alt="Locked content"
                                            className="w-full h-full object-cover blur-2xl scale-110"
                                        />
                                    )
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-neon-pink/20 to-neon-purple/20" />
                                )}

                                {/* Lock Overlay */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md">
                                    <Lock className="w-10 h-10 text-neon-pink drop-shadow-[0_0_10px_currentColor] mb-3" />
                                    <p className="text-white font-semibold text-sm mb-1">Tap to unlock</p>
                                    <p className="text-white/70 text-xs px-4 text-center">
                                        {post.title || 'New clip just dropped. Unlock to watch.'}
                                    </p>
                                </div>

                                {/* Video Preview Badge */}
                                {contentType === 'video' && (
                                    <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-neon-cyan/50 text-neon-cyan text-xs font-semibold flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
                                        Video preview
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 pt-3">
                                {/* Category Tags */}
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {tags.map((tag, index) => (
                                        <span
                                            key={index}
                                            className="px-2 py-1 rounded-full bg-secondary/50 border border-neon-purple/30 text-neon-purple text-xs font-medium"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => handleLike(post.id, e)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-sm font-medium",
                                            isLiked
                                                ? "bg-neon-pink/20 text-neon-pink border border-neon-pink/50"
                                                : "bg-secondary/50 text-muted-foreground hover:text-foreground border border-border/50"
                                        )}
                                    >
                                        <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
                                        <span>Like</span>
                                    </button>
                                    <NeonButton
                                        variant="filled"
                                        size="sm"
                                        onClick={(e) => handleUnlock(post.id, e)}
                                        className="flex-1"
                                    >
                                        <Lock className="w-4 h-4" />
                                        Unlock
                                    </NeonButton>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Empty State */}
                {lockedPosts.length === 0 && (
                    <div className="text-center py-8">
                        <Lock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No locked content available</p>
                    </div>
                )}
            </div>
        </aside>
    );
}
