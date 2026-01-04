import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, LogOut, Users, Wallet } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/glass-card';
import { NeonButton } from '@/components/ui/neon-button';
import { TruthDareCard } from '@/components/game/TruthDareCard';
import { useAuth } from '@/contexts/AuthContext';
import { useGameRoom } from '@/hooks/useGameRoom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function GameRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, profile } = useAuth();
  const {
    room,
    loading,
    flipping,
    isCreator,
    isFan,
    joinRoom,
    flipCard,
    resetCards,
    endGame,
  } = useGameRoom(roomId || null);

  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [fanProfile, setFanProfile] = useState<any>(null);

  // Fetch player profiles
  useEffect(() => {
    if (room?.creator_id) {
      supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', room.creator_id)
        .single()
        .then(({ data }) => setCreatorProfile(data));
    }
    if (room?.fan_id) {
      supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', room.fan_id)
        .single()
        .then(({ data }) => setFanProfile(data));
    }
  }, [room?.creator_id, room?.fan_id]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="text-neon-pink"
        >
          <RefreshCw className="w-10 h-10" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!room) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto p-4 md:p-8 text-center">
          <h1 className="text-2xl font-display text-foreground mb-4">Room not found</h1>
          <NeonButton variant="cyan" onClick={() => navigate('/games')}>
            Back to Games
          </NeonButton>
        </div>
      </AppLayout>
    );
  }

  if (room.status === 'ended') {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto p-4 md:p-8 text-center">
          <GlassCard border="pink" className="py-12">
            <h1 className="text-3xl font-display neon-text-pink mb-4">Game Over!</h1>
            <p className="text-muted-foreground mb-6">Thanks for playing Truth or Dare</p>
            <NeonButton variant="filled" onClick={() => navigate('/games')}>
              Play Again
            </NeonButton>
          </GlassCard>
        </div>
      </AppLayout>
    );
  }

  const isParticipant = isCreator || isFan;
  const canJoin = !isParticipant && room.status === 'waiting' && !room.fan_id;
  const isActive = room.status === 'active' && room.fan_id;
  const hasCardRevealed = room.current_card_type !== null;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/games')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Games
            </button>

            {isCreator && (
              <NeonButton
                variant="pink"
                size="sm"
                onClick={() => {
                  endGame();
                  navigate('/games');
                }}
              >
                <LogOut className="w-4 h-4" />
                End Game
              </NeonButton>
            )}
          </div>

          <div className="mt-6 text-center">
            <h1 className="text-3xl md:text-4xl font-display font-bold">
              <span className="neon-text-cyan">Truth</span>
              <span className="text-foreground mx-2">or</span>
              <span className="neon-text-pink">Dare</span>
            </h1>
          </div>
        </motion.header>

        {/* Players Section */}
        <div className="flex justify-center gap-8 mb-8">
          <GlassCard border="pink" padding="sm" className="text-center min-w-[140px]">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center text-2xl font-bold mb-2">
              {creatorProfile?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <p className="font-semibold text-foreground">{creatorProfile?.username || 'Creator'}</p>
            <p className="text-xs text-neon-pink">Suga Baby</p>
          </GlassCard>

          <div className="flex items-center">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>

          <GlassCard border="cyan" padding="sm" className="text-center min-w-[140px]">
            {room.fan_id ? (
              <>
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-neon-cyan to-neon-green flex items-center justify-center text-2xl font-bold mb-2">
                  {fanProfile?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <p className="font-semibold text-foreground">{fanProfile?.username || 'Fan'}</p>
                <p className="text-xs text-neon-cyan">Suga Daddy</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center text-2xl mb-2">
                  ?
                </div>
                <p className="text-muted-foreground">Waiting...</p>
              </>
            )}
          </GlassCard>
        </div>

        {/* Wallet Balance (for fan) */}
        {isFan && profile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center mb-6"
          >
            <GlassCard border="green" padding="sm" className="inline-flex items-center gap-3">
              <Wallet className="w-5 h-5 text-neon-green" />
              <span className="text-muted-foreground">Balance:</span>
              <span className="text-lg font-semibold text-neon-green">
                ${profile.wallet_balance.toFixed(2)}
              </span>
            </GlassCard>
          </motion.div>
        )}

        {/* Join Button for non-participants */}
        {canJoin && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-8"
          >
            <NeonButton variant="filled" size="lg" onClick={joinRoom}>
              Join Game as Fan
            </NeonButton>
          </motion.div>
        )}

        {/* Waiting State */}
        {isCreator && !room.fan_id && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mb-8"
          >
            <GlassCard border="yellow" className="inline-block">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <RefreshCw className="w-5 h-5 text-neon-yellow" />
                </motion.div>
                <span className="text-neon-yellow">Waiting for a fan to join...</span>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Game Cards */}
        {isActive && (
          <AnimatePresence mode="wait">
            {hasCardRevealed ? (
              <motion.div
                key="revealed"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center"
              >
                <TruthDareCard
                  type={room.current_card_type as 'truth' | 'dare'}
                  content={room.current_card_content || ''}
                  isFlipped={true}
                  price={room.card_price}
                />

                {isCreator && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8"
                  >
                    <NeonButton variant="cyan" onClick={resetCards}>
                      <RefreshCw className="w-4 h-4" />
                      Next Round
                    </NeonButton>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="cards"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <p className="text-center text-muted-foreground mb-6">
                  {isFan 
                    ? "Choose a card to reveal! Tip to flip." 
                    : "Waiting for the fan to pick a card..."}
                </p>

                <div className="grid grid-cols-2 gap-6 max-w-xl mx-auto">
                  <TruthDareCard
                    type="truth"
                    isFlipped={false}
                    isRevealing={flipping}
                    price={room.card_price}
                    onFlip={() => flipCard('truth')}
                    disabled={!isFan || flipping}
                  />
                  <TruthDareCard
                    type="dare"
                    isFlipped={false}
                    isRevealing={flipping}
                    price={room.card_price}
                    onFlip={() => flipCard('dare')}
                    disabled={!isFan || flipping}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Spectator Message */}
        {!isParticipant && !canJoin && (
          <div className="text-center">
            <GlassCard border="default">
              <p className="text-muted-foreground">
                This game room is full. Find another room to join!
              </p>
            </GlassCard>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
