import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  MessageCircle,
  MessageSquare,
  Wine,
  Target,
  Heart,
  Bell,
  Bookmark,
  LogIn,
  UserPlus,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface CategoryItem {
  id: string;
  label: string;
  icon: any;
  color: string;
  gradient: string;
}

const categories: CategoryItem[] = [
  {
    id: 'flash-drops',
    label: 'Flash Drops',
    icon: Sparkles,
    color: 'text-neon-cyan',
    gradient: 'from-neon-cyan to-neon-blue'
  },
  {
    id: 'confessions',
    label: 'Confessions',
    icon: MessageCircle,
    color: 'text-neon-pink',
    gradient: 'from-neon-pink to-neon-purple'
  },
  {
    id: 'x-chat',
    label: 'X Chat',
    icon: MessageSquare,
    color: 'text-neon-yellow',
    gradient: 'from-neon-yellow to-neon-orange'
  },
  {
    id: 'bar-lounge',
    label: 'Bar Lounge',
    icon: Wine,
    color: 'text-neon-purple',
    gradient: 'from-neon-purple to-neon-pink'
  },
  {
    id: 'truth-or-dare',
    label: 'Truth or Dare',
    icon: Target,
    color: 'text-neon-green',
    gradient: 'from-neon-green to-neon-cyan'
  },
  {
    id: 'suga-4-u',
    label: 'Suga 4 U',
    icon: Heart,
    color: 'text-neon-pink',
    gradient: 'from-neon-pink to-neon-orange'
  },
];

interface CategorySidebarProps {
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export function CategorySidebar({ selectedCategory, onCategoryChange }: CategorySidebarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="hidden lg:block w-64 h-screen sticky top-0 glass-card rounded-none border-r border-border/50 p-6 overflow-y-auto">
      {/* Browse Section */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground mb-4 px-2">Browse</h2>

        {/* Categories Link */}
        <button
          onClick={() => navigate('/discover')}
          className="flex items-center gap-3 px-4 py-2.5 mb-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all w-full"
        >
          <Search className="w-5 h-5" />
          <span className="font-medium">Categories</span>
        </button>

        {/* Category List */}
        <div className="space-y-1">
          {categories.map((category) => {
            const isActive = selectedCategory === category.id;
            const Icon = category.icon;

            return (
              <button
                key={category.id}
                onClick={() => {
                  if (category.id === 'truth-or-dare') {
                    navigate('/truth-or-dare');
                  } else {
                    onCategoryChange(category.id);
                  }
                }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all w-full group relative overflow-hidden",
                  isActive
                    ? `${category.color} bg-secondary/50 shadow-[0_0_20px_currentColor/20]`
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                )}
              >
                {/* Gradient border effect when active */}
                {isActive && (
                  <div className={cn(
                    "absolute inset-0 rounded-lg bg-gradient-to-r opacity-20",
                    category.gradient
                  )} />
                )}

                <Icon className={cn(
                  "w-5 h-5 relative z-10",
                  isActive && "drop-shadow-[0_0_8px_currentColor]"
                )} />
                <span className="font-medium relative z-10">{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Account Section */}
      {user && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4 px-2">Account</h2>
          <div className="space-y-1">
            <Link
              to="/messages"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">Messages</span>
            </Link>
            <Link
              to="/notifications"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all"
            >
              <Bell className="w-5 h-5" />
              <span className="font-medium">Notifications</span>
            </Link>
            <Link
              to="/bookmarks"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all"
            >
              <Bookmark className="w-5 h-5" />
              <span className="font-medium">Collections</span>
            </Link>
          </div>
        </div>
      )}

      {/* Auth Buttons (when not logged in) */}
      {!user && (
        <div className="space-y-2">
          <button
            onClick={() => navigate('/auth')}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold hover:shadow-[0_0_20px_rgba(236,72,153,0.5)] transition-all"
          >
            <UserPlus className="w-5 h-5" />
            Register
          </button>
          <button
            onClick={() => navigate('/auth')}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg border border-neon-cyan text-neon-cyan font-semibold hover:bg-neon-cyan/10 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all"
          >
            <LogIn className="w-5 h-5" />
            Login
          </button>
        </div>
      )}
    </aside>
  );
}
