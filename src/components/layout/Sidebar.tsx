import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, MessageSquare, Gamepad2, Trophy, Wallet, User, Settings, Heart, Search, Bell, LogOut, Sparkles, MessageCircle, Wine } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';
import { ThemeToggle } from '@/components/ThemeToggle';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';



interface SidebarProps {
  className?: string;
  onLinkClick?: () => void;
}

export function Sidebar({ className, onLinkClick }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();
  const { unreadMessageCount } = useNotification();

  const isCreator = role === 'creator';

  const navItems = [
    { icon: Home, label: 'Home', href: '/', color: 'text-neon-pink' },
    { icon: Search, label: 'Explore', href: '/explore', color: 'text-neon-green' },
    {
      icon: Sparkles,
      label: 'Flash Drops',
      href: isCreator ? '/flash-drops-creator' : `/flash-drops/${profile?.id || 'guest'}`,
      color: 'text-neon-cyan'
    },
    {
      icon: MessageCircle,
      label: 'Confessions',
      href: isCreator ? '/confessions-studio' : `/confessions/${profile?.id || 'guest'}`,
      color: 'text-neon-pink'
    },
    {
      icon: MessageSquare,
      label: 'X Chat',
      href: isCreator ? '/xchat-creator' : `/x-chat/${profile?.id || 'guest'}`,
      color: 'text-neon-yellow'
    },
    {
      icon: Wine,
      label: 'Bar Lounge',
      href: `/bar-lounge/${profile?.id || 'guest'}`,
      color: 'text-neon-purple'
    },
    { icon: Gamepad2, label: 'Games', href: '/games', color: 'text-neon-cyan' },
    { icon: Gamepad2, label: 'Truth or Dare', href: '/games/truth-or-dare', color: 'text-neon-cyan' },
    { icon: Heart, label: 'Suga 4 U', href: '/suga4u', color: 'text-neon-pink' },
    { icon: MessageSquare, label: 'Messages', href: '/messages', color: 'text-neon-yellow' },
    { icon: Bell, label: 'Notifications', href: '/notifications', color: 'text-neon-orange' },
    { icon: Trophy, label: 'Leaderboard', href: '/leaderboard', color: 'text-neon-green' },
    { icon: Wallet, label: 'Wallet', href: '/wallet', color: 'text-neon-purple' },

  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
    toast.success('Logged out successfully');
    onLinkClick?.();
  };

  return (
    <aside className={cn("hidden md:flex fixed left-0 top-0 h-screen w-64 flex-col glass-card rounded-none border-r border-border/50 p-6", className)}>
      <div className="mb-8 flex items-center justify-between">
        <Logo size="md" />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <NotificationsDropdown />
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto min-h-0 pr-1 custom-scrollbar">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                isActive
                  ? `${item.color} bg-secondary/50 shadow-[0_0_15px_currentColor/20]`
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_8px_currentColor]")} />
              <span className="font-medium">{item.label}</span>
              {item.label === 'Messages' && unreadMessageCount > 0 && (
                <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                  {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                </span>
              )}
            </Link>
          );
        })}

        {role === 'creator' && (
          <>
            <Link
              to="/creator"
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                location.pathname === '/creator'
                  ? "text-neon-orange bg-secondary/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
              )}
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Creator Hub</span>
            </Link>
            <Link
              to="/confessions-studio"
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                location.pathname === '/confessions-studio'
                  ? "text-neon-pink bg-secondary/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
              )}
            >
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">Confessions Studio</span>
            </Link>
            <Link
              to="/creator/withdraw"
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                location.pathname === '/creator/withdraw'
                  ? "text-neon-green bg-secondary/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
              )}
            >
              <Wallet className="w-5 h-5" />
              <span className="font-medium">Withdraw</span>
            </Link>
          </>
        )}

        {role === 'admin' && (
          <Link
            to="/admin"
            onClick={onLinkClick}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
              location.pathname.startsWith('/admin')
                ? "text-neon-cyan bg-secondary/50"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
            )}
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Admin Panel</span>
          </Link>
        )}
      </nav>

      {profile && (
        <div className="space-y-2">
          <Link to="/settings" onClick={onLinkClick} className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-pink to-neon-cyan flex items-center justify-center overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-background" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{profile.display_name || profile.username}</p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-destructive hover:bg-destructive/10 transition-all">
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Log Out</span>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will need to sign in again to access your account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleLogout}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Log Out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </aside>
  );
}
