import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useCameraSlots = (roomId: string) => {
    const { user } = useAuth();
    const [fanSlots, setFanSlots] = useState<any[]>([]);
    const [creatorSlots, setCreatorSlots] = useState<any[]>([]);
    const [isOnCamera, setIsOnCamera] = useState(false);

    useEffect(() => {
        if (!roomId) return;

        // Fetch initial slots
        const fetchSlots = async () => {
            const { data, error } = await supabase
                .from('td_camera_slots')
                .select(`
                  *,
                  profile:occupied_by_user_id(username, avatar_url)
                `)
                .eq('room_id', roomId);

            if (data) {
                setFanSlots(data.filter(s => s.slot_type === 'fan').sort((a, b) => a.slot_index - b.slot_index));
                setCreatorSlots(data.filter(s => s.slot_type === 'creator').sort((a, b) => a.slot_index - b.slot_index));

                if (user) {
                    const mySlot = data.find(s => s.occupied_by_user_id === user.id);
                    setIsOnCamera(!!mySlot);
                }
            }
        };

        fetchSlots();

        // Subscribe to changes
        const channel = supabase
            .channel(`camera-slots-${roomId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'td_camera_slots',
                filter: `room_id=eq.${roomId}`
            }, () => {
                fetchSlots();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, user]);

    const joinCamera = async () => {
        if (!user) return;
        if (isOnCamera) return;

        try {
            // Find first empty fan slot
            const emptySlot = fanSlots.find(s => !s.occupied_by_user_id);

            if (!emptySlot) {
                toast.error('All camera slots are full!');
                return;
            }

            const { error } = await supabase
                .from('td_camera_slots')
                .update({
                    occupied_by_user_id: user.id,
                    occupied_at: new Date().toISOString()
                })
                .eq('id', emptySlot.id)
                .is('occupied_by_user_id', null); // Optimistic lock

            if (error) throw error;

            setIsOnCamera(true);
            toast.success('You are now on camera!');

        } catch (error) {
            console.error('Error joining camera:', error);
            toast.error('Failed to join camera slot.');
        }
    };

    const leaveCamera = async () => {
        if (!user || !isOnCamera) return;

        try {
            const { error } = await supabase
                .from('td_camera_slots')
                .update({
                    occupied_by_user_id: null,
                    occupied_at: null
                })
                .eq('occupied_by_user_id', user.id)
                .eq('room_id', roomId);

            if (error) throw error;

            setIsOnCamera(false);
            toast.info('You have left the camera.');

        } catch (error) {
            console.error('Error leaving camera:', error);
        }
    };

    return {
        fanSlots,
        creatorSlots,
        isOnCamera,
        joinCamera,
        leaveCamera
    };
};
