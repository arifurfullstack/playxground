import { useState, useEffect, useRef, useCallback } from 'react';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { CreatorGrid } from '@/components/feed/CreatorGrid';
import { CreatorFeedSidebar } from '@/components/feed/CreatorFeedSidebar';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const POSTS_PER_PAGE = 10;

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

export default function Feed() {
  const { user, loading } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [subscribedCreators, setSubscribedCreators] = useState<string[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Set<string>>(new Set());

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recommended');

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (user) {
      fetchPosts();
      fetchSubscriptions();
      fetchUserLikes();
      fetchUserBookmarks();
    }
  }, [user, selectedCategory, sortBy]);

  // Infinite scroll observer
  useEffect(() => {
    if (loadingPosts || loadingMore || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadingPosts, loadingMore, hasMore, posts.length]);

  // Real-time subscriptions for likes and comments
  useEffect(() => {
    if (!user || posts.length === 0) return;

    const postIds = posts.map(p => p.id);

    const likesChannel = supabase
      .channel('likes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
        },
        (payload) => {
          const postId = (payload.new as any)?.post_id || (payload.old as any)?.post_id;
          if (!postIds.includes(postId)) return;

          if (payload.eventType === 'INSERT') {
            setPosts(prev => prev.map(p =>
              p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p
            ));
            const likeUserId = (payload.new as any)?.user_id;
            if (likeUserId === user.id) {
              setLikedPosts(prev => new Set([...prev, postId]));
            }
          } else if (payload.eventType === 'DELETE') {
            setPosts(prev => prev.map(p =>
              p.id === postId ? { ...p, likes_count: Math.max(0, p.likes_count - 1) } : p
            ));
            const likeUserId = (payload.old as any)?.user_id;
            if (likeUserId === user.id) {
              setLikedPosts(prev => {
                const newSet = new Set(prev);
                newSet.delete(postId);
                return newSet;
              });
            }
          }
        }
      )
      .subscribe();

    const commentsChannel = supabase
      .channel('comments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
        },
        (payload) => {
          const postId = (payload.new as any)?.post_id || (payload.old as any)?.post_id;
          if (!postIds.includes(postId)) return;

          if (payload.eventType === 'INSERT') {
            setPosts(prev => prev.map(p =>
              p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
            ));
          } else if (payload.eventType === 'DELETE') {
            setPosts(prev => prev.map(p =>
              p.id === postId ? { ...p, comments_count: Math.max(0, p.comments_count - 1) } : p
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [user, posts.length]);

  const fetchPosts = async () => {
    setLoadingPosts(true);

    let query = supabase
      .from('posts')
      .select(`
        id,
        title,
        content,
        content_url,
        is_locked,
        likes_count,
        creator_id,
        created_at,
        creator:profiles!posts_creator_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        ),
        comments(count)
      `);

    // Apply sorting
    if (sortBy === 'new') {
      query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'popular') {
      query = query.order('likes_count', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query.limit(POSTS_PER_PAGE);

    if (!error && data) {
      const postsWithCounts = data.map((post: any) => ({
        ...post,
        comments_count: post.comments?.[0]?.count || 0
      }));
      setPosts(postsWithCounts as FeedPost[]);
      setHasMore(data.length === POSTS_PER_PAGE);
    }
    setLoadingPosts(false);
  };

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore || posts.length === 0) return;

    setLoadingMore(true);
    const lastPost = posts[posts.length - 1];

    let query = supabase
      .from('posts')
      .select(`
        id,
        title,
        content,
        content_url,
        is_locked,
        likes_count,
        creator_id,
        created_at,
        creator:profiles!posts_creator_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        ),
        comments(count)
      `);

    if (sortBy === 'new') {
      query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'popular') {
      query = query.order('likes_count', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query
      .lt('created_at', lastPost.created_at)
      .limit(POSTS_PER_PAGE);

    if (!error && data) {
      const postsWithCounts = data.map((post: any) => ({
        ...post,
        comments_count: post.comments?.[0]?.count || 0
      }));
      setPosts(prev => [...prev, ...(postsWithCounts as FeedPost[])]);
      setHasMore(data.length === POSTS_PER_PAGE);
    }
    setLoadingMore(false);
  }, [loadingMore, hasMore, posts, sortBy]);

  const fetchSubscriptions = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('subscriptions')
      .select('creator_id')
      .eq('fan_id', user.id)
      .eq('status', 'active');

    if (data) {
      setSubscribedCreators(data.map(s => s.creator_id));
    }
  };

  const fetchUserLikes = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', user.id);

    if (data) {
      setLikedPosts(new Set(data.map(l => l.post_id)));
    }
  };

  const fetchUserBookmarks = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('bookmarks')
      .select('post_id')
      .eq('user_id', user.id);

    if (data) {
      setBookmarkedPosts(new Set(data.map(b => b.post_id)));
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setHasMore(true);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setHasMore(true);
  };

  const handleUnlock = (postId: string) => {
    // Navigate to post detail or show subscription modal
    toast.info('Subscribe to unlock this content');
  };

  const handleRefresh = useCallback(async () => {
    setHasMore(true);
    await Promise.all([
      fetchPosts(),
      fetchSubscriptions(),
      fetchUserLikes(),
      fetchUserBookmarks(),
    ]);
    toast.success('Feed refreshed');
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neon-pink">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <AppLayout>
      <div className="flex bg-background">
        {/* Main Content - Creator Grid */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile with pull-to-refresh */}
          <div className="md:hidden">
            <PullToRefresh onRefresh={handleRefresh}>
              <CreatorGrid
                posts={posts}
                loading={loadingPosts}
                subscribedCreators={subscribedCreators}
                likedPosts={likedPosts}
                onCategoryFilter={handleCategoryChange}
                onSortChange={handleSortChange}
              />
              {/* Load more trigger */}
              <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
                {loadingMore && <div className="animate-pulse text-neon-pink">Loading more...</div>}
              </div>
            </PullToRefresh>
          </div>

          {/* Desktop without pull-to-refresh */}
          <div className="hidden md:block">
            <CreatorGrid
              posts={posts}
              loading={loadingPosts}
              subscribedCreators={subscribedCreators}
              likedPosts={likedPosts}
              onCategoryFilter={handleCategoryChange}
              onSortChange={handleSortChange}
            />
            {/* Load more trigger */}
            <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
              {loadingMore && <div className="animate-pulse text-neon-pink">Loading more...</div>}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Creator Feed */}
        <div className="hidden xl:block">
          <CreatorFeedSidebar
            posts={posts}
            subscribedCreators={subscribedCreators}
            onUnlock={handleUnlock}
          />
        </div>
      </div>
    </AppLayout>
  );
}
