import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  AlertCircle
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/glass-card';
import { NeonButton } from '@/components/ui/neon-button';
import { NeonInput } from '@/components/ui/neon-input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface BankSetting {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
}

export default function CreatorWithdrawal() {
  const { user, loading: authLoading, profile, role, refreshProfile } = useAuth();
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [banks, setBanks] = useState<BankSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (user && role === 'creator') {
      fetchData();
    }
  }, [user, role]);

  const fetchData = async () => {
    if (!user) return;

    // Fetch withdrawal requests
    const { data: requestsData } = await supabase
      .from('payment_requests')
      .select('id, amount, status, notes, admin_notes, created_at, reviewed_at')
      .eq('user_id', user.id)
      .eq('type', 'withdrawal')
      .order('created_at', { ascending: false });

    if (requestsData) {
      setRequests(requestsData);
    }

    // Fetch active banks for reference
    const { data: banksData } = await supabase
      .from('bank_settings')
      .select('id, bank_name, account_name, account_number')
      .eq('is_active', true);

    if (banksData) {
      setBanks(banksData);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !profile) return;

    const withdrawalAmount = parseFloat(amount);

    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid withdrawal amount',
        variant: 'destructive',
      });
      return;
    }

    if (withdrawalAmount > profile.pending_balance) {
      toast({
        title: 'Insufficient balance',
        description: `Your pending balance is $${profile.pending_balance.toFixed(2)}`,
        variant: 'destructive',
      });
      return;
    }

    if (!bankDetails.trim()) {
      toast({
        title: 'Bank details required',
        description: 'Please provide your bank account details for the transfer',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase
      .from('payment_requests')
      .insert({
        user_id: user.id,
        type: 'withdrawal',
        amount: withdrawalAmount,
        notes: `Bank Details:\n${bankDetails}${notes ? `\n\nAdditional Notes:\n${notes}` : ''}`,
        payment_method: 'bank_transfer',
        bank_account_name: bankDetails.split('\n')[0] || 'Not provided',
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit withdrawal request',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Request submitted',
        description: 'Your withdrawal request has been submitted for review',
      });
      setAmount('');
      setNotes('');
      setBankDetails('');
      fetchData();
    }

    setSubmitting(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-neon-yellow" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-neon-green" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-neon-yellow';
      case 'approved':
        return 'text-neon-green';
      case 'rejected':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neon-pink">Loading...</div>
      </div>
    );
  }

  if (!user || role !== 'creator') {
    return <Navigate to="/feed" replace />;
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const pendingTotal = pendingRequests.reduce((sum, r) => sum + r.amount, 0);
  const availableToWithdraw = (profile?.pending_balance || 0) - pendingTotal;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button 
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Wallet className="w-8 h-8 text-neon-green" />
            <span className="neon-text-green">Withdraw Earnings</span>
          </h1>
        </motion.header>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard border="green" className="mb-8">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pending Balance</p>
                <p className="text-3xl font-bold text-neon-green">
                  ${profile?.pending_balance?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Available to Withdraw</p>
                <p className="text-3xl font-bold text-foreground">
                  ${availableToWithdraw.toFixed(2)}
                </p>
                {pendingTotal > 0 && (
                  <p className="text-xs text-neon-yellow mt-1">
                    ${pendingTotal.toFixed(2)} pending approval
                  </p>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Withdrawal Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard border="purple" className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <Send className="w-5 h-5 text-neon-purple" />
              New Withdrawal Request
            </h2>

            {availableToWithdraw <= 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No balance available for withdrawal
                </p>
                {pendingTotal > 0 && (
                  <p className="text-sm text-neon-yellow mt-2">
                    You have pending requests totaling ${pendingTotal.toFixed(2)}
                  </p>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-muted-foreground mb-2 block">
                    Amount (Max: ${availableToWithdraw.toFixed(2)})
                  </Label>
                  <NeonInput
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="1"
                    max={availableToWithdraw}
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <Label className="text-muted-foreground mb-2 block">
                    Your Bank Details *
                  </Label>
                  <Textarea
                    value={bankDetails}
                    onChange={(e) => setBankDetails(e.target.value)}
                    placeholder="Bank Name&#10;Account Holder Name&#10;Account Number&#10;Routing/SWIFT Code"
                    className="bg-secondary/50 border-border min-h-[120px]"
                    required
                  />
                </div>

                <div>
                  <Label className="text-muted-foreground mb-2 block">
                    Additional Notes (Optional)
                  </Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional information..."
                    className="bg-secondary/50 border-border"
                  />
                </div>

                <NeonButton
                  type="submit"
                  variant="green"
                  size="lg"
                  className="w-full"
                  disabled={submitting || availableToWithdraw <= 0}
                >
                  <Send className="w-5 h-5" />
                  {submitting ? 'Submitting...' : 'Submit Withdrawal Request'}
                </NeonButton>
              </form>
            )}
          </GlassCard>
        </motion.div>

        {/* Request History */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-neon-cyan" />
            Withdrawal History
          </h2>

          {loading ? (
            <GlassCard border="default" className="text-center py-8">
              <div className="animate-pulse text-muted-foreground">Loading...</div>
            </GlassCard>
          ) : requests.length === 0 ? (
            <GlassCard border="default" className="text-center py-12">
              <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No withdrawal requests yet</p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {requests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard border="default" padding="sm">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-secondary/50">
                          {getStatusIcon(request.status)}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            ${request.amount.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(request.created_at), 'MMM d, yyyy • h:mm a')}
                          </p>
                          {request.admin_notes && request.status !== 'pending' && (
                            <p className="text-sm text-muted-foreground mt-2 italic">
                              "{request.admin_notes}"
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`text-sm font-medium capitalize ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>
      </div>
    </AppLayout>
  );
}
