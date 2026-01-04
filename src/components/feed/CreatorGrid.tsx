import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Heart, MessageCircle, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface Creator {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
}

interface Post {
    id: string;
    title: string | null;
    content: string | null;
    content_url: string | null;
    is_locked: boolean;
    likes_count: number;
    creator_id: string;
    created_at: string;
    comments_count: number;
    creator: Creator;
}

interface CreatorGridProps {
    posts: Post[];
    loading: boolean;
    subscribedCreators: string[];
    likedPosts: Set<string>;
    onCategoryFilter: (category: string) => void;
    onSortChange: (sort: string) => void;
}

const getCategoryTags = (postId: string): string[] => {
    // Mock category tags - in real implementation, these would come from the post data
    const tagOptions = ['Flash Drop', 'Suga 4 U', 'Confessions', 'X Chat', 'Truth or Dare', 'Bar Lounge'];
    return [tagOptions[Math.floor(Math.random() * tagOptions.length)]];
};

const getCreatorLevel = (creatorId: string): string => {
    // Mock creator levels - in real implementation, this would come from creator profile
    const levels = ['Elite', 'Star', 'Rising'];
    return levels[Math.floor(Math.random() * levels.length)];
};

export function CreatorGrid({
    posts,
    loading,
    subscribedCreators,
    likedPosts,
    onCategoryFilter,
    onSortChange
}: CreatorGridProps) {
    const navigate = useNavigate();
    const [creatorLevel, setCreatorLevel] = useState('all');
    const [roomCategory, setRoomCategory] = useState('all');
    const [sortBy, setSortBy] = useState('recommended');

    const handleSortChange = (value: string) => {
        setSortBy(value);
        onSortChange(value);
    };

    if (loading) {
        return (
            <div className="flex-1 p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-12 bg-secondary/50 rounded-lg w-full" />
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-64 bg-secondary/50 rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 overflow-y-auto">
            {/* Filter Controls */}
            <div className="mb-6 flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs text-muted-foreground mb-1 block">Creator Level</label>
                    <Select value={creatorLevel} onValueChange={setCreatorLevel}>
                        <SelectTrigger className="glass-card border-border/50">
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="elite">Elite</SelectItem>
                            <SelectItem value="star">Star</SelectItem>
                            <SelectItem value="rising">Rising</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs text-muted-foreground mb-1 block">Room / Category</label>
                    <Select value={roomCategory} onValueChange={(value) => {
                        setRoomCategory(value);
                        onCategoryFilter(value);
                    }}>
                        <SelectTrigger className="glass-card border-border/50">
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="flash-drops">Flash Drops</SelectItem>
                            <SelectItem value="confessions">Confessions</SelectItem>
                            <SelectItem value="x-chat">X Chat</SelectItem>
                            <SelectItem value="bar-lounge">Bar Lounge</SelectItem>
                            <SelectItem value="truth-or-dare">Truth or Dare</SelectItem>
                            <SelectItem value="suga-4-u">Suga 4 U</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs text-muted-foreground mb-1 block">Sort</label>
                    <Select value={sortBy} onValueChange={handleSortChange}>
                        <SelectTrigger className="glass-card border-border/50">
                            <SelectValue placeholder="Recommended" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="recommended">Recommended</SelectItem>
                            <SelectItem value="popular">Popular</SelectItem>
                            <SelectItem value="new">New</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Creator Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {posts.map((post) => {
                    const isSubscribed = subscribedCreators.includes(post.creator_id);
                    const isLiked = likedPosts.has(post.id);
                    const tags = getCategoryTags(post.id);
                    const level = getCreatorLevel(post.creator_id);

                    return (
                        <div
                            key={post.id}
                            onClick={() => navigate(`/post/${post.id}`)}
                            className="glass-card rounded-xl overflow-hidden cursor-pointer group hover:shadow-[0_0_30px_rgba(236,72,153,0.3)] transition-all duration-300 border border-border/50 hover:border-neon-pink/50"
                        >
                            {/* Preview Image/Video */}
                            <div className="relative aspect-[4/5] bg-gradient-to-br from-secondary/50 to-secondary/30 overflow-hidden">
                                {post.content_url ? (
                                    post.content_url.match(/\.(mp4|webm|ogg)$/i) ? (
                                        <video
                                            src={post.content_url}
                                            className={cn(
                                                "w-full h-full object-cover",
                                                post.is_locked && !isSubscribed && "blur-xl scale-110"
                                            )}
                                            muted
                                            loop
                                            playsInline
                                        />
                                    ) : (
                                        <img
                                            src={post.content_url}
                                            alt={post.title || 'Content preview'}
                                            className={cn(
                                                "w-full h-full object-cover",
                                                post.is_locked && !isSubscribed && "blur-xl scale-110"
                                            )}
                                        />
                                    )
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Eye className="w-12 h-12 text-muted-foreground/30" />
                                    </div>
                                )}

                                {/* Lock Overlay */}
                                {post.is_locked && !isSubscribed && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                        <Lock className="w-12 h-12 text-neon-pink drop-shadow-[0_0_10px_currentColor]" />
                                    </div>
                                )}

                                {/* Creator Level Badge */}
                                <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-neon-yellow/50 text-neon-yellow text-xs font-semibold">
                                    {level}
                                </div>
                            </div>

                            {/* Card Content */}
                            <div className="p-4">
                                {/* Creator Info */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-pink to-neon-cyan overflow-hidden">
                                        {post.creator.avatar_url ? (
                                            <img
                                                src={post.creator.avatar_url}
                                                alt={post.creator.username}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white font-bold">
                                                {post.creator.username[0].toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-foreground truncate">
                                            {post.creator.display_name || post.creator.username}
                                        </p>
                                        <p className="text-xs text-muted-foreground">@{post.creator.username}</p>
                                    </div>
                                </div>

                                {/* Category Tags */}
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {tags.map((tag, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1 rounded-full bg-secondary/50 border border-neon-cyan/30 text-neon-cyan text-xs font-medium"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>

                                {/* Stats */}
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Heart className={cn("w-4 h-4", isLiked && "fill-neon-pink text-neon-pink")} />
                                        <span>{post.likes_count}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <MessageCircle className="w-4 h-4" />
                                        <span>{post.comments_count}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty State */}
            {posts.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No creators found</p>
                </div>
            )}
        </div>
    );
}
