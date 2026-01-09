import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Gamepad2, Plus, Users, RefreshCw, Trophy, Crown } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/glass-card';
import { NeonButton } from '@/components/ui/neon-button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MOCK_GAME_ROOMS, MOCK_LEADERBOARD } from '@/data/mockGamesData';
interface GameRoom {
  id: string;
  creator_id: string;
  status: string;
  card_price: number;
  creator?: {
    username: string;
    avatar_url: string | null;
  };
}

interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_earnings: number;
  games_played: number;
}

export default function Games() {
  const { user, loading, role, profile } = useAuth();
  // OPTIMISTIC: Start with Mock data
  const [rooms, setRooms] = useState<GameRoom[]>(MOCK_GAME_ROOMS as any);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(MOCK_LEADERBOARD as any);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchRooms();
    fetchLeaderboard();
  }, []);

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from('game_rooms')
      .select(`
        *,
        creator:profiles!game_rooms_creator_id_fkey(username, avatar_url)
      `)
      .eq('status', 'waiting')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRooms(data as any);
    }
  };

  const fetchLeaderboard = async () => {
    // Fetch game transactions grouped by receiver (creator)
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('receiver_id, amount')
      .eq('type', 'game');

    if (error || !transactions) return;

    // Aggregate earnings by user
    const earningsMap = new Map<string, { total: number; count: number }>();
    transactions.forEach((tx) => {
      if (tx.receiver_id) {
        const existing = earningsMap.get(tx.receiver_id) || { total: 0, count: 0 };
        earningsMap.set(tx.receiver_id, {
          total: existing.total + Number(tx.amount),
          count: existing.count + 1,
        });
      }
    });

    // Get top 5 earners
    const topEarners = Array.from(earningsMap.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5);

    if (topEarners.length === 0) {
      setLeaderboard([]);
      return;
    }

    // Fetch profiles for top earners
    const userIds = topEarners.map(([id]) => id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', userIds);

    const leaderboardData: LeaderboardEntry[] = topEarners.map(([userId, stats]) => {
      const profile = profiles?.find((p) => p.id === userId);
      return {
        user_id: userId,
        username: profile?.username || 'Unknown',
        avatar_url: profile?.avatar_url || null,
        total_earnings: stats.total,
        games_played: stats.count,
      };
    });

    setLeaderboard(leaderboardData);
  };

  const createRoom = async () => {
    if (!user) return;
    setCreating(true);

    try {
      const { data, error } = await supabase
        .from('game_rooms')
        .insert({
          creator_id: user.id,
          card_price: 10,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Game room created!',
        description: 'Waiting for a fan to join...',
      });

      navigate(`/games/${data.id}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
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
      <div className="max-w-4xl mx-auto px-3 py-4 sm:px-4 sm:py-6 md:p-8">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold flex items-center gap-2 sm:gap-3 flex-wrap">
                <span className="neon-text-cyan">Truth</span>
                <span className="text-foreground">or</span>
                <span className="neon-text-pink">Dare</span>
                <RefreshCw
                  className="w-5 h-5 sm:w-6 sm:h-6 text-neon-cyan cursor-pointer hover:rotate-180 transition-transform duration-500"
                  onClick={fetchRooms}
                />
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
                Connect with creators through interactive games
              </p>
            </div>

            {role === 'creator' && (
              <NeonButton
                variant="filled"
                onClick={createRoom}
                disabled={creating}
                className="w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                Create Room
              </NeonButton>
            )}
          </div>

          {profile && (
            <div className="mt-3 sm:mt-4 flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
              <span className="text-muted-foreground">Your Balance:</span>
              <span className="text-neon-green font-semibold">
                ${profile.wallet_balance.toFixed(2)}
              </span>
            </div>
          )}
        </motion.header>

        {/* Active Rooms */}
        <section className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-neon-pink" />
            Available Rooms
          </h2>

          {rooms.length === 0 ? (
            <GlassCard border="default" className="text-center py-8 sm:py-12">
              <Gamepad2 className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base text-muted-foreground">
                No rooms available right now.
              </p>
              {role === 'creator' && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                  Create a room and wait for fans to join!
                </p>
              )}
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {rooms.map((room, index) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <GlassCard
                    border="cyan"
                    hover="both"
                    className="cursor-pointer"
                    onClick={() => navigate(`/games/${room.id}`)}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center text-base sm:text-xl font-bold shrink-0">
                        {room.creator?.username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                          {room.creator?.username || 'Creator'}
                        </h3>
                        <p className="text-xs sm:text-sm text-neon-pink">Suga Baby</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs sm:text-sm text-muted-foreground">Card Price</p>
                        <p className="text-base sm:text-lg font-semibold text-neon-green">
                          ${room.card_price}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/50 flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-neon-yellow">
                        Waiting for player...
                      </span>
                      <NeonButton variant="pink" size="sm">
                        Join Game
                      </NeonButton>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Leaderboard */}
        <section className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-neon-yellow" />
            Top Players
          </h2>

          {leaderboard.length === 0 ? (
            <GlassCard border="default" className="text-center py-6 sm:py-8">
              <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm sm:text-base text-muted-foreground">
                No games played yet. Be the first!
              </p>
            </GlassCard>
          ) : (
            <GlassCard border="yellow">
              <div className="space-y-3 sm:space-y-4">
                {leaderboard.map((entry, index) => (
                  <motion.div
                    key={entry.user_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-lg ${index === 0 ? 'bg-neon-yellow/10 border border-neon-yellow/30' : ''
                      }`}
                  >
                    {/* Rank */}
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-base shrink-0 ${index === 0
                        ? 'bg-neon-yellow/20 text-neon-yellow'
                        : index === 1
                          ? 'bg-gray-300/20 text-gray-300'
                          : index === 2
                            ? 'bg-orange-400/20 text-orange-400'
                            : 'bg-muted text-muted-foreground'
                      }`}>
                      {index === 0 ? <Crown className="w-4 h-4 sm:w-5 sm:h-5" /> : index + 1}
                    </div>

                    {/* Avatar */}
                    <div
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center text-base sm:text-lg font-bold shrink-0 cursor-pointer"
                      onClick={() => navigate(`/creator/${entry.user_id}`)}
                    >
                      {entry.avatar_url ? (
                        <img
                          src={entry.avatar_url}
                          alt={entry.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        entry.username[0]?.toUpperCase() || '?'
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-semibold text-sm sm:text-base text-foreground truncate cursor-pointer hover:text-neon-pink transition-colors"
                        onClick={() => navigate(`/creator/${entry.user_id}`)}
                      >
                        {entry.username}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {entry.games_played} {entry.games_played === 1 ? 'game' : 'games'}
                      </p>
                    </div>

                    {/* Earnings */}
                    <div className="text-right shrink-0">
                      <p className="text-base sm:text-lg font-bold text-neon-green">
                        ${entry.total_earnings.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">earned</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          )}
        </section>

        {/* How to Play */}
        <section>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4">How to Play</h2>
          <GlassCard border="purple">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-center">
              <div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-full bg-neon-cyan/20 flex items-center justify-center">
                  <span className="text-lg sm:text-xl font-bold text-neon-cyan">1</span>
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-foreground mb-1">Join a Room</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Find a creator's room and join their game session
                </p>
              </div>
              <div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-full bg-neon-pink/20 flex items-center justify-center">
                  <span className="text-lg sm:text-xl font-bold text-neon-pink">2</span>
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-foreground mb-1">Pick a Card</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Choose Truth or Dare - tip to flip and reveal
                </p>
              </div>
              <div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-full bg-neon-green/20 flex items-center justify-center">
                  <span className="text-lg sm:text-xl font-bold text-neon-green">3</span>
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-foreground mb-1">Play Together</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Watch the reveal in real-time with your creator
                </p>
              </div>
            </div>
          </GlassCard>
        </section>
      </div>
    </AppLayout>
  );
}
