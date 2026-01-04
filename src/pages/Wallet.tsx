import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Gamepad2, 
  Heart, 
  Sparkles,
  CreditCard,
  Check,
  X,
  Building2,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/glass-card';
import { NeonButton } from '@/components/ui/neon-button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  sender_id: string | null;
  receiver_id: string | null;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

interface PaymentGateway {
  id: string;
  name: string;
  type: string;
  display_name: string | null;
  description: string | null;
  is_active: boolean;
  config: Record<string, any>;
}

const topUpOptions = [
  { amount: 10, bonus: 0, popular: false },
  { amount: 25, bonus: 2, popular: true },
  { amount: 50, bonus: 5, popular: false },
  { amount: 100, bonus: 15, popular: false },
];

export default function WalletPage() {
  const { user, loading: authLoading, profile, role, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [showTopUp, setShowTopUp] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [selectedBonus, setSelectedBonus] = useState<number>(0);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'amount' | 'gateway'>('amount');
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [loadingGateways, setLoadingGateways] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setTransactions(data);
    }
    setLoadingTx(false);
  };

  const fetchGateways = async () => {
    setLoadingGateways(true);
    const { data, error } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setGateways(data as PaymentGateway[]);
    }
    setLoadingGateways(false);
  };

  const handleSelectAmount = (amount: number, bonus: number) => {
    setSelectedAmount(amount);
    setSelectedBonus(bonus);
    setStep('gateway');
    fetchGateways();
  };

  const handleSelectGateway = async (gateway: PaymentGateway) => {
    if (!user || !profile || !selectedAmount) return;

    if (gateway.type === 'bank_transfer') {
      setShowTopUp(false);
      setStep('amount');
      navigate(`/manual-payment?type=wallet_topup&amount=${selectedAmount}`);
      return;
    }

    setProcessing(true);

    // Simulate payment processing for demo
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const totalAmount = selectedAmount + selectedBonus;

      // Update wallet balance
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ wallet_balance: profile.wallet_balance + totalAmount })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Record transaction
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          sender_id: user.id,
          receiver_id: user.id,
          amount: totalAmount,
          type: 'topup',
          description: `Wallet top-up via ${gateway.name}: $${selectedAmount}${selectedBonus > 0 ? ` + $${selectedBonus} bonus` : ''}`,
        });

      if (txError) throw txError;

      await refreshProfile();
      await fetchTransactions();

      toast({
        title: 'Top-up successful!',
        description: `$${totalAmount} has been added to your wallet via ${gateway.name}.`,
      });

      setShowTopUp(false);
      setStep('amount');
    } catch (error: any) {
      toast({
        title: 'Top-up failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
      setSelectedAmount(null);
      setSelectedBonus(0);
    }
  };

  const getGatewayIcon = (type: string) => {
    switch (type) {
      case 'paypal':
        return <Wallet className="w-6 h-6 text-[#00457C]" />;
      case 'stripe':
        return <CreditCard className="w-6 h-6 text-[#635BFF]" />;
      case 'bank_transfer':
        return <Building2 className="w-6 h-6 text-neon-green" />;
      default:
        return <CreditCard className="w-6 h-6" />;
    }
  };

  const closeModal = () => {
    if (!processing) {
      setShowTopUp(false);
      setStep('amount');
      setSelectedAmount(null);
      setSelectedBonus(0);
    }
  };

  const getTransactionIcon = (type: string, isOutgoing: boolean) => {
    switch (type) {
      case 'tip':
        return <Heart className="w-5 h-5 text-neon-pink" />;
      case 'subscription':
        return <Sparkles className="w-5 h-5 text-neon-purple" />;
      case 'game':
        return <Gamepad2 className="w-5 h-5 text-neon-cyan" />;
      case 'topup':
        return <Plus className="w-5 h-5 text-neon-green" />;
      default:
        return isOutgoing 
          ? <ArrowUpRight className="w-5 h-5 text-neon-orange" />
          : <ArrowDownLeft className="w-5 h-5 text-neon-green" />;
    }
  };

  const getTransactionColor = (type: string, isOutgoing: boolean) => {
    if (type === 'topup') return 'text-neon-green';
    return isOutgoing ? 'text-neon-orange' : 'text-neon-green';
  };

  if (authLoading) {
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
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Wallet className="w-8 h-8 text-neon-purple" />
            <span className="neon-text-purple">Wallet</span>
          </h1>
        </motion.header>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard border="purple" className="mb-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/10 via-transparent to-neon-pink/10" />
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Available Balance</p>
                  <h2 className="text-5xl font-display font-bold text-foreground">
                    ${profile?.wallet_balance.toFixed(2) || '0.00'}
                  </h2>
                </div>
                <div className="p-3 rounded-full bg-neon-purple/20">
                  <Wallet className="w-8 h-8 text-neon-purple" />
                </div>
              </div>

              {role === 'creator' && profile && (
                <div className="flex items-center gap-4 mb-6 p-4 rounded-lg bg-secondary/50">
                  <div>
                    <p className="text-xs text-muted-foreground">Pending Earnings</p>
                    <p className="text-xl font-semibold text-neon-green">
                      ${profile.pending_balance.toFixed(2)}
                    </p>
                  </div>
                  <NeonButton variant="green" size="sm" disabled>
                    Withdraw
                  </NeonButton>
                </div>
              )}

              <NeonButton
                variant="filled"
                size="lg"
                className="w-full"
                onClick={() => setShowTopUp(true)}
              >
                <Plus className="w-5 h-5" />
                Top Up Wallet
              </NeonButton>
            </div>
          </GlassCard>
        </motion.div>

        {/* Top-Up Modal */}
        <AnimatePresence>
          {showTopUp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
              onClick={closeModal}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <GlassCard border="pink" padding="lg" className="w-full max-w-md">
                  <div className="flex items-center justify-between mb-6">
                    {step === 'gateway' && (
                      <button
                        onClick={() => setStep('amount')}
                        disabled={processing}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                    )}
                    <h3 className="text-xl font-display font-bold text-foreground flex-1 text-center">
                      {step === 'amount' ? 'Select Amount' : 'Choose Payment Method'}
                    </h3>
                    <button
                      onClick={closeModal}
                      className="text-muted-foreground hover:text-foreground"
                      disabled={processing}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {step === 'amount' ? (
                      <motion.div
                        key="amount"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                      >
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          {topUpOptions.map((option) => (
                            <motion.button
                              key={option.amount}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleSelectAmount(option.amount, option.bonus)}
                              className={`
                                relative p-4 rounded-xl border-2 transition-all text-left
                                ${option.popular 
                                  ? 'border-neon-pink bg-neon-pink/10' 
                                  : 'border-border hover:border-neon-pink/50'}
                              `}
                            >
                              {option.popular && (
                                <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 text-xs bg-neon-pink text-background rounded-full">
                                  Popular
                                </span>
                              )}
                              
                              <div className="text-2xl font-bold text-foreground mb-1">
                                ${option.amount}
                              </div>
                              
                              {option.bonus > 0 && (
                                <div className="text-sm text-neon-green">
                                  +${option.bonus} bonus
                                </div>
                              )}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="gateway"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                      >
                        <div className="mb-4 p-3 rounded-lg bg-secondary/50 text-center">
                          <p className="text-sm text-muted-foreground">Amount to add</p>
                          <p className="text-2xl font-bold text-foreground">
                            ${selectedAmount}
                            {selectedBonus > 0 && (
                              <span className="text-neon-green text-lg ml-2">+${selectedBonus}</span>
                            )}
                          </p>
                        </div>

                        {loadingGateways ? (
                          <div className="py-8 text-center">
                            <div className="animate-pulse text-muted-foreground">Loading payment methods...</div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {gateways.map((gateway) => (
                              <motion.button
                                key={gateway.id}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleSelectGateway(gateway)}
                                disabled={processing}
                                className={`
                                  w-full p-4 rounded-xl border-2 border-border hover:border-neon-cyan/50 
                                  transition-all flex items-center gap-4 text-left
                                  ${processing ? 'opacity-50' : ''}
                                `}
                              >
                                <div className="p-3 rounded-xl bg-secondary/50">
                                  {getGatewayIcon(gateway.type)}
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold text-foreground">
                                    {gateway.display_name || gateway.name}
                                  </p>
                                  {gateway.description && (
                                    <p className="text-sm text-muted-foreground">
                                      {gateway.description}
                                    </p>
                                  )}
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                              </motion.button>
                            ))}
                          </div>
                        )}

                        {processing && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-xl"
                          >
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                              <CreditCard className="w-8 h-8 text-neon-pink" />
                            </motion.div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Demo mode - no real payment processed.
                  </p>
                </GlassCard>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transaction History */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-neon-cyan" />
            Transaction History
          </h2>

          {loadingTx ? (
            <GlassCard border="default" className="text-center py-8">
              <div className="animate-pulse text-muted-foreground">Loading transactions...</div>
            </GlassCard>
          ) : transactions.length === 0 ? (
            <GlassCard border="default" className="text-center py-12">
              <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Top up your wallet to get started!
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx, index) => {
                const isOutgoing = tx.sender_id === user?.id && tx.type !== 'topup';
                const isIncoming = tx.receiver_id === user?.id && tx.sender_id !== user?.id;

                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <GlassCard border="default" padding="sm" hover="glow">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-full bg-secondary/50">
                          {getTransactionIcon(tx.type, isOutgoing)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {tx.description || tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(tx.created_at), 'MMM d, yyyy • h:mm a')}
                          </p>
                        </div>
                        
                        <div className={`text-right ${getTransactionColor(tx.type, isOutgoing)}`}>
                          <p className="font-semibold">
                            {tx.type === 'topup' || isIncoming ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                          </p>
                          <p className="text-xs capitalize text-muted-foreground">
                            {tx.type}
                          </p>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.section>
      </div>
    </AppLayout>
  );
}
