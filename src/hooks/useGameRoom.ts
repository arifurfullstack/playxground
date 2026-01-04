import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getRandomTruth, getRandomDare } from '@/lib/gameData';

interface GameRoom {
  id: string;
  creator_id: string;
  fan_id: string | null;
  status: string;
  current_card_type: string | null;
  current_card_content: string | null;
  card_price: number;
}

export function useGameRoom(roomId: string | null) {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [flipping, setFlipping] = useState(false);
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();

  // Fetch room data
  const fetchRoom = useCallback(async () => {
    if (!roomId) return;
    
    const { data, error } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (error) {
      console.error('Error fetching room:', error);
      return;
    }

    setRoom(data as GameRoom);
    setLoading(false);
  }, [roomId]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!roomId) return;

    fetchRoom();

    const channel = supabase
      .channel(`game_room_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          console.log('Room update:', payload);
          setRoom(payload.new as GameRoom);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchRoom]);

  // Join room as fan
  const joinRoom = async () => {
    if (!roomId || !user) return;

    const { error } = await supabase
      .from('game_rooms')
      .update({ fan_id: user.id, status: 'active' })
      .eq('id', roomId);

    if (error) {
      toast({
        title: 'Error joining room',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Flip card and deduct balance
  const flipCard = async (cardType: 'truth' | 'dare') => {
    if (!roomId || !user || !profile || !room) return;
    
    const price = cardType === 'truth' ? room.card_price / 2 : room.card_price;

    // Check balance
    if (profile.wallet_balance < price) {
      toast({
        title: 'Insufficient balance',
        description: `You need $${price} to reveal this card. Top up your wallet!`,
        variant: 'destructive',
      });
      return;
    }

    setFlipping(true);

    try {
      // Get random content
      const content = cardType === 'truth' ? getRandomTruth() : getRandomDare();

      // Deduct from fan's wallet
      const { error: walletError } = await supabase
        .from('profiles')
        .update({ wallet_balance: profile.wallet_balance - price })
        .eq('id', user.id);

      if (walletError) throw walletError;

      // Add to creator's pending balance
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('pending_balance')
        .eq('id', room.creator_id)
        .single();

      if (creatorProfile) {
        await supabase
          .from('profiles')
          .update({ pending_balance: Number(creatorProfile.pending_balance) + price })
          .eq('id', room.creator_id);
      }

      // Record transaction
      await supabase.from('transactions').insert({
        sender_id: user.id,
        receiver_id: room.creator_id,
        amount: price,
        type: 'game',
        description: `Truth or Dare - ${cardType}`,
      });

      // Update room with card reveal (this will sync to both players via realtime)
      const { error: roomError } = await supabase
        .from('game_rooms')
        .update({
          current_card_type: cardType,
          current_card_content: content,
        })
        .eq('id', roomId);

      if (roomError) throw roomError;

      // Refresh profile to update wallet display
      await refreshProfile();

      toast({
        title: `${cardType === 'truth' ? 'Truth' : 'Dare'} revealed!`,
        description: `$${price} deducted from your wallet.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setFlipping(false);
    }
  };

  // Reset cards for next round
  const resetCards = async () => {
    if (!roomId) return;

    await supabase
      .from('game_rooms')
      .update({
        current_card_type: null,
        current_card_content: null,
      })
      .eq('id', roomId);
  };

  // End game
  const endGame = async () => {
    if (!roomId) return;

    await supabase
      .from('game_rooms')
      .update({ status: 'ended' })
      .eq('id', roomId);
  };

  return {
    room,
    loading,
    flipping,
    isCreator: room?.creator_id === user?.id,
    isFan: room?.fan_id === user?.id,
    joinRoom,
    flipCard,
    resetCards,
    endGame,
  };
}
