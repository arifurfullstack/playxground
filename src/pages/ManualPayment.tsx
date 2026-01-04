import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/glass-card';
import { NeonButton } from '@/components/ui/neon-button';
import { NeonInput } from '@/components/ui/neon-input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Building2, Copy, CheckCircle, Clock, Loader2, ArrowLeft } from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface BankSettings {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  routing_number: string | null;
  swift_code: string | null;
  additional_info: string | null;
}

interface PaymentRequest {
  id: string;
  amount: number;
  type: string;
  status: string;
  transaction_reference: string | null;
  created_at: string;
}

export default function ManualPayment() {
  const { user, loading, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [bankSettings, setBankSettings] = useState<BankSettings | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PaymentRequest[]>([]);
  const [amount, setAmount] = useState(searchParams.get('amount') || '');
  const [transactionRef, setTransactionRef] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const paymentType = searchParams.get('type') || 'wallet_topup';
  const creatorId = searchParams.get('creator_id');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoadingData(true);
    
    // Fetch bank settings
    const { data: bankData } = await supabase
      .from('bank_settings')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    
    if (bankData) {
      setBankSettings(bankData);
    }

    // Fetch pending payment requests
    const { data: requests } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('user_id', user!.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (requests) {
      setPendingRequests(requests);
    }

    setLoadingData(false);
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!transactionRef.trim()) {
      toast.error('Please enter your transaction reference');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('payment_requests')
        .insert({
          user_id: user!.id,
          amount: parseFloat(amount),
          type: paymentType,
          transaction_reference: transactionRef.trim(),
          bank_account_name: bankAccountName.trim() || null,
          notes: notes.trim() || null,
          creator_id: creatorId || null,
        });

      if (error) throw error;

      toast.success('Payment request submitted! We will review it shortly.');
      setAmount('');
      setTransactionRef('');
      setBankAccountName('');
      setNotes('');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit payment request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <header className="mb-8">
          <h1 className="text-3xl font-display font-bold neon-text-cyan mb-2">
            Bank Transfer Payment
          </h1>
          <p className="text-muted-foreground">
            {paymentType === 'wallet_topup' 
              ? 'Add funds to your wallet via bank transfer'
              : 'Pay for subscription via bank transfer'}
          </p>
        </header>

        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
          </div>
        ) : !bankSettings ? (
          <GlassCard border="pink">
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Bank Transfer Not Available
              </h3>
              <p className="text-muted-foreground">
                Bank transfer payment is not configured yet. Please try again later.
              </p>
            </div>
          </GlassCard>
        ) : (
          <>
            {/* Bank Details */}
            <GlassCard border="cyan" className="mb-6">
              <h2 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-neon-cyan" />
                Bank Account Details
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Transfer the exact amount to the following bank account:
              </p>
              
              <div className="space-y-3">
                <BankDetailRow
                  label="Bank Name"
                  value={bankSettings.bank_name}
                  onCopy={() => copyToClipboard(bankSettings.bank_name, 'bank')}
                  copied={copiedField === 'bank'}
                />
                <BankDetailRow
                  label="Account Name"
                  value={bankSettings.account_name}
                  onCopy={() => copyToClipboard(bankSettings.account_name, 'name')}
                  copied={copiedField === 'name'}
                />
                <BankDetailRow
                  label="Account Number"
                  value={bankSettings.account_number}
                  onCopy={() => copyToClipboard(bankSettings.account_number, 'number')}
                  copied={copiedField === 'number'}
                />
                {bankSettings.routing_number && (
                  <BankDetailRow
                    label="Routing Number"
                    value={bankSettings.routing_number}
                    onCopy={() => copyToClipboard(bankSettings.routing_number!, 'routing')}
                    copied={copiedField === 'routing'}
                  />
                )}
                {bankSettings.swift_code && (
                  <BankDetailRow
                    label="SWIFT Code"
                    value={bankSettings.swift_code}
                    onCopy={() => copyToClipboard(bankSettings.swift_code!, 'swift')}
                    copied={copiedField === 'swift'}
                  />
                )}
                {bankSettings.additional_info && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground">{bankSettings.additional_info}</p>
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Payment Form */}
            <GlassCard border="pink" className="mb-6">
              <h2 className="text-lg font-display font-bold text-foreground mb-4">
                Submit Payment Details
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground block mb-2">
                    Amount ($) *
                  </label>
                  <NeonInput
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    variant="cyan"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground block mb-2">
                    Transaction Reference *
                  </label>
                  <NeonInput
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="Your bank transaction reference"
                    variant="cyan"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the reference number from your bank transfer
                  </p>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground block mb-2">
                    Your Bank Account Name
                  </label>
                  <NeonInput
                    type="text"
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    placeholder="Name on your bank account"
                    variant="cyan"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground block mb-2">
                    Notes (optional)
                  </label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional information..."
                    className="bg-background/50 border-neon-cyan/30"
                  />
                </div>

                <NeonButton
                  type="submit"
                  variant="filledCyan"
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Payment Request'
                  )}
                </NeonButton>
              </form>
            </GlassCard>

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <GlassCard border="yellow">
                <h2 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-neon-yellow" />
                  Pending Requests
                </h2>
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-neon-yellow/20"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          ${request.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Ref: {request.transaction_reference}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-neon-yellow">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">Pending</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

function BankDetailRow({ 
  label, 
  value, 
  onCopy, 
  copied 
}: { 
  label: string; 
  value: string; 
  onCopy: () => void; 
  copied: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-mono text-foreground">{value}</p>
      </div>
      <button
        onClick={onCopy}
        className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
      >
        {copied ? (
          <CheckCircle className="w-4 h-4 text-neon-green" />
        ) : (
          <Copy className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}
