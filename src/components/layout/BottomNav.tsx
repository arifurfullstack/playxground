import { Link, useLocation } from 'react-router-dom';
import { Home, Gamepad2, Wallet, MessageSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

const navItems = [
  { icon: Home, label: 'Home', href: '/feed', color: 'text-neon-pink' },
  { icon: Gamepad2, label: 'Games', href: '/games', color: 'text-neon-cyan' },
  { icon: MessageSquare, label: 'Messages', href: '/messages', color: 'text-neon-yellow', badge: 'messages' },
  { icon: Wallet, label: 'Wallet', href: '/wallet', color: 'text-neon-purple' },
  { icon: User, label: 'Profile', href: '/profile', color: 'text-neon-green' },
];

export function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      // Get conversations where user is a participant
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .or(`creator_id.eq.${user.id},fan_id.eq.${user.id}`);

      if (!conversations?.length) return;

      const conversationIds = conversations.map(c => c.id);

      // Count unread messages in those conversations
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .neq('sender_id', user.id)
        .eq('is_read', false);

      setUnreadCount(count || 0);
    };

    fetchUnreadCount();

    // Subscribe to new messages
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="glass-card rounded-t-2xl border-t border-border/50 px-2 py-3">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            const showBadge = item.badge === 'messages' && unreadCount > 0;
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg transition-all relative",
                  isActive ? item.color : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="relative">
                  <item.icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_8px_currentColor]")} />
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold bg-neon-pink text-background rounded-full">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
