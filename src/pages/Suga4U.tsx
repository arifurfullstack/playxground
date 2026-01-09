import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Gift,
  Star,
  Send,
  BadgeCheck,
  Sparkles,
  MessageCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/glass-card';
import { NeonButton } from '@/components/ui/neon-button';
import { NeonInput } from '@/components/ui/neon-input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { MOCK_CREATORS_SUGA, MOCK_REQUESTS } from '@/data/mockSugaData';

interface Creator {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  subscription_price: number;
}

interface SugaRequest {
  id: string;
  fan_id: string;
  creator_id: string;
  message: string;
  tip_amount: number;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  response: string | null;
  created_at: string;
  creator?: Creator;
}

export default function Suga4U() {
  const { user, loading: authLoading, profile, role, refreshProfile } = useAuth();
  const navigate = useNavigate();
  // OPTIMISTIC: Start with Mock data
  const [subscribedCreators, setSubscribedCreators] = useState<Creator[]>(MOCK_CREATORS_SUGA);
  const [myRequests, setMyRequests] = useState<SugaRequest[]>(MOCK_REQUESTS as any);
  const [incomingRequests, setIncomingRequests] = useState<SugaRequest[]>([]);
  const [loading, setLoading] = useState(false); // No local blocking load
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [tipAmount, setTipAmount] = useState('5');
  const [sending, setSending] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState('');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    // setLoading(true); // Don't block UI

    // Fetch subscribed creators (for fans)
    if (role === 'fan') {
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('creator_id')
        .eq('fan_id', user.id)
        .eq('status', 'active');

      if (subs && subs.length > 0) {
        const creatorIds = subs.map(s => s.creator_id);
        const { data: creators } = await supabase
          .from('profiles')
          .select('*')
          .in('id', creatorIds);

        if (creators) {
          setSubscribedCreators(creators.map(c => ({
            id: c.id,
            username: c.username,
            display_name: c.display_name,
            avatar_url: c.avatar_url,
            is_verified: c.is_verified || false,
            subscription_price: Number(c.subscription_price) || 9.99,
          })));
        }
      }
    }

    // For now, we'll use a simple approach - store requests in transactions with a special type
    // In a real app, you'd have a dedicated suga_requests table

    setLoading(false);
  };

  const handleSendRequest = async () => {
    if (!user || !profile || !selectedCreator) return;

    const amount = parseFloat(tipAmount);
    if (isNaN(amount) || amount < 5) {
      toast.error('Minimum tip is $5');
      return;
    }

    if (!requestMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (profile.wallet_balance < amount) {
      toast.error('Insufficient balance. Please top up your wallet!');
      return;
    }

    setSending(true);

    try {
      // Deduct from fan's wallet
      const { error: walletError } = await supabase
        .from('profiles')
        .update({ wallet_balance: profile.wallet_balance - amount })
        .eq('id', user.id);

      if (walletError) throw walletError;

      // Add to creator's pending balance
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('pending_balance')
        .eq('id', selectedCreator.id)
        .single();

      if (creatorProfile) {
        await supabase
          .from('profiles')
          .update({ pending_balance: Number(creatorProfile.pending_balance) + amount })
          .eq('id', selectedCreator.id);
      }

      // Record transaction with special description for Suga4U
      await supabase.from('transactions').insert({
        sender_id: user.id,
        receiver_id: selectedCreator.id,
        amount,
        type: 'suga4u',
        description: `Suga4U Request: ${requestMessage.substring(0, 100)}`,
      });

      // Create notification for creator
      await supabase.from('notifications').insert({
        user_id: selectedCreator.id,
        actor_id: user.id,
        type: 'suga4u',
        content: `New Suga4U request with $${amount} tip: "${requestMessage.substring(0, 50)}..."`,
      });

      await refreshProfile();

      toast.success(`Request sent to ${selectedCreator.display_name || selectedCreator.username}!`);
      setRequestDialogOpen(false);
      setRequestMessage('');
      setTipAmount('5');
      setSelectedCreator(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send request');
    } finally {
      setSending(false);
    }
  };

  const openRequestDialog = (creator: Creator) => {
    setSelectedCreator(creator);
    setRequestDialogOpen(true);
  };

  if (authLoading) {
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
      <div className="max-w-4xl mx-auto px-3 py-4 sm:px-4 sm:py-6 md:p-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 sm:p-3 rounded-full bg-gradient-to-br from-neon-pink/20 to-neon-purple/20">
              <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-neon-pink" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold">
                <span className="neon-text-pink">Suga</span>
                <span className="text-foreground"> 4 </span>
                <span className="neon-text-cyan">U</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Send special requests to your favorite creators
              </p>
            </div>
          </div>
        </motion.header>

        {/* How it works */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 sm:mb-8"
        >
          <GlassCard border="pink">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-neon-yellow" />
              <h2 className="text-lg sm:text-xl font-display font-bold text-foreground">How it works</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-neon-pink/20 flex items-center justify-center mb-2">
                  <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-neon-pink" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-foreground">Send a Request</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Choose a creator and send your special request with a tip
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-neon-cyan/20 flex items-center justify-center mb-2">
                  <Star className="w-5 h-5 sm:w-6 sm:h-6 text-neon-cyan" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-foreground">Creator Responds</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  They'll create something special just for you
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-neon-green/20 flex items-center justify-center mb-2">
                  <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-neon-green" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-foreground">Enjoy!</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Receive your personalized content or response
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.section>

        {/* Your Subscribed Creators */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 sm:mb-8"
        >
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
            <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-neon-pink" />
            Your Creators
          </h2>

          {loading ? (
            <GlassCard className="text-center py-8">
              <Loader2 className="w-8 h-8 text-neon-pink mx-auto animate-spin" />
              <p className="text-sm text-muted-foreground mt-2">Loading...</p>
            </GlassCard>
          ) : subscribedCreators.length === 0 ? (
            <GlassCard className="text-center py-8 sm:py-12">
              <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">No subscriptions yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Subscribe to creators to send them Suga4U requests
              </p>
              <NeonButton variant="pink" onClick={() => navigate('/discover')}>
                Discover Creators
              </NeonButton>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {subscribedCreators.map((creator, index) => (
                <motion.div
                  key={creator.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <GlassCard
                    border="pink"
                    hover="both"
                    className="cursor-pointer"
                    onClick={() => openRequestDialog(creator)}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center text-lg sm:text-xl font-bold overflow-hidden">
                          {creator.avatar_url ? (
                            <img
                              src={creator.avatar_url}
                              alt={creator.display_name || creator.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            creator.username[0]?.toUpperCase()
                          )}
                        </div>
                        {creator.is_verified && (
                          <div className="absolute -bottom-1 -right-1 bg-neon-cyan rounded-full p-0.5">
                            <BadgeCheck className="w-3 h-3 sm:w-4 sm:h-4 text-background" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                          {creator.display_name || creator.username}
                        </h3>
                        <p className="text-xs sm:text-sm text-neon-pink truncate">@{creator.username}</p>
                      </div>
                      <NeonButton variant="pink" size="sm">
                        <Gift className="w-4 h-4" />
                      </NeonButton>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

        {/* Balance reminder */}
        {profile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <GlassCard border="purple" className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-neon-purple/20">
                  <Sparkles className="w-5 h-5 text-neon-purple" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Your Balance</p>
                  <p className="text-lg sm:text-xl font-bold text-neon-green">
                    ${profile.wallet_balance.toFixed(2)}
                  </p>
                </div>
              </div>
              <NeonButton variant="purple" size="sm" onClick={() => navigate('/wallet')}>
                Top Up
              </NeonButton>
            </GlassCard>
          </motion.div>
        )}

        {/* Request Dialog */}
        <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
          <DialogContent className="glass-card border-neon-pink/50 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-display flex items-center gap-2">
                <Gift className="w-5 h-5 text-neon-pink" />
                <span className="neon-text-pink">Send Suga4U Request</span>
              </DialogTitle>
            </DialogHeader>

            {selectedCreator && (
              <div className="space-y-4 pt-2">
                {/* Creator Info */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center font-bold overflow-hidden">
                    {selectedCreator.avatar_url ? (
                      <img
                        src={selectedCreator.avatar_url}
                        alt={selectedCreator.display_name || selectedCreator.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      selectedCreator.username[0]?.toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {selectedCreator.display_name || selectedCreator.username}
                    </p>
                    <p className="text-sm text-neon-pink">@{selectedCreator.username}</p>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Your Request</label>
                  <Textarea
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    placeholder="What would you like? Be specific about your request..."
                    className="min-h-[100px] bg-background/50 border-neon-pink/30 focus:border-neon-pink"
                  />
                </div>

                {/* Tip Amount */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Tip Amount (min $5)</label>
                  <div className="flex gap-2 mb-2">
                    {[5, 10, 25, 50].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setTipAmount(amount.toString())}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${tipAmount === amount.toString()
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
                    min="5"
                    placeholder="Custom amount"
                    color="pink"
                  />
                </div>

                {/* Balance */}
                <p className="text-sm text-muted-foreground">
                  Your balance: <span className="text-neon-green font-medium">${profile?.wallet_balance.toFixed(2) || '0.00'}</span>
                </p>

                {/* Send Button */}
                <NeonButton
                  variant="filled"
                  className="w-full"
                  onClick={handleSendRequest}
                  disabled={sending}
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {sending ? 'Sending...' : `Send Request ($${parseFloat(tipAmount || '0').toFixed(2)})`}
                </NeonButton>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}