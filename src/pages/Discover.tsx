import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/glass-card';
import { NeonInput } from '@/components/ui/neon-input';
import { Search, BadgeCheck, Users, TrendingUp, Sparkles, Star, Crown, Flame, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Creator {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  subscription_price: number;
  subscriber_count: number;
  categories: string[];
  recent_posts: number;
  recent_subs: number;
}

type SortOption = 'popular' | 'newest' | 'price_low' | 'price_high' | 'trending';

const AVAILABLE_CATEGORIES = [
  'Confessions',
  'Suga 4 U',
  'Flash Drops',
  'X Chat',
  'Bar Lounge',
  'Truth or Dare',
  'Fitness',
  'Gaming',
  'Music',
  'Art',
  'Fashion',
  'Lifestyle',
  'Comedy',
  'Education',
  'Cooking',
  'Travel',
  'Tech',
  'Beauty',
];

export default function Discover() {
  const [searchParams] = useSearchParams();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get('category'));

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchCreators();
  }, []);

  const fetchCreators = async () => {
    setLoading(true);

    // Fetch all creators (users with creator role)
    const { data: creatorRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'creator');

    if (!creatorRoles || creatorRoles.length === 0) {
      setCreators([]);
      setLoading(false);
      return;
    }

    const creatorIds = creatorRoles.map(r => r.user_id);

    // Fetch profiles for creators
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', creatorIds);

    if (!profiles) {
      setCreators([]);
      setLoading(false);
      return;
    }

    // Date for "recent" activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Fetch subscriber counts and recent activity for each creator
    const creatorsWithCounts = await Promise.all(
      profiles.map(async (profile) => {
        // Total subscriber count
        const { count: totalSubs } = await supabase
          .from('subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', profile.id)
          .eq('status', 'active');

        // Recent subscribers (last 7 days)
        const { count: recentSubs } = await supabase
          .from('subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', profile.id)
          .gte('created_at', sevenDaysAgo.toISOString());

        // Recent posts (last 7 days)
        const { count: recentPosts } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', profile.id)
          .gte('created_at', sevenDaysAgo.toISOString());

        return {
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
          is_verified: profile.is_verified || false,
          subscription_price: Number(profile.subscription_price) || 9.99,
          subscriber_count: totalSubs || 0,
          categories: (profile.categories as string[]) || [],
          recent_posts: recentPosts || 0,
          recent_subs: recentSubs || 0,
        };
      })
    );

    setCreators(creatorsWithCounts);
    setLoading(false);
  };

  // Get featured creators (top 3 by subscriber count, verified preferred)
  const featuredCreators = [...creators]
    .sort((a, b) => {
      // Prioritize verified creators
      if (a.is_verified && !b.is_verified) return -1;
      if (!a.is_verified && b.is_verified) return 1;
      return b.subscriber_count - a.subscriber_count;
    })
    .slice(0, 3);

  // Get trending creators (most active in last 7 days - recent subs + posts)
  const trendingCreators = [...creators]
    .map(creator => ({
      ...creator,
      trendingScore: (creator.recent_subs * 2) + creator.recent_posts
    }))
    .filter(creator => creator.trendingScore > 0)
    .sort((a, b) => b.trendingScore - a.trendingScore)
    .slice(0, 6);

  // Filter and sort creators
  const filteredCreators = creators
    .filter((creator) => {
      const matchesSearch =
        searchQuery === '' ||
        creator.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (creator.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (creator.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      const matchesVerified = !showVerifiedOnly || creator.is_verified;

      const matchesCategory =
        !selectedCategory ||
        creator.categories.includes(selectedCategory);

      return matchesSearch && matchesVerified && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.subscriber_count - a.subscriber_count;
        case 'trending':
          return (b.recent_subs + b.recent_posts) - (a.recent_subs + a.recent_posts);
        case 'newest':
          return 0;
        case 'price_low':
          return a.subscription_price - b.subscription_price;
        case 'price_high':
          return b.subscription_price - a.subscription_price;
        default:
          return 0;
      }
    });

  // Get unique categories from creators
  const activeCategories = AVAILABLE_CATEGORIES.filter((cat) =>
    creators.some((c) => c.categories.includes(cat))
  );

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
            <span className="neon-text-pink">Discover</span> Creators
          </h1>
          <p className="text-muted-foreground">
            Find and follow your favorite content creators
          </p>
        </div>

        {/* Featured Creators Section */}
        {!loading && featuredCreators.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-6 h-6 text-neon-yellow" />
              <h2 className="text-xl font-display font-bold text-foreground">Featured Creators</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {featuredCreators.map((creator, index) => (
                <Link key={creator.id} to={`/profile/${creator.id}`}>
                  <GlassCard
                    border={index === 0 ? 'yellow' : 'pink'}
                    className="h-full hover:scale-[1.02] transition-transform cursor-pointer group relative overflow-hidden"
                  >
                    {/* Featured Badge */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-neon-yellow/20 border border-neon-yellow/50">
                      <Star className="w-3 h-3 text-neon-yellow fill-neon-yellow" />
                      <span className="text-xs text-neon-yellow font-medium">
                        {index === 0 ? 'Top Creator' : 'Featured'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center text-center pt-4">
                      {/* Avatar */}
                      <div className="relative mb-4">
                        <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center text-2xl font-bold border-3 ${index === 0 ? 'border-neon-yellow shadow-lg shadow-neon-yellow/30' : 'border-neon-pink/50'} overflow-hidden`}>
                          {creator.avatar_url ? (
                            <img
                              src={creator.avatar_url}
                              alt={creator.display_name || creator.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            creator.username.charAt(0).toUpperCase()
                          )}
                        </div>
                        {creator.is_verified && (
                          <div className="absolute -bottom-1 -right-1 bg-neon-cyan rounded-full p-0.5">
                            <BadgeCheck className="w-5 h-5 text-background" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <h3 className="font-display font-bold text-foreground group-hover:text-neon-pink transition-colors">
                        {creator.display_name || creator.username}
                      </h3>
                      <p className="text-sm text-neon-pink mb-2">@{creator.username}</p>

                      {/* Categories */}
                      {creator.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-center mb-3">
                          {creator.categories.slice(0, 2).map((cat) => (
                            <span
                              key={cat}
                              className="text-xs px-2 py-0.5 rounded-full bg-neon-purple/20 text-neon-purple border border-neon-purple/30"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-neon-cyan" />
                          <span className="text-muted-foreground">{creator.subscriber_count}</span>
                        </div>
                        <span className="font-medium neon-text-yellow">
                          ${creator.subscription_price.toFixed(2)}/mo
                        </span>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Trending Creators Section */}
        {!loading && trendingCreators.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-6 h-6 text-neon-orange" />
              <h2 className="text-xl font-display font-bold text-foreground">Trending This Week</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-neon-orange/20 text-neon-orange border border-neon-orange/30">
                Hot
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {trendingCreators.map((creator) => (
                <Link key={creator.id} to={`/profile/${creator.id}`}>
                  <GlassCard className="h-full hover:scale-[1.02] transition-transform cursor-pointer group text-center p-4">
                    {/* Avatar */}
                    <div className="relative mx-auto mb-3">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-neon-orange to-neon-pink flex items-center justify-center text-lg font-bold border-2 border-neon-orange/50 group-hover:border-neon-orange transition-colors overflow-hidden">
                        {creator.avatar_url ? (
                          <img
                            src={creator.avatar_url}
                            alt={creator.display_name || creator.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          creator.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      {creator.is_verified && (
                        <div className="absolute -bottom-1 -right-1 bg-neon-cyan rounded-full p-0.5">
                          <BadgeCheck className="w-3.5 h-3.5 text-background" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-neon-orange transition-colors">
                      {creator.display_name || creator.username}
                    </h3>
                    <p className="text-xs text-neon-pink truncate mb-2">@{creator.username}</p>

                    {/* Trending stats */}
                    <div className="flex items-center justify-center gap-1 text-xs">
                      <ArrowUpRight className="w-3 h-3 text-neon-green" />
                      <span className="text-neon-green">
                        +{creator.recent_subs} subs
                      </span>
                    </div>
                  </GlassCard>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <GlassCard className="mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <NeonInput
                  placeholder="Search by name or bio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  color="pink"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${showVerifiedOnly
                    ? 'border-neon-cyan bg-neon-cyan/20 text-neon-cyan'
                    : 'border-border hover:border-neon-cyan/50 text-muted-foreground'
                    }`}
                >
                  <BadgeCheck className="w-4 h-4" />
                  Verified
                </button>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:border-neon-pink focus:outline-none"
                >
                  <option value="popular">Most Popular</option>
                  <option value="trending">Trending</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                </select>
              </div>
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${!selectedCategory
                  ? 'border-neon-pink bg-neon-pink/20 text-neon-pink'
                  : 'border-border hover:border-neon-pink/50 text-muted-foreground'
                  }`}
              >
                All
              </button>
              {AVAILABLE_CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all ${selectedCategory === category
                    ? 'border-neon-purple bg-neon-purple/20 text-neon-purple'
                    : 'border-border hover:border-neon-purple/50 text-muted-foreground'
                    }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <GlassCard className="text-center py-4">
            <Users className="w-6 h-6 text-neon-pink mx-auto mb-2" />
            <p className="text-2xl font-bold neon-text-pink">{creators.length}</p>
            <p className="text-xs text-muted-foreground">Total Creators</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <BadgeCheck className="w-6 h-6 text-neon-cyan mx-auto mb-2" />
            <p className="text-2xl font-bold neon-text-cyan">
              {creators.filter((c) => c.is_verified).length}
            </p>
            <p className="text-xs text-muted-foreground">Verified</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <TrendingUp className="w-6 h-6 text-neon-green mx-auto mb-2" />
            <p className="text-2xl font-bold neon-text-green">
              {creators.reduce((sum, c) => sum + c.subscriber_count, 0)}
            </p>
            <p className="text-xs text-muted-foreground">Total Subs</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <Sparkles className="w-6 h-6 text-neon-yellow mx-auto mb-2" />
            <p className="text-2xl font-bold neon-text-yellow">{filteredCreators.length}</p>
            <p className="text-xs text-muted-foreground">Showing</p>
          </GlassCard>
        </div>

        {/* Creators Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-pulse text-neon-pink">Loading creators...</div>
          </div>
        ) : filteredCreators.length === 0 ? (
          <GlassCard className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No creators found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCreators.map((creator) => (
              <Link key={creator.id} to={`/profile/${creator.id}`}>
                <GlassCard
                  border="pink"
                  className="h-full hover:scale-[1.02] transition-transform cursor-pointer group"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center text-xl font-bold border-2 border-neon-pink/50 group-hover:border-neon-pink transition-colors overflow-hidden">
                        {creator.avatar_url ? (
                          <img
                            src={creator.avatar_url}
                            alt={creator.display_name || creator.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          creator.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      {creator.is_verified && (
                        <div className="absolute -bottom-1 -right-1 bg-neon-cyan rounded-full p-0.5">
                          <BadgeCheck className="w-4 h-4 text-background" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-1">
                        <h3 className="font-display font-bold text-foreground truncate group-hover:text-neon-pink transition-colors">
                          {creator.display_name || creator.username}
                        </h3>
                      </div>
                      <p className="text-sm text-neon-pink mb-2">@{creator.username}</p>

                      {/* Categories */}
                      {creator.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {creator.categories.slice(0, 2).map((cat) => (
                            <span
                              key={cat}
                              className="text-xs px-2 py-0.5 rounded-full bg-neon-purple/20 text-neon-purple border border-neon-purple/30"
                            >
                              {cat}
                            </span>
                          ))}
                          {creator.categories.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{creator.categories.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      {creator.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {creator.bio}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="w-4 h-4 text-neon-cyan" />
                          <span className="text-muted-foreground">
                            {creator.subscriber_count} subs
                          </span>
                        </div>
                        <span className="text-sm font-medium neon-text-yellow">
                          ${creator.subscription_price.toFixed(2)}/mo
                        </span>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
