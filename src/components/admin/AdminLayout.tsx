import { ReactNode, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Flag, 
  Settings, 
  CreditCard,
  Building2,
  Wallet,
  ChevronLeft,
  Shield
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AdminPaymentNotifications } from './AdminPaymentNotifications';

interface AdminLayoutProps {
  children: ReactNode;
}

const adminNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin', color: 'text-neon-cyan' },
  { icon: Users, label: 'Users', href: '/admin/users', color: 'text-neon-pink' },
  { icon: FileText, label: 'Posts', href: '/admin/posts', color: 'text-neon-yellow' },
  { icon: Flag, label: 'Reports', href: '/admin/reports', color: 'text-neon-orange' },
  { icon: CreditCard, label: 'Payments', href: '/admin/payments', color: 'text-neon-green' },
  { icon: Wallet, label: 'Gateways', href: '/admin/gateways', color: 'text-neon-purple' },
  { icon: Building2, label: 'Bank Settings', href: '/admin/bank-settings', color: 'text-neon-cyan' },
  { icon: Settings, label: 'Settings', href: '/admin/settings', color: 'text-muted-foreground' },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, role } = useAuth();

  useEffect(() => {
    if (!loading && (!user || role !== 'admin')) {
      navigate('/forbidden', { replace: true });
    }
  }, [user, loading, role, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-neon-pink">Loading...</div>
      </div>
    );
  }

  if (!user || role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 flex-col glass-card rounded-none border-r border-border/50 p-6 z-50">
        <div className="mb-4 flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-1">
            <AdminPaymentNotifications />
            <ThemeToggle />
          </div>
        </div>
        
        <div className="flex items-center gap-2 mb-6 px-2 py-1.5 rounded-lg bg-neon-pink/10 border border-neon-pink/30">
          <Shield className="w-4 h-4 text-neon-pink" />
          <span className="text-sm font-medium text-neon-pink">Admin Panel</span>
        </div>

        <nav className="flex-1 space-y-1">
          {adminNavItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/admin' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm",
                  isActive 
                    ? `${item.color} bg-secondary/50 shadow-[0_0_15px_currentColor/20]` 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive && "drop-shadow-[0_0_8px_currentColor]")} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <Link 
          to="/feed" 
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to App</span>
        </Link>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-neon-pink" />
            <span className="font-display font-bold text-neon-pink">Admin</span>
          </div>
          <div className="flex items-center gap-1">
            <AdminPaymentNotifications />
            <ThemeToggle />
            <Link to="/feed" className="text-muted-foreground hover:text-foreground p-2">
              <ChevronLeft className="w-5 h-5" />
            </Link>
          </div>
        </div>
        
        {/* Mobile nav */}
        <nav className="flex gap-1 mt-3 overflow-x-auto pb-2 -mx-4 px-4">
          {adminNavItems.slice(0, 5).map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap text-xs font-medium transition-all",
                  isActive 
                    ? `${item.color} bg-secondary/50` 
                    : "text-muted-foreground hover:text-foreground bg-secondary/30"
                )}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 md:ml-64 pt-28 md:pt-0">
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}