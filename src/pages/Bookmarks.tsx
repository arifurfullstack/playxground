import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/glass-card';
import { NeonButton } from '@/components/ui/neon-button';
import { Bookmark, Heart, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PostCard } from '@/components/feed/PostCard';

interface BookmarkedPost {
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

export default function Bookmarks() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BookmarkedPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [subscribedCreators, setSubscribedCreators] = useState<string[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchBookmarkedPosts();
      fetchSubscriptions();
      fetchUserLikes();
    }
  }, [user]);

  const fetchBookmarkedPosts = async () => {
    if (!user) return;

    const { data: bookmarks } = await supabase
      .from('bookmarks')
      .select('post_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!bookmarks || bookmarks.length === 0) {
      setPosts([]);
      setBookmarkedPosts(new Set());
      setLoadingPosts(false);
      return;
    }

    const postIds = bookmarks.map(b => b.post_id);
    setBookmarkedPosts(new Set(postIds));

    const { data: postsData } = await supabase
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
      `)
      .in('id', postIds);

    if (postsData) {
      const postsWithCounts = postsData.map((post: any) => ({
        ...post,
        comments_count: post.comments?.[0]?.count || 0
      }));
      
      // Sort by bookmark order
      const sortedPosts = postIds
        .map(id => postsWithCounts.find((p: any) => p.id === id))
        .filter(Boolean) as BookmarkedPost[];
      
      setPosts(sortedPosts);
    }
    setLoadingPosts(false);
  };

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

  const handleLikeToggle = (postId: string, isLiked: boolean) => {
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (isLiked) {
        newSet.add(postId);
      } else {
        newSet.delete(postId);
      }
      return newSet;
    });
  };

  const handleBookmarkToggle = (postId: string, isBookmarked: boolean) => {
    setBookmarkedPosts(prev => {
      const newSet = new Set(prev);
      if (isBookmarked) {
        newSet.add(postId);
      } else {
        newSet.delete(postId);
        // Remove from posts list when unbookmarked
        setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
      }
      return newSet;
    });
  };

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
      <div className="max-w-2xl mx-auto p-4 md:p-8 pb-24">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <header className="mb-8">
          <h1 className="text-3xl font-display font-bold neon-text-yellow mb-2 flex items-center gap-3">
            <Bookmark className="w-8 h-8" />
            Saved Posts
          </h1>
          <p className="text-muted-foreground">
            Your bookmarked posts for later
          </p>
        </header>

        {loadingPosts ? (
          <div className="text-center py-12">
            <div className="animate-pulse text-neon-pink">Loading bookmarks...</div>
          </div>
        ) : posts.length === 0 ? (
          <GlassCard className="text-center py-12">
            <Bookmark className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No saved posts yet</p>
            <p className="text-sm text-muted-foreground mb-6">
              Tap the bookmark icon on any post to save it for later
            </p>
            <NeonButton variant="pink" onClick={() => navigate('/feed')}>
              Browse Feed
            </NeonButton>
          </GlassCard>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                userId={user.id}
                isSubscribed={subscribedCreators.includes(post.creator_id)}
                isLiked={likedPosts.has(post.id)}
                isBookmarked={bookmarkedPosts.has(post.id)}
                commentsCount={post.comments_count}
                onLikeToggle={handleLikeToggle}
                onBookmarkToggle={handleBookmarkToggle}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
