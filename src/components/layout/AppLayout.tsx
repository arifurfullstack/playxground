import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { Logo } from '@/components/Logo';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      {/* Mobile Header Elements */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 p-4 flex items-center justify-between pointer-events-none bg-background/80 backdrop-blur-md border-b border-border/10">
        {/* Left: Menu Trigger (Pointer events enabled) */}
        <div className="pointer-events-auto z-50">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-primary/20">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-r border-border/50 bg-black/95">
              <Sidebar
                className="flex w-full h-full border-none relative bg-transparent pt-4"
                onLinkClick={() => setIsMobileMenuOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </div>

        {/* Center: Logo (Absolute to ensure perfect center) */}
        <div className="absolute left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <Logo size="sm" />
        </div>

        {/* Right: Theme & Notifications (Pointer events enabled) */}
        <div className="flex items-center gap-2 pointer-events-auto z-50">
          <ThemeToggle />
          <NotificationsDropdown />
        </div>
      </div>

      {/* Main Content - Added pt-16 for mobile header spacing */}
      <main className="md:ml-64 pt-16 md:pt-0 pb-24 md:pb-0 min-h-screen">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
