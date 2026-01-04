import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { PostCard } from '@/components/feed/PostCard';
import { CreatePost } from '@/components/feed/CreatePost';
import { Loader2, Search, X } from 'lucide-react';
import { RefObject } from 'react';

interface FeedPost {
  id: string;
  title: string | null;
  content: string | null;
  content_url: string | null;
  is_locked: boolean;
  likes_count: number;
  creator_id: string;
  created_at: string;
  comments_count: number;
  creator: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface FeedContentProps {
  profile: { username: string } | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  isSearching: boolean;
  role: string | null;
  userId: string;
  handlePostCreated: () => void;
  loadingPosts: boolean;
  posts: FeedPost[];
  subscribedCreators: string[];
  likedPosts: Set<string>;
  bookmarkedPosts: Set<string>;
  handleLikeToggle: (postId: string, isLiked: boolean) => void;
  handleBookmarkToggle: (postId: string, isBookmarked: boolean) => void;
  handlePostDeleted: (postId: string) => void;
  loadMoreRef: RefObject<HTMLDivElement>;
  loadingMore: boolean;
  hasMore: boolean;
}

export function FeedContent({
  profile,
  searchQuery,
  setSearchQuery,
  clearSearch,
  isSearching,
  role,
  userId,
  handlePostCreated,
  loadingPosts,
  posts,
  subscribedCreators,
  likedPosts,
  bookmarkedPosts,
  handleLikeToggle,
  handleBookmarkToggle,
  handlePostDeleted,
  loadMoreRef,
  loadingMore,
  hasMore,
}: FeedContentProps) {
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 pb-24">
      <header className="mb-6">
        <h1 className="text-3xl font-display font-bold neon-text-pink mb-2">Feed</h1>
        <p className="text-muted-foreground">
          Welcome back, <span className="text-neon-cyan">{profile?.username}</span>
        </p>
      </header>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search posts or creators..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10 bg-background/50 border-border focus:border-neon-pink"
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {isSearching && searchQuery && (
        <p className="text-sm text-muted-foreground mb-4">
          Showing results for "<span className="text-neon-cyan">{searchQuery}</span>"
        </p>
      )}

      {role === 'creator' && !isSearching && (
        <CreatePost userId={userId} onPostCreated={handlePostCreated} />
      )}
      
      {loadingPosts ? (
        <div className="text-center py-12">
          <div className="animate-pulse text-neon-pink">
            {isSearching ? 'Searching...' : 'Loading posts...'}
          </div>
        </div>
      ) : posts.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isSearching ? 'No posts found matching your search' : 'No posts yet. Follow some creators!'}
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              userId={userId}
              isSubscribed={subscribedCreators.includes(post.creator_id)}
              isLiked={likedPosts.has(post.id)}
              isBookmarked={bookmarkedPosts.has(post.id)}
              commentsCount={post.comments_count}
              onLikeToggle={handleLikeToggle}
              onBookmarkToggle={handleBookmarkToggle}
              onPostDeleted={handlePostDeleted}
              onPostUpdated={handlePostCreated}
            />
          ))}
          
          {/* Load more trigger */}
          <div ref={loadMoreRef} className="py-4">
            {loadingMore && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin text-neon-pink" />
                <span>Loading more posts...</span>
              </div>
            )}
            {!hasMore && posts.length > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                You've reached the end
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
