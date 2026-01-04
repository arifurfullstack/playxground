import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, DollarSign, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getAdminNotificationSettings } from '@/pages/AdminSettings';

interface PendingPayment {
  id: string;
  amount: number;
  type: string;
  created_at: string;
  user?: {
    username: string;
    display_name: string | null;
  };
}

export function AdminPaymentNotifications() {
  const [pendingCount, setPendingCount] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [newPayment, setNewPayment] = useState<PendingPayment | null>(null);
  const navigate = useNavigate();

  // Fetch initial pending count
  useEffect(() => {
    const fetchPendingCount = async () => {
      const { count, error } = await supabase
        .from('payment_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (!error && count !== null) {
        setPendingCount(count);
      }
    };

    fetchPendingCount();
  }, []);

  // Subscribe to realtime changes
  useEffect(() => {
    console.log('Setting up realtime subscription for payment_requests');
    
    const channel = supabase
      .channel('admin-payment-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payment_requests',
          filter: 'status=eq.pending'
        },
        async (payload) => {
          console.log('New payment request received:', payload);
          
          // Fetch user info for the new payment
          const { data: userData } = await supabase
            .from('profiles')
            .select('username, display_name')
            .eq('id', payload.new.user_id)
            .single();

          const payment: PendingPayment = {
            id: payload.new.id,
            amount: payload.new.amount,
            type: payload.new.type,
            created_at: payload.new.created_at,
            user: userData || undefined
          };

          // Get current notification settings
          const settings = getAdminNotificationSettings();

          if (settings.popupEnabled) {
            setNewPayment(payment);
            setShowPopup(true);
            // Auto-hide popup after 5 seconds
            setTimeout(() => setShowPopup(false), 5000);
          }
          
          setPendingCount(prev => prev + 1);

          // Play notification sound if enabled
          if (settings.soundEnabled) {
            try {
              const audio = new Audio('/notification.mp3');
              audio.volume = settings.soundVolume / 100;
              audio.play().catch(() => {});
            } catch (e) {
              console.log('Could not play notification sound');
            }
          }

          // Show toast notification if enabled
          if (settings.toastEnabled) {
            toast.info(
              `New ${payment.type === 'wallet_topup' ? 'top-up' : 'payment'} request: $${payment.amount.toFixed(2)}`,
              {
                action: {
                  label: 'View',
                  onClick: () => navigate('/admin/payments')
                }
              }
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payment_requests'
        },
        (payload) => {
          console.log('Payment request updated:', payload);
          // If a pending request was approved/rejected, decrement count
          if (payload.old.status === 'pending' && payload.new.status !== 'pending') {
            setPendingCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  return (
    <>
      {/* Notification Badge Button */}
      <button
        onClick={() => navigate('/admin/payments')}
        className="relative p-2 rounded-lg hover:bg-secondary/50 transition-colors group"
        title="Payment Requests"
      >
        <Bell className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        <AnimatePresence>
          {pendingCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-neon-pink text-background text-xs font-bold rounded-full flex items-center justify-center shadow-[0_0_10px_hsl(var(--neon-pink))]"
            >
              {pendingCount > 9 ? '9+' : pendingCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Floating Popup Notification */}
      <AnimatePresence>
        {showPopup && newPayment && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20, x: 20 }}
            className="fixed top-20 right-4 z-50 w-80"
          >
            <div className="glass-card p-4 border border-neon-cyan/50 shadow-[0_0_20px_hsl(var(--neon-cyan)/0.3)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-neon-cyan/20 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-neon-cyan" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      New Payment Request
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {newPayment.user?.display_name || newPayment.user?.username || 'User'} • {newPayment.type === 'wallet_topup' ? 'Top-up' : 'Subscription'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPopup(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="mt-3 flex items-center justify-between">
                <span className="text-2xl font-bold neon-text-cyan">
                  ${newPayment.amount.toFixed(2)}
                </span>
                <button
                  onClick={() => {
                    setShowPopup(false);
                    navigate('/admin/payments');
                  }}
                  className="text-sm text-neon-cyan hover:underline"
                >
                  Review now →
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}