
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface NotificationContextType {
    unreadMessageCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Simple "pop" sound base64
const NOTIFICATION_SOUND = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"; // Placeholder, will use a real one or longer one

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [unreadMessageCount, setUnreadMessageCount] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // efficient minimal placeholder sound (just a blip for now, user can replace)
        // Actually, let's use a slightly better one or just init the audio
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Public domain or placeholder
        audioRef.current.volume = 0.5;
    }, []);

    const playSound = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.error("Error playing sound:", e));
        }
    };

    useEffect(() => {
        if (!user) {
            setUnreadMessageCount(0);
            return;
        }

        // 1. Fetch initial count and setup subscriptions
        const fetchUnreadCount = async () => {
            if (!user) return;

            const { count, error } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('is_read', false)
                .neq('sender_id', user.id);

            if (!error && count !== null) {
                setUnreadMessageCount(count);
            }
        };

        fetchUnreadCount();

        // Debounce timer for updates
        let updateTimeout: NodeJS.Timeout;

        // 2. Subscribe to new messages (INSERT) and updates
        const channel = supabase
            .channel('global-messages-count')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                },
                (payload) => {
                    const newMsg = payload.new as any;
                    if (newMsg.sender_id && newMsg.sender_id !== user.id) {
                        setUnreadMessageCount(prev => prev + 1);
                        playSound();
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                },
                () => {
                    // On any update (like marking as read), re-fetch the count
                    // Debounce to prevent multiple fetches when marking many messages as read
                    if (updateTimeout) clearTimeout(updateTimeout);
                    updateTimeout = setTimeout(() => {
                        fetchUnreadCount();
                    }, 500);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            if (updateTimeout) clearTimeout(updateTimeout);
        };
    }, [user]);

    return (
        <NotificationContext.Provider value={{ unreadMessageCount }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
}
