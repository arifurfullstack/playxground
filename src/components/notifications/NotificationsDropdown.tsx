import { useState, useEffect } from 'react';
import { Bell, Heart, MessageCircle, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'invite';
  post_id: string | null;
  content: string | null;
  data: any; // Contains room_id, invite_id for invites
  is_read: boolean;
  created_at: string;
  actor: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function NotificationsDropdown() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          // Fetch the full notification with actor info
          const { data } = await supabase
            .from('notifications')
            .select(`
              id,
              type,
              post_id,
              content,
              data,
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
            setUnreadCount(prev => prev + 1);
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
      .limit(20);

    if (data) {
      setNotifications(data as unknown as Notification[]);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);

      setNotifications(prev =>
        prev.map(n => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    setOpen(false);

    if (notification.type === 'invite' && (notification.data as any)?.room_id) {
      navigate(`/games/${(notification.data as any).room_id}`);
    } else {
      navigate('/feed');
    }
  };

  const handleAcceptInvite = async (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation();
    const inviteId = (notification.data as any)?.invite_id;
    if (!inviteId) return;

    try {
      const { data, error } = await (supabase as any).rpc('accept_invite', { p_invite_id: inviteId });
      if (error) throw error;

      toast.success("Invitation accepted!");
      handleNotificationClick(notification);
      if (data?.room_id) navigate(`/games/${data.room_id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to accept invitation");
    }
  };

  const handleDeclineInvite = async (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation();
    const inviteId = (notification.data as any)?.invite_id;
    if (!inviteId) return;

    try {
      const { error } = await (supabase as any)
        .from('invitations')
        .update({ status: 'declined' })
        .eq('id', inviteId);
      if (error) throw error;

      toast.success("Invitation declined");
      // Mark notification as read
      if (!notification.is_read) {
        await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error: any) {
      toast.error("Failed to decline invitation");
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  if (!user) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 text-muted-foreground hover:text-neon-pink transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-neon-pink text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <h3 className="font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-neon-cyan hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No notifications yet
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full flex items-start gap-3 px-3 py-3 hover:bg-accent/50 transition-colors text-left ${!notification.is_read ? 'bg-accent/20' : ''
                    }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden">
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
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">
                        {notification.actor?.display_name || notification.actor?.username}
                      </span>{' '}
                      {notification.type === 'like' ? (
                        <>
                          <Heart className="w-3 h-3 inline text-neon-pink" /> liked your post
                        </>
                      ) : notification.type === 'comment' ? (
                        <>
                          <MessageCircle className="w-3 h-3 inline text-neon-cyan" /> commented on your post
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3 inline text-neon-green" /> {notification.content}
                        </>
                      )}
                    </p>
                    {notification.type === 'invite' && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={(e) => handleAcceptInvite(e, notification)}
                          className="px-3 py-1 bg-neon-green/20 text-neon-green border border-neon-green/30 rounded-md text-[10px] font-bold hover:bg-neon-green/40 transition-colors"
                        >
                          Accept {(notification.data as any)?.role === 'fan' && "($10)"}
                        </button>
                        <button
                          onClick={(e) => handleDeclineInvite(e, notification)}
                          className="px-3 py-1 bg-white/5 text-muted-foreground border border-white/10 rounded-md text-[10px] font-bold hover:bg-white/10 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    {notification.content && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        "{notification.content}"
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {formatTime(notification.created_at)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
