import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { GlassCard } from '@/components/ui/glass-card';
import { NeonButton } from '@/components/ui/neon-button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2, 
  Building2, 
  DollarSign,
  User,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';

interface PaymentRequest {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  status: string;
  payment_method: string;
  transaction_reference: string | null;
  bank_account_name: string | null;
  notes: string | null;
  admin_notes: string | null;
  creator_id: string | null;
  created_at: string;
  user: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export default function AdminPayments() {
  const { user, loading, role } = useAuth();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    if (user && role === 'admin') {
      fetchRequests();
    }
  }, [user, role, activeTab]);

  const fetchRequests = async () => {
    setLoadingData(true);
    
    const { data, error } = await supabase
      .from('payment_requests')
      .select(`
        *,
        user:profiles!payment_requests_user_id_fkey(username, display_name, avatar_url)
      `)
      .eq('status', activeTab)
      .order('created_at', { ascending: activeTab !== 'pending' });

    if (data && !error) {
      setRequests(data as PaymentRequest[]);
    }
    
    setLoadingData(false);
  };

  const handleAction = async (approve: boolean) => {
    if (!selectedRequest) return;

    setProcessing(true);

    try {
      // Update payment request status
      const { error: updateError } = await supabase
        .from('payment_requests')
        .update({
          status: approve ? 'approved' : 'rejected',
          admin_notes: adminNotes.trim() || null,
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (updateError) throw updateError;

      // If approved, update user's wallet balance for top-up
      if (approve && selectedRequest.type === 'wallet_topup') {
        // Get current balance and update
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', selectedRequest.user_id)
          .single();

        if (currentProfile) {
          await supabase
            .from('profiles')
            .update({
              wallet_balance: (Number(currentProfile.wallet_balance) || 0) + selectedRequest.amount
            })
            .eq('id', selectedRequest.user_id);
        }

        // Create transaction record
        await supabase
          .from('transactions')
          .insert({
            receiver_id: selectedRequest.user_id,
            amount: selectedRequest.amount,
            type: 'deposit',
            description: `Bank transfer deposit - Ref: ${selectedRequest.transaction_reference}`,
          });
      }

      // If approved withdrawal, deduct from pending balance
      if (approve && selectedRequest.type === 'withdrawal') {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('pending_balance')
          .eq('id', selectedRequest.user_id)
          .single();

        if (currentProfile) {
          await supabase
            .from('profiles')
            .update({
              pending_balance: Math.max(0, (Number(currentProfile.pending_balance) || 0) - selectedRequest.amount)
            })
            .eq('id', selectedRequest.user_id);
        }

        // Create transaction record
        await supabase
          .from('transactions')
          .insert({
            sender_id: selectedRequest.user_id,
            amount: selectedRequest.amount,
            type: 'withdrawal',
            description: `Withdrawal payout - Admin approved`,
          });
      }

      // If approved subscription, create subscription
      if (approve && selectedRequest.type === 'subscription' && selectedRequest.creator_id) {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        await supabase
          .from('subscriptions')
          .upsert({
            fan_id: selectedRequest.user_id,
            creator_id: selectedRequest.creator_id,
            status: 'active',
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
          }, { onConflict: 'fan_id,creator_id' });
      }

      toast.success(approve ? 'Payment approved!' : 'Payment rejected');
      setSelectedRequest(null);
      setAdminNotes('');
      setActionType(null);
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message || 'Failed to process request');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-display font-bold neon-text-pink mb-2">
            Payment Management
          </h1>
          <p className="text-muted-foreground">
            Review and manage manual payment requests
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Pending
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Approved
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              <XCircle className="w-4 h-4" />
              Rejected
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {loadingData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-neon-pink" />
              </div>
            ) : requests.length === 0 ? (
              <GlassCard border="pink">
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No {activeTab} requests
                  </h3>
                  <p className="text-muted-foreground">
                    {activeTab === 'pending' 
                      ? 'All payment requests have been processed'
                      : `No ${activeTab} payment requests yet`}
                  </p>
                </div>
              </GlassCard>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <GlassCard 
                      border={request.status === 'pending' ? 'yellow' : request.status === 'approved' ? 'cyan' : 'pink'}
                      className="cursor-pointer hover:scale-[1.01] transition-transform"
                      onClick={() => {
                        setSelectedRequest(request);
                        setAdminNotes(request.admin_notes || '');
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-pink to-neon-cyan flex items-center justify-center overflow-hidden">
                            {request.user?.avatar_url ? (
                              <img src={request.user.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-6 h-6 text-background" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {request.user?.display_name || request.user?.username}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              @{request.user?.username}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-2xl font-bold neon-text-cyan">
                            ${request.amount.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.type === 'wallet_topup' ? 'Wallet Top-up' : 'Subscription'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Reference</p>
                          <p className="font-mono text-foreground">{request.transaction_reference || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Submitted</p>
                          <p className="text-foreground">
                            {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>

                      {activeTab === 'pending' && (
                        <div className="mt-4 flex gap-2">
                          <NeonButton
                            variant="filledCyan"
                            size="sm"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRequest(request);
                              setActionType('approve');
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </NeonButton>
                          <NeonButton
                            variant="pink"
                            size="sm"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRequest(request);
                              setActionType('reject');
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </NeonButton>
                        </div>
                      )}
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Dialog */}
        <Dialog open={actionType !== null} onOpenChange={() => setActionType(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'approve' ? 'Approve Payment' : 'Reject Payment'}
              </DialogTitle>
              <DialogDescription>
                {actionType === 'approve'
                  ? 'Confirm this payment and credit the user\'s wallet'
                  : 'Reject this payment request'}
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-secondary/50">
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-bold text-foreground">${selectedRequest.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Reference</span>
                    <span className="font-mono text-foreground">{selectedRequest.transaction_reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">User</span>
                    <span className="text-foreground">{selectedRequest.user?.username}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground block mb-2">
                    Admin Notes (optional)
                  </label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this decision..."
                    className="bg-background/50"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <NeonButton variant="ghost" onClick={() => setActionType(null)}>
                Cancel
              </NeonButton>
              <NeonButton
                variant={actionType === 'approve' ? 'filledCyan' : 'filled'}
                onClick={() => handleAction(actionType === 'approve')}
                disabled={processing}
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : actionType === 'approve' ? (
                  'Approve Payment'
                ) : (
                  'Reject Payment'
                )}
              </NeonButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
