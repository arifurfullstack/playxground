import { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/glass-card';
import { NeonButton } from '@/components/ui/neon-button';
import { NeonInput } from '@/components/ui/neon-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Lock, Heart, DollarSign, Users, BadgeCheck, ImageIcon, Send, MessageCircle, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreatorProfile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  subscription_price: number;
  is_verified: boolean;
}

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

export default function CreatorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile: myProfile, refreshProfile } = useAuth();
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [tipDialogOpen, setTipDialogOpen] = useState(false);
  const [tipAmount, setTipAmount] = useState('5');
  const [tipping, setTipping] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [startingConversation, setStartingConversation] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCreatorData();
    }
  }, [id, user]);

  const fetchCreatorData = async () => {
    if (!id) return;

    // Fetch creator profile
    const { data: creatorData, error: creatorError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (creatorError || !creatorData) {
      toast.error('Creator not found');
      setLoading(false);
      return;
    }

    setCreator({
      ...creatorData,
      subscription_price: Number(creatorData.subscription_price) || 9.99,
    });

    // Fetch creator's posts
    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .eq('creator_id', id)
      .order('created_at', { ascending: false });

    if (postsData) {
      setPosts(postsData.map(p => ({
        ...p,
        price: Number(p.price) || 0,
        likes_count: p.likes_count || 0,
      })));
    }

    // Check subscription status
    if (user) {
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('fan_id', user.id)
        .eq('creator_id', id)
        .eq('status', 'active')
        .maybeSingle();

      setIsSubscribed(!!subData);
    }

    // Get subscriber count
    const { count } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', id)
      .eq('status', 'active');

    setSubscriberCount(count || 0);
    setLoading(false);
  };

  const handleStartConversation = async () => {
    if (!user || !creator) return;

    setStartingConversation(true);

    try {
      // Check if conversation already exists
      const { data: existingConvo } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(creator_id.eq.${creator.id},fan_id.eq.${user.id}),and(creator_id.eq.${user.id},fan_id.eq.${creator.id})`)
        .maybeSingle();

      if (existingConvo) {
        navigate(`/messages?conversation=${existingConvo.id}`);
        return;
      }

      // Create new conversation
      const { data: newConvo, error } = await supabase
        .from('conversations')
        .insert({
          creator_id: creator.id,
          fan_id: user.id,
        })
        .select('id')
        .single();

      if (error) throw error;

      navigate(`/messages?conversation=${newConvo.id}`);
    } catch (error) {
      console.error('Start conversation error:', error);
      toast.error('Failed to start conversation');
    } finally {
      setStartingConversation(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user || !creator) return;

    if (!myProfile || myProfile.wallet_balance < creator.subscription_price) {
      toast.error('Insufficient balance. Please top up your wallet!');
      return;
    }

    setSubscribing(true);

    try {
      // Deduct from fan's wallet
      const { error: walletError } = await supabase
        .from('profiles')
        .update({ wallet_balance: myProfile.wallet_balance - creator.subscription_price })
        .eq('id', user.id);

      if (walletError) throw walletError;

      // Add to creator's pending balance
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('pending_balance')
        .eq('id', creator.id)
        .single();

      if (creatorProfile) {
        await supabase
          .from('profiles')
          .update({ pending_balance: Number(creatorProfile.pending_balance) + creator.subscription_price })
          .eq('id', creator.id);
      }

      // Create subscription
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
          fan_id: user.id,
          creator_id: creator.id,
          status: 'active',
          expires_at: expiresAt.toISOString(),
        });

      if (subError) throw subError;

      // Log transaction
      await supabase
        .from('transactions')
        .insert({
          sender_id: user.id,
          receiver_id: creator.id,
          amount: creator.subscription_price,
          type: 'subscription',
          description: `Subscription to ${creator.display_name || creator.username}`,
        });

      toast.success(`Subscribed to ${creator.display_name || creator.username}!`);
      setIsSubscribed(true);
      setSubscriberCount(prev => prev + 1);
      await refreshProfile();
      await fetchCreatorData();
    } catch (error) {
      console.error('Subscribe error:', error);
      toast.error('Failed to subscribe');
    } finally {
      setSubscribing(false);
    }
  };

  const handleTip = async () => {
    if (!user || !creator) return;

    const amount = parseFloat(tipAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid tip amount');
      return;
    }

    if (!myProfile || myProfile.wallet_balance < amount) {
      toast.error('Insufficient balance. Please top up your wallet!');
      return;
    }

    setTipping(true);

    try {
      // Deduct from fan's wallet
      const { error: walletError } = await supabase
        .from('profiles')
        .update({ wallet_balance: myProfile.wallet_balance - amount })
        .eq('id', user.id);

      if (walletError) throw walletError;

      // Add to creator's pending balance
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('pending_balance')
        .eq('id', creator.id)
        .single();

      if (creatorProfile) {
        await supabase
          .from('profiles')
          .update({ pending_balance: Number(creatorProfile.pending_balance) + amount })
          .eq('id', creator.id);
      }

      // Log transaction
      await supabase
        .from('transactions')
        .insert({
          sender_id: user.id,
          receiver_id: creator.id,
          amount,
          type: 'tip',
          description: `Tip to ${creator.display_name || creator.username}`,
        });

      toast.success(`Sent $${amount.toFixed(2)} tip to ${creator.display_name || creator.username}!`);
      setTipDialogOpen(false);
      setTipAmount('5');
      await refreshProfile();
    } catch (error) {
      console.error('Tip error:', error);
      toast.error('Failed to send tip');
    } finally {
      setTipping(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-neon-pink">Loading profile...</div>
        </div>
      </AppLayout>
    );
  }

  if (!creator) {
    return <Navigate to="/feed" replace />;
  }

  const isOwnProfile = user?.id === creator.id;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-3 py-4 sm:px-4 sm:py-6 md:p-8">
        {/* Profile Header */}
        <GlassCard border="pink" className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex flex-col items-center gap-4 sm:gap-6 md:flex-row md:items-start">
            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center text-2xl sm:text-3xl md:text-4xl font-bold border-4 border-neon-pink/50 shadow-lg shadow-neon-pink/30">
                {creator.avatar_url ? (
                  <img
                    src={creator.avatar_url}
                    alt={creator.display_name || creator.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  creator.username.charAt(0).toUpperCase()
                )}
              </div>
              {creator.is_verified && (
                <div className="absolute bottom-0 right-0 bg-neon-cyan rounded-full p-0.5 sm:p-1">
                  <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-background" />
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left w-full">
              <div className="flex items-center justify-center md:justify-start gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-foreground">
                  {creator.display_name || creator.username}
                </h1>
                {creator.is_verified && (
                  <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-neon-cyan" />
                )}
              </div>
              <p className="text-sm sm:text-base text-neon-pink mb-2 sm:mb-4">@{creator.username}</p>

              {creator.bio && (
                <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4 max-w-lg mx-auto md:mx-0">{creator.bio}</p>
              )}

              <div className="flex items-center justify-center md:justify-start gap-4 sm:gap-6 mb-4 sm:mb-6">
                <div className="text-center">
                  <p className="text-lg sm:text-xl md:text-2xl font-bold neon-text-pink">{posts.length}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Posts</p>
                </div>
                <div className="text-center">
                  <p className="text-lg sm:text-xl md:text-2xl font-bold neon-text-cyan">{subscriberCount}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Subscribers</p>
                </div>
                <div className="text-center">
                  <p className="text-lg sm:text-xl md:text-2xl font-bold neon-text-yellow">${creator.subscription_price.toFixed(2)}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">/month</p>
                </div>
              </div>

              {/* Action Buttons */}
              {!isOwnProfile && user && (
                <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-2 sm:gap-3 md:gap-4 w-full">
                  {isSubscribed ? (
                    <NeonButton variant="cyan" size="md" className="w-full sm:w-auto" disabled>
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                      Subscribed
                    </NeonButton>
                  ) : (
                    <NeonButton
                      variant="filled"
                      size="md"
                      className="w-full sm:w-auto text-sm sm:text-base"
                      onClick={handleSubscribe}
                      disabled={subscribing}
                    >
                      <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                      {subscribing ? 'Subscribing...' : `Subscribe $${creator.subscription_price.toFixed(2)}/mo`}
                    </NeonButton>
                  )}
                  <div className="flex gap-2 sm:gap-3 md:gap-4 w-full sm:w-auto">
                    <NeonButton
                      variant="yellow"
                      size="md"
                      className="flex-1 sm:flex-none"
                      onClick={() => setTipDialogOpen(true)}
                    >
                      <Heart className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                      Tip
                    </NeonButton>
                    <NeonButton
                      variant="cyan"
                      size="md"
                      className="flex-1 sm:flex-none"
                      onClick={handleStartConversation}
                      disabled={startingConversation}
                    >
                      <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                      {startingConversation ? 'Opening...' : 'Message'}
                    </NeonButton>
                    <NeonButton
                      variant="purple"
                      size="md"
                      className="flex-1 sm:flex-none"
                      onClick={() => navigate(`/flash-drops/${creator.id}`)}
                    >
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                      Flash Drops
                    </NeonButton>
                  </div>
                </div>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Posts Grid */}
        <div className="mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-display font-bold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-neon-pink" />
            Posts
          </h2>
        </div>

        {posts.length === 0 ? (
          <GlassCard className="text-center py-8 sm:py-12">
            <ImageIcon className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base text-muted-foreground">No posts yet</p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            {posts.map((post) => {
              const canView = !post.is_locked || isSubscribed || isOwnProfile;

              return (
                <div
                  key={post.id}
                  className="relative aspect-square rounded-xl overflow-hidden group"
                >
                  {/* Post Background */}
                  <div className={`absolute inset-0 bg-gradient-to-br from-neon-pink/30 to-neon-purple/30 ${!canView ? 'blur-xl' : ''}`}>
                    {post.content_url ? (
                      <img
                        src={post.content_url}
                        alt={post.title || 'Post'}
                        className={`w-full h-full object-cover ${!canView ? 'blur-xl scale-110' : ''}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-4">
                        <p className={`text-sm text-foreground/80 line-clamp-4 ${!canView ? 'blur-xl' : ''}`}>
                          {post.content || post.title}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Locked Overlay */}
                  {!canView && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center">
                      <Lock className="w-8 h-8 text-neon-pink mb-2" />
                      <p className="text-xs text-muted-foreground mb-2">Subscribers only</p>
                      <NeonButton
                        variant="pink"
                        size="sm"
                        onClick={handleSubscribe}
                        disabled={subscribing}
                      >
                        Subscribe
                      </NeonButton>
                    </div>
                  )}

                  {/* Hover Overlay */}
                  {canView && (
                    <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <div className="flex items-center gap-1 text-foreground">
                        <Heart className="w-5 h-5" />
                        <span>{post.likes_count}</span>
                      </div>
                    </div>
                  )}

                  {/* Lock Badge */}
                  {post.is_locked && (
                    <div className="absolute top-2 right-2">
                      <div className={`p-1.5 rounded-full ${canView ? 'bg-neon-green/20' : 'bg-neon-pink/20'}`}>
                        <Lock className={`w-4 h-4 ${canView ? 'text-neon-green' : 'text-neon-pink'}`} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tip Dialog */}
        <Dialog open={tipDialogOpen} onOpenChange={setTipDialogOpen}>
          <DialogContent className="glass-card border-neon-pink/50">
            <DialogHeader>
              <DialogTitle className="text-xl font-display neon-text-pink">
                Send a Tip to {creator.display_name || creator.username}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="flex gap-2">
                {[5, 10, 20, 50].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setTipAmount(amount.toString())}
                    className={`flex-1 py-3 rounded-lg border transition-all ${tipAmount === amount.toString()
                        ? 'border-neon-pink bg-neon-pink/20 text-neon-pink'
                        : 'border-border hover:border-neon-pink/50 text-muted-foreground'
                      }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>

              <NeonInput
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value)}
                type="number"
                min="1"
                placeholder="Custom amount"
                color="pink"
              />

              <p className="text-sm text-muted-foreground">
                Your balance: <span className="neon-text-cyan">${myProfile?.wallet_balance.toFixed(2) || '0.00'}</span>
              </p>

              <NeonButton
                variant="filled"
                className="w-full"
                onClick={handleTip}
                disabled={tipping}
              >
                <Send className="w-4 h-4 mr-2" />
                {tipping ? 'Sending...' : `Send $${parseFloat(tipAmount || '0').toFixed(2)} Tip`}
              </NeonButton>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
