import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/glass-card';
import { NeonButton } from '@/components/ui/neon-button';
import { Heart, MessageCircle, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Notification {
  id: string;
  type: 'like' | 'comment';
  post_id: string;
  content: string | null;
  is_read: boolean;
  created_at: string;
  actor: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export default function Notifications() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-page-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('notifications')
            .select(`
              id,
              type,
              post_id,
              content,
              is_read,
              created_at,
              actor:profiles!notifications_actor_id_fkey (
                username,
                display_name,
                avatar_url
              )
            `)
            .eq('id', (payload.new as any).id)
            .single();

          if (data) {
            setNotifications(prev => [data as unknown as Notification, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('notifications')
      .select(`
        id,
        type,
        post_id,
        content,
        is_read,
        created_at,
        actor:profiles!notifications_actor_id_fkey (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setNotifications(data as unknown as Notification[]);
    }
    setLoadingNotifications(false);
  };

  const markAllAsRead = async () => {
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);

      setNotifications(prev =>
        prev.map(n => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
    }

    navigate('/feed');
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

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
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold neon-text-pink mb-2">Notifications</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <NeonButton variant="cyan" size="sm" onClick={markAllAsRead}>
              <Check className="w-4 h-4 mr-2" />
              Mark all read
            </NeonButton>
          )}
        </header>

        {loadingNotifications ? (
          <div className="text-center py-12">
            <div className="animate-pulse text-neon-pink">Loading notifications...</div>
          </div>
        ) : notifications.length === 0 ? (
          <GlassCard className="text-center py-12">
            <p className="text-muted-foreground">No notifications yet</p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <GlassCard
                key={notification.id}
                hover="glow"
                className={`cursor-pointer transition-all ${
                  !notification.is_read ? 'border-neon-pink/50 bg-neon-pink/5' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden">
                    {notification.actor?.avatar_url ? (
                      <img
                        src={notification.actor.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      notification.actor?.username?.charAt(0).toUpperCase() || '?'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground">
                      <span className="font-semibold">
                        {notification.actor?.display_name || notification.actor?.username}
                      </span>{' '}
                      {notification.type === 'like' ? (
                        <span className="text-muted-foreground">
                          <Heart className="w-4 h-4 inline text-neon-pink mx-1" />
                          liked your post
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          <MessageCircle className="w-4 h-4 inline text-neon-cyan mx-1" />
                          commented on your post
                        </span>
                      )}
                    </p>
                    {notification.content && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        "{notification.content}"
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-neon-pink flex-shrink-0 mt-2" />
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
