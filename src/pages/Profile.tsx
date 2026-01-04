import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/glass-card';
import { NeonButton } from '@/components/ui/neon-button';
import { BadgeCheck, ImageIcon, Heart, Users, DollarSign, Wallet, MessageCircle, Edit, Bookmark } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';

interface Post {
  id: string;
  title: string | null;
  content: string | null;
  content_url: string | null;
  is_locked: boolean;
  price: number;
  likes_count: number;
  created_at: string;
}

interface Stats {
  totalPosts: number;
  totalLikes: number;
  subscriberCount: number;
  totalEarnings: number;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, loading, profile, role } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalPosts: 0,
    totalLikes: 0,
    subscriberCount: 0,
    totalEarnings: 0,
  });
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    if (!user) return;

    try {
      // Fetch user's posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (postsData) {
        const formattedPosts = postsData.map(p => ({
          ...p,
          price: Number(p.price) || 0,
          likes_count: p.likes_count || 0,
        }));
        setPosts(formattedPosts);

        // Calculate total likes
        const totalLikes = formattedPosts.reduce((sum, post) => sum + post.likes_count, 0);

        // Get subscriber count
        const { count: subscriberCount } = await supabase
          .from('subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', user.id)
          .eq('status', 'active');

        // Get total earnings from transactions
        const { data: earnings } = await supabase
          .from('transactions')
          .select('amount')
          .eq('receiver_id', user.id);

        const totalEarnings = earnings?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        setStats({
          totalPosts: formattedPosts.length,
          totalLikes,
          subscriberCount: subscriberCount || 0,
          totalEarnings,
        });
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-neon-pink">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-8 py-4 md:py-8 pb-24">
        {/* Profile Header */}
        <GlassCard border="pink" className="mb-4 sm:mb-6 p-4 sm:p-6">
          <div className="flex flex-col items-center gap-4 sm:gap-6 md:flex-row md:items-start">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center text-2xl sm:text-4xl font-bold border-4 border-neon-pink/50 shadow-lg shadow-neon-pink/30">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.display_name || profile.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  profile?.username.charAt(0).toUpperCase()
                )}
              </div>
              {profile?.is_verified && (
                <div className="absolute bottom-0 right-0 bg-neon-cyan rounded-full p-1">
                  <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 text-background" />
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left w-full">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-foreground truncate">
                  {profile?.display_name || profile?.username}
                </h1>
                {profile?.is_verified && (
                  <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 text-neon-cyan flex-shrink-0" />
                )}
              </div>
              <p className="text-sm sm:text-base text-neon-pink mb-2">@{profile?.username}</p>
              
              {role && (
                <span className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs font-medium mb-3 ${
                  role === 'creator' ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30' :
                  role === 'admin' ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30' :
                  'bg-neon-green/20 text-neon-green border border-neon-green/30'
                }`}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </span>
              )}
              
              {profile?.bio && (
                <p className="text-muted-foreground mb-4 max-w-lg text-xs sm:text-sm line-clamp-3 md:line-clamp-none">{profile.bio}</p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-center md:justify-start gap-2 sm:gap-3 flex-wrap">
                <NeonButton 
                  variant="pink" 
                  size="sm"
                  className="text-xs sm:text-sm px-2 sm:px-4"
                  onClick={() => navigate('/settings')}
                >
                  <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Edit Profile</span>
                  <span className="xs:hidden">Edit</span>
                </NeonButton>
                <NeonButton 
                  variant="yellow" 
                  size="sm"
                  className="text-xs sm:text-sm px-2 sm:px-4"
                  onClick={() => navigate('/bookmarks')}
                >
                  <Bookmark className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Saved</span>
                </NeonButton>
                <NeonButton 
                  variant="cyan" 
                  size="sm"
                  className="text-xs sm:text-sm px-2 sm:px-4"
                  onClick={() => navigate('/messages')}
                >
                  <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Messages</span>
                </NeonButton>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <GlassCard className="text-center py-3 sm:py-4 px-2">
            <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-neon-pink mx-auto mb-1 sm:mb-2" />
            <p className="text-lg sm:text-2xl font-bold neon-text-pink">{stats.totalPosts}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Posts</p>
          </GlassCard>
          
          <GlassCard className="text-center py-3 sm:py-4 px-2">
            <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-neon-yellow mx-auto mb-1 sm:mb-2" />
            <p className="text-lg sm:text-2xl font-bold neon-text-yellow">{stats.totalLikes}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Likes</p>
          </GlassCard>
          
          <GlassCard className="text-center py-3 sm:py-4 px-2">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-neon-cyan mx-auto mb-1 sm:mb-2" />
            <p className="text-lg sm:text-2xl font-bold neon-text-cyan">{stats.subscriberCount}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Subscribers</p>
          </GlassCard>
          
          <GlassCard className="text-center py-3 sm:py-4 px-2">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-neon-green mx-auto mb-1 sm:mb-2" />
            <p className="text-lg sm:text-2xl font-bold neon-text-green">${stats.totalEarnings.toFixed(2)}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Earned</p>
          </GlassCard>
        </div>

        {/* Wallet Balance */}
        <GlassCard border="purple" className="mb-4 sm:mb-6 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-neon-purple flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Wallet Balance</p>
                <p className="text-lg sm:text-xl font-bold neon-text-purple truncate">${profile?.wallet_balance.toFixed(2) || '0.00'}</p>
              </div>
            </div>
            <NeonButton 
              variant="purple" 
              size="sm"
              className="flex-shrink-0 text-xs sm:text-sm"
              onClick={() => navigate('/wallet')}
            >
              Manage
            </NeonButton>
          </div>
        </GlassCard>

        {/* Posts Section */}
        <div className="mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-display font-bold text-foreground flex items-center gap-2">
            <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-neon-pink" />
            My Posts
          </h2>
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-8 sm:py-12">
            <div className="animate-pulse text-neon-pink text-sm sm:text-base">Loading posts...</div>
          </div>
        ) : posts.length === 0 ? (
          <GlassCard className="text-center py-8 sm:py-12 px-4">
            <ImageIcon className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base text-muted-foreground mb-4">No posts yet</p>
            {role === 'creator' && (
              <NeonButton 
                variant="filled"
                className="text-sm"
                onClick={() => navigate('/feed')}
              >
                Create Your First Post
              </NeonButton>
            )}
          </GlassCard>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-1 sm:gap-2 md:gap-3">
            {posts.map((post) => (
              <div 
                key={post.id} 
                className="relative aspect-square rounded-lg sm:rounded-xl overflow-hidden group cursor-pointer"
                onClick={() => navigate(`/post/${post.id}`)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-neon-pink/30 to-neon-purple/30">
                  {post.content_url ? (
                    <img 
                      src={post.content_url} 
                      alt={post.title || 'Post'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-2 sm:p-4">
                      <p className="text-[10px] sm:text-sm text-foreground/80 line-clamp-3 sm:line-clamp-4">
                        {post.content || post.title}
                      </p>
                    </div>
                  )}
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-1 text-foreground text-xs sm:text-base">
                    <Heart className="w-3 h-3 sm:w-5 sm:h-5" />
                    <span>{post.likes_count}</span>
                  </div>
                </div>

                {/* Lock Badge */}
                {post.is_locked && (
                  <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
                    <div className="p-1 sm:p-1.5 rounded-full bg-neon-green/20">
                      <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-neon-green" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
