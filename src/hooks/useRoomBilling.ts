import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useRoomBilling = (roomId: string) => {
    const { user } = useAuth();
    const [minutesInRoom, setMinutesInRoom] = useState(0);
    const [billableMinutes, setBillableMinutes] = useState(0);
    const [totalCost, setTotalCost] = useState(0);
    const [isJoined, setIsJoined] = useState(false);
    const timerRef = useRef<NodeJS.Timeout>();

    const FREE_MINUTES = 10;
    const PER_MINUTE_FEE = 2;
    const ENTRY_FEE = 10;

    useEffect(() => {
        if (!roomId || !user) return;

        // Check if user has already entered/paid
        const checkEntry = async () => {
            const { data, error } = await supabase
                .from('td_participants')
                .select('*')
                .eq('room_id', roomId)
                .eq('user_id', user.id)
                .eq('left_at', null)
                .single();

            if (data) {
                setIsJoined(true);
            }
        };

        checkEntry();
    }, [roomId, user]);

    const joinRoom = async () => {
        if (!user) return;

        try {
            // Check if user is the room creator
            const { data: roomData } = await supabase
                .from('td_rooms')
                .select('creator_id')
                .eq('id', roomId)
                .single();

            const isCreator = roomData?.creator_id === user.id;

            if (!isCreator) {
                // 1. Charge entry fee by inserting a transaction
                // The DB trigger will verify balance and deduct
                const { error: txError } = await supabase
                    .from('td_transactions')
                    .insert({
                        room_id: roomId,
                        user_id: user.id,
                        type: 'entry_fee',
                        amount: ENTRY_FEE,
                    });

                if (txError) throw txError;
            }

            // 2. Add to participants
            const { error: partError } = await supabase
                .from('td_participants')
                .insert({
                    room_id: roomId,
                    user_id: user.id,
                    role: isCreator ? 'creator' : 'fan',
                    entered_at: new Date().toISOString()
                });

            if (partError) throw partError;

            setIsJoined(true);
            toast.success(isCreator ? 'Entering room as Creator...' : 'Joined room successfully!');

        } catch (error: any) {
            console.error('Error joining room:', error);
            toast.error(error.message || 'Failed to join room. Please check your wallet balance.');
        }
    };

    const leaveRoom = async () => {
        if (!user || !isJoined) return;

        try {
            await supabase
                .from('td_participants')
                .update({ left_at: new Date().toISOString() })
                .eq('room_id', roomId)
                .eq('user_id', user.id);

            setIsJoined(false);
            setMinutesInRoom(0);
        } catch (error) {
            console.error('Error leaving room:', error);
        }
    };

    // Timer logic for billing - now using the bill_me_for_room RPC
    useEffect(() => {
        if (!isJoined) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }

        const runBilling = async () => {
            const { error } = await supabase.rpc('bill_me_for_room', { p_room_id: roomId });
            if (error) console.error('Billing error:', error);

            setMinutesInRoom(prev => prev + 1);
        };

        // Initial check and then every minute
        runBilling();
        timerRef.current = setInterval(runBilling, 60000); // 1 minute

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isJoined, roomId]);

    return {
        isJoined,
        minutesInRoom,
        billableMinutes: Math.max(0, minutesInRoom - FREE_MINUTES),
        totalCost: Math.max(0, minutesInRoom - FREE_MINUTES) * PER_MINUTE_FEE + (isJoined ? ENTRY_FEE : 0),
        joinRoom,
        leaveRoom,
        ENTRY_FEE,
        FREE_MINUTES,
        PER_MINUTE_FEE
    };
};
